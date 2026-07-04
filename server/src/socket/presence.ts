import { envVars } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Project presence tracking. Reference-counted per (project,user) so a user with
 * multiple tabs/sockets only drops offline when their LAST connection closes.
 *
 * - In-memory by default (correct on a single instance).
 * - Redis-backed when REDIS_URL is set, so presence is accurate across
 *   horizontally-scaled instances — fixing the prior bug where each node only
 *   knew about its own connections.
 */
export interface Presence {
  join(projectId: string, userId: string): Promise<string[]>;
  leave(projectId: string, userId: string): Promise<string[]>;
  list(projectId: string): Promise<string[]>;
}

// ── In-memory (ref-counted) ──────────────────────────────────────────────────
const createMemoryPresence = (): Presence => {
  const counts = new Map<string, Map<string, number>>();
  const bucket = (p: string) => {
    if (!counts.has(p)) counts.set(p, new Map());
    return counts.get(p)!;
  };
  return {
    async join(projectId, userId) {
      const b = bucket(projectId);
      b.set(userId, (b.get(userId) ?? 0) + 1);
      return [...b.keys()];
    },
    async leave(projectId, userId) {
      const b = bucket(projectId);
      const n = (b.get(userId) ?? 0) - 1;
      if (n <= 0) b.delete(userId);
      else b.set(userId, n);
      return [...b.keys()];
    },
    async list(projectId) {
      return [...bucket(projectId).keys()];
    },
  };
};

// ── Redis (ref-counted via a per-project hash) ───────────────────────────────
const createRedisPresence = (client: any): Presence => {
  const key = (projectId: string) => `presence:project:${projectId}`;
  return {
    async join(projectId, userId) {
      await client.hIncrBy(key(projectId), userId, 1);
      return client.hKeys(key(projectId));
    },
    async leave(projectId, userId) {
      const n = await client.hIncrBy(key(projectId), userId, -1);
      if (n <= 0) await client.hDel(key(projectId), userId);
      return client.hKeys(key(projectId));
    },
    async list(projectId) {
      return client.hKeys(key(projectId));
    },
  };
};

let presence: Presence = createMemoryPresence();

// Called once during socket initialisation. Upgrades to Redis presence when a
// working Redis client is available; otherwise stays in-memory.
export const initPresence = async (): Promise<void> => {
  if (!envVars.REDIS_URL) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require("redis");
    const client = createClient({ url: envVars.REDIS_URL });
    await client.connect();
    presence = createRedisPresence(client);
    logger.info("Presence backend: Redis (cross-instance accurate)");
  } catch (err) {
    logger.warn("Redis presence unavailable — using in-memory presence", {
      err: String(err),
    });
  }
};

export const getPresence = (): Presence => presence;
