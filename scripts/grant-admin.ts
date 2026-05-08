/**
 * scripts/grant-admin.ts — Phase 6 / AUTH-12
 *
 * The ONLY path for granting admin role on the production database.
 * Never grant admin via the app UI (REQUIREMENTS.md AUTH-12 is hard-locked).
 *
 * Usage:
 *   CONFIRM=GRANT-ADMIN-<email> npx tsx scripts/grant-admin.ts <email> [--display-name "Full Name"]
 *
 * Behavior tree (idempotent):
 *   - User exists AND role='admin' AND deletedAt IS NULL  → no-op (log + exit 0)
 *   - User exists AND role='partner' AND deletedAt IS NULL → upgrade role='admin'
 *   - User exists AND deletedAt IS NOT NULL (disabled)     → re-enable + role='admin' + emit fresh invitation URL
 *   - User does not exist                                   → create users row + emit invitation URL
 *
 * The script never sees plaintext passwords. New admins set their password by
 * redeeming the invitation URL (which routes through app/(public)/invite/[token]/
 * — Plan 06-05's flow).
 *
 * Per D-16: typed-confirmation gate (CONFIRM=GRANT-ADMIN-<email>) — defends
 * against accidental runs against the wrong DATABASE_URL.
 *
 * Per D-15: at v1.1 launch, run twice — once for Antoine, once for Emmanuel.
 *
 * Per RESEARCH §3 NOTE: users are created via direct Drizzle insert, NOT
 * Better Auth's signUpEmail (which requires a password). The user has no
 * `accounts` row until they redeem the invitation URL via Plan 06-05's redeemToken.
 */

import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import * as schema from '../src/db/schema';
import { generateToken } from '../src/lib/auth/tokens';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — D-09

function parseArgs(argv: string[]): { email: string; displayName?: string } {
  const args = argv.slice(2);
  const email = args[0];
  if (!email || email.startsWith('--')) {
    console.error(
      'Usage: CONFIRM=GRANT-ADMIN-<email> npx tsx scripts/grant-admin.ts <email> [--display-name "Full Name"]',
    );
    process.exit(1);
  }
  let displayName: string | undefined;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--display-name' && args[i + 1]) {
      displayName = args[i + 1];
      i++;
    }
  }
  return { email, displayName };
}

/**
 * Derive a sane display name from the email local-part.
 * Per D-14: capitalize each segment split by . _ -
 * Example: "antoine.rousseau@memento.eco" → "Antoine Rousseau"
 */
function defaultDisplayName(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(' ');
}

function maskUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '(malformed URL)';
  }
}

async function main() {
  const { email: rawEmail, displayName: cliDisplayName } = parseArgs(process.argv);
  const email = rawEmail.toLowerCase();

  // D-16: typed-confirmation gate — defends against accidental runs against the wrong DATABASE_URL
  const expectedConfirm = `GRANT-ADMIN-${email}`;
  if (process.env.CONFIRM !== expectedConfirm) {
    console.error(`[grant-admin] FATAL: typed-confirmation gate not satisfied.`);
    console.error(`[grant-admin] Expected:  CONFIRM=${expectedConfirm}`);
    console.error(`[grant-admin] Received:  CONFIRM=${process.env.CONFIRM ?? '(unset)'}`);
    process.exit(2);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[grant-admin] FATAL: DATABASE_URL is not set');
    process.exit(2);
  }

  console.log(`[grant-admin] Connecting to ${maskUrl(url)} ...`);
  console.log(`[grant-admin] Target email: ${email}`);

  const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';

  // postgres-js client. max=1 (single connection); prepare=false (Neon pooler compat).
  const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

  try {
    const db = drizzle(client, { schema });

    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
      columns: { id: true, role: true, deletedAt: true, displayName: true },
    });

    // Branch 1: user is already an active admin — no-op
    if (existing && existing.role === 'admin' && existing.deletedAt === null) {
      console.log('[grant-admin] No-op: user is already an active admin.');
      console.log(`[grant-admin] User id: ${existing.id}`);
      return;
    }

    // Branch 2: user is an active partner — upgrade to admin
    if (existing && existing.deletedAt === null) {
      await db
        .update(schema.users)
        .set({ role: 'admin' })
        .where(eq(schema.users.id, existing.id));
      console.log('[grant-admin] Upgraded active partner to admin.');
      console.log(`[grant-admin] User id: ${existing.id}`);
      return;
    }

    // Branch 3: user exists but is disabled — re-enable + ensure admin + emit fresh invitation URL
    if (existing && existing.deletedAt !== null) {
      await db
        .update(schema.users)
        .set({
          role: 'admin',
          deletedAt: null,
          ...(cliDisplayName ? { displayName: cliDisplayName } : {}),
        })
        .where(eq(schema.users.id, existing.id));

      // Invalidate any prior unused tokens for this user (D-11: re-issuance invalidates prior tokens)
      await db
        .delete(schema.passwordResets)
        .where(eq(schema.passwordResets.userId, existing.id));

      const { plaintext, hash } = generateToken();
      await db.insert(schema.passwordResets).values({
        userId: existing.id,
        kind: 'invite',
        tokenHash: hash,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      });

      console.log('[grant-admin] Re-enabled disabled user and set role=admin. Invitation URL issued:');
      console.log(`[grant-admin]   ${baseUrl}/invite/${plaintext}`);
      console.log('[grant-admin] (URL valid for 24 hours, single-use. Share via secure channel.)');
      return;
    }

    // Branch 4: user does not exist — create user row + emit invitation URL
    // Better Auth-compatible string id (~21 chars URL-safe base64 from random bytes).
    const userId = randomBytes(16).toString('base64url').slice(0, 21);
    const dn = cliDisplayName ?? defaultDisplayName(email);

    await db.insert(schema.users).values({
      id: userId,
      email,
      name: dn,
      displayName: dn,
      role: 'admin',
      // No accounts row — created by the invitation redemption flow (Plan 06-05).
    });

    const { plaintext, hash } = generateToken();
    await db.insert(schema.passwordResets).values({
      userId,
      kind: 'invite',
      tokenHash: hash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });

    console.log('[grant-admin] Created new admin user.');
    console.log(`[grant-admin] User id: ${userId}`);
    console.log(`[grant-admin] Display name: ${dn}`);
    console.log('[grant-admin] Invitation URL (24-hour validity, single-use):');
    console.log(`[grant-admin]   ${baseUrl}/invite/${plaintext}`);
    console.log(
      '[grant-admin] Share this URL via a secure channel. The admin will set their password upon redemption.',
    );
  } catch (e) {
    console.error('[grant-admin] FAILED:', e);
    process.exit(1);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
