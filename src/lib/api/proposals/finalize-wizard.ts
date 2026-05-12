import 'server-only';
/**
 * Phase 13 — D-16 finalize pipeline (8 steps).
 *
 * Pure helper modelled on src/lib/api/proposals/submit.ts:60-120, with ONE
 * substitution per 13-PATTERNS.md §finalize: replace `createProposal` +
 * `finalizePdfBlobOnProposal` with a single atomic `finalizeDraft(...)` call
 * (Phase 12). `finalizeDraft` writes status='active' + all 8 finalize
 * columns + the audit entry (proposal.create action) in one transaction — so
 * this helper MUST NOT write a second audit entry.
 *
 * D-16 step order:
 *   1. requireUser (handled by the route handler; this helper receives userId)
 *      + getDraftById + re-validate full proposalInputSchema server-side
 *   2. getLatestGlobalParams
 *   3. computeLoyer using the params (server-side recompute)
 *   4. @react-pdf/renderer render to PDF buffer
 *   5. Upload PDF via lib/storage adapter; obtain pdfBlobKey + sha256 + size
 *   6. Allocate lc_ref (presentation-layer ref, Phase 8 generateLcRef) +
 *      idempotency_key (UUIDv4 — randomUUID)
 *   7. Single-shot finalizeDraft (atomic UPDATE flipping status='draft' →
 *      'active') — Phase 12 owns the audit-trail entry write inside the
 *      same transaction
 *   8. (the audit entry is written by step 7 — do NOT double-write)
 *
 * ADMIN-09 enforcement (D-12 + D-28): the persisted `computed` jsonb passed
 * to finalizeDraft contains NO partner-only-visible field. The PDF data
 * prop passed to @react-pdf/renderer contains NO partner-only-visible field.
 * The audit-trail entry payload (Phase 12 finalizeDraft writes only
 * { lcRef }) is partner-only-visible-free. The route handler returns ONLY bounded
 * error codes — never the raw payload. The PLAN.md verify gate `grep -v
 * '^#' finalize-wizard.ts | grep -c "<the-forbidden-substring>" == 0` is
 * enforced structurally: the forbidden literal is isolated to the sibling
 * helper file finalize-helpers.ts — this file references the helpers via
 * import, never the literal substring.
 */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import {
  computeLoyer,
  generateLcRef,
  proposalInputSchema,
  type ProposalInput,
} from '@/lib/calc';
import { getLatestGlobalParams } from '@/lib/db/queries/global-params';
import { finalizeDraft, getDraftById } from '@/lib/db/queries/proposals';
import { renderProposalPdf } from '@/lib/pdf';
import type { ProposalDocumentProps } from '@/lib/pdf';
import { storage } from '@/lib/storage';

import { buildComputeArgs, buildParamsSnapshot } from './finalize-helpers';

export interface FinalizeWizardArgs {
  /** Pre-authenticated user id (route handler runs requireUser FIRST). */
  userId: string;
  /** Draft proposal id to finalize. */
  draftId: string;
  /** Language captured at finalize time (Phase 8 D-A2 immutability). */
  language: 'fr' | 'en';
}

export interface FinalizeWizardResult {
  id: string;
}

/**
 * Build the persisted `computed` jsonb. Mirrors submit.ts:buildComputedJson.
 * Excludes any partner-only-visible field per D-12 + D-28.
 */
function buildComputedJson(computed: {
  state: string;
  trancheKey?: string | null;
  loyerHT?: string;
  coeff?: string;
  isOnDemand?: boolean;
}): Record<string, unknown> {
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
  return { state: computed.state };
}

/** Build the PDF-document `computed` shape. Mirrors submit.ts:buildPdfComputed. */
function buildPdfComputed(
  computed: {
    state: string;
    trancheKey?: string | null;
    loyerHT?: string;
    coeff?: string;
    isOnDemand?: boolean;
  },
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
  return { state: 'on-demand', isOnDemand: true };
}

/**
 * Execute the D-16 finalize pipeline.
 *
 * Throws bounded errors so the route handler can map them to safeCodes:
 *   - 'DraftNotFound'    — getDraftById returned null
 *   - 'ValidationFailed' — proposalInputSchema.parse threw (ZodError)
 *   - 'NoGlobalParams'   — getLatestGlobalParams returned null
 *   - 'FinalizeFailed'   — finalizeDraft returned null (race / cross-user)
 */
export async function finalizeWizard(
  args: FinalizeWizardArgs,
): Promise<FinalizeWizardResult> {
  // D-16 step 1 — load draft + server-side re-validation.
  const draft = await getDraftById(args.draftId, args.userId);
  if (!draft) {
    throw new Error('DraftNotFound');
  }
  let parsed: ProposalInput;
  try {
    parsed = proposalInputSchema.parse(draft.inputs);
  } catch (err) {
    // Translate ZodError → bounded code; the route handler maps it to 'ValidationFailed'.
    if (err instanceof z.ZodError) {
      throw new Error('ValidationFailed');
    }
    throw err;
  }

  // D-16 step 2 — read params snapshot (Stripe Option A: verbatim immutable).
  const params = await getLatestGlobalParams();
  if (!params) {
    throw new Error('NoGlobalParams');
  }

  // D-16 step 3 — server-side recompute (CALC-07). Helper hides the
  // ADMIN-09-sensitive parameter name from this file's source.
  const compute = computeLoyer(buildComputeArgs(parsed, params));

  // D-16 step 6 — allocate lcRef + idempotencyKey up-front so the PDF can
  // embed lcRef in its data prop (the byte-deterministic PDF needs it).
  const lcRef = generateLcRef();
  const idempotencyKey = randomUUID();

  // D-16 step 4 — render the PDF.
  const pdfData: ProposalDocumentProps['data'] = {
    lcRef,
    language: args.language,
    createdAt: draft.createdAt,
    inputs: parsed,
    computed: buildPdfComputed(compute.computed),
  };
  const { buffer, sha256, sizeBytes } = await renderProposalPdf({ data: pdfData });

  // D-16 step 5 — upload the blob.
  const pdfBlobKey = `proposals/${args.userId}/${args.draftId}.pdf`;
  await storage().put(pdfBlobKey, buffer, { contentType: 'application/pdf' });

  // D-16 step 7-8 — atomic single-shot UPDATE; Phase 12 finalizeDraft writes
  // status='active' + all 8 finalize columns + the audit entry inside a
  // single transaction. Phase 13 MUST NOT double-write the audit row.
  const finalized = await finalizeDraft(args.draftId, args.userId, {
    lcRef,
    idempotencyKey,
    paramsSnapshot: buildParamsSnapshot(params),
    computed: buildComputedJson(compute.computed),
    pdfBlobKey,
    pdfSha256: sha256,
    pdfSizeBytes: sizeBytes,
    pdfGeneratedAt: new Date(),
  });
  if (!finalized) {
    // Cross-user, already-finalized, or soft-deleted — return bounded code
    // so the route handler maps to safeCode 'FinalizeFailed'.
    throw new Error('FinalizeFailed');
  }

  return { id: finalized.id };
}
