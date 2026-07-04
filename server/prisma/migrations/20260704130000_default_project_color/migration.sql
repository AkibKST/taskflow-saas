-- Align the DB default project color with the client (DEFAULT_PROJECT_COLOR
-- in @taskflow/shared): brand indigo instead of the old neon green.
ALTER TABLE "Project" ALTER COLUMN "color" SET DEFAULT '#6366f1';

-- Migrate existing rows that still carry the old default.
UPDATE "Project" SET "color" = '#6366f1' WHERE "color" = '#00ff41';
