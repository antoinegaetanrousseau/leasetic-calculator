/**
 * Phase 44 Plan 02 — mode-aware per-row render/upload/persist/mark worker
 * (D-01, D-04, D-06, D-10).
 *
 * Pure module: no database module, no storage module, no PDF-renderer
 * module is imported at runtime. Everything this module touches arrives through the injected
 * `BackfillDeps` bag (src/lib/backfill/types.ts) — that is what makes the
 * whole render/upload/persist/mark path unit-testable with no live
 * database, no live blob store and no live PDF renderer.
 *
 * `renderRow` never throws: every failure path returns a bounded `failed`
 * `RowOutcome` so the per-row loop (plan 04) can log a reason and continue
 * (D-10) instead of aborting the entire run over one row.
 */
import { buildBackfillPdfData } from './pdf-data';
import type { AdvisorIdentity, BackfillCandidate, BackfillDeps, BackfillMode, RowOutcome } from './types';

/**
 * Reduce a caught error to a short, credential-safe string. Every `detail`
 * produced from a caught error passes through here before it reaches a
 * `RowOutcome` — a storage or database error message can carry a store URL
 * or a connection string, and every `detail` ends up in a report that is
 * uploaded as a GitHub artifact and pasted into transcripts (the same
 * disclosure rule `scripts/_db-branch-guard.ts` documents).
 */
export function redactDetail(input: unknown): string {
  const message = input instanceof Error ? input.message : String(input);
  const redacted = message.replace(/[a-z][a-z0-9+.\-]*:\/\/\S+/gi, '[redacted-url]');
  return redacted.slice(0, 200);
}

/**
 * Render one stored, in-scope proposal row, and — in apply mode only —
 * upload it, persist its PDF columns, and write the MIG-05 idempotence
 * marker. Dry-run mode stops immediately after the render step: nothing is
 * uploaded, nothing is persisted, nothing is marked (MIG-01).
 */
export async function renderRow(args: {
  row: BackfillCandidate;
  advisor: AdvisorIdentity | null;
  mode: BackfillMode;
  deps: BackfillDeps;
}): Promise<RowOutcome> {
  const { row, advisor, mode, deps } = args;

  // Step 1 — build the document props. On failure, nothing is rendered and
  // nothing is written; the failure form already carries a bounded reason.
  const built = buildBackfillPdfData({ row, advisor });
  if (!built.ok) {
    return {
      status: 'failed',
      proposalId: row.id,
      lcRef: row.lcRef,
      reason: built.reason,
      detail: built.detail,
    };
  }

  // Step 2 — render. `contentHash` is deliberately ignored: it is never
  // persisted anywhere, only `sha256` and `sizeBytes` are used downstream.
  let sha256: string;
  let sizeBytes: number;
  let buffer: Buffer;
  try {
    const rendered = await deps.renderPdf(built.data);
    buffer = rendered.buffer;
    sha256 = rendered.sha256;
    sizeBytes = rendered.sizeBytes;
  } catch (err) {
    return {
      status: 'failed',
      proposalId: row.id,
      lcRef: row.lcRef,
      reason: 'render-failed',
      detail: redactDetail(err),
    };
  }

  // Step 3 — MIG-01's "without a single blob being written". Steps 4-6 are
  // unreachable in dry-run mode; this early return is what makes that true.
  if (mode === 'dry-run') {
    return {
      status: 'rendered',
      proposalId: row.id,
      lcRef: row.lcRef,
      language: row.language,
      sizeBytes,
    };
  }

  // Step 4 — upload. The blob key is a pure function of (userId,
  // proposalId) — the identical expression used at the finalize call site
  // (src/lib/api/proposals/finalize-wizard.ts:252). Because the storage
  // driver passes `addRandomSuffix: false`, this `putBlob` call is an
  // in-place OVERWRITE of the delivered document (D-01): there is no
  // versioning in the store and no sidecar copy is taken. The dry-run
  // report and the workflow's approval gate are the only safety net once
  // apply runs.
  //
  // D-04: deliberately NO existence probe first, and no branch on whether
  // the object already exists — a row whose blob is missing from storage is
  // processed exactly like any other row and is repaired as a side effect.
  // No orphan category, no separate counter, no distinct reporting.
  const key = `proposals/${row.userId}/${row.id}.pdf`;
  try {
    await deps.putBlob(key, buffer);
  } catch (err) {
    return {
      status: 'failed',
      proposalId: row.id,
      lcRef: row.lcRef,
      reason: 'upload-failed',
      detail: redactDetail(err),
    };
  }

  // Step 5 — persist the four PDF columns. Writing a fresh sha256/size/
  // generated-at is correct and required (DATA-09 — the columns describe
  // the blob that now exists); it is NOT and must never become the skip
  // signal, because the raw hash varies per render
  // (src/lib/pdf/render.ts:19). Passing the blob key also repairs a row
  // whose key was null.
  try {
    await deps.persistPdfArtifact({
      proposalId: row.id,
      pdfBlobKey: key,
      pdfSha256: sha256,
      pdfSizeBytes: sizeBytes,
      pdfGeneratedAt: deps.now(),
    });
  } catch (err) {
    return {
      status: 'failed',
      proposalId: row.id,
      lcRef: row.lcRef,
      reason: 'persist-failed',
      detail: redactDetail(err),
    };
  }

  // Step 6 — write the marker LAST. Ordering is load-bearing: the marker is
  // the MIG-05 idempotence signal, so it must only ever exist for a row
  // whose blob and columns are already written. A crash between the persist
  // call above and this call leaves the row unmarked and therefore a
  // candidate again on the next run — a harmless second overwrite with the
  // same inputs, which is exactly the resumability MIG-05 asks for. A throw
  // here is reported the same way (persist-failed): the blob and the
  // columns are already correct, so the row will simply be re-processed,
  // never left corrupt.
  try {
    await deps.writeMarker({ proposalId: row.id, language: row.language, pdfSizeBytes: sizeBytes });
  } catch (err) {
    return {
      status: 'failed',
      proposalId: row.id,
      lcRef: row.lcRef,
      reason: 'persist-failed',
      detail: redactDetail(err),
    };
  }

  return {
    status: 'migrated',
    proposalId: row.id,
    lcRef: row.lcRef,
    language: row.language,
    sizeBytes,
  };
}
