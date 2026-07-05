-- Corrective migration: the InviteToken table and a number of indexes existed
-- in schema.prisma but were only ever applied to the dev database via
-- `prisma db push` — no migration created them, so any database built from
-- migrations alone (CI, Docker, a fresh production deploy) was missing them
-- and every invite request failed. Written idempotently (IF NOT EXISTS /
-- guarded constraints) so it also applies cleanly to databases that already
-- got these objects from db push.

-- CreateTable
CREATE TABLE IF NOT EXISTS "InviteToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "invitedById" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InviteToken_token_key" ON "InviteToken"("token");
CREATE INDEX IF NOT EXISTS "InviteToken_tenantId_idx" ON "InviteToken"("tenantId");
CREATE INDEX IF NOT EXISTS "InviteToken_email_idx" ON "InviteToken"("email");
CREATE INDEX IF NOT EXISTS "Comment_taskId_isDeleted_idx" ON "Comment"("taskId", "isDeleted");
CREATE INDEX IF NOT EXISTS "Comment_userId_idx" ON "Comment"("userId");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_tenantId_idx" ON "Notification"("tenantId");
CREATE INDEX IF NOT EXISTS "Project_tenantId_isDeleted_idx" ON "Project"("tenantId", "isDeleted");
CREATE INDEX IF NOT EXISTS "ProjectMember_userId_idx" ON "ProjectMember"("userId");
CREATE INDEX IF NOT EXISTS "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "Task_projectId_tenantId_status_idx" ON "Task"("projectId", "tenantId", "status");
CREATE INDEX IF NOT EXISTS "Task_projectId_order_idx" ON "Task"("projectId", "order");
CREATE INDEX IF NOT EXISTS "Task_tenantId_isDeleted_idx" ON "Task"("tenantId", "isDeleted");
CREATE INDEX IF NOT EXISTS "Task_createdById_idx" ON "Task"("createdById");
CREATE INDEX IF NOT EXISTS "TaskAssignee_userId_idx" ON "TaskAssignee"("userId");
CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");

-- AddForeignKey (guarded — ADD CONSTRAINT has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InviteToken_tenantId_fkey') THEN
    ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InviteToken_invitedById_fkey') THEN
    ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_invitedById_fkey"
      FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
