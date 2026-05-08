'use server';

/**
 * Admin-mediated user lifecycle server actions.
 *
 * (a) PITFALLS §7.3 ordering — every exported function calls requireAdmin() as
 *     the FIRST await before any DB access. This is a hard invariant (AUTH-15
 *     defence-in-depth): even if a non-admin somehow gets a reference to one of
 *     these functions, the requireAdmin() guard fires before any mutation occurs.
 *
 * (b) D-11 re-issuance discipline — createInvitation and createPasswordReset
 *     invalidate any prior unused tokens for that user (invalidatePriorTokens)
 *     before inserting a fresh one. Re-inviting an ACTIVE user is rejected; admin
 *     must use createPasswordReset for that case.
 *
 * (c) Session revocation in disableUser — the Better Auth admin plugin's
 *     revokeUserSessions({ body: { userId } }) deletes all DB session rows for
 *     the target user immediately. Combined with requireUser()'s secondary
 *     deletedAt check (AUTH-16), the effective revocation window is per-request
 *     (not the 5-min cookieCache TTL).
 *
 * (d) password field NOT set on users insert — Better Auth owns the argon2id hash
 *     in the `accounts.password` column (email+password provider). We insert a
 *     user row only; the partner sets their initial password via the invite token
 *     redemption flow in Plan 06-05, which also inserts the matching accounts row.
 */

import { eq, sql } from 'drizzle-orm';
import { auth } from './index';
import { requireAdmin } from './require';
import { generateToken } from './tokens';
import { db, schema } from '@/lib/db';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

/** 24-hour token TTL per D-09 */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export interface InviteResult {
  url: string;
}

export interface ResetResult {
  url: string;
}

/**
 * Disable a partner account (AUTH-11).
 *
 * Sets deleted_at = NOW() and bumps session_version + 1, then immediately
 * revokes all active sessions via the Better Auth admin plugin's
 * revokeUserSessions API (primary revocation mechanism). The secondary
 * revocation is requireUser()'s per-request deletedAt check in AUTH-16.
 *
 * Per D-23: setting deleted_at does NOT physically delete the user row — all
 * historical data (proposals, etc.) is preserved.
 */
export async function disableUser(userId: string): Promise<void> {
  await requireAdmin();
  await db()
    .update(schema.users)
    .set({
      deletedAt: sql`NOW()`,
      sessionVersion: sql`${schema.users.sessionVersion} + 1`,
    })
    .where(eq(schema.users.id, userId));
  // Primary session revocation: deletes all DB session rows immediately.
  // Secondary: requireUser() deletedAt check catches any stale cookie still
  // within the 5-min cookieCache window (AUTH-16).
  await auth().api.revokeUserSessions({ body: { userId } });
}

/**
 * Re-enable a previously disabled partner account.
 *
 * Per D-23: clearing deleted_at re-enables login; session_version is NOT bumped
 * (would log out the user on their very next request after re-enable, which is
 * counter-productive). The re-enabled user will need to sign in with their
 * existing credentials.
 */
export async function reEnableUser(userId: string): Promise<void> {
  await requireAdmin();
  await db()
    .update(schema.users)
    .set({ deletedAt: null })
    .where(eq(schema.users.id, userId));
}

/**
 * Invalidate all prior unused tokens for a user before issuing a new one (D-11).
 * Idempotent: if no rows exist, the DELETE is a no-op.
 */
async function invalidatePriorTokens(userId: string): Promise<void> {
  await db()
    .delete(schema.passwordResets)
    .where(eq(schema.passwordResets.userId, userId));
}

/**
 * Create an invitation for a new partner account (AUTH-07/08).
 *
 * Flow:
 * 1. If the email already exists and the user is ACTIVE (deletedAt IS NULL) →
 *    throw. Admin must use createPasswordReset for active users (D-11).
 * 2. If the email exists but is disabled → re-enable and issue a new invite.
 * 3. Otherwise → insert a new users row (role='partner', no password — accounts
 *    row is created at invite redemption time in Plan 06-05).
 * 4. Invalidate prior tokens, generate a fresh token, insert passwordResets row
 *    with kind='invite', return the plaintext URL.
 *
 * User ID generation: we derive a 21-char URL-safe base64 prefix from
 * generateToken().plaintext (base64url chars are base62-compatible for Better
 * Auth's nanoid expectations). This avoids a nanoid runtime dependency.
 */
export async function createInvitation(
  email: string,
  displayName: string,
): Promise<InviteResult> {
  await requireAdmin();
  const lowered = email.toLowerCase();

  const existing = await db().query.users.findFirst({
    where: eq(schema.users.email, lowered),
    columns: { id: true, deletedAt: true, role: true },
  });

  let userId: string;

  if (existing) {
    if (existing.deletedAt === null) {
      // D-11: active users cannot be re-invited; admin must use reset instead.
      throw new Error('User already active — use reset password instead.');
    }
    // User exists but was disabled: re-enable and allow a fresh invitation.
    await db()
      .update(schema.users)
      .set({ deletedAt: null, displayName })
      .where(eq(schema.users.id, existing.id));
    userId = existing.id;
  } else {
    // Generate a Better Auth-compatible nanoid-style ID (21 chars from base64url).
    const nanoidLike = generateToken().plaintext.slice(0, 21);
    userId = nanoidLike;
    await db().insert(schema.users).values({
      id: userId,
      email: lowered,
      name: displayName,
      displayName,
      role: 'partner',
      // NOTE: password is NOT set here — Better Auth stores it in accounts.password.
      // The partner sets their password via the invite redemption flow (Plan 06-05).
    });
  }

  await invalidatePriorTokens(userId);
  const { plaintext, hash } = generateToken();
  await db().insert(schema.passwordResets).values({
    userId,
    kind: 'invite',
    tokenHash: hash,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  return { url: `${APP_URL}/invite/${plaintext}` };
}

/**
 * Create a password-reset link for an existing user (AUTH-10).
 *
 * Invalidates any prior unused tokens for the user, generates a fresh token,
 * inserts a passwordResets row with kind='reset', and returns the URL.
 * Single-use: the redemption flow (Plan 06-05) sets usedAt on first use.
 */
export async function createPasswordReset(userId: string): Promise<ResetResult> {
  await requireAdmin();
  await invalidatePriorTokens(userId);
  const { plaintext, hash } = generateToken();
  await db().insert(schema.passwordResets).values({
    userId,
    kind: 'reset',
    tokenHash: hash,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return { url: `${APP_URL}/reset/${plaintext}` };
}
