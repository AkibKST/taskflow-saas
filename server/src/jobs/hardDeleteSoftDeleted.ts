import { prisma } from "../config/prisma";

// How long to keep soft-deleted records before hard-deleting them (30 days)
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// Hard-deletes Project, Task, and Comment rows that were soft-deleted more than
// RETENTION_MS ago. Run on a long schedule (e.g. once per day).
export const hardDeleteSoftDeleted = async (): Promise<void> => {
  const cutoff = new Date(Date.now() - RETENTION_MS);

  const [projects, tasks, comments] = await Promise.all([
    prisma.project.deleteMany({
      where: { isDeleted: true, updatedAt: { lt: cutoff } },
    }),
    prisma.task.deleteMany({
      where: { isDeleted: true, updatedAt: { lt: cutoff } },
    }),
    prisma.comment.deleteMany({
      where: { isDeleted: true, updatedAt: { lt: cutoff } },
    }),
  ]);

  console.log(
    `[JOBS] hardDeleteSoftDeleted: projects=${projects.count} tasks=${tasks.count} comments=${comments.count}`
  );
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// hardDeleteSoftDeleted()
//   → hard-deletes Project/Task/Comment rows where isDeleted=true and
//     updatedAt < (now − 30 days). Prevents unbounded accumulation of soft-deleted rows.
//     Call from a daily setInterval in server.ts.
// ──────────────────────────────────────────────────────────────────────────────
