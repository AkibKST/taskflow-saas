import { z } from "zod";

export const registerSchema = z.object({
  orgName: z.string().min(2, "Org name min 2 chars").max(100),
  name: z.string().min(2).max(100),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "Need 1 uppercase")
    .regex(/[0-9]/, "Need 1 number"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
