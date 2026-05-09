/**
 * One-off launch-day admin seeding script.
 *
 * Bypasses the AUTH-08/09 invitation flow on purpose: at v1.1 launch, both
 * admins (Antoine + Emmanuel) need to be able to log in immediately with a
 * shared "for now" password, then rotate to individual strong passwords
 * before the first real partner is onboarded.
 *
 * This script intentionally diverges from `scripts/grant-admin.ts` (which
 * generates an invitation URL and lets the admin set their own password).
 * Use grant-admin for ANY future admin grant; use this script ONLY for the
 * v1.1 launch-day pair.
 *
 * Why direct DB manipulation: Better Auth's `signUpEmail` is disabled in
 * this project (per architecture: admin-invited only, no self-signup). The
 * admin plugin's `createUser` requires an authenticated admin caller, which
 * we don't have at bootstrap. Direct-DB is the only path that:
 *   - doesn't require relaxing the disable-signup architectural lock
 *   - doesn't require an existing admin (chicken-and-egg)
 *   - produces the same row state that Better Auth's internal signup would
 *
 * The argon2id hash uses the same parameters Better Auth's hash function uses
 * (per `src/lib/auth/index.ts`: timeCost: 2, memoryCost: 19456, parallelism: 1,
 * algorithm: argon2id), so the hash is verifiable by Better Auth's verify().
 *
 * Run:
 *   CONFIRM=SEED-LAUNCH-ADMINS DATABASE_URL=$(...) npx tsx scripts/seed-admins-launch.ts
 *
 * Required env:
 *   DATABASE_URL     — production Neon URL (pulled from Vercel env)
 *   CONFIRM          — must equal "SEED-LAUNCH-ADMINS" (typed-confirmation gate)
 *   INITIAL_PASSWORD — the shared "for now" password the admins will use to
 *                      log in for the first time (kept out of source so the
 *                      literal value never lands in git history)
 *
 * Idempotency:
 *   - If user exists with role=admin → skip
 *   - If user exists with role=partner → promote to admin (don't touch password)
 *   - If user does not exist → create user + accounts row
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';

// Hardcoded launch-day admin pair. Per CONTEXT.md decision (Open Q6 resolution
// 2026-05-07: Antoine + Emmanuel at v1.1 launch).
const ADMINS = [
  { email: 'antoine.rousseau@leasetic.com', name: 'Antoine Rousseau' },
  { email: 'emmanuel.rousseau@leasetic.com', name: 'Emmanuel Rousseau' },
] as const;

// Shared "for now" password — passed via env var so the literal value never
// lands in git history. Both admins MUST rotate to individual strong
// passwords before the first partner is onboarded.
//
// At v1.1 launch (2026-05-08), this was set to a year-based shared phrase
// agreed verbally between Antoine and Emmanuel; the rotation to per-admin
// strong passwords is a Phase 9 cutover-prep task.
const INITIAL_PASSWORD = process.env.INITIAL_PASSWORD ?? '';

const REQUIRED_CONFIRM = 'SEED-LAUNCH-ADMINS';

// Same nanoid-equivalent ID generator used by `scripts/grant-admin.ts`.
function generateUserId(): string {
  return randomBytes(16).toString('base64url').slice(0, 21);
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return '<invalid>';
  }
}

async function main(): Promise<void> {
  // Gate 1: typed confirmation
  if (process.env.CONFIRM !== REQUIRED_CONFIRM) {
    console.error('[seed-admins] FATAL: typed-confirmation gate not satisfied.');
    console.error(`[seed-admins] Expected: CONFIRM=${REQUIRED_CONFIRM}`);
    console.error(`[seed-admins] Got:      CONFIRM=${process.env.CONFIRM ?? '(unset)'}`);
    process.exit(2);
  }

  // Gate 2: required env
  if (!process.env.DATABASE_URL) {
    console.error('[seed-admins] FATAL: DATABASE_URL is not set.');
    process.exit(2);
  }
  if (!INITIAL_PASSWORD) {
    console.error('[seed-admins] FATAL: INITIAL_PASSWORD env var must be set (the shared "for now" password).');
    process.exit(2);
  }

  console.log(`[seed-admins] Connected to: ${maskUrl(process.env.DATABASE_URL)}`);
  console.log(`[seed-admins] Seeding ${ADMINS.length} admins (idempotent).`);
  console.log();

  // Lazy imports so env-var validation runs before db init.
  const { db } = await import('../src/lib/db/index');
  const { users, accounts } = await import('../src/db/schema');
  const { hash } = await import('@node-rs/argon2');

  // Hash the password ONCE — same parameters as Better Auth's hasher
  // (src/lib/auth/index.ts: timeCost:2, memoryCost:19456, parallelism:1).
  // algorithm: 2 = argon2id per @node-rs/argon2 Algorithm enum (literal int
  // used to avoid isolatedModules const-enum access restriction).
  const passwordHash = await hash(INITIAL_PASSWORD, {
    algorithm: 2,
    timeCost: 2,
    memoryCost: 19456,
    parallelism: 1,
  });
  console.log(`[seed-admins] Hashed shared password (argon2id, ${passwordHash.length} chars).`);
  console.log();

  for (const { email, name } of ADMINS) {
    const lcEmail = email.trim().toLowerCase();
    console.log(`[seed-admins] Processing: ${lcEmail} (${name})`);

    // Idempotency check
    const existing = await db().select().from(users).where(eq(users.email, lcEmail)).limit(1);

    if (existing.length > 0) {
      const u = existing[0]!;
      if (u.role === 'admin') {
        console.log(`[seed-admins]   ✓ already exists with role=admin (skip — password unchanged)`);
      } else {
        await db().update(users).set({ role: 'admin', updatedAt: new Date() }).where(eq(users.id, u.id));
        console.log(`[seed-admins]   ↑ existed with role=${u.role}, promoted to admin (password unchanged)`);
      }
      continue;
    }

    // User does not exist — create user row + accounts row
    const userId = generateUserId();
    const accountId = generateUserId(); // separate id for the accounts row

    await db().insert(users).values({
      id: userId,
      email: lcEmail,
      name,
      displayName: name,
      role: 'admin',
      language: 'fr',
      theme: 'system',
      emailVerified: 1, // launch-day admins are pre-verified by definition
      sessionVersion: 1,
    });

    await db().insert(accounts).values({
      id: accountId,
      userId,
      providerId: 'credential', // Better Auth's email+password provider id
      accountId: lcEmail,        // Better Auth uses email as accountId for credential provider
      password: passwordHash,
    });

    console.log(`[seed-admins]   + created user ${userId}`);
    console.log(`[seed-admins]   + created accounts row (provider=credential, password set)`);
  }

  console.log();
  console.log('[seed-admins] Done. Both admins can now log in at /login with their email + the shared password.');
  console.log('[seed-admins] REMINDER: rotate to individual strong passwords before onboarding the first partner.');
}

main().catch((err) => {
  console.error('[seed-admins] FATAL:', err);
  process.exit(1);
});
