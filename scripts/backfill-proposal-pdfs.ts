#!/usr/bin/env tsx
import './_load-env';

/**
 * Phase 44 — the proposal-PDF backfill CLI entry point (MIG-01..05), a thin,
 * guard-arming shell over `@/lib/backfill`. It re-renders every stored
 * proposal PDF into the Phase 43 design and overwrites the stored blob in
 * place — the milestone's one irreversible step.
 *
 * Invoked by two npm scripts:
 *   npm run db:backfill:proposal-pdfs:dry-run   — plans + writes the two-form
 *                                                   report, zero blobs/rows written
 *   npm run db:backfill:proposal-pdfs           — reads the last dry-run
 *                                                   report, diffs against a
 *                                                   fresh plan (D-09), and applies
 *
 * Flags:
 *   --dry-run       run in dry-run mode (default: apply mode)
 *   --allow-drift   in apply mode, proceed even when the fresh plan differs
 *                    from the approved dry-run report instead of aborting
 *
 * This script applies no database migration and never invokes the
 * schema-sync command this repo forbids outside optional local dev
 * experimentation (see docs/operations/neon-branch-routing.md, locked rule
 * 3). Migrations reach real branches only through
 * .github/workflows/db-migrate.yml — this phase creates none.
 *
 * Apply is expected to run only from
 * .github/workflows/backfill-proposal-pdfs.yml (D-07): `import './_load-env'`
 * above arms the local-database guard at module scope, which classifies Neon
 * `main` as `refuse-production` and exits before any other statement runs,
 * so a developer machine holding a `.env*` candidate file cannot reach apply
 * mode at all. No bypass env var exists for this script and none is added.
 *
 * Exit codes:
 *   0  success (dry-run report written, or apply completed with zero failures)
 *   1  crash (uncaught error)
 *   2  environment refusal (DATABASE_URL missing/malformed, required storage
 *      env var missing in apply mode)
 *   3  guard refusal (apply mode aborted: no report / fingerprint mismatch /
 *      unaccepted drift)
 *   4  partial failure — the run completed but at least one row failed to
 *      render, upload or persist. This EXTENDS reconcile's 0/1/2/3
 *      vocabulary rather than overloading `1`: a partial failure is neither
 *      a crash nor a refusal, and giving it its own code turns the Action
 *      run red so a partial success cannot pass unnoticed (D-10).
 */
import { createHash } from 'node:crypto';
import { resolveNeonTarget } from './_neon-target';

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const allowDrift = process.argv.includes('--allow-drift');
  const mode: 'dry-run' | 'apply' = dryRun ? 'dry-run' : 'apply';

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Phase 44 — Proposal PDF backfill migration (MIG-01..05)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${mode}`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[backfill-pdfs] FATAL: DATABASE_URL is not set');
    process.exit(2);
  }

  // bug_011: use URL.hostname (the bare DNS name), never the port-inclusive
  // URL property.
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    console.error('[backfill-pdfs] FATAL: DATABASE_URL is malformed');
    process.exit(2);
  }
  const hostname = url.hostname;
  const databaseName = url.pathname.replace(/^\//, '');
  // Only hostname + database name are hashed, and only hostname is ever
  // logged — the full connection string (credentials included) is never
  // hashed and never written to any log line or report.
  const databaseFingerprint = createHash('sha256').update(`${hostname}/${databaseName}`).digest('hex');

  const target = resolveNeonTarget(hostname);
  const emphasis = mode === 'apply' && target.isProductionSeverity ? ' *** PRODUCTION WRITE ***' : '';
  console.log(`[backfill-pdfs] Target: ${target.label} (${hostname}).${emphasis}`);

  // Storage-environment validation runs in APPLY MODE ONLY. Dry-run renders
  // every candidate but writes zero blobs, so it needs no storage
  // credentials at all — keeping job 1's secret surface free of blob
  // credentials is a deliberate choice (T-44-27), not an oversight. Do not
  // "simplify" this check to run in both modes; that would hand blob
  // credentials to a job that never touches the blob store.
  if (mode === 'apply') {
    const missing: string[] = [];
    const storageDriver = process.env.STORAGE_DRIVER;
    if (!storageDriver) {
      missing.push('STORAGE_DRIVER');
    } else if (storageDriver === 'vercel') {
      if (!process.env.BLOB_READ_WRITE_TOKEN) missing.push('BLOB_READ_WRITE_TOKEN');
    } else if (storageDriver === 's3') {
      for (const name of ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
        if (!process.env[name]) missing.push(name);
      }
    }
    if (missing.length > 0) {
      console.error(`[backfill-pdfs] FATAL: missing required env var(s): ${missing.join(', ')}`);
      process.exit(2);
    }
  }

  // Lazy imports — env validation runs first, matching reconcile's
  // lazy-import discipline. `formatBackfillDrift` is a pure, database-free
  // formatter (no db/storage/pdf import) not re-exported by the barrel —
  // read directly from its own module, same as reconcile's CLI formats its
  // own drift output inline rather than through a shared barrel export.
  const { runBackfill, createLiveBackfillDeps } = await import('../src/lib/backfill');
  const { formatBackfillDrift } = await import('../src/lib/backfill/drift');

  const result = await runBackfill({
    deps: createLiveBackfillDeps({ log: (line) => console.log(line) }),
    mode,
    rootDir: process.cwd(),
    databaseFingerprint,
    allowDrift,
  });

  if (result.mode === 'dry-run') {
    console.log('[backfill-pdfs] Dry-run report paths:');
    console.log(`  ${result.reportPaths.latestMdPath}`);
    console.log(`  ${result.reportPaths.latestJsonPath}`);
    console.log(`  ${result.reportPaths.archivedMdPath}`);
    console.log(`  ${result.reportPaths.archivedJsonPath}`);
    console.log('[backfill-pdfs] Counts:', JSON.stringify(result.counts));
    // Exit 0 even when some rows would fail to render: MIG-01 wants those
    // failures surfaced IN THE REPORT for the operator to read, not turned
    // into a red CI run here — job 1 must succeed so the artifact uploads
    // and the approval gate is reached at all.
    process.exit(0);
  }

  if (result.aborted) {
    console.error(`[backfill-pdfs] Refused to apply: ${result.reason}`);
    if (result.reason === 'drift' && result.drift) {
      console.error(formatBackfillDrift(result.drift));
    }
    process.exit(3);
  }

  console.log('[backfill-pdfs] Counts:', JSON.stringify(result.counts));
  for (const failure of result.failures) {
    if (failure.status === 'failed') {
      console.error(`  [fail] id=${failure.proposalId}: ${failure.reason}`);
    }
  }
  console.log(`[backfill-pdfs] Done. ${result.counts.rendered} rendered, ${result.failures.length} failed.`);
  if (result.failures.length > 0) {
    console.log('[backfill-pdfs] Re-run to retry failed rows (they remain unmarked in audit_log).');
    process.exit(4);
  }
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('[backfill-pdfs] FATAL:', err);
  process.exit(1);
});
