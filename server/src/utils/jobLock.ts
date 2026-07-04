import { prisma } from "../config/prisma";
import { logger } from "./logger";

/**
 * Run `fn` only if this instance can grab a cluster-wide lock for `name`, so a
 * scheduled job doesn't double-execute when the app runs on multiple instances.
 *
 * Uses a Postgres transaction-level advisory lock: it's held for the duration of
 * the surrounding transaction and auto-released at the end (even on crash), and
 * — unlike a session-level lock — it behaves correctly through a connection
 * pooler. If another instance holds it, `pg_try_advisory_xact_lock` returns
 * false and we skip this run.
 */

// Deterministic 32-bit signed key from a job name (advisory locks take integers).
const keyFor = (name: string): number => {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  }
  return h;
};

export const withJobLock = async (
  name: string,
  fn: () => Promise<void>,
  { timeoutMs = 5 * 60 * 1000 }: { timeoutMs?: number } = {}
): Promise<void> => {
  const key = keyFor(name);
  await prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRawUnsafe<{ locked: boolean }[]>(
        `SELECT pg_try_advisory_xact_lock(${key}) AS locked`
      );
      if (!rows[0]?.locked) {
        logger.debug("job lock held by another instance — skipping", { job: name });
        return;
      }
      await fn();
    },
    { timeout: timeoutMs, maxWait: 5000 }
  );
};
