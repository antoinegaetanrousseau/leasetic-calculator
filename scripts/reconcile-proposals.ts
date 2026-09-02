import './_load-env';

/**
 * Phase 31 Plan 07 — the reconciliation CLI entry point (D-13), the offline
 * bulk-write operator tool that runs the dedup/match engine over the
 * `proposals` table and, in apply mode, writes companies/relationships/
 * contacts/proposal-links/pending-pairs into the registry.
 *
 * Invoked by two npm scripts:
 *   npm run db:reconcile:dry-run   — plans and writes the two-form report,
 *                                     zero rows written (criterion 1)
 *   npm run db:reconcile           — reads the last dry-run report, diffs
 *                                     against a fresh plan (D-15), and applies
 *
 * Flags:
 *   --dry-run       run in dry-run mode (default: apply mode)
 *   --allow-drift   in apply mode, proceed even when the fresh plan differs
 *                    from the stored dry-run report instead of aborting
 *
 * This script never applies a database migration and never invokes the
 * schema-sync command this repo forbids outside optional local dev
 * experimentation (see docs/operations/neon-branch-routing.md, locked rule
 * 3). Migrations reach real branches only through
 * .github/workflows/db-migrate.yml.
 *
 * Exit codes:
 *   0  success (dry-run report written, or apply completed)
 *   1  crash (uncaught error)
 *   2  environment refusal (DATABASE_URL missing/malformed, unconfirmed
 *      production apply)
 *   3  guard refusal (apply mode aborted: no report / fingerprint mismatch /
 *      source mismatch / unaccepted drift)
 */
import { createHash } from 'node:crypto';

const REQUIRED_CONFIRM_VALUE = 'YES';

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const allowDrift = process.argv.includes('--allow-drift');
  const mode: 'dry-run' | 'apply' = dryRun ? 'dry-run' : 'apply';

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[reconcile] FATAL: DATABASE_URL is not set');
    process.exit(2);
  }

  // bug_011: use URL.hostname (the bare DNS name), never the port-inclusive
  // URL property — see scripts/backfill-coefficient-history.ts for the
  // documented bug fix this check mirrors.
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    console.error('[reconcile] FATAL: DATABASE_URL is malformed');
    process.exit(2);
  }
  const hostname = url.hostname;
  const isNeonProd = hostname.endsWith('.neon.tech');

  if (isNeonProd && mode === 'apply') {
    if (process.env.RECONCILE_CONFIRM !== REQUIRED_CONFIRM_VALUE) {
      console.error(
        `[reconcile] FATAL: Production Neon DB detected (${hostname}). ` +
          `Re-run with RECONCILE_CONFIRM=YES to confirm.`,
      );
      process.exit(2);
    }
    console.log(`[reconcile] Production Neon (${hostname}) — RECONCILE_CONFIRM satisfied.`);
  } else if (isNeonProd) {
    console.log(`[reconcile] Production Neon (${hostname}) — dry run, no confirmation required (writes nothing).`);
  } else {
    console.log(`[reconcile] Non-prod DB (${hostname}).`);
  }

  // Only hostname + database name are hashed, and only hostname is ever
  // logged — the full connection string (credentials included) is never
  // hashed and never written to the report.
  const databaseName = url.pathname.replace(/^\//, '');
  const databaseFingerprint = createHash('sha256').update(`${hostname}/${databaseName}`).digest('hex');

  // Lazy imports — env validation and the production gate run first.
  const { db } = await import('../src/lib/db/index');
  const { runReconciliation, proposalsSource } = await import('../src/lib/reconcile');

  const result = await runReconciliation({
    dbi: db(),
    source: proposalsSource,
    mode,
    rootDir: process.cwd(),
    databaseFingerprint,
    now: new Date(),
    allowDrift,
    log: (line) => console.log(line),
  });

  if (result.mode === 'dry-run') {
    console.log('[reconcile] Dry-run report paths:');
    console.log(`  ${result.reportPaths.latestMdPath}`);
    console.log(`  ${result.reportPaths.latestJsonPath}`);
    console.log(`  ${result.reportPaths.archivedMdPath}`);
    console.log(`  ${result.reportPaths.archivedJsonPath}`);
    console.log('[reconcile] Counts:', JSON.stringify(result.counts));
    process.exit(0);
  }

  if (result.aborted) {
    console.error(`[reconcile] Refused to apply: ${result.reason}`);
    if (result.reason === 'drift' && result.changes) {
      for (const change of result.changes) {
        const prefix = change.direction === 'added' ? '+' : change.direction === 'removed' ? '-' : '~';
        console.error(`  ${prefix} [${change.kind}] ${change.key} - ${change.detail}`);
      }
    }
    process.exit(3);
  }

  console.log('[reconcile] Applied:', JSON.stringify(result.applied));
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('[reconcile] FATAL:', err);
  process.exit(1);
});
