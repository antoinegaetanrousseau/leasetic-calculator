/**
 * Zod schemas shared between client (react-hook-form) and server (action input parsing).
 *
 * Per D-29 / SHELL-11: the same schema is imported by both sides so client
 * validation matches server-side input parsing exactly. Pure module — no
 * framework imports, no I/O, no 'use server' / 'use client' directives.
 */
import { z } from 'zod';

/** Login form / signIn.email input. */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

/**
 * Set-password (invitation OR reset) form input. Confirm field must match.
 * Server-side, the redemption handler additionally checks token validity
 * (Plan 06-05 owns that path).
 */
export const setPasswordSchema = z
  .object({
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
