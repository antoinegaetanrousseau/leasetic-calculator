import 'server-only';
import { renderProposalPdf } from '@/lib/pdf';
import { storage } from '@/lib/storage';
import {
  finalizePdfBlobOnProposal,
  getAdvisor,
  listBackfillCandidates,
  listBackfilledProposalIds,
  writeAuditLog,
} from '@/lib/db/queries';
import type { BackfillDeps } from './types';

/**
 * Phase 44 Plan 04 — production wiring of `BackfillDeps` (D-06, D-11).
 *
 * This is the ONLY file in `src/lib/backfill/` that touches the real
 * database, the real blob store and the real PDF renderer. Isolating every
 * impure call behind this one module is what keeps `run.ts`, `render-row.ts`,
 * `pdf-data.ts`, `report.ts` and `drift.ts` testable with no runtime-guard
 * shim: none of those five files imports a database module, a storage
 * module or a PDF-renderer module.
 *
 * `createLiveBackfillDeps` reproduces exactly steps 3.5 through 5 of the
 * finalize pipeline (`src/lib/api/proposals/finalize-wizard.ts`) — the live
 * advisor read, the render call, and the upload — and nothing before or
 * after: no idempotency-key allocation, no lc-ref allocation, and no call
 * to the row-finalizing write function that turns a draft into an active
 * proposal. Those steps are finalize-only and this module must never
 * reproduce them.
 */
export function createLiveBackfillDeps(opts: { log: (line: string) => void }): BackfillDeps {
  return {
    listCandidates: async () => {
      const rows = await listBackfillCandidates();
      return rows;
    },

    listMigratedIds: async () => listBackfilledProposalIds(),

    getAdvisor: async () => {
      const row = await getAdvisor();
      if (!row) return null;
      // Exactly the four content columns `ProposalDocumentProps['data']['advisor']`
      // accepts. The row's actor id and updated-at must never reach this
      // module's caller (Phase 43 D-13).
      return { name: row.name, fonction: row.fonction, telephone: row.telephone, email: row.email };
    },

    renderPdf: async (data) => {
      const { buffer, sha256, sizeBytes } = await renderProposalPdf({ data });
      // `contentHash` is deliberately dropped here — it is never persisted
      // anywhere in the schema; only `sha256` and `sizeBytes` are used
      // downstream (src/lib/pdf/render.ts documents why the raw hash is not
      // a stable idempotence signal).
      return { buffer, sha256, sizeBytes };
    },

    putBlob: async (key, buffer) => {
      // No `cacheControl` is passed, so the adapter's default
      // `private, max-age=0, no-store` applies. No access option is passed
      // either — there is none, and every rendered proposal is private.
      // Because the underlying driver passes `addRandomSuffix: false`, this
      // call is an in-place OVERWRITE of the delivered document (D-01):
      // there is no versioning in the store and no sidecar copy is kept.
      await storage().put(key, buffer, { contentType: 'application/pdf' });
    },

    persistPdfArtifact: async (args) => {
      // Reused verbatim — sets exactly the four PDF columns by id and
      // touches nothing else. `inputs`, `paramsSnapshot`, `computed`,
      // `schemaVersion`, `status`, `deletedAt`, `language` and `lcRef` all
      // stay immutable (DATA-01..04).
      await finalizePdfBlobOnProposal({
        proposalId: args.proposalId,
        pdfBlobKey: args.pdfBlobKey,
        pdfSha256: args.pdfSha256,
        pdfSizeBytes: args.pdfSizeBytes,
        pdfGeneratedAt: args.pdfGeneratedAt,
      });
    },

    writeMarker: async (args) => {
      // A null actor id is the system-initiated-CLI convention already used
      // by 'proposal.purge' and the Phase 31 `.extract` actions. The
      // payload carries exactly these two keys and nothing else — no
      // figure, no `computed`, no `paramsSnapshot` (ADMIN-09).
      await writeAuditLog({
        actorId: null,
        action: 'proposal.pdf_backfill',
        targetType: 'proposal',
        targetId: args.proposalId,
        payload: { language: args.language, pdfSizeBytes: args.pdfSizeBytes },
      });
    },

    now: () => new Date(),

    log: opts.log,
  };
}
