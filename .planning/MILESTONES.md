# Milestones — Matrice Commerciale

> **Record-completeness note (2026-09-07, Phase 40 D-40-04).** `v1.2` and `v1.3` still have
> no entry in this file — both shipped in May 2026 (Phases 11-15 and 16-21 respectively) before
> this ledger's discipline was established. Backfilling them was deliberately **not** done in
> Phase 40: reconstructing two milestones' worth of narrative means mining roughly 30 phase
> summaries for a milestone nobody is auditing, for record-keeping value only. Recorded here so
> the omission is visible rather than silently inherited at the next audit.

## v1.7 Sales Motivation (Shipped: 2026-09-05)

**Scope:** Phase 35 only — 1 phase, 5 plans, 13 tasks, 35 commits.
**Source diff:** 15 files changed, +3,085 / −10.
**Timeline:** 2026-09-04 23:35 → 2026-09-05 12:37 (~13 hours).
**Requirements:** GAME-01..GAME-05 — 5/5 validated.

**Delivered:** a partner sees their own book gaining momentum on the home page —
what moved this week, a weekly streak with its break condition stated, and a
3×3 badge ladder — all derived from Phase 34's `relationship_events` at read
time, with no new table, no migration and no awarding job.

**Key accomplishments:**

- **35-01** — pure Europe/Paris Mon–Sun week window (DST-safe via `@date-fns/tz`
  TZDate), the streak fold that preserves a longest-ever record across a broken
  current streak, and the badge tier ladder as operator-editable constants. 30
  unit tests, zero database or clock coupling.
- **35-02** — the owner-scoped read layer: three functions deriving momentum,
  progress weeks and badge counts from `relationship_events`, each carrying the
  CRM-02 owner predicate in the SAME statement as the data it selects.
- **35-03** — 19 `dashboard.momentum.*` dictionary entries in fr and en, and the
  `MomentumCard` server component.
- **35-04** — a skip-by-default real-Postgres isolation suite that, on its first
  real run, **caught two production-shipping bugs that 2297 mocked-driver tests
  could not**: `listProgressWeekKeysForOwner` threw on every real call (a GROUP BY
  functional-dependency mismatch from reusing a parameterized `sql` fragment in
  both SELECT and GROUP BY), and a jsonb double-encoding defect. Full mutation
  evidence recorded — removing the owner predicate, the Perdu exclusion, or the
  window's exclusivity each produced a specific named test failure.
- **35-05** — the admin-gated call site: an admin's request resolves no momentum
  query and renders no momentum DOM (D-15), one shared clock read drives the
  week window, and the card sits between "à relancer" and recent proposals.
  Human-verified live and approved.
- **Post-execution amendment (D-19a)** — the visual-restraint decision was
  reversed after operator review of the live surface, amended in `35-CONTEXT.md`
  and `35-UI-SPEC.md`, and the card rebuilt with tier identity, progress tracks
  and badge tiles, then compacted to ~36% of its original height. GAME-04's
  no-leaderboard rule was explicitly held throughout as a privacy property
  rather than a style budget.

**Gates:** verification passed 9/9 must-haves · code review no blockers
(2 WARNINGs fixed, 2 INFO deliberately left) · security audit 21/21 threats
closed, `threats_open: 0` · 2,320 tests passing · typecheck, `eslint
--max-warnings=0` and build all clean.

**Known deferred items at close:** 8 (see STATE.md § Deferred Items). None
originate from v1.7 — all are inherited v1.0–v1.6 artifacts. Genuinely open:
Phase 30's 4 pending UAT scenarios and two `human_needed` verifications
(31.1, 33).

**Archive note:** `milestones/v1.7-ROADMAP.md` and `v1.7-REQUIREMENTS.md` are
FULL snapshots at v1.7 close, not v1.7-scoped extracts — v1.6 was never
archived, and all 35 phase directories remain in `.planning/phases/`. The
archiving CLI attributed every phase on disk to this milestone; those figures
(19 phases / 97 plans / 178 tasks) were incorrect and have been replaced by the
scope stated above.

## v1.6 — CRM Foundation

**Shipped:** 2026-09-04
**Phases:** 6 (29, 30, 31, 31.1, 33, 34) | **Plans:** 48 | **Plan↔Summary parity:** 48/48
**Requirements:** 34/34 satisfied (`v1.6-REQUIREMENTS.md`'s own Traceability section
miscounts this as "31/31" over a 39-row table — see Known gaps at close)
**Tests:** 2254 passing / 52 skipped (env-gated) / 0 failed, measured at git tag `v1.6` via an
isolated worktree checkout (not inherited from v1.5's or v1.7's figures) · `tsc --noEmit` clean ·
`eslint --max-warnings=0` clean
**Git range:** `14d6996..bb91307` (362 commits since the v1.5 tag · code +166,235 / −5,059
across 840 files)
**Timeline:** 2026-08-31 → 2026-09-04 (5 days)
**Known deferred items:** 4 at close — Phase 30's UAT (`30-UAT.md`, testing status, 4 pending
scenarios), Phase 31.1's and Phase 33's `human_needed` verifications, and 3 open context
questions on Phase 31's re-run idempotency / canonical-name selection (see `STATE.md` §
Deferred Items). All four were carried forward through v1.7 close and closed inside v1.8
(Phases 36-39).

Phase 32 (HubSpot Import) is recorded as **Removed 2026-09-02** by operator decision —
IMPORT-02/IMPORT-07 dropped with it, the number retained rather than reused (see ROADMAP.md §
Phase 32 for the full rationale). Phase 28 (ReUI/base-maia design-system migration) is
attributed to v1.6 but is retro-documented outside the GSD workflow (no PLAN, no
VERIFICATION — see plan 40-01 / ROADMAP.md); it is named here for completeness but is not
folded into the "6 phases" count above, which covers only the phases planned and verified
through this workflow.

### What shipped

The CRM foundation: client data gets its own life independent of proposals. A shared
`companies` registry (global fact) carries per-partner `client_relationships` (private,
channel-conflict safe) and relationship-scoped `contacts`; `proposals` gains a nullable FK to
a relationship. `proposals.inputs` stays byte-identical throughout — the CRM is strictly
additive, never a relaxation of the snapshot invariant. A source-agnostic reconciliation
engine backfilled every client already implied by existing proposals into real company +
relationship records (dry-run-first, SIREN auto-merge, human-resolved name-only matches). A
partner-advanced pipeline gives every relationship a stage and every proposal a won / lost /
unanswered outcome, SIREN-gated at win. The fiche client page shows registry-sourced company
identity (SIRENE-backed), per-section editing, and a single chronological timeline mixing
manual notes with system events, driving a next-action "à relancer" list.

### Key accomplishments

- **Phase 29 — Migration Safety Net** — repaired the `db-smoke` path filter so the gate
  actually fires on this repo's real migration paths (it was blind to the exact Phase 12
  regression), added an anti-rot guard, and repointed local dev off the production Neon branch.
- **Phase 30 — Company & Contact Registry** — `companies` (global) + `client_relationships`
  (private, per-partner) + `contacts` (scoped to the relationship) schema and surfaces;
  `proposals` gains a nullable FK; a new `sales` role added alongside `partner`/`admin` with
  zero change to existing access.
- **Phase 31 — Reconciliation Engine & Proposal Extraction** — a reusable, source-agnostic
  dry-run-first dedup engine (SIREN auto-merge, name-normalized flagging, human-resolution UI)
  that extracted every client already implied by `proposals.inputs` into real registry records
  without altering a single proposal snapshot.
- **Phase 31.1 — App Shell Refresh (inserted)** — the shell converged on the sibling Colibris
  product: header breadcrumbs, header-owned collapse control, a 120px brand lockup, and a
  two-tier radius scale that decouples container surfaces from controls.
- **Phase 33 — Pipeline** — a partner-advanced stage on the relationship (late stages
  system-owned, reserved for the future contract tool), a won/lost/unanswered outcome on the
  proposal, and a SIREN-gated win that never blocks quoting.
- **Phase 34 — Fiche client** — registry-backed company identity (SIRENE lookup + read-only
  render + audited shared-field edits), per-section editing, a tabbed client page, and a
  unified timeline mixing manual notes with automatically recorded system events.

### Verification artifacts

- `milestones/v1.6-ROADMAP.md` — v1.6-scoped roadmap extract (phases 29-34, prior milestones
  collapsed)
- `milestones/v1.6-REQUIREMENTS.md` — the 34-requirement traceability snapshot, now carrying
  the standard archive header
- `milestones/v1.6-MILESTONE-AUDIT.md` — the audit this entry's Known gaps section transcribes,
  re-run 2026-09-07 against the finished milestone (34/34 requirements, 6/6 phases, 27/27
  integration, 6/6 flows, `tech_debt`)
- `milestones/v1.6-MILESTONE-AUDIT-SUPERSEDED.md` — the stale 2026-09-01 audit (revised
  2026-09-02), preserved verbatim; it scored the milestone while phases 31/33/34 were still
  unbuilt and its findings are withdrawn, superseded by the 2026-09-07 re-run above

### Known gaps at close (acknowledged, not blocking)

- **Record-integrity — Coverage miscount:** `v1.6-REQUIREMENTS.md` § Traceability claims
  "Coverage: 31/31 (100%)" above a table listing 39 rows. The real v1.6 count is 34.
- **Record-integrity — GAME-01..GAME-05 double-attributed:** these five requirements appear in
  both `v1.6-REQUIREMENTS.md` and `v1.7-REQUIREMENTS.md`, mapped to Phase 35 in each.
  `ROADMAP.md` assigns Phase 35 to v1.7; the v1.6 ledger over-scopes by five requirements —
  the corrected v1.6 total is 34, matching the Requirements figure above.
- **Record-integrity — SHELL-C1..SHELL-C7 have no REQ-ID:** Phase 31.1 delivered these seven
  success criteria as phase-local criteria with no requirement ID in either milestone ledger.
  The work is real and consumed (per the milestone audit's cross-phase integration check); it
  is simply invisible to REQ-ID-based coverage accounting.
- **Record-integrity — Phase 28 has no verification record:** no PLAN, no VERIFICATION.md —
  only a retro-documented summary, outside the GSD workflow, recorded as such in ROADMAP.md.
  Accepted by design, not a defect; noted so future audits stop re-raising it.
- **Record-integrity — the archive pair was incomplete:** `.planning/milestones/v1.6-ROADMAP.md`
  did not exist prior to this plan; `v1.6-REQUIREMENTS.md` existed alone. Closed by this plan
  (40-05).
- **INFRA-05 (Phase 29):** verified on an architectural-inference basis at the time; the
  empirical write-isolation proof was explicitly not obtained (`29-VERIFICATION.md`). Closed
  retroactively outside v1.6 by Phase 36's `scripts/probe-write-isolation.ts` (live-fire probe
  against Neon main) and hardened again by Phase 39 (OPS-05).
- **Phase 29 Nyquist:** `29-VALIDATION.md` records `nyquist_compliant: not-derivable`.
- **Phase 30 — `30-UAT.md` reconciliation:** frontmatter status is still "testing"; its
  "Current Test" block is stale (parked at test 2) and its Summary counts (passed 8 / issues 3 /
  pending 4) do not reconcile with the 13 itemized results (12 pass + 1 fixed).
  Documentation-quality only.
- **Phase 30 — `admin.companies.search` copy:** placeholder text reads "client ou référence" on
  a surface that searches company name and SIREN. Reviewed by Antoine 2026-09-02 and accepted
  as shipped (recorded in `REQUIREMENTS.md` § Out of Scope).
- **SHELL-C7 (Phase 31.1):** the dark-theme shell + PDF surface visual check could not be
  closed inside v1.6 — the browser session dropped mid-check. Closed 2026-09-06 by Phase 38
  CLOSE-02, evidenced in `38-UAT.md`.
- **Phase 33 — voided acceptance evidence:** `33-VERIFICATION.md` scores 5/5 must-haves in code
  but records 2 with voided acceptance evidence — the 33-09 acceptance table was not trusted
  and the criteria were re-derived from `ROADMAP.md` instead.
- **Phase 33 — unperformed verification:** a production-build check of the SIREN-gate dialog
  (dialog stays open, retains typed date and reason, reveals the SIREN field) against a seeded
  Neon development branch is recorded in `33-VERIFICATION.md` under `human_verification` and
  was never run.
- **Nyquist coverage:** 5 of 7 v1.6 phases have no VALIDATION.md — 28, 31, 31.1, 33, 34. Phase
  30 is compliant; Phase 29 is partial (not-derivable).

### Archive

- `milestones/v1.6-ROADMAP.md` · `milestones/v1.6-REQUIREMENTS.md`
- The six phase directories (29, 30, 31, 31.1, 33, 34) plus Phase 28 are to be archived to
  `milestones/v1.6-phases/` by Phase 40 plan 40-06.
- **Correcting the v1.7 entry's Archive note, without editing it:** the statement above, under
  `## v1.7`, that "v1.6 was never archived, and all 35 phase directories remain in
  `.planning/phases/`" describes the state **at v1.7 close** (2026-09-05), not the state now.
  v1.6 **is** now formally archived with a milestone-scoped `ROADMAP.md` + `REQUIREMENTS.md`
  pair, per this entry.

---

## v1.5 — Proposal List Actions & Pill Fix

**Shipped:** 2026-05-30
**Phases:** 2 (26-27) | **Plans:** 5 | **Plan↔Summary parity:** 5/5
**Requirements:** 6/6 active satisfied (ROWACT-02 per-row Delete descoped → Archive-only, D-01)
**Tests:** 1184 passing / 4 skipped (env-gated) / 0 failed · typecheck + `eslint --max-warnings=0` clean
**Git range:** `add7599..8dfb1d6` (37 commits since v1.4 tag · code +2,277 / −51 across 30 files)
**Timeline:** 2026-05-30 (1 day)
**Known deferred items:** 4 (stale planning artifacts from v1.1/v1.4 — see `STATE.md` Deferred Items)

### What shipped

A focused UI-regression milestone on the partner `/proposals` surface — no change to the core
proposal flow. Restored per-row management actions: active/expired rows now expose a per-row
**Archive** icon button (instant in-place refresh + toast), the Archivées view (`?archived=1`)
gains a per-row **Restore**, and draft rows keep their existing Edit + Archive + Delete set — all
without disturbing the ADMIN-09 commission-invisibility envelope (19-gate grep-contract suite stays
green). Per-row Delete on finalized rows was descoped mid-milestone (D-01): given the single
soft-delete state, Archive and Delete collapse to the same operation, so a single Archive button
ships. Separately, the status-pill rendering regression was fixed — the chip on both the home
"Propositions récentes" list and the `/proposals` table now hugs its content adaptively (trailing
`max-content` grid track), full label, aligned, in light and dark; the chip component + color
tokens stayed frozen.

### Key accomplishments

- **Active/expired row actions** — per-row Archive on non-draft rows + Restore in the Archivées view; instant in-place refresh + toast; body-click navigation preserved; `ProposalRowDto` never carries commission/`params_snapshot`; ADMIN-09 19-gate grep suite green (Phase 26: ROWACT-01/03/04/05; ROWACT-02 descoped D-01)
- **Status-pill rendering fix** — home "Propositions récentes" chip moved to a trailing content-hugging `max-content` grid track with a `justifySelf:'start'` wrapper, eliminating the fixed-90px stretch/clip; `/proposals` re-verified post-Phase-26 row-action slots; `globals.css` `.chip*` + `StatusChip.tsx` untouched (Phase 27: UIFIX-02/03)

### Verification

- Phase 26 — 3/3 plans verified; Phase 27 — 2/2 plans verified + **human-tested** (both surfaces, light + dark, FR + EN).
- Full vitest suite 1184 passing / 0 failed; `tsc --noEmit` clean; `eslint --max-warnings=0` clean.
- Code review (Phase 27, standard depth): 0 critical / 0 warning / 2 info (inert CSS, non-blocking).

### Known gaps

None — all active v1.5 requirements satisfied. (Teal rebrand BRAND-01/02/03 remains shelved as Future Requirements, descoped since v1.4 Phase 25.)

### Archive

- `milestones/v1.5-ROADMAP.md` · `milestones/v1.5-REQUIREMENTS.md`

---

## v1.4 — Partner Types, Admin Dual-View & Rebrand

**Shipped:** 2026-05-30
**Phases:** 4 (22-25) | **Plans:** 12 | **Plan↔Summary parity:** 12/12
**Requirements:** 19/19 active satisfied (BRAND-01/02/03 teal rebrand descoped)
**Tests:** 1184 passing / 4 skipped (env-gated) / 0 failed · typecheck clean
**Git range:** `6893a4f..effb59c` (129 commits) · code +12,244 / −1,421 across 155 files
**Timeline:** 2026-05-29 → 2026-05-30 (2 days)
**Known deferred items:** 4 (stale planning artifacts — see `STATE.md` Deferred Items)

### What shipped

A `partner_type` dimension (Agent / Commercial / Partenaire) that conditions proposal economics
end-to-end. Agent/Commercial proposals compute the loyer **without** the commission factor, with
commission **structurally absent** from every surface (wizard, live preview, dashboards, PDF,
server logs, audit payloads) — the first approved exception to the frozen formula, kept tightly
scoped (`Partenaire` formula + tranches unchanged; all existing accounts backfilled to
`Partenaire`). Plus a session-only Admin/Agent view toggle for admins, a PDF typography fix
(U+202F glyph overlap) + Destinataire-block removal, and admin-home label changes + status-pill
sizing fix. The teal rebrand (BRAND-01/02/03) was descoped mid-milestone and shelved.

### Key accomplishments

- **Partner types + commission-free calc** — `partner_type` column (migration `0006` + Better Auth additionalField + idempotent backfill); commission-free variant via a `commissionPct:0` seam with 12 golden cases (±0.01 €, `formula.ts` frozen); required type selector on the create form + audited `adminUpdatePartnerType` (Phase 22: PTYPE-01..07)
- **Commission structural absence + 19-gate grep suite** — commission omitted (not hidden) across wizard steps 2+3, live preview, PDF; `params_snapshot` records `partner_type` + `commission_applied` for reproducibility; ADMIN-09 grep-contract suite grown 13→19 gates; 21 STRIDE threats closed (ASVS L1) (Phase 22)
- **PDF rendering fixes** — root-caused number/typography glyph overlap to U+202F; PDF-scoped `sanitizePdfNumber` (U+202F/U+00A0 → space) with reproduction test, `format.ts` untouched; Destinataire block removed with clean reflow; byte-determinism fixture regenerated + Agent/Commercial commission-free corpus (Phase 23: PDF-01..03)
- **Admin dual-view toggle** — session-only view store (`sessionStorage` + `useSyncExternalStore`, cleared on logout); `ViewToggle` behind `isAdmin` gate; `effectiveView` nav remap; authorization unchanged (server-derived `isAdmin` short-circuits forged flags); 7 STRIDE threats closed; 5 code-review warnings fixed (Phase 24: VIEW-01..04)
- **Admin-home polish** — COPY-01..04 FR+EN relabels ("Toutes les propositions", "Coefficients & Commissions", "Dernière Modif Coef") with `_EnHasAllFrKeys` parity proof green; status-pill `max-content` hug-content fix (Phase 25: COPY-01..04, UIFIX-01)

### Verification artifacts

- `milestones/v1.4-ROADMAP.md` — full phase + plan archive with milestone summary
- `milestones/v1.4-REQUIREMENTS.md` — 22-requirement traceability with final outcomes (19 satisfied, 3 descoped)
- `milestones/v1.4-MILESTONE-AUDIT.md` — convergent-evidence audit (19/19 reqs, 6/6 integration, 2/2 E2E flows, PASSED)
- `reports/MILESTONE_SUMMARY-v1.4.md` — narrative milestone report (onboarding pointer + next-session notes)
- Per-phase `SUMMARY.md` (12 files); SECURITY.md for Phases 22+24; REVIEW.md + REVIEW-FIX.md + UAT.md for Phase 22/24

### Key decisions (v1.4)

- **Partner-type formula exception** — Agent/Commercial drop the commission factor; first break in the frozen-formula constraint, strictly scoped (`Partenaire` formula + tranches stay frozen)
- **Commission as structural absence, not CSS hiding** — defense-in-depth against leakage, enforced by the 19-gate grep suite
- **View toggle is session-only + server-derived authz** — a nav convenience, never a permission change (VIEW-04)
- **PDF-scoped sanitizer** — confine the U+202F fix to the PDF layer; leave `format.ts` and the byte-determinism surface untouched
- **Teal rebrand descoped 2026-05-30** — `--gd` token split + WCAG re-audit across ~63 sites judged too much effort for too little value; shelved (revisitable), not killed

### Known gaps / tech debt at close (acknowledged, non-blocking, all Info-level)

- Stale `deferred-items.md` lint entry in Phase 22 (already resolved in 22-05; delete the file)
- Migration label drift `0005`→`0006_workable_yellow_claw.sql` reconciled 2026-05-30 (doc-only)
- Phase 24: dead `fullWidth` prop on `ViewToggle`; unused `adminHrefs.history`; duplicated `rgba(18,150,87,0.10)` active-tint literal (extract to a CSS var); retained back-compat i18n keys
- `partnerType` session fallback re-derived in 3 places (finalize route + calcul + verification) — a shared helper would reduce drift risk

### Deploy gate (pre-onboarding, not a code blocker)

Migration `0006_workable_yellow_claw.sql` + `partner_type` backfill (`db:backfill:partner-type`, `BACKFILL_CONFIRM=YES`) must be applied to Neon `main` via the `MIGRATE PROD` GitHub Action before the first real Agent/Commercial partner is onboarded. Per session record the 0005→0006 reconcile + Neon apply occurred 2026-05-30 — **confirm applied** before onboarding.

---

## v1.1 — Hosted Web App Foundation

**Shipped:** 2026-05-11
**Phases:** 6 | **Plans:** 46 | **Plan↔Summary parity:** 46/46
**Requirements:** 108/108 (105 ✅ complete + 3 partial — see audit)
**Timeline:** 2026-05-05 → 2026-05-11 (6 days from Phase 5 scaffold to Phase 10 audit pass)
**Deliverable:** `https://leasetic-matrice.vercel.app` — Vercel-hosted Next.js 16 + Neon Postgres + Vercel Blob + Better Auth, OVH-portable architecture
**Git range:** `24a9bae..5df081a` (236 commits, 300 files changed, 16,139 LOC across `src/` + `app/`)
**Known deferred items:** 7 (see `STATE.md` Deferred Items section and `milestones/v1.1-MILESTONE-AUDIT.md`)

### What shipped

Migration of the Leasétic Matrice from a single-file standalone HTML quote tool to a **hosted multi-page web application** with admin-invited authentication, persistent PDF proposals stored as immutable blobs per partner, admin-only global financial parameters (commission / max / validity / coefficients), and a coefficient-snapshot pattern that makes existing PDFs immune to future parameter edits. The full v10 calculation formula was ported as a pure-TS module with a 30-case golden corpus asserting ±0.01 € parity in CI. The architecture is deliberately OVH-portable: a `lib/storage` + `lib/db` adapter spine plus ESLint + CI grep gates prevent Vercel-only imports outside those modules, so the September 2026 OVH cutover can swap drivers via env-var changes only.

### Key accomplishments

- **Vercel-hosted Next.js 16 + Neon Postgres + Vercel Blob deployment** with `/healthz` live exercising DB read + blob round-trip via portable adapters; `output: 'standalone'` from first commit; CI enforces no-Vercel-only-imports rule on every PR (Phase 5: BOOT-01..12)
- **Admin-invited authentication** with Better Auth 1.6.9 + argon2id hashing + 8h sliding sessions; hidden `/[adminSegment]` admin tree with 2-layer gate (env-segment `notFound()` → `requireAdmin()`); no SMTP — invitations and resets are admin-mediated one-time URLs via the `InviteUrlModal` primitive; 231-key FR/EN i18n dictionary with compile-time `_EnHasAllFrKeys` parity proof; light/dark mode with no-flash cookie-driven SSR (Phase 6: AUTH-01..18, SHELL-01..14)
- **Pure-TS calculation engine** at `src/lib/calc/` with the frozen v10 formula `loyer = amountHT × (1 + commission/100) × coefficient / 100`; 30-case golden corpus in CI with ±0.01 € tolerance; live preview (300ms debounce) on the proposal entry form with full 5-state machine (idle / expired / missing / on-demand / computed) and LC reference + Copy button + 15/30/60-day validity selector (Phase 7: CALC-01..08, PROP-01/06/07/08/24/25)
- **Persistent PDF proposals with `params_snapshot` immutability** — single `POST /api/proposals` handler with client-generated `Idempotency-Key`, server-side `computeLoyer()` recompute (never trusts client), deep-copy snapshot of `global_params` into the row, deterministic `@react-pdf/renderer` PDF (CI-gated SHA-256 byte-equality on a fixture proposal), blob upload at `proposals/{userId}/{proposalId}.pdf` with private access; cursor-paginated home list + ILIKE search + soft-delete (30-day window) + duplicate flow (snapshots *current* params, not source's) (Phase 8: DATA-01..12, PROP-02..05/09..23/26)
- **Admin operating surface** at `/[adminSegment]/coefficients` (editor + computed-diff confirmation modal + cursor-paginated history with per-row diff + pure-client "Explain calculation" debug tool — the SOLE non-editor surface allowed to display `commission_pct` per ADMIN-09) and `/[adminSegment]/accounts` (6-column partners list with proposal counts, per-row disable/re-enable via sonner confirm-toast, re-issue invitation, send password reset, create-new-partner modal); 42 STRIDE threats verified closed (ASVS L1); cross-cutting commission redaction discipline enforced across server logs, audit_log payloads, and partner-facing surfaces (Phase 9: ADMIN-01..09)
- **Cutover & polish operational layer** — `docs/operations/deploy-ovh.md` runbook + `scripts/smoke-ovh.ts` 7-step full-lifecycle smoke (deferred OVH execution to September 2026; capability ships now); twice-monthly Vercel Cron at `0 3 1,15 * * UTC` → dual-auth `/api/internal/purge-soft-deleted` route → shared `src/lib/admin/purge.ts` pure function called by both CLI and cron; email-pattern test-data discriminator (`@test.leasetic.com`) with `scripts/purge-test-data.ts` pre-launch scrub; `<SeedBanner>` first-login confirmation surface; CI grep gate blocking v10 localStorage key resurrection; 55 STRIDE threats verified closed (Phase 10: CUT-01..09)

### Verification artifacts

- `milestones/v1.1-ROADMAP.md` — full phase + plan archive
- `milestones/v1.1-REQUIREMENTS.md` — 108-row traceability with final outcomes
- `milestones/v1.1-MILESTONE-AUDIT.md` — integration check + cross-cutting invariants + Drizzle correlated-subquery latent-bug audit (commit `5df081a`)
- Per-phase artifacts under `.planning/phases/{05..10}-*/` — SUMMARY.md per plan (46 files), REVIEW.md + REVIEW-FIX.md for Phases 8/9/10, SECURITY.md for Phases 9/10 (97 threats verified closed across the two)
- 399/399 Vitest tests passing as of milestone close; typecheck + lint + build all clean
- Code review surfaced and fixed 21 findings across Phases 8/9/10 (5 critical + 11 warning + 5 info-deferred); zero open critical issues

### Key decisions (v1.1)

- **Vercel + Neon + Better Auth** chosen over NextAuth alternatives for adapter ergonomics, EU-hosting compliance, and OVH portability; locked at Phase 5 with all dep versions pinned exact-no-carets
- **OVH portability is a CI claim, not a runtime claim** in v1.1 — the smoke script + runbook ship now; actual OVH deploy is September 2026 (v1.2 follow-up)
- **PDF immutability via `params_snapshot` jsonb** (Stripe pattern, Option A in ARCHITECTURE §2.5) — old PDFs render byte-identically forever even after admin coefficient edits
- **Commission invisibility extended to logs / traces / audit payloads** (ADMIN-09 cross-cutting), with the explicit "Explain calculation" debug tool as the sole authorized exception
- **Hard cutover from v10 — no localStorage migration path**; v10 was never hosted (delivered as emailed HTML file), so CUT-02 collapses vacuously
- **Phased pilot launch** (2-3 trusted partners → 1-2 weeks observation → batch onboard); Antoine owns partner comms directly (not delegated to Thomas)

### Known gaps at close (acknowledged, not blocking)

- BOOT-03 partial: Neon 3-branch split deferred — all Vercel scopes currently route to the `main` Neon branch (functionally green; documented Phase 5 follow-up)
- ADMIN-05 operational gap: `users.last_login_at` is read by the admin accounts page but never *written* anywhere in the auth code — every partner row will show `'—'`
- DATA-11 legal counsel sign-off on 10-year PDF retention deferred (Thomas reply pending; stub committed at `docs/legal/privacy-coverage-confirmation.md`)
- CUT-09 live OVH smoke deploy deferred to September 2026 (capability shipped: `scripts/smoke-ovh.ts` + `docs/operations/deploy-ovh.md`)
- Admin password rotation (`leasetic2026` → individual strong) — Phase 6 follow-up #1, must complete *before* first real partner is onboarded
- Better Auth `trustedOrigins` hardening deferred to v1.2 (SameSite=Lax + `__Secure-` cookies are the actual CSRF defense)
- 2 stale `[~]` markers in v1.1 REQUIREMENTS.md (CALC-07, PROP-01) — functionally satisfied by Phase 8 work; cosmetic only

### Surprises captured

- **Drizzle correlated-subquery name-resolution footgun** (commit `4879831`) — `${schema.users.id}` interpolation inside a `sql\`...\`` template emits unqualified `"id"`, which Postgres binds to the wrong inner-table column. Caught in production via Vercel runtime logs after the partners page 500'd; fixed by inlining `users.id` as raw SQL. The milestone audit confirmed no other latent instances of this pattern exist in the codebase
- **Vercel Cron auth env-var reserved name** (commit `df6fdae`) — Vercel auto-injects `Authorization: Bearer ${CRON_SECRET}` using the literal env-var name `CRON_SECRET`. The Phase 10 plan originally named it `PURGE_CRON_SECRET`; CR-01 fix renamed to match Vercel's reserved name. Would have caused the soft-delete purge cron to silently 401 forever without alerting (CUT-07 alerting is deferred to v1.2)
- **Token-scope friction on push** — the local `gh` token initially lacked the `workflow` scope needed to push commits modifying `.github/workflows/`; resolved with `gh auth refresh -s workflow`. Worth flagging for any future contributor

---

Living log of shipped versions. Each entry summarizes what shipped, when, and where the detailed archives live.

---

## v1.0 — Matrice Commerciale v10 Refactor

**Shipped:** 2026-04-30
**Phases:** 4 | **Plans:** 11 | **Plan↔Summary parity:** 11/11
**Requirements:** 69/69 ✅
**Deliverable:** `Matrice_2026_THE_Leasetic-v10.html` (2,296 lines, single-file standalone)

### What shipped

A complete refactor of the Leasétic Matrice Commerciale standalone HTML quote tool, modernizing the v9 baseline (911 lines, ES5 vanilla, plaintext password, no XSS guards, alert-driven UX, French only) into a production-grade v10 with:

- **Functional parity** with v9 across all 22 PARITY requirements; backward-compatible reads of v9 localStorage so existing partners need zero reconfiguration
- **ES6+ refactor** with labeled CSS sections (TOKENS / LAYOUT / COMPONENTS / PRINT) and JS sections (STATE / I18N / UTILS / CALC / ADMIN / PROPOSAL / MIGRATION / INIT); zero `var`, template literals, arrow functions
- **Security hardening:** SHA-256 password hashing via Web Crypto API, transparent in-place migration of plaintext `lt_pw`, current-password confirmation gate, `escapeHtml()` wrapping every user-sourced HTML interpolation (23-row authoritative audit table)
- **UX polish:** non-blocking toast system, real-time blur-based field validation, document-level keyboard shortcuts (Enter/Esc), auto-focus on failed submit, copy-LC button, configurable validity (15/30/60 days)
- **FR/EN bilingual** with ~138 dictionary keys × 2 languages, segmented header toggle, instant proposal re-render on language switch, bilingual RSE page caption
- **Modern SaaS shell:** retractable left sidebar (260px ↔ 72px), sticky topbar with per-page contextual actions, footer, pill buttons, shadow cards, larger typography, leasetic.fr-aligned design tokens
- **Light + dark mode** with no-flash theme restoration, Colibris-inspired dark palette, all Leasétic brand colors preserved, proposal forced to stay white in dark mode for print-output parity
- **On-load self-check triad:** `assertCalc` (6/6 fixtures), `assertEscape` (8/8 fixtures), `assertValidity` (6/6 fixtures) — every page load logs green or surfaces a regression immediately

### Verification artifacts

- `phases/01-parity-refactor/PARITY-AUDIT.md` — 22-row evidence log + browser smoke runbook
- `phases/02-security-hardening/SEC-TEST.md` — XSS payload fixtures + 23-row HTML-writing audit table
- `phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md` — Master ship-gate runbook (Sections A-J, ~75-105 min Chrome+Edge)

### Key decisions

| Decision | Outcome |
|----------|---------|
| Standalone single HTML file (no build tools, no framework) | ✓ Held — distribution model is "send the file" |
| Ship as `-v10.html` alongside intact `-v9.html` | ✓ Held — partners can roll back by reopening v9 |
| Manual test checklists instead of Playwright | ✓ Held — matches the no-build-chain constraint |
| SHA-256 via Web Crypto API for password hashing | ✓ Validated in Phase 2 |
| Hierarchical i18n keys in a single JS dictionary | ✓ Validated in Phase 3 |
| Light sidebar in Phase 4 (Dashly-style, not navy) | ✓ Held — navy would compete with white content cards |
| `--surface` token introduced for dark mode | ✓ Held — semantic separation from `--white` |
| Proposal page stays white in dark mode | ✓ Held — print parity over visual unity |
| No-flash inline `<head>` script for theme restore | ✓ Held — prevents flash of light content |

### Issues encountered + resolved

- **Premature `</script>` close in `assertEscape` fixture** — A literal `</script>` string inside the JS test fixture closed the HTML script block early, dumping unprocessed JS as visible page text. Fixed by escaping the forward slash (`<\/script>`).
- **CSS variable name collision** — v9's `--sidebar-w: 24px` was used by the proposal page's internal navy strip. Phase 4 introduced `--shell-sidebar-w: 260px` rather than overloading.
- **Duplicate IDs from button consolidation** — Topbar Save/Lock buttons renamed to `btn-save-topbar` / `btn-lock-topbar`, delegating clicks to the inline admin-panel buttons.
- **Dashly icon experiment reverted** — Mid-milestone iteration where filled-green Dashly tiles temporarily replaced the feather-style icons. Antoine preferred the feather style; reverted while keeping all retractable-sidebar work intact.

### Tech debt + carried forward to next milestone candidates

- Distribution model is still "edit + resend" per partner (no hosted version)
- No automated browser tests (manual runbooks only)
- LC references random + uncentralized (no backend dashboard)
- No proposal-portfolio Excel export
- No mobile-optimized layout (degrades gracefully but not optimized)

### Patterns established (carry forward)

- Plan↔Summary 1:1 ratio as the milestone-completeness invariant
- CONTEXT.md as the durable phase decision log (locked decisions before planning)
- On-load self-checks (`assertX()`) as regression early-warning per invariant
- Labeled CSS + JS sections for predictable code placement
- Sequential waves for shared-file projects (avoid merge conflicts)
- Atomic commits per task
- `<symbol>` + `<use>` SVG sprite with `currentColor` inheritance
- Tokens → surfaces → states (design changes start at the variable layer)

### Known notes at close

- **Git history was lost during a directory move** (cloud-sync corruption zeroed ~109 object files including HEAD). Working tree was 100% intact. Re-initialized fresh git history at milestone close with the v1.0 deliverable as the initial commit. The corrupted `.git.corrupted-backup/` directory remains in the project root for any future recovery attempts (gitignored). Planning artifacts and per-phase summaries preserved the *why* of every decision; the lost commit log was a finer-grained record of the same information.
- **`FINAL-TEST-v11.md` runbook has not yet been executed by Antoine.** Recommended before partner distribution.

### Detailed archives

- `.planning/milestones/v1.0-ROADMAP.md` — full phase-by-phase breakdown with plans, tasks, decisions
- `.planning/milestones/v1.0-REQUIREMENTS.md` — all 69 requirements with shipped status

---

*This file accumulates milestone summaries. Add new entries above this line when shipping v1.1+, with the most recent at the top.*
