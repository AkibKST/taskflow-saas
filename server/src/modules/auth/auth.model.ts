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

export const updateProfileSchema = z
  .object({
    name: z.string().min(2, "Name min 2 chars").max(100).optional(),
    email: z.string().email("Invalid email").optional(),
    // Required only when changing the email — re-authenticates a sensitive change
    // so a hijacked session can't silently take over the account by swapping email.
    currentPassword: z.string().min(1).optional(),
  })
  .refine((d) => d.name !== undefined || d.email !== undefined, {
    message: "Provide a name or email to update",
  })
  .refine((d) => d.email === undefined || !!d.currentPassword, {
    message: "Current password is required to change your email",
    path: ["currentPassword"],
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "Need 1 uppercase")
    .regex(/[0-9]/, "Need 1 number"),
});

// Reuse the same strength rules as registration for any new password.
const strongPassword = z
  .string()
  .min(8, "Min 8 characters")
  .regex(/[A-Z]/, "Need 1 uppercase")
  .regex(/[0-9]/, "Need 1 number");

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Invalid token"),
  password: strongPassword,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, "Invalid token"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
