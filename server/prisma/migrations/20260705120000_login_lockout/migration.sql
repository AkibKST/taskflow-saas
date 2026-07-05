-- Per-account login lockout: counts consecutive failed logins and locks the
-- account temporarily once the threshold is hit (see loginService).
ALTER TABLE "User"
  ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3);
