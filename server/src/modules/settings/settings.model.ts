import { z } from "zod";

// Per-user notification toggles. Field names mirror the NotificationPreference
// model columns (and @taskflow/shared NOTIFICATION_PREF_KEYS). All optional so
// the client can PATCH a single switch.
export const updateNotificationPrefsSchema = z
  .object({
    taskAssigned: z.boolean().optional(),
    taskDue: z.boolean().optional(),
    commentMention: z.boolean().optional(),
    memberJoined: z.boolean().optional(),
    projectUpdate: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one preference to update",
  });

export const updateWorkspaceSchema = z
  .object({
    name: z.string().min(2, "Workspace name min 2 chars").max(100).optional(),
    // Accept a URL or an empty string (which clears the logo → null).
    logoUrl: z.union([z.string().url("Invalid URL"), z.literal("")]).optional(),
  })
  .refine((d) => d.name !== undefined || d.logoUrl !== undefined, {
    message: "Provide a name or logo URL to update",
  });

export type UpdateNotificationPrefsInput = z.infer<typeof updateNotificationPrefsSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
