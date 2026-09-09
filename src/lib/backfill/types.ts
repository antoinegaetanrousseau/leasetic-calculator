/**
 * Phase 44 Plan 01 — the type contracts every later backfill module (plans
 * 02, 03 and 04) is written against (MIG-01..05).
 *
 * Pure types only — this module imports nothing at runtime. The single
 * type-only import below is erased by the TypeScript compiler, so the
 * runtime import guard inside `@/lib/pdf` never executes and every test in
 * this module family stays a plain unit test with no runtime-guard shim.
 *
 * Two interpretations this whole phase rests on — a future reader must not
 * "fix" them:
 *
 * (a) D-05 — the PDF's `computed` prop is the stored `computed` jsonb,
 * VERBATIM. Nothing is recomputed: `computeLoyer` is never called and
 * `params_snapshot` is never read at render time. `buildComputedJson` and
 * `buildPdfComputed` (src/lib/api/proposals/finalize-wizard.ts:89, :116)
 * emit identical field sets, so the stored jsonb feeds the document prop
 * directly after validation. MIG-04 ("read from that proposal's
 * `params_snapshot` rather than current coefficients") is satisfied
 * TRANSITIVELY, not literally: `computed` was itself derived from that
 * snapshot at finalization, so printing it reproduces the same figures
 * more strictly than a replay would.
 *
 * (b) D-01 — the blob key is a pure function of `(userId, proposalId)`, and
 * `VercelBlobStorage.put()` passes `addRandomSuffix: false` (see
 * src/lib/storage/vercel-blob.ts), so every `putBlob` call driven by this
 * module is an IRREVERSIBLE in-place overwrite of
 * `proposals/{userId}/{proposalId}.pdf` — no sidecar copy, no versioning.
 * The dry-run report and the GitHub Environment approval gate (D-08) are
 * the only safety net once apply runs.
 */
import type { ProposalDocumentProps } from '@/lib/pdf';

// ── Row shapes ───────────────────────────────────────────────────────────

/**
 * Mirrors the `listBackfillCandidates` projection
 * (src/lib/db/queries/proposals.ts) — everything a re-render needs without
 * a second query (D-02). `partnerCompanyTelephone` is the creating user's
 * CURRENT company telephone, live-read by design; it is not a snapshot and
 * no delta is ever computed against it.
 */
export interface BackfillCandidate {
  id: string;
  userId: string;
  lcRef: string | null;
  language: string;
  status: string;
  createdAt: Date;
  inputs: Record<string, unknown>;
  computed: Record<string, unknown> | null;
  pdfBlobKey: string | null;
  partnerCompanyTelephone: string | null;
}

/**
 * Exactly the four content columns `ProposalDocumentProps['data']['advisor']`
 * accepts. The advisor row's actor id and updated-at must never reach this
 * module (Phase 43 D-13) — a null advisor is a valid state, not an error.
 */
export interface AdvisorIdentity {
  name: string | null;
  fonction: string | null;
  telephone: string | null;
  email: string | null;
}

// ── Per-row outcomes ─────────────────────────────────────────────────────

/**
 * Bounded on purpose so the report groups failures without echoing raw
 * error text as a category.
 */
export type RowFailureReason =
  | 'missing-lc-ref'
  | 'invalid-language'
  | 'invalid-inputs'
  | 'invalid-computed'
  | 'render-failed'
  | 'upload-failed'
  | 'persist-failed';

/**
 * Discriminated on `status`. `rendered` is a dry-run success, `migrated` is
 * an apply success, `failed` covers either mode. `detail` on the failed arm
 * is documented as already-redacted, bounded text — plan 03's report writer
 * is where the redaction is enforced, not this type.
 */
export type RowOutcome =
  | { status: 'rendered'; proposalId: string; lcRef: string | null; language: string; sizeBytes: number }
  | { status: 'migrated'; proposalId: string; lcRef: string | null; language: string; sizeBytes: number }
  | { status: 'failed'; proposalId: string; lcRef: string | null; reason: RowFailureReason; detail: string };

export interface BackfillCounts {
  candidates: number;
  rendered: number;
  failed: number;
}

// ── Report artifact (T-44-01) ───────────────────────────────────────────

/**
 * The SAFE projection allowed into the artifact. `inputs`, `computed`,
 * `paramsSnapshot`, any amount/loyer/coeff/commission value, the blob key
 * itself and any connection string are FORBIDDEN here — the report is
 * uploaded as a GitHub artifact and read by a human. This is a closed,
 * explicit field list on purpose: plan 03 must not widen it by adding a
 * field, only by adding a new named key to this type.
 */
export interface BackfillReportRow {
  proposalId: string;
  lcRef: string | null;
  language: string;
  status: string;
  blobKeyPresent: boolean;
  outcome: 'rendered' | 'failed';
  reason?: RowFailureReason;
  detail?: string;
}

/**
 * Mirrors reconcile's `DryRunReportEnvelope` shape (src/lib/reconcile/report.ts),
 * including the literal `'1'` version discriminator.
 */
export interface BackfillReportEnvelope {
  reportVersion: '1';
  generatedAt: string;
  databaseFingerprint: string;
  counts: BackfillCounts;
  rows: BackfillReportRow[];
}

// ── Dependency injection ────────────────────────────────────────────────

/**
 * The injected-dependency bag that keeps every later module unit-testable
 * without a live database, blob store or PDF renderer — this is what makes
 * CONTEXT.md's "how the render loop is exercised without a live blob store"
 * answerable.
 */
export interface BackfillDeps {
  listCandidates: () => Promise<BackfillCandidate[]>;
  listMigratedIds: () => Promise<string[]>;
  getAdvisor: () => Promise<AdvisorIdentity | null>;
  renderPdf: (
    data: ProposalDocumentProps['data'],
  ) => Promise<{ buffer: Buffer; sha256: string; sizeBytes: number }>;
  putBlob: (key: string, buffer: Buffer) => Promise<void>;
  persistPdfArtifact: (args: {
    proposalId: string;
    pdfBlobKey: string;
    pdfSha256: string;
    pdfSizeBytes: number;
    pdfGeneratedAt: Date;
  }) => Promise<void>;
  writeMarker: (args: { proposalId: string; language: string; pdfSizeBytes: number }) => Promise<void>;
  now: () => Date;
  log: (line: string) => void;
}

export type BackfillMode = 'dry-run' | 'apply';

export type BackfillAbortReason = 'no-dry-run-report' | 'fingerprint-mismatch' | 'drift';

/**
 * Declared HERE rather than in plan 03's `drift.ts` on purpose: plan 04's
 * `RunBackfillResult` carries a drift verdict, and declaring it in
 * `drift.ts` would make `types.ts` import from a module that imports
 * `types.ts`. `drift.ts` imports and re-exports this type; it does not
 * redeclare it.
 */
export interface BackfillDriftResult {
  status: 'clean' | 'drift';
  added: string[];
  removed: string[];
  alreadyMigrated: string[];
}

export interface RunBackfillArgs {
  deps: BackfillDeps;
  mode: BackfillMode;
  rootDir: string;
  databaseFingerprint: string;
  allowDrift: boolean;
}

/**
 * The discriminated result of `runBackfill` (plan 04). The dry-run form's
 * `reportPaths` mirrors reconcile's two-form (`.md` + `.json`) artifact
 * shape — the obvious precedent (CONTEXT.md "Claude's Discretion") but not
 * mandated, so plan 03 owns the exact path fields.
 */
export type RunBackfillResult =
  | {
      mode: 'dry-run';
      reportPaths: { archivedJsonPath: string; archivedMdPath: string; latestJsonPath: string; latestMdPath: string };
      counts: BackfillCounts;
    }
  | { mode: 'apply'; aborted: true; reason: BackfillAbortReason; drift?: BackfillDriftResult }
  | { mode: 'apply'; aborted: false; counts: BackfillCounts; failures: RowOutcome[]; drift: BackfillDriftResult };
