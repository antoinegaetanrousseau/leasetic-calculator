#!/usr/bin/env tsx
/**
 * Manual purge CLI for soft-deleted proposals (DATA-10 + Phase 8 hygiene).
 *
 * What it does:
 *   1. List rows from `proposals` where `deleted_at < now() - 30 days`.
 *   2. For each row: storage().delete(pdf_blob_key), then hardPurgeProposal(id),
 *      then writeAuditLog({actorId: null, action: 'proposal.purge', ...}).
 *   3. Best-effort: log + continue past per-row failures.
 *
 * Why manual in Phase 8: D-D2 ships the data discipline now; the scheduled
 * cron is Phase 10 (CUT-08). Until then, an operator (Antoine) runs this
 * before each prod release to keep blob storage clean.
 *
 * Confirmation gate (Phase 5/6 D-09 typed-confirmation precedent):
 *   - default invocation = dry-run (lists candidates + counts, no writes)
 *   - --confirm PURGE-SOFT-DELETED OR env CONFIRM=PURGE-SOFT-DELETED = apply
 *
 * Required env: DATABASE_URL + STORAGE_DRIVER + (BLOB_READ_WRITE_TOKEN | AWS_*).
 *
 * Usage:
 *   npm run purge:soft-deleted                                   → dry-run
 *   CONFIRM=PURGE-SOFT-DELETED npm run purge:soft-deleted        → apply (env)
 *   npm run purge:soft-deleted -- --confirm PURGE-SOFT-DELETED   → apply (flag)
 *
 * Note: the npm script uses `-r ./scripts/_preload-mock-server-only.cjs` to
 * allow importing from src/lib/db/queries (which carries 'server-only') outside
 * the Next.js server context. The same pattern is used by pdf:update-fixture.
 */
import 'dotenv/config';
import {
  listPurgeCandidates,
  hardPurgeProposal,
  writeAuditLog,
} from '../src/lib/db/queries';
import { storage } from '../src/lib/storage';

function maskUrl(raw: string | undefined): string {
  if (!raw) return '<unset>';
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.username || '?'}@${u.hostname}${u.pathname}`;
  } catch {
    return '<invalid URL>';
  }
}

function getConfirmFlag(): boolean {
  const env = process.env.CONFIRM === 'PURGE-SOFT-DELETED';
  const argIdx = process.argv.indexOf('--confirm');
  const arg = argIdx >= 0 && process.argv[argIdx + 1] === 'PURGE-SOFT-DELETED';
  return env || arg;
}

async function main() {
  const apply = getConfirmFlag();
  const mode = apply ? 'APPLY (writes WILL happen)' : 'DRY-RUN (no writes)';

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Phase 8 — Manual purge of soft-deleted proposals (DATA-10)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode:           ${mode}`);
  console.log(`  DATABASE_URL:   ${maskUrl(process.env.DATABASE_URL)}`);
  console.log(`  STORAGE_DRIVER: ${process.env.STORAGE_DRIVER ?? '<unset>'}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set. Aborting.');
    process.exit(2);
  }
  if (!process.env.STORAGE_DRIVER) {
    console.error('ERROR: STORAGE_DRIVER is not set. Aborting.');
    process.exit(2);
  }

  const candidates = await listPurgeCandidates();
  console.log(`Found ${candidates.length} candidate(s) ready for hard purge (deleted_at < now() - 30d).`);

  if (candidates.length === 0) {
    console.log('Nothing to do. Exit 0.');
    return;
  }

  // Dry-run: print candidates + exit.
  if (!apply) {
    console.log('');
    for (const row of candidates.slice(0, 20)) {
      console.log(
        `  - id=${row.id} lc_ref=${row.lcRef} deleted_at=${row.deletedAt?.toISOString() ?? 'null'} blob=${row.pdfBlobKey ?? '<none>'}`,
      );
    }
    if (candidates.length > 20) {
      console.log(`  ... ${candidates.length - 20} more (truncated at 20)`);
    }
    console.log('');
    console.log('Dry-run complete. To apply, re-run with:');
    console.log('  CONFIRM=PURGE-SOFT-DELETED npm run purge:soft-deleted');
    console.log('  OR: npm run purge:soft-deleted -- --confirm PURGE-SOFT-DELETED');
    return;
  }

  // Apply mode: blob FIRST, then row, then audit log.
  // Order matters: blob delete BEFORE row delete so a crash mid-purge leaves
  // the row + blob in place for retry. If we deleted the row first, a failure
  // between would orphan the blob with no recovery path.
  let ok = 0;
  let failed = 0;

  for (const row of candidates) {
    try {
      // Step 1: delete the blob (idempotent — 404 is a no-op in both Vercel Blob + S3)
      if (row.pdfBlobKey) {
        await storage().delete(row.pdfBlobKey);
      }

      // Step 2: hard-delete the row (WHERE clause re-checks the 30-day window)
      const deleted = await hardPurgeProposal(row.id);
      if (!deleted) {
        // Race condition: row was already purged by a concurrent run, or the
        // 30-day window flipped between listPurgeCandidates and now. Skip gracefully.
        console.log(`  [skip] id=${row.id} (no row affected — possible race condition)`);
        continue;
      }

      // Step 3: write audit log entry (DATA-07 / DATA-10)
      await writeAuditLog({
        actorId: null, // system-initiated (manual CLI counts as system)
        action: 'proposal.purge',
        targetType: 'proposal',
        targetId: row.id,
        payload: {
          lcRef: row.lcRef,
          deletedAt: row.deletedAt?.toISOString() ?? null,
          blobKey: row.pdfBlobKey ?? null,
        },
      });

      console.log(`  [ok]   id=${row.id} lc_ref=${row.lcRef}`);
      ok += 1;
    } catch (err) {
      console.error(
        `  [fail] id=${row.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      failed += 1;
      // best-effort: continue with next row
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Done. ${ok} purged, ${failed} failed.`);
  if (failed > 0) {
    console.log(`  Re-run to retry failed rows (they remain as purge candidates).`);
  }
  console.log('═══════════════════════════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
