import { prisma } from "../config/prisma";

// Deletes refresh tokens that are either expired or revoked.
// Run on a schedule (e.g. every 6 hours) to prevent unbounded table growth.
export const pruneRefreshTokens = async (): Promise<void> => {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { isRevoked: true },
      ],
    },
  });
  console.log(`[JOBS] pruneRefreshTokens: deleted ${result.count} rows`);
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// pruneRefreshTokens()
//   → deletes all RefreshToken rows where expiresAt < now OR isRevoked = true.
//     Safe to run any time; call from a recurring setInterval in server.ts.
// ──────────────────────────────────────────────────────────────────────────────
