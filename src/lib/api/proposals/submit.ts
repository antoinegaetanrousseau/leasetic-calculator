import 'server-only';
import {
  proposalInputSchema,
  computeLoyer,
  generateLcRef,
  parseNumeric,
  type ProposalInput,
} from '@/lib/calc';
import {
  createProposal,
  finalizePdfBlobOnProposal,
  findByIdempotencyKey,
  getLatestGlobalParams,
  softDeleteProposal,
  writeAuditLog,
} from '@/lib/db/queries';
import { renderProposalPdf } from '@/lib/pdf';
import type { ProposalDocumentProps } from '@/lib/pdf';
import { storage } from '@/lib/storage';
import { SubmitError, type SubmitErrorCode } from './errors';

const SCHEMA_VERSION = '1.0.0';     // D-D3
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface SubmitProposalArgs {
  /** Validated user (post-requireUser). */
  userId: string;
  /** D-A2 — captured at gen time, never changes. */
  language: 'fr' | 'en';
  /** Raw header value from the route handler. */
  idempotencyKey: string;
  /** Raw JSON body from the request. submitProposal Zod-parses. */
  body: unknown;
}

export interface SubmitProposalResult {
  id: string;
  pdfUrl: string;            // `/api/proposals/${id}/pdf`
  /** True when this request hit the idempotency cache (no new INSERT). */
  idempotent: boolean;
}

/**
 * The full create flow. Pure-ish: receives the userId from the caller,
 * orchestrates DB + PDF + blob via the existing seams. Throws SubmitError
 * with a bounded code on any failure.
 *
 * Layered for testability: the route handler does HTTP plumbing only.
 *
 * Flow (per D-B1 + D-B2):
 *   1. Validate idempotency-key shape (400 if invalid UUID)
 *   2. Parse body via proposalInputSchema (400 if invalid)
 *   3. Idempotency lookup — return existing row if found (D-B2)
 *   4. Server-side recompute via computeLoyer (CALC-07)
 *   5. Read latest global_params snapshot (DATA-06; 503 if none)
 *   6. INSERT proposal row with snapshot + computed
 *   7. TRY: render PDF → upload blob → finalize row → write audit log
 *      CATCH: tombstone row (softDeleteProposal) + audit log + throw 500
 */
export async function submitProposal(args: SubmitProposalArgs): Promise<SubmitProposalResult> {
  // ── Step 1: idempotency-key shape ─────────────────────────────────────────
  if (!args.idempotencyKey || !UUID_V4_REGEX.test(args.idempotencyKey)) {
    throw new SubmitError(
      'invalid_idempotency_key',
      'Idempotency-Key header must be a UUIDv4.',
      400,
    );
  }

  // ── Step 2: parse body via the same Zod schema the form uses ─────────────
  const parsed = proposalInputSchema.safeParse(args.body);
  if (!parsed.success) {
    throw new SubmitError(
      'invalid_body',
      'Request body failed proposalInputSchema validation.',
      400,
    );
  }
  const input: ProposalInput = parsed.data;

  // ── Step 3: idempotency lookup (D-B2) ─────────────────────────────────────
  const existing = await findByIdempotencyKey(args.userId, args.idempotencyKey);
  if (existing) {
    return {
      id: existing.id,
      pdfUrl: `/api/proposals/${existing.id}/pdf`,
      idempotent: true,
    };
  }

  // ── Step 4: server-side recompute (CALC-07) ───────────────────────────────
  // Read global params FIRST so we can pass snapshot coefficients to computeLoyer.
  // This ensures the server-side recompute uses the same coefficients that will
  // be stored in the snapshot (DATA-01 immutability contract).
  const params = await getLatestGlobalParams();
  if (!params) {
    throw new SubmitError(
      'seed_not_applied',
      'global_params has no rows. The seed migration (Plan 08-04) must be applied before /api/proposals can serve.',
      503,
    );
  }

  // ── Step 5: build paramsSnapshot (DATA-06 → DATA-01) ─────────────────────
  const paramsSnapshot = {
    commissionPct: params.commissionPct,
    maxAmount: params.maxAmount,
    validityDays: params.validityDays,
    coefficients: params.coefficients,
  };

  // Server-side recompute using snapshot params (CALC-07).
  const computeResult = computeLoyer({
    amountHT: input.amountHT,
    durationMonths: input.durationMonths,
    validityDays: input.validityDays,
    coefficients: params.coefficients,
    commissionPct: parseNumeric(params.commissionPct),
    maxAmount: parseNumeric(params.maxAmount),
  });

  // Build the computed JSON for DB storage.
  const computedJson: Record<string, unknown> = buildComputedJson(computeResult.computed);

  // ── Step 6: INSERT the row ────────────────────────────────────────────────
  const lcRef = generateLcRef();
  const inputsJson: Record<string, unknown> = { ...input };

  const row = await createProposal({
    userId: args.userId,
    language: args.language,
    lcRef,
    idempotencyKey: args.idempotencyKey,
    schemaVersion: SCHEMA_VERSION,
    inputs: inputsJson,
    paramsSnapshot,
    computed: computedJson,
    duplicatedFromId: extractDuplicatedFromId(args.body),
  });

  // ── Step 7-9: render → upload → finalize, with D-B1 fail-loud rollback ────
  try {
    // Build the PDF data — use the snapshot state (computed from above).
    const pdfComputed = buildPdfComputed(computeResult.computed);

    const { buffer, sha256, sizeBytes } = await renderProposalPdf({
      data: {
        lcRef: row.lcRef,
        language: row.language as 'fr' | 'en',
        createdAt: row.createdAt,
        inputs: input,
        computed: pdfComputed,
      },
    });

    const blobKey = `proposals/${args.userId}/${row.id}.pdf`;
    await storage().put(blobKey, buffer, { contentType: 'application/pdf' });

    await finalizePdfBlobOnProposal({
      proposalId: row.id,
      pdfBlobKey: blobKey,
      pdfSha256: sha256,        // DATA-09: raw buffer sha256 (NOT contentHash)
      pdfSizeBytes: sizeBytes,
      pdfGeneratedAt: new Date(),
    });

    await writeAuditLog({
      actorId: args.userId,
      action: 'proposal.create',
      targetType: 'proposal',
      targetId: row.id,
      payload: {
        lcRef: row.lcRef,
        language: row.language,
        schemaVersion: row.schemaVersion,
      },
    });

    return { id: row.id, pdfUrl: `/api/proposals/${row.id}/pdf`, idempotent: false };
  } catch (err) {
    // D-B1: tombstone + audit + rethrow as SubmitError 500.
    const errorCode: SubmitErrorCode = classifyError(err);

    try {
      await softDeleteProposal(row.id, args.userId);
    } catch {
      // Tombstone failed too; surface the original error anyway.
    }
    try {
      await writeAuditLog({
        actorId: args.userId,
        action: 'proposal.create_failed',
        targetType: 'proposal',
        targetId: row.id,
        payload: {
          errorCode,
          message: err instanceof Error ? err.message : String(err),
        },
      });
    } catch {
      // Audit write failed; ignore — already returning 500.
    }

    throw new SubmitError(errorCode, `Create-proposal pipeline failed at: ${errorCode}.`, 500);
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

/**
 * Classify the D-B1 error code from the caught exception.
 * - StorageError (name includes 'Storage') → pdf_upload_failed
 * - An error whose message includes 'finalize' → finalize_failed
 * - Everything else → pdf_render_failed
 */
function classifyError(err: unknown): SubmitErrorCode {
  if (err instanceof Error && err.name.includes('Storage')) {
    return 'pdf_upload_failed';
  }
  if (err instanceof Error && err.message.toLowerCase().includes('finalize')) {
    return 'finalize_failed';
  }
  return 'pdf_render_failed';
}

/** Build the DB-stored computed JSON from a ComputeLoyerState. */
function buildComputedJson(computed: { state: string; trancheKey?: string | null; loyerHT?: string; coeff?: string; isOnDemand?: boolean }): Record<string, unknown> {
  if (computed.state === 'computed') {
    return {
      state: 'computed',
      trancheKey: computed.trancheKey,
      loyerHT: computed.loyerHT,
      coeff: computed.coeff,
      isOnDemand: false,
    };
  }
  if (computed.state === 'on-demand') {
    return {
      state: 'on-demand',
      trancheKey: computed.trancheKey ?? null,
      isOnDemand: true,
    };
  }
  // idle / missing — store minimal state
  return { state: computed.state };
}

/** Build the PDF-document computed shape from a ComputeLoyerState. */
function buildPdfComputed(
  computed: { state: string; trancheKey?: string | null; loyerHT?: string; coeff?: string; isOnDemand?: boolean },
): ProposalDocumentProps['data']['computed'] {
  if (computed.state === 'computed') {
    return {
      state: 'computed',
      trancheKey: computed.trancheKey as 't1' | 't2' | 't3' | 't4' | undefined,
      loyerHT: computed.loyerHT,
      coeff: computed.coeff,
      isOnDemand: false,
    };
  }
  if (computed.state === 'on-demand') {
    return {
      state: 'on-demand',
      trancheKey: computed.trancheKey as 't1' | 't2' | 't3' | 't4' | undefined,
      isOnDemand: true,
    };
  }
  // Fallback (idle/missing) — use on-demand display mode in PDF
  return { state: 'on-demand', isOnDemand: true };
}

/** Extract optional duplicatedFromId from raw body (informational only per T-08-07-05). */
function extractDuplicatedFromId(body: unknown): string | null {
  if (
    body !== null &&
    typeof body === 'object' &&
    'duplicatedFromId' in body &&
    typeof (body as { duplicatedFromId?: unknown }).duplicatedFromId === 'string'
  ) {
    return (body as { duplicatedFromId: string }).duplicatedFromId;
  }
  return null;
}
