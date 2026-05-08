'use server';

import { eq, and, isNull, gt, sql } from 'drizzle-orm';
import { auth } from './index';
import { hashToken } from './tokens';
import { setPasswordSchema } from './schemas';
import { db, schema } from '@/lib/db';

export type RedeemKind = 'invite' | 'reset';

export type RedeemResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'invalid_password' | 'server_error' };

/**
 * Atomic token redemption for both invitation (kind='invite') and reset (kind='reset').
 *
 * On success:
 *  - Hashes the new password via @node-rs/argon2 with the same parameters as auth()
 *  - Upserts the accounts row (creates for invite-flow, updates for reset-flow)
 *  - Marks passwordResets.usedAt = NOW() (single-use enforcement, D-09)
 *  - For kind='reset': bumps users.sessionVersion so requireUser() rejects any
 *    stale sessions on the next request (D-23 mirror — evicts old sessions)
 *
 * Always returns the same generic 'invalid' reason for any token issue (anti-
 * enumeration sibling of D-22) — the redemption page does NOT distinguish
 * "expired" from "wrong kind" from "missing" in the visible error.
 *
 * Server-only — never import this from a Client Component.
 */
export async function redeemToken(
  plaintext: string,
  kind: RedeemKind,
  password: string,
  confirmPassword: string,
): Promise<RedeemResult> {
  // Step 1: Input validation via the same Zod schema the client uses.
  // Validate BEFORE any DB lookup to give fast feedback for trivially bad input.
  const parsed = setPasswordSchema.safeParse({ password, confirmPassword });
  if (!parsed.success) return { ok: false, reason: 'invalid_password' };

  try {
    const tokenHash = hashToken(plaintext);

    // Step 2: Atomic lookup — all 4 conditions must be satisfied:
    //  - tokenHash matches the URL-plaintext's SHA-256
    //  - kind matches the route (/invite vs /reset — T-06-05-04 wrong-kind prevention)
    //  - usedAt IS NULL (single-use enforcement, D-09 / T-06-05-03)
    //  - expiresAt > NOW (TTL enforcement, D-09)
    const record = await db().query.passwordResets.findFirst({
      where: and(
        eq(schema.passwordResets.tokenHash, tokenHash),
        eq(schema.passwordResets.kind, kind),
        isNull(schema.passwordResets.usedAt),
        gt(schema.passwordResets.expiresAt, new Date()),
      ),
    });
    if (!record) return { ok: false, reason: 'invalid' };

    // Step 3: Hash the new password using the same argon2id parameters as auth().
    // We call @node-rs/argon2 directly here with identical parameters to keep
    // the hash format interchangeable with Better Auth's configured hasher
    // (06-03 uses algorithm: 2 = argon2id, memoryCost: 19456, timeCost: 2).
    const argon2 = await import('@node-rs/argon2');
    const passwordHash = await argon2.hash(password, {
      algorithm: 2, // argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    // Step 4: Look up the user (we need their email for the accounts.accountId).
    const user = await db().query.users.findFirst({
      where: eq(schema.users.id, record.userId),
      columns: { id: true, email: true },
    });
    if (!user) return { ok: false, reason: 'invalid' };

    // Step 5: Upsert the accounts row.
    // Better Auth uses providerId='credential' for email+password accounts.
    // - Invite flow: no accounts row exists yet → INSERT.
    // - Reset flow: accounts row already exists → UPDATE the password column.
    const existingAccount = await db().query.accounts.findFirst({
      where: and(
        eq(schema.accounts.userId, user.id),
        eq(schema.accounts.providerId, 'credential'),
      ),
    });

    if (existingAccount) {
      await db()
        .update(schema.accounts)
        .set({ password: passwordHash, updatedAt: sql`NOW()` })
        .where(eq(schema.accounts.id, existingAccount.id));
    } else {
      // Generate an ID matching Better Auth's nanoid shape (~21 base64url chars).
      const { randomBytes } = await import('node:crypto');
      const accountId = randomBytes(16).toString('base64url').slice(0, 21);
      await db().insert(schema.accounts).values({
        id: accountId,
        userId: user.id,
        // accountId = email (Better Auth convention for the credential provider)
        accountId: user.email,
        providerId: 'credential',
        password: passwordHash,
        // Better Auth expects createdAt/updatedAt on the accounts row.
        // The schema uses .defaultNow() so we don't need to pass them,
        // but set explicitly to avoid any driver issues.
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Step 6: Mark token as used (single-use enforcement, D-09).
    await db()
      .update(schema.passwordResets)
      .set({ usedAt: sql`NOW()` })
      .where(eq(schema.passwordResets.id, record.id));

    // Step 7: For reset flow only — bump sessionVersion to evict stale sessions
    // (D-23: admin reset must invalidate prior sessions within the 5-min cookieCache window).
    if (kind === 'reset') {
      await db()
        .update(schema.users)
        .set({ sessionVersion: sql`${schema.users.sessionVersion} + 1` })
        .where(eq(schema.users.id, user.id));

      // Belt-and-suspenders: also revoke DB session rows via Better Auth's admin plugin
      // so any active sessions are immediately invalidated (not just after cookieCache TTL).
      await auth().api.revokeUserSessions({ body: { userId: user.id } });
    }

    return { ok: true };
  } catch (e) {
    // Bounded error redaction (Phase 5 classifyError discipline): never leak
    // DB schema details or specific failure reasons to the caller.
    // Server logs capture the full error for forensics.
    console.error('[redeem] token redemption failed:', e);
    return { ok: false, reason: 'server_error' };
  }
}
