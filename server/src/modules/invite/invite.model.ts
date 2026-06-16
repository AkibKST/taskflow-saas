import { z } from "zod";
import { ROLES } from "@taskflow/shared";

const roleValues = Object.values(ROLES) as [string, ...string[]];

export const createInviteSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(roleValues).optional().default(ROLES.MEMBER),
});

export const acceptInviteSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 chars").max(100),
  password: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "Need at least 1 uppercase letter")
    .regex(/[0-9]/, "Need at least 1 number"),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

// ─── Function Summary ──────────────────────────────────────────────────────────
// createInviteSchema  → validates { email, role? } for POST /invite
// acceptInviteSchema  → validates { name, password } for POST /invite/:token/accept
// ──────────────────────────────────────────────────────────────────────────────
