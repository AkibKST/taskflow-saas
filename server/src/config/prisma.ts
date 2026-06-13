import "dotenv/config";
import dns from "node:dns";
// Prefer IPv4: Neon's host resolves to IPv6 too, but IPv6 connectivity here is
// broken, which makes the serverless driver's fetch/WebSocket fail.
dns.setDefaultResultOrder("ipv4first");
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

// Node has no built-in WebSocket that the Neon serverless driver can use, so
// provide one. Without this, transactions/pool queries fail with
// "All attempts to open a WebSocket to connect to the database failed".
neonConfig.webSocketConstructor = ws;
import { PrismaClient } from "../generated/prisma/client";
import { envVars } from "./env";

const adapter = new PrismaNeon({
  connectionString: envVars.DATABASE_URL,
});

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
