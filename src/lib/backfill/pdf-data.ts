/**
 * Phase 44 Plan 02 — stored proposal row -> `ProposalDocumentProps['data']`
 * (MIG-03, MIG-04, D-05, D-02, FIELD-03).
 *
 * Pure module. Runtime imports: `zod` only. `ProposalDocumentProps` is
 * imported as a type only, so the compiler erases it entirely — the
 * runtime import guard inside `@/lib/pdf`'s render module never executes,
 * and this module (and every test against it) needs no runtime-guard shim.
 *
 * `buildBackfillPdfData` never throws: every rejection returns the bounded
 * failure form so the per-row loop (plan 04) can log a reason and continue
 * (D-10) instead of crashing the whole run over one legacy row.
 */
import { z } from 'zod';
import type { ProposalDocumentProps } from '@/lib/pdf';
import type { AdvisorIdentity, BackfillCandidate, RowFailureReason } from './types';

// ── Render-shape guard for `row.inputs` ─────────────────────────────────────

/**
 * Render-shape guard for a stored proposal's `inputs` jsonb.
 *
 * This is deliberately NOT the strict wizard-input schema declared in
 * `src/lib/calc/schema.ts`. That schema is this app's WRITE-time gate for
 * brand-new proposals: it
 * requires `clientSiren` and `clientSiret`, and it refines `amountHT` to be
 * greater than 25000 after a transform. Applying it here would reject every
 * proposal finalized before those rules existed — exactly the rows this
 * migration exists to re-render (FIELD-03). `proposals.inputs` is immutable
 * (DATA-01..04), so an old row's shape can never be brought up to today's
 * write-time rules; the only honest gate at render time is "is there enough
 * here to build a document prop", nothing more.
 *
 * No `.transform()`, no SIREN/SIRET normalization, no amount lower bound, no
 * email/phone shape check. Do not "align" this with that stricter wizard
 * schema — that would silently reintroduce the FIELD-03 regression this
 * file exists to avoid.
 */
export const backfillRenderInputsSchema = z.object({
  partnerName: z.string(),
  clientCo: z.string(),
  amountHT: z.string().regex(/^\d+$/),
  durationMonths: z.union([z.literal(36), z.literal(48), z.literal(60)]),
  validityDays: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  // Optional passthrough — carried as-is when present, left absent when not.
  // A pre-Phase-42 row has neither `clientSiret` nor `partnerTel` at all
  // (FIELD-03); the document renders an em dash for either (DOC-11).
  partnerCo: z.string().optional(),
  partnerTel: z.string().optional(),
  clientName: z.string().optional(),
  clientRole: z.string().optional(),
  clientTel: z.string().optional(),
  clientEmail: z.string().optional(),
  clientSiren: z.string().optional(),
  clientSiret: z.string().optional(),
  slb: z.boolean().optional(),
  evalParc: z.boolean().optional(),
  projectDesc: z.string().optional(),
  partnerRef: z.string().optional(),
});

// ── Render-shape guard for `row.computed` ───────────────────────────────────

/**
 * Render-shape guard for a stored proposal's `computed` jsonb. Accepts
 * exactly the field set the document prop needs — nothing is derived,
 * nothing is recomputed. See the `computed` binding below for why this
 * schema exists at all rather than a plain pass-through.
 */
export const backfillComputedSchema = z.object({
  state: z.union([z.literal('computed'), z.literal('on-demand')]),
  trancheKey: z
    .union([z.literal('t1'), z.literal('t2'), z.literal('t3'), z.literal('t4')])
    .optional(),
  loyerHT: z.string().optional(),
  coeff: z.string().optional(),
  isOnDemand: z.boolean().optional(),
});

// ── The builder ──────────────────────────────────────────────────────────

export type BuildBackfillPdfDataResult =
  | { ok: true; data: ProposalDocumentProps['data'] }
  | { ok: false; reason: RowFailureReason; detail: string };

/**
 * Turn one stored, in-scope proposal row into the props
 * `ProposalDocument` needs to render. Never throws.
 */
export function buildBackfillPdfData(args: {
  row: BackfillCandidate;
  advisor: AdvisorIdentity | null;
}): BuildBackfillPdfDataResult {
  const { row, advisor } = args;

  // A finalized row cannot have a null/empty `lc_ref` — the
  // `proposals_finalized_completeness_check` constraint forbids it at write
  // time. Seeing one here is a corruption signal, not a normal path, but it
  // must not crash the run (D-10).
  if (!row.lcRef) {
    return { ok: false, reason: 'missing-lc-ref', detail: 'row.lcRef is null or empty' };
  }

  // MIG-03 in one line: the row's OWN committed language feeds the
  // document, narrowed to the `Lang` union, never defaulted, coerced, or
  // replaced by a session language.
  if (row.language !== 'fr' && row.language !== 'en') {
    return {
      ok: false,
      reason: 'invalid-language',
      detail: `unsupported language value: ${typeof row.language}`,
    };
  }
  const language = row.language;

  const inputsResult = backfillRenderInputsSchema.safeParse(row.inputs);
  if (!inputsResult.success) {
    // Field NAMES only — never a stored value — end up in a report artifact.
    const detail = inputsResult.error.issues.map((issue) => issue.path.join('.')).join(', ');
    return { ok: false, reason: 'invalid-inputs', detail };
  }

  if (row.computed === null) {
    return { ok: false, reason: 'invalid-computed', detail: 'row.computed is null' };
  }
  const computedResult = backfillComputedSchema.safeParse(row.computed);
  if (!computedResult.success) {
    const detail = computedResult.error.issues.map((issue) => issue.path.join('.')).join(', ');
    return { ok: false, reason: 'invalid-computed', detail };
  }

  const data: ProposalDocumentProps['data'] = {
    lcRef: row.lcRef,
    language,
    createdAt: row.createdAt,
    inputs: inputsResult.data,
    // D-05 / MIG-04 — the single most important binding in this file. The
    // stored jsonb IS the document prop, printed verbatim: nothing here
    // recomputes a lease figure, nothing here re-derives a coefficient, and
    // nothing here re-opens the proposal's immutable finalization-time
    // snapshot column. The two builders that produced this same jsonb and
    // the equivalent PDF-prop shape at finalize time
    // (src/lib/api/proposals/finalize-wizard.ts:89 and :116) emit identical
    // field sets — `state`, `trancheKey`, `loyerHT`, `coeff`, `isOnDemand` —
    // so printing the stored value reproduces the exact figures MORE
    // strictly than replaying the original snapshot would: there is no
    // arithmetic left to drift. This equivalence is load-bearing — if that
    // pair of builders is ever changed to diverge, D-05 needs revisiting.
    computed: computedResult.data,
    // D-02 — both bindings below are LIVE reads. Either may legitimately
    // differ from the document a client already holds (a different advisor
    // now staffs the account, the partner's company phone changed). No
    // delta detection, no comparison and no reporting is built for either —
    // that omission is intentional, not a gap. `advisor` is passed through
    // even when `null`: a missing advisor is a valid render (Phase 43
    // D-13), so no guard is added here for that case.
    partner: { companyTelephone: row.partnerCompanyTelephone },
    advisor,
  };

  return { ok: true, data };
}
