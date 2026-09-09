# Phase 44: Backfill Migration - Context

**Gathered:** 2026-09-09
**Status:** Ready for planning

<domain>
## Phase Boundary

A one-time, operator-run backfill that re-renders every stored proposal PDF into the
Phase 43 design, driven by each proposal's own committed data, and overwrites the stored
blob in place.

**In scope:** a `tsx` entry point + the GitHub Action that runs it, a dry-run mode, an
apply mode, an idempotence marker, and the audit trail. Requirements MIG-01..MIG-05.

**Out of scope:** any change to the document design itself (Phase 43 owns it), to the
calculation (frozen), to `inputs` / `params_snapshot` / `computed` (immutable by
DATA-01..04), or any partner-facing UI. This phase adds no user-visible surface.

**Why it runs last:** this is the milestone's one irreversible step and the standing
constraint it lifts — "Mutating already-saved PDFs" (`.planning/REQUIREMENTS.md`
§ Rule lifted by this milestone). The new document must already be proven correct
(Phase 43) before anything is bulk re-rendered into it.

</domain>

<decisions>
## Implementation Decisions

### The irreversible act

- **D-01: No sidecar copy of the delivered document.** The re-render overwrites
  `proposals/{userId}/{proposalId}.pdf` in place. This is not an added decision — the blob
  key is a pure function of `(userId, proposalId)` and `VercelBlobStorage.put()` passes
  `addRandomSuffix: false`, so a `put()` at that key IS a replacement and the store has no
  versioning. A `.pre-v19.pdf` sidecar was considered and declined: the ROADMAP's
  "irreversibly" is taken at face value. **Consequence the plans must respect:** once
  apply runs, the retired layout does not exist anywhere, so the dry-run and the approval
  gate (D-08) are the only safety net.

- **D-02: Live-read fields change silently, by design.** A re-render reads the advisor
  live (`getAdvisor()`, 43 D-13) and takes `partner.companyTelephone` from the creating
  user's current account (PROF-03). Neither is snapshotted, so a re-rendered PDF can name
  a different advisor or phone than the document the client holds. This is correct
  behaviour, not a defect: both fields were decided as live-by-design. **Build no delta
  detection and no delta reporting for them** — the dry-run does not compare them, and no
  row is skipped because they would change.

### Row scope

- **D-03: `status IN ('active','deleted')`.** Drafts are excluded structurally — they have
  no blob. Soft-deleted rows are included with **no `deleted_at` window filter**: a partner
  can restore one within the 30-day window, and an unmigrated row would resurrect a
  retired-layout document after the migration reported success.

- **D-04: A missing blob is not a special case.** A row whose `pdf_blob_key` is set but
  whose object is absent from storage is rendered like any other row; the render writes a
  valid PDF at the expected key and repairs the row as a side effect. No orphan category,
  no separate counter, no distinct reporting.

### Figures and idempotence

- **D-05: The PDF's `computed` prop is the stored `computed` jsonb, verbatim. Nothing is
  recomputed.** `buildComputedJson` and `buildPdfComputed`
  (`src/lib/api/proposals/finalize-wizard.ts:89` and `:116`) emit identical field sets —
  `state`, `trancheKey`, `loyerHT`, `coeff`, `isOnDemand` — so the stored jsonb feeds the
  document prop directly after validation. This removes every path by which a figure on a
  delivered document could move.

  > **Interpretation note — MIG-04 is satisfied transitively, not literally.** MIG-04 reads
  > "read from that proposal's `params_snapshot` rather than current coefficients". Under
  > D-05, `params_snapshot` is **never read at render time**: the guarantee is that
  > `computed` was itself derived from that snapshot at finalization, so printing it
  > reproduces the same figures more strictly than a replay would. The requirement's
  > *intent* — never touch current coefficients — is fully met. **Verify-phase must not
  > read the absent `params_snapshot` read as a gap.** MIG-04 in
  > `.planning/REQUIREMENTS.md` may warrant a restatement line in the style Phase 42/43
  > used for PROF-03 and DOC-03.

- **D-06: Idempotence is an `audit_log` row per migrated proposal**, written as each row
  completes: `action: 'proposal.pdf_backfill'`, `targetType: 'proposal'`,
  `targetId: proposal.id`. A re-run left-joins against it and skips what is already marked.
  This doubles as the operator audit trail an irreversible bulk mutation should leave.
  Requires a new member on the `AuditAction` union in
  `src/lib/db/queries/audit-log.ts:8` — the same move Phase 43's partner-phone edit made.

  > **`pdf_sha256` cannot serve as the marker and must not be used as one.**
  > `src/lib/pdf/render.ts:19` documents that the raw buffer hash is not stable across
  > renders: `@react-pdf/renderer` batches through the React Fiber scheduler and emits PDF
  > objects in a different order every call, so identical inputs yield a different sha256.
  > Only `contentHash` is stable, and it is never persisted — the schema stores
  > `pdf_sha256` only. Any plan that proposes hash comparison for MIG-05 is wrong.
  >
  > The backfill still writes a fresh `pdf_sha256` / `pdf_size_bytes` / `pdf_generated_at`
  > for each re-rendered row, because those describe the blob that now exists (DATA-09).

### Where and how it runs

- **D-07: Apply runs as a `workflow_dispatch` GitHub Action, never from a laptop.**
  Modelled on `.github/workflows/db-migrate.yml`. `import './_load-env'` arms
  `assertSafeDatabaseTarget`, which classifies Neon `main` as `refuse-production` and
  exits(1) — so a developer machine holding `.env.local` cannot run apply at all. The
  guard's SKIP rule (no `.env*` candidate present in a fresh Action checkout) is the
  sanctioned production-write path this repo already uses for MIGRATE PROD and for CI's
  ephemeral-branch step. Secrets: `DATABASE_URL_MAIN` plus the storage credentials
  (`STORAGE_DRIVER` + `BLOB_READ_WRITE_TOKEN`, or the `AWS_*` set).

  > **Interpretation note — MIG-02's "local-database guard".** The guard is satisfied by
  > being armed and refusing every venue except the Action; it does not authorise the
  > Action, it simply skips there. Do not weaken, override, or add a bypass env var to
  > `scripts/_db-branch-guard.ts` for this phase — a bypass built for a bulk irreversible
  > blob mutation would outlive the phase.

- **D-08: One dispatch, two jobs, a GitHub Environment required-reviewer gate between
  them.** Job 1 (dry-run) renders every in-scope proposal, writes zero blobs and zero
  rows, and uploads the report as a workflow artifact. The approval click on the
  Environment gate **is** MIG-02's explicit confirmation. Job 2 (apply) downloads that
  exact artifact and proceeds. This makes "the run I approved" and "the run that happened"
  the same run by construction — load-bearing, because D-01 removed the rollback.

- **D-09: Apply refuses on drift.** Before writing, apply re-plans the in-scope set,
  diffs it against the approved report, and aborts if the set changed, with an
  `--allow-drift` escape for a deliberate override. Mirrors
  `scripts/reconcile-proposals.ts` (D-15) and its exit-code-3 guard refusal.

- **D-10: Failure policy is log-and-continue, with a non-zero exit if any row failed.**
  Same best-effort shape as `scripts/purge-soft-deleted.ts`. One legacy row with an
  unparseable `inputs` blob must not block the rest. The non-zero exit turns the Action
  run red so a partial success cannot pass unnoticed. Because idempotence is the audit_log
  row (D-06), a failed proposal is simply unmarked, and the failures are exactly the set a
  re-run picks up — which is also how MIG-05 is satisfied for interruptions.

- **D-11: The script follows the established `tsx` entry-point shape.**
  `#!/usr/bin/env tsx`, `import './_load-env'` as the first import, npm scripts wrapped
  with `-r ./scripts/_preload-mock-server-only.cjs` (required to import from
  `src/lib/db/queries`, which carries `server-only`). Exit codes follow reconcile:
  `0` success, `1` crash, `2` environment refusal, `3` guard refusal.

### Claude's Discretion

- Render-loop batch size and whether rows are processed serially or with bounded
  concurrency.
- Report format and path — mirroring reconcile's two-form (`.md` + `.json`) output is the
  obvious precedent but is not mandated.
- The Action's confirm-input token wording, and whether a typed input is used at all
  given the Environment gate already provides the confirmation.
- Progress-logging cadence.
- Whether the dry-run report carries per-row detail beyond the count and the failing list
  that MIG-01 requires.
- Test strategy, including how the render loop is exercised without a live blob store.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap

- `.planning/REQUIREMENTS.md` § "Migration — the backfill" — MIG-01..MIG-05 verbatim.
- `.planning/REQUIREMENTS.md` § "Rule lifted by this milestone" — the standing constraint
  this phase converts into a deliberate one-time migration, and the reasoning that
  `params_snapshot` keeps the figures honest and per-proposal language is preserved.
- `.planning/ROADMAP.md` § "Phase 44: Backfill Migration" — goal, the four success
  criteria, and the planning note pinning this behind Phase 39's DB guard.

### Prior-phase decisions this phase inherits

- `.planning/phases/43-new-pdf-layout/43-CONTEXT.md` — D-12 (`ProposalDocumentProps` grew
  and there are two render call sites, not one) and D-13 (the advisor is read live at
  render time; a null advisor is valid and must not be guarded against).
- `.planning/phases/42-captured-data-fields-advisor-profile/42-CONTEXT.md` — how the
  partner block and advisor block are sourced (PROF-03).

### The render and storage path this phase drives

- `src/lib/api/proposals/finalize-wizard.ts:200-275` — the canonical render → upload →
  persist sequence. The backfill reproduces steps 3.5 through 5 and must not touch the
  finalize-only steps (idempotency key, lcRef allocation, `finalizeDraft`).
- `src/lib/pdf/render.ts` — `renderProposalPdf`, and the docstring at :19 establishing
  that `sha256` is not stable across renders while `contentHash` is.
- `src/lib/storage/adapter.ts` — the `StorageAdapter` contract (`put` / `head` / `get`).
- `src/lib/storage/vercel-blob.ts` — `addRandomSuffix: false`, which is what makes a
  re-`put()` an in-place overwrite.
- `src/db/schema.ts` — the `proposals` table (`pdfBlobKey`, `pdfSha256`, `pdfSizeBytes`,
  `pdfGeneratedAt`, `language`, `status`, `deletedAt`) and the `auditLog` table.
- `src/lib/db/queries/audit-log.ts:8` — the `AuditAction` union that needs a new member.

### Operator-script precedent to follow

- `scripts/reconcile-proposals.ts` — dry-run → report → apply-with-drift-check, the
  production confirmation gate, and the 0/1/2/3 exit-code vocabulary.
- `scripts/purge-soft-deleted.ts` — the typed-confirmation gate and the best-effort
  log-and-continue loop over proposals + blobs.
- `scripts/_db-branch-guard.ts` — the verdict table, the SKIP rule D-07 depends on, and
  the credential-disclosure rules every message must respect.
- `scripts/_load-env.ts` — where the guard is armed.
- `.github/workflows/db-migrate.yml` — the `workflow_dispatch` + Environment + secrets
  shape D-07/D-08 mirror.
- `docs/operations/neon-branch-routing.md` — the locked rule that migrations reach real
  branches only through the gated workflow.
- `docs/operations/migrations.md`, `docs/operations/purge.md`,
  `docs/operations/reconciliation-import.md` — the runbook format an operator-facing
  script in this repo is documented in.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `renderProposalPdf({ data })` — the whole render, already shared by both existing call
  sites. The backfill is a third caller and needs no new rendering code.
- `storage()` + `StorageAdapter.put/head` — driver-agnostic, so the same script works
  against Vercel Blob and S3 without branching.
- `writeAuditLog(...)` — already the mechanism for operator mutations
  (`proposal.purge` is the closest precedent).
- `scripts/_load-env.ts`, `scripts/_db-branch-guard.ts`, `scripts/_neon-target.ts` — the
  environment/guard trio every write-capable script already imports.
- `scripts/render-pdf-preview.ts` — an existing script that renders a PDF outside the
  Next.js server context; the closest working example of the imports required.

### Established Patterns

- **Dry-run is the default; writes require an explicit confirmation.** Both
  `purge-soft-deleted.ts` and `reconcile-proposals.ts` do this, with different tokens.
- **The report is a two-form artifact** (`.md` for a human, `.json` for the drift check)
  in reconcile.
- **Credentials never appear in output.** The guard's docstring is explicit: interpolate a
  derived `hostname` and a bare filename, never a URL — guard output gets pasted into
  transcripts.
- **Blob key shape is `proposals/{userId}/{proposalId}.pdf`**, constructed identically at
  both finalize call sites.
- **`server-only` modules need the preload shim** — `-r ./scripts/_preload-mock-server-only.cjs`
  is what lets a `tsx` script import `src/lib/db/queries`.

### Integration Points

- New `scripts/backfill-proposal-pdfs.ts` (name at planner's discretion), alongside the
  existing `backfill-*.ts` scripts.
- New npm scripts for dry-run and apply, following the `db:reconcile:dry-run` / `db:reconcile`
  naming pair.
- New `.github/workflows/` entry, or a new job pair — modelled on `db-migrate.yml`.
- One new `AuditAction` union member in `src/lib/db/queries/audit-log.ts`.
- A new GitHub Environment (or reuse of the existing `production` one) to host the
  required-reviewer gate.

</code_context>

<specifics>
## Specific Ideas

- **The sha256 trap, stated once more because it will look like the obvious solution:**
  comparing `proposals.pdf_sha256` against a fresh render's hash to decide "already
  migrated?" is guaranteed to report every row as changed. `src/lib/pdf/render.ts:19`.
- **`buildComputedJson` and `buildPdfComputed` are field-identical** — that equality is
  what makes D-05 a one-line prop pass rather than a mapping layer. If a future change
  breaks that equality, D-05 needs revisiting.
- **The approval gate is the confirmation.** D-08 deliberately puts MIG-02's "explicit
  confirmation" on a GitHub Environment reviewer gate rather than a typed string, because
  a gate between two jobs of one run also guarantees the approved plan is the executed plan.
- **`wr-07` interacts with D-07.** The open todo `wr-07-db-guard-skip-rule` proposes
  hardening the guard's `NODE_ENV=test` SKIP narrowness. D-07 depends on the SKIP rule
  firing in a fresh Action checkout. Any future wr-07 work must not break that path — the
  guard's own docstring already warns that the naive broadening would refuse MIGRATE PROD.

</specifics>

<deferred>
## Deferred Ideas

- **Snapshotting advisor + partner phone onto the proposal row** so a document becomes
  fully reproducible from stored data alone. This would reverse 43 D-13 and PROF-03's
  live-read decision and needs a schema change — its own phase, not this one.
- **A per-run row-count ceiling as a blast-radius cap.** Considered and not adopted: the
  dry-run count plus the approval gate already put a human between the plan and the write.
- **Re-rendering a single proposal on demand from the admin UI** — already recorded in
  `.planning/REQUIREMENTS.md` § Future Requirements.
- **Retro-fitting `contentHash` as a persisted column**, which would give future
  migrations a real content-level idempotence signal. Not needed here (D-06 solves MIG-05
  with the audit log) but worth remembering the next time a bulk re-render is proposed.

### Reviewed Todos (not folded)

- `ops-03-ovh-cutover-december-2026` — "Provision an OVH-compatible target and run
  scripts/smoke-ovh.ts". Matched on shared vocabulary (ops, run, cutover) only. Deferred:
  an infrastructure-portability task, unrelated to re-rendering stored documents.
- `wr-07-db-guard-skip-rule` — "Harden the DB guard's NODE_ENV=test SKIP rule". Deferred:
  changing the guard is explicitly out of scope per D-07, and the guard's own docstring
  records this as a deliberate operator decision rather than a defect. Recorded in
  `<specifics>` above because D-07 depends on the rule it would change.

</deferred>

---

*Phase: 44-backfill-migration*
*Context gathered: 2026-09-09*
