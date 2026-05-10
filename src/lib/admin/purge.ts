import 'server-only';
import { listPurgeCandidates, hardPurgeProposal, writeAuditLog } from '@/lib/db/queries';
import { storage } from '@/lib/storage';

/**
 * D-10-07: Shared pure function for the soft-delete purge loop.
 * Both scripts/purge-soft-deleted.ts (CLI) and app/api/internal/purge-soft-deleted (HTTP)
 * call this function — single source of truth for the per-row purge protocol.
 *
 * Order is load-bearing: blob delete BEFORE row delete so a crash mid-purge leaves
 * the row+blob in place for retry (vs. orphan blob). Same discipline as Phase 8 CLI.
 *
 * Best-effort per row: per-row failures are captured in `errors[]`; the loop continues.
 * Caller decides what to do with errors (CLI: print + exit non-zero; HTTP: return 500
 * if all rows failed and 200 if any succeeded — D-10-08).
 */
export async function purgeSoftDeleted(opts?: {
  /** Older-than-N-days predicate. Default 30 (DATA-10 minimum threshold). */
  olderThanDays?: number;
  /** actorId for audit_log entries. Default null (system-initiated — cron or CLI). */
  actorId?: string | null;
}): Promise<{ purged: number; errors: Array<{ id: string; error: string }> }> {
  const actorId = opts?.actorId ?? null;
  // Note: olderThanDays is currently fixed at 30d inside listPurgeCandidates() per
  // DATA-10 invariant. Plumbing it through is a v1.2 follow-up if the cron cadence
  // ever changes — for now opts.olderThanDays is informational.
  void opts?.olderThanDays;

  const candidates = await listPurgeCandidates();
  let purged = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const row of candidates) {
    try {
      // Step 1: blob first (idempotent — 404 is no-op in both Vercel Blob + S3 adapters)
      if (row.pdfBlobKey) {
        await storage().delete(row.pdfBlobKey);
      }
      // Step 2: hard-delete row (WHERE clause re-checks the 30-day window)
      const deleted = await hardPurgeProposal(row.id);
      if (!deleted) {
        // Race condition: another concurrent run already purged this row.
        continue;
      }
      // Count the purge BEFORE the audit write — the row is gone regardless of audit outcome.
      purged += 1;
    } catch (err) {
      errors.push({
        id: row.id,
        error: err instanceof Error ? err.message : String(err),
      });
      // best-effort: continue with next row
      continue;
    }

    // Step 3: audit log entry (DATA-07 / DATA-10) — best-effort, does NOT undo the purge.
    try {
      await writeAuditLog({
        actorId,
        action: 'proposal.purge',
        targetType: 'proposal',
        targetId: row.id,
        payload: {
          lcRef: row.lcRef,
          deletedAt: row.deletedAt?.toISOString() ?? null,
          blobKey: row.pdfBlobKey ?? null,
        },
      });
    } catch (auditErr) {
      console.error(
        `[purgeSoftDeleted] audit log write failed for proposal ${row.id}:`,
        auditErr instanceof Error ? auditErr.message : String(auditErr),
      );
    }
  }

  return { purged, errors };
}
