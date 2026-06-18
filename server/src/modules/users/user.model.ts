import { z } from "zod";
import { ROLES } from "@taskflow/shared";

const roleValues = Object.values(ROLES) as [string, ...string[]];

export const updateRoleSchema = z.object({
  role: z.enum(roleValues),
});

export const setStatusSchema = z.object({
  isActive: z.boolean(),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type SetStatusInput = z.infer<typeof setStatusSchema>;
