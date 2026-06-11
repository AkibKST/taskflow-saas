import { z } from "zod";
import { TASK_STATUS, PRIORITY, PAGINATION } from "@taskflow/shared";

const statusValues = Object.values(TASK_STATUS) as [string, ...string[]];
const priorityValues = Object.values(PRIORITY) as [string, ...string[]];

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(statusValues).optional(),
  priority: z.enum(priorityValues).optional(),
  dueDate: z.coerce.date().optional(),
  order: z.number().int().optional(),
  parentTaskId: z.string().uuid().optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const listTasksQuerySchema = z.object({
  status: z.enum(statusValues).optional(),
  priority: z.enum(priorityValues).optional(),
  assigneeId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
