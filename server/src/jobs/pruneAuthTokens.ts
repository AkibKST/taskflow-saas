import { prisma } from "../config/prisma";

// Deletes password-reset and email-verification tokens that are expired or used.
// Run on a schedule (e.g. every 6 hours) to keep these tables bounded.
export const pruneAuthTokens = async (): Promise<void> => {
  const now = new Date();
  const where = {
    OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
  };

  const [reset, verify] = await Promise.all([
    prisma.passwordResetToken.deleteMany({ where }),
    prisma.emailVerificationToken.deleteMany({ where }),
  ]);

  console.log(
    `[JOBS] pruneAuthTokens: deleted ${reset.count} reset + ${verify.count} verification rows`
  );
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// pruneAuthTokens()
//   → deletes PasswordResetToken/EmailVerificationToken rows that are expired
//     (expiresAt < now) or already consumed (usedAt set). Safe to run any time.
// ──────────────────────────────────────────────────────────────────────────────
