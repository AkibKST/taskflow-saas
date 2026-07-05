import "dotenv/config";
import dns from "node:dns";
// Prefer IPv4: Neon's host resolves to IPv6 too, but IPv6 connectivity here is
// broken, which makes the serverless driver's fetch/WebSocket fail.
dns.setDefaultResultOrder("ipv4first");
import { PrismaClient } from "../generated/prisma/client";
import { envVars } from "./env";

/**
 * Driver selection. The Neon serverless driver speaks Neon's WebSocket proxy
 * protocol and cannot connect to a plain Postgres (local dev, CI service
 * containers, docker-compose). Set DATABASE_DRIVER=pg to use node-postgres
 * instead; unset (or "neon") keeps the Neon driver. As a convenience, a
 * DATABASE_URL pointing at localhost auto-selects pg — Neon can never be
 * local, so that combination would only ever fail.
 */
const isLocalhostUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
};

const driver =
  process.env.DATABASE_DRIVER ??
  (isLocalhostUrl(envVars.DATABASE_URL) ? "pg" : "neon");

const buildAdapter = () => {
  if (driver === "pg") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaPg } = require("@prisma/adapter-pg");
    return new PrismaPg({ connectionString: envVars.DATABASE_URL });
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ws = require("ws");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { neonConfig } = require("@neondatabase/serverless");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaNeon } = require("@prisma/adapter-neon");
  // Node has no built-in WebSocket that the Neon serverless driver can use, so
  // provide one. Without this, transactions/pool queries fail with
  // "All attempts to open a WebSocket to connect to the database failed".
  neonConfig.webSocketConstructor = ws;
  return new PrismaNeon({ connectionString: envVars.DATABASE_URL });
};

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: buildAdapter() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
