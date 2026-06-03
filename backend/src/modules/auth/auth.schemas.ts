import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const emailSchema = z.object({
  email: z.string().email()
});

export const tokenSchema = z.object({
  token: z.string().min(32)
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(12).max(128)
});

export type LoginInput = z.infer<typeof loginSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type TokenInput = z.infer<typeof tokenSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
