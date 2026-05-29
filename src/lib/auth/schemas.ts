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

// ── Phase 21 / Plan 21-01 — /parametres schemas ─────────────────────────────
// D-06d resolved 2026-05-29: email is READ-ONLY in identitySchema — DB probe
// found email_verified = 1 (true) for BOTH antoine.rousseau@leasetic.com AND
// emmanuel.rousseau@leasetic.com on the Neon `main` (production) branch. Better
// Auth 1.6.9 would reject /change-email without SMTP when emailVerified=true
// (RESEARCH §1d). Safe fallback per 21-CONTEXT.md D-06d.
//
// Consequence: identitySchema OMITS the email field. The /parametres form
// renders the email as static text + the `parametres.identity.email.readonly.notice`
// helper. The `user.changeEmail` block is NOT added to src/lib/auth/index.ts.
// To revisit: re-run the DB probe; if both rows drop to email_verified=0
// (e.g. after a schema migration that resets verification state), re-introduce
// the email field + the changeEmail config.

/**
 * In-app self-service password change (Phase 21 — D-07 rev 2).
 *
 * The server-side Better Auth changePassword endpoint additionally verifies
 * that `currentPassword` matches the stored hash; client-side only the length
 * constraint is enforced.
 *
 * Rev 2 (2026-05-29): the "Confirmer le nouveau mot de passe" field was
 * DROPPED to match the Figma 132:867 2-field row (Ancien + Nouveau). No
 * client-side equality refine. If a user typos newPassword, they discover it
 * on the next sign-in and use the existing admin-mediated reset flow as
 * recovery. Documented as accepted UX risk in 21-CONTEXT.md D-07.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Ancien mot de passe requis'),
  newPassword: z.string().min(8).max(128),
});

/**
 * Identity update (Phase 21 — D-06).
 *
 * Splits a Better Auth `user.name` into Prénom / Nom for the form, recombines
 * client-side before calling `authClient.updateUser({ name })`.
 *
 * Email is OMITTED — D-06d resolved to "email READ-ONLY" (see top-of-section
 * comment above). If the resolution flips to "editable" in the future, add
 * `email: z.string().email()` here AND enable `user.changeEmail` in
 * src/lib/auth/index.ts.
 */
export const identitySchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(60),
  lastName: z.string().min(1, 'Nom requis').max(60),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type IdentityInput = z.infer<typeof identitySchema>;
