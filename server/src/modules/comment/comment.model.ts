import { z } from "zod";

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000),
  parentId: z.string().uuid().optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

// ─── Function Summary ──────────────────────────────────────────────────────────
// createCommentSchema → validates { content, parentId? } for POST /comments
// updateCommentSchema → validates { content } for PATCH /comments/:commentId
// ──────────────────────────────────────────────────────────────────────────────
