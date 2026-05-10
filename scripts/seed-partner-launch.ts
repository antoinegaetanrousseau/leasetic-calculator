/**
 * Testing-only partner seeding script.
 *
 * Bypasses the AUTH-08/09 invitation flow on purpose: certain Phase 8+
 * test cycles need a partner that can log in immediately with a known
 * password (so the test plan can exercise the create-proposal flow without
 * the human-in-the-loop /invite/<token> redemption step).
 *
 * Production partners MUST come through the invitation flow
 * (`src/lib/auth/actions.ts createInvitation` → /invite/<token> redemption).
 * Use this script ONLY for internal test accounts under the
 * `@test.leasetic.com` domain (D-10-09 / D-10-10 — domain reservation).
 * Example: delphine.specht@test.leasetic.com.
 *
 * The argon2id hash uses the same parameters Better Auth's hash function uses
 * (per `src/lib/auth/index.ts`: timeCost: 2, memoryCost: 19456, parallelism: 1,
 * algorithm: argon2id), so the resulting hash is verifiable by Better Auth's
 * `verify()` and the seeded user can log in via /login with email + password.
 *
 * Run:
 *   CONFIRM=SEED-PARTNER-<email> \
 *   INITIAL_PASSWORD=<password> \
 *   DATABASE_URL=<...> \
 *     npx tsx scripts/seed-partner-launch.ts <email> [--display-name "Full Name"]
 *
 * Required env:
 *   DATABASE_URL     — Neon URL (pull via `vercel env pull --environment=production`)
 *   CONFIRM          — must equal "SEED-PARTNER-<email>" (typed-confirmation gate;
 *                      includes the email so a typo'd CLI arg fails the gate)
 *   INITIAL_PASSWORD — the literal password the partner will use to log in.
 *                      Kept out of source so the value never lands in git history.
 *
 * Idempotency:
 *   - User exists AND role='partner' AND deletedAt IS NULL → skip (password unchanged)
 *   - User exists AND role='admin'                          → REFUSE (do not downgrade an admin)
 *   - User exists AND deletedAt IS NOT NULL                 → REFUSE (re-enable via grant-admin/admin UI first)
 *   - User does not exist                                   → create users + accounts row
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';

const REQUIRED_CONFIRM_PREFIX = 'SEED-PARTNER-';

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

function deriveDisplayName(email: string): string {
  // delphine.specht@leasetic.com → "Delphine Specht"
  const local = email.split('@')[0] ?? email;
  return local
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((s) => s[0]!.toUpperCase() + s.slice(1).toLowerCase())
    .join(' ');
}

function parseArgs(argv: string[]): { email: string; displayName?: string } {
  const args = argv.slice(2);
  const email = args[0];
  if (!email || email.startsWith('--')) {
    console.error(
      'Usage: CONFIRM=SEED-PARTNER-<email> INITIAL_PASSWORD=... DATABASE_URL=... npx tsx scripts/seed-partner-launch.ts <email> [--display-name "Full Name"]',
    );
    process.exit(2);
  }
  let displayName: string | undefined;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--display-name' && args[i + 1]) {
      displayName = args[i + 1];
      i += 1;
    }
  }
  return { email, displayName };
}

async function main(): Promise<void> {
  const { email: rawEmail, displayName: nameArg } = parseArgs(process.argv);
  const email = rawEmail.trim().toLowerCase();

  // Gate 0: D-10-10 — seed-partner-launch.ts is for TEST partners ONLY.
  // The @test.leasetic.com domain is reserved for test accounts (D-10-09);
  // production partners come through the /invite/<token> invitation flow
  // (src/lib/auth/actions.ts createInvitation) — never via this script.
  // This guard runs BEFORE the typed-confirmation gate so a wrong-domain
  // invocation fails-fast without the operator needing to figure out the
  // CONFIRM token first.
  const TEST_EMAIL_RE = /^.+@test\.leasetic\.com$/;
  if (!TEST_EMAIL_RE.test(email)) {
    console.error('[seed-partner] REFUSE: email does not match @test.leasetic.com pattern.');
    console.error('[seed-partner] Production partners must come through the /invite/<token> flow.');
    console.error(`[seed-partner] Got: ${email}`);
    process.exit(2);
  }

  const expectedConfirm = `${REQUIRED_CONFIRM_PREFIX}${email}`;

  // Gate 1: typed confirmation (email-scoped — typo'd CLI arg fails the gate)
  if (process.env.CONFIRM !== expectedConfirm) {
    console.error('[seed-partner] FATAL: typed-confirmation gate not satisfied.');
    console.error(`[seed-partner] Expected: CONFIRM=${expectedConfirm}`);
    console.error(`[seed-partner] Got:      CONFIRM=${process.env.CONFIRM ?? '(unset)'}`);
    process.exit(2);
  }

  // Gate 2: required env
  if (!process.env.DATABASE_URL) {
    console.error('[seed-partner] FATAL: DATABASE_URL is not set.');
    process.exit(2);
  }
  const initialPassword = process.env.INITIAL_PASSWORD ?? '';
  if (!initialPassword) {
    console.error('[seed-partner] FATAL: INITIAL_PASSWORD env var must be set.');
    process.exit(2);
  }

  const displayName = nameArg ?? deriveDisplayName(email);

  console.log(`[seed-partner] Connected to: ${maskUrl(process.env.DATABASE_URL)}`);
  console.log(`[seed-partner] Email:        ${email}`);
  console.log(`[seed-partner] Display name: ${displayName}`);
  console.log();

  // Lazy imports so env-var validation runs before db init.
  const { db } = await import('../src/lib/db/index');
  const { users, accounts } = await import('../src/db/schema');
  const { hash } = await import('@node-rs/argon2');

  // Same parameters as Better Auth's hasher (src/lib/auth/index.ts).
  // algorithm: 2 = argon2id per @node-rs/argon2 Algorithm enum.
  const passwordHash = await hash(initialPassword, {
    algorithm: 2,
    timeCost: 2,
    memoryCost: 19456,
    parallelism: 1,
  });
  console.log(`[seed-partner] Hashed password (argon2id, ${passwordHash.length} chars).`);
  console.log();

  // Idempotency check
  const existing = await db().select().from(users).where(eq(users.email, email)).limit(1);

  if (existing.length > 0) {
    const u = existing[0]!;
    if (u.deletedAt) {
      console.error(`[seed-partner] REFUSE: user exists but is disabled (deletedAt set). Re-enable via admin UI / grant-admin first.`);
      process.exit(3);
    }
    if (u.role === 'admin') {
      console.error(`[seed-partner] REFUSE: user exists with role=admin. Will not downgrade an admin to partner.`);
      process.exit(3);
    }
    if (u.role === 'partner') {
      console.log(`[seed-partner]   ✓ already exists with role=partner — skip (password unchanged).`);
      console.log(`[seed-partner] Done.`);
      return;
    }
    console.error(`[seed-partner] REFUSE: user exists with unexpected role=${u.role}.`);
    process.exit(3);
  }

  // User does not exist — create users row + accounts row
  const userId = generateUserId();
  const accountId = generateUserId();

  await db().insert(users).values({
    id: userId,
    email,
    name: displayName,
    displayName,
    role: 'partner',
    language: 'fr',
    theme: 'system',
    emailVerified: 1, // testing seed: pre-verified so login works immediately
    sessionVersion: 1,
  });

  await db().insert(accounts).values({
    id: accountId,
    userId,
    providerId: 'credential', // Better Auth's email+password provider id
    accountId: email,          // Better Auth uses email as accountId for credential provider
    password: passwordHash,
  });

  console.log(`[seed-partner]   + created user ${userId} (role=partner)`);
  console.log(`[seed-partner]   + created accounts row (provider=credential, password set)`);
  console.log();
  console.log(`[seed-partner] Done. ${email} can now log in at /login with the literal password you supplied.`);
  console.log(`[seed-partner] REMINDER: production partners must come via the /invite/<token> flow — this script is testing-only.`);
}

main().catch((err) => {
  console.error('[seed-partner] FATAL:', err);
  process.exit(1);
});
