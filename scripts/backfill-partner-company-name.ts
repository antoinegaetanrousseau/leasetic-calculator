/**
 * One-shot, idempotent backfill — sets `users.company_name` for partner rows
 * that were seeded before migration 0005 added the column.
 *
 * Motivation:
 *   Migration 0005_partner_company_name adds `users.company_name` (nullable text).
 *   Partners created before this migration — or via `seed-partner-launch.ts` before
 *   the `--company` flag was added — have company_name = NULL, which blocks the
 *   proposal wizard at step 2 (proposalInputSchema requires partnerCo.min(1)).
 *
 * Run:
 *   # Dry run (reads only — prints what would change):
 *   DATABASE_URL=postgres://... npx tsx scripts/backfill-partner-company-name.ts
 *
 *   # Live run (writes to DB):
 *   DATABASE_URL=postgres://... BACKFILL_CONFIRM=YES npx tsx scripts/backfill-partner-company-name.ts
 *
 *   # Production Neon — pull env first:
 *   vercel env pull --environment=production .env.production.local
 *   DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d= -f2-) \
 *     BACKFILL_CONFIRM=YES npx tsx scripts/backfill-partner-company-name.ts
 *
 * Per-row logic:
 *   - Uses COMPANY_<UPPER_EMAIL_LOCAL> env vars for known partners.
 *     Example: COMPANY_DELPHINE_SPECHT=Specht Conseil SAS
 *   - Falls back to `deriveCompanyName(email)` — same derivation as seed script
 *     (capitalized local-part + " SAS"). Prints a WARNING for any fallback row
 *     so the operator can override via env before the live run.
 *
 * Idempotency:
 *   - Skips rows where company_name is already set (non-null, non-empty).
 *   - Safe to re-run; already-backfilled rows are untouched.
 */
import 'dotenv/config';
import { isNull, or, eq } from 'drizzle-orm';

const DRY_RUN = process.env.BACKFILL_CONFIRM !== 'YES';

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return '<invalid>';
  }
}

/**
 * Derive a fallback company name from an email address.
 * delphine.specht@test.leasetic.com → "Delphine Specht SAS"
 */
function deriveCompanyName(email: string): string {
  const local = email.split('@')[0] ?? email;
  const pretty = local
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((s) => s[0]!.toUpperCase() + s.slice(1).toLowerCase())
    .join(' ');
  return `${pretty} SAS`;
}

/**
 * Look up a per-partner company name override from env vars.
 * Env key format: COMPANY_<LOCAL_PART_UPPERCASED_DOTS_TO_UNDERSCORES>
 * Example: delphine.specht@... → COMPANY_DELPHINE_SPECHT
 */
function resolveCompanyName(email: string): { value: string; source: 'env' | 'derived' } {
  const local = (email.split('@')[0] ?? email).toUpperCase().replace(/[.\-]/g, '_');
  const envKey = `COMPANY_${local}`;
  const fromEnv = process.env[envKey];
  if (fromEnv && fromEnv.trim().length > 0) {
    return { value: fromEnv.trim(), source: 'env' };
  }
  return { value: deriveCompanyName(email), source: 'derived' };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('[backfill-company-name] FATAL: DATABASE_URL is not set.');
    process.exit(2);
  }

  console.log(`[backfill-company-name] Target DB: ${maskUrl(process.env.DATABASE_URL)}`);
  console.log(`[backfill-company-name] Mode:      ${DRY_RUN ? 'DRY RUN (set BACKFILL_CONFIRM=YES to write)' : 'LIVE — will write to DB'}`);
  console.log();

  const { db } = await import('../src/lib/db/index');
  const { users } = await import('../src/db/schema');

  // Find all partner rows where company_name is null or empty string.
  const targets = await db()
    .select({ id: users.id, email: users.email, displayName: users.displayName })
    .from(users)
    .where(
      or(
        isNull(users.companyName),
        eq(users.companyName, ''),
      ),
    );

  if (targets.length === 0) {
    console.log('[backfill-company-name] Nothing to do — all users already have company_name set.');
    return;
  }

  console.log(`[backfill-company-name] Found ${targets.length} row(s) with null/empty company_name:\n`);

  let warnings = 0;

  for (const u of targets) {
    const { value: companyName, source } = resolveCompanyName(u.email);
    const tag = source === 'env' ? '  [env]' : '[derived] ⚠';
    if (source === 'derived') warnings++;

    console.log(`  ${tag}  ${u.email}`);
    console.log(`           display_name: ${u.displayName ?? '(null)'}`);
    console.log(`           company_name → ${companyName}`);
    console.log();

    if (!DRY_RUN) {
      await db()
        .update(users)
        .set({ companyName })
        .where(eq(users.id, u.id));
    }
  }

  if (warnings > 0) {
    console.log(`⚠  ${warnings} row(s) used the derived fallback (email local-part + " SAS").`);
    console.log(`   To override before the live run, set env vars e.g.:`);
    for (const u of targets) {
      const local = (u.email.split('@')[0] ?? u.email).toUpperCase().replace(/[.\-]/g, '_');
      console.log(`     COMPANY_${local}="Société SAS"`);
    }
    console.log();
  }

  if (DRY_RUN) {
    console.log('[backfill-company-name] Dry run complete — no rows written. Re-run with BACKFILL_CONFIRM=YES to apply.');
  } else {
    console.log(`[backfill-company-name] Done — ${targets.length} row(s) updated.`);
  }
}

main().catch((err) => {
  console.error('[backfill-company-name] FATAL:', err);
  process.exit(1);
});
