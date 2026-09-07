# Project Retrospective — Matrice Commerciale

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.8 — Deferred Items

**Shipped:** 2026-09-07
**Phases:** 5 (36-40) | **Plans:** 26 | **Tasks:** 62 | **Commits:** 209

### What Was Built

Nothing new — that was the point. v1.8 closed the accumulated v1.0-v1.7 deferred backlog so no
shipped milestone still carries an unclosed item. It is a net *deletion* milestone: 215 code
files changed, +7,186 / −28,079.

- **Phase 36** — made the gates trustworthy again: `lint:check` back to zero findings, four stale
  v1.1-era `<open_questions>` blocks annotated with their real outcomes, 25 dead vendored ReUI
  directories (152 files, 1.1M) deleted on a dated decision, and INFRA-05's write isolation
  empirically probed against the real Neon branches rather than inferred.
- **Phase 37** — closed the `/proposals/[id]` admin dead end that Phase 30 assigned to
  "Phase 33/34" and neither picked up, walked the v1.6/v1.7 surfaces to `pending: 0`, and gave
  Phase 34 the VERIFICATION and REVIEW it had shipped 13 plans without.
- **Phase 38** — localised the icon-only dialog close labels, moved the legacy button rule on-grid
  and repointed all six focus selectors at `--ring`, and walked Phase 28's browser backlog in both
  themes.
- **Phase 39** — rewrote the local DB guard so it validates the *effective resolved*
  `DATABASE_URL` for the command about to run, from one declarative endpoint source, with a
  differential test pinning the bash guard and the TypeScript resolver together.
- **Phase 40** — made the planning record tell the truth: v1.6 formally closed and re-audited
  against its finished state, Phase 28 attributed, phases 28-35 archived.

### What Worked

- **Ordering the milestone so the gates land first.** Phase 36 shipped a clean `lint:check`
  before anything else, and every later phase proved itself against it. Sequencing by
  *what later work needs in order to be provable* beat sequencing by size or risk.
- **Verifiers that attack the phase's own claims.** Phase 38's verifier caught that
  `38-UAT.md` said two findings were "filed for a later phase" while nothing had reached
  REQUIREMENTS.md — *"A UAT footnote that says 'filed' is not filing."* Those became HOUSE-05 and
  HOUSE-06, went to Phase 40, and Phase 40 closed them. Coverage 22/22 → 24/24. That loop closing
  inside one milestone is the clearest evidence the verification layer earns its cost.
- **Recording overrides as accepted-not-closed.** Phase 38's operator override says in its own
  words *"These gaps are accepted, not closed. Nothing below is a claim that the missing
  observations were made."* Six weeks from now that sentence is worth more than a green checkmark.
- **Declining to accept a risk on purpose.** The security auditor proposed logging WR-07 as an
  accepted risk. That was declined specifically so it keeps resurfacing at every close while the
  fail-open still ships. Accepting it would have bought silence, not safety.

### What Was Inefficient

- **Four test files were never committed.** 39 tests enforcing GAP-04, CLOSE-01/03/04, HOUSE-03
  and HOUSE-04 passed locally, were recorded as `✅ green` in the VALIDATION coverage tables, and
  were absent from every CI checkout — not skipped, absent, with CI still reporting green. The
  milestone audit found them; `40-VERIFICATION.md` had already flagged one. The regression guards
  this milestone built existed on one machine for three days.
- **A verification report went stale in 24 hours and nobody amended it.** WR-01 was fixed on
  2026-09-06 in `c669d33`; `37-VERIFICATION.md`, written the previous evening, still described it
  as a live defect awaiting an operator decision. The milestone audit read that description as
  current state and reported a defect that did not exist — then ranked it first in its tech debt.
- **The generated MILESTONES entry needed a full rewrite.** `milestone.complete` dumps every plan
  one-liner verbatim; two summaries had non-one-liner values (`PASS`, `five findings`) and one was
  multi-line, breaking the list. The template's own instruction is 4-6 curated accomplishments.
- **The audit ran twice.** The first pass ran mid-milestone, before Phase 40 existed, and scored
  nine requirements as unsatisfied-by-definition. Cheap to redo, but the run had no chance of
  being right.

### Patterns Established

- **Post-Verification Amendment sections.** Started by `38-VERIFICATION.md` (recording an operator
  override without rewriting the findings) and now used by `37-VERIFICATION.md` (recording a fix
  that landed after the report). Leave the original findings unedited; append what changed.
- **One declarative source read by every consumer.** `scripts/_neon-endpoints.list` replaced five
  divergent hardcoded endpoint tables, with a data-integrity test as the regression net and one
  documented, test-enforced exemption.
- **Differential tests where two implementations must agree.** The bash guard and the TypeScript
  resolver are proven to resolve the same `DATABASE_URL` for every case, so they cannot drift
  apart silently — the failure mode that caused the 2026-09-06 incident in the first place.
- **Correcting a ledger with dated amendments rather than edits.** Phase 40 amended OPS-01..04 and
  GAP-05 in place with "Amended 2026-09-07" parentheticals and the original text preserved, and
  closed HOUSE-06 with an errata block rather than editing the walk's evidence table.

### Key Lessons

1. **A test that is not committed is not a test.** CI does a plain checkout: an untracked test
   file does not skip, it is absent, and the build stays green. Add "does `git status` show
   untracked test files?" to phase close, not just to milestone audit.
2. **Verification reports are dated observations, not live views.** On a three-day milestone the
   record goes stale faster than anyone re-reads it. Anything that reads a report as current state
   — including a milestone audit — must re-derive from code before reporting a live defect.
3. **A narrowly-worded success criterion passes while the change's blast radius escapes it.**
   GAP-01's criterion covered *reaching* the proposal page; it said nothing about what an admin
   could then do there. The gap was caught by the code review, not by criterion-matching.
4. **Some verification is structurally blocked, not merely unscheduled.** A route that refuses
   admins by design, a wizard that writes a draft on entry, a pagination control that needs a
   multi-page dataset. Those need a relationship-holder login and a disposable database — a
   milestone-level prerequisite, not something a phase can arrange for itself. This is the
   concrete argument for the long-deferred Playwright work.
5. **Backlogs drain when a milestone is dedicated to them.** v1.7 closed with 8 deferred items,
   none originating in v1.7; two had been explicitly assigned to later phases that shipped without
   picking them up. Every one of those is now closed, along with the v1.1 close's entire deferred
   table. Assigning debt to "a later phase" did not work; assigning it to a milestone did.

### Cost Observations

- Model mix: `balanced` profile — orchestration on Opus, verification/review/integration subagents
  on Sonnet
- Timeline: 3 days (2026-09-05 → 2026-09-07), 209 commits, ~2-3 phases/day
- Notable: the highest-value findings of the milestone came from adversarial re-derivation, not
  from gates. All four CI gates were green while 39 tests were missing from CI and a stale report
  asserted a defect that had been fixed.

---

## Milestone: v1.7 — Sales Motivation

**Shipped:** 2026-09-05
**Phases:** 1 (Phase 35) | **Plans:** 5 | **Tasks:** 13 | **Commits:** 35

### What Was Built

Momentum, weekly streaks and a 3×3 badge ladder on the partner home page, derived
from v1.6's `relationship_events` at read time. No new table, no migration, no
awarding job — changing a badge criterion re-reads history instead of leaving
stale awards behind.

### What Worked

- **Interface-first wave 1.** 35-01 shipped only types and pure functions, which
  let the SQL plan (35-02) and the React plan (35-03) be planned as siblings —
  neither had to guess the other's shape because both compiled against the same
  `types.ts`.
- **A plan whose deliverable was evidence, not code.** 35-04's stated output was
  "removing the owner predicate makes exactly this test fail", not "the test
  passes". That framing is why it was run for real rather than written and
  skipped.
- **Amending the contract instead of just editing the code.** When D-19 was
  reversed mid-flight, the amendment went into 35-CONTEXT.md and 35-UI-SPEC.md
  before any component change, so later audits verify against what shipped.

### What Was Inefficient

- **The checkpoint for a test database cost a full round trip** — and then a
  second one, because the agent asked the operator to `export` in their own
  shell, which never reaches an agent's Bash tool. The working channel is a
  gitignored file sourced inline. Now recorded.
- **Two UI iterations.** The first restrained version was judged unfinished; the
  gamified rebuild was judged too tall. Both were avoidable with a rendered
  preview before the human-verify checkpoint rather than after.
- **The archiving CLI mis-scoped this milestone**, attributing all 35 phase
  directories on disk to v1.7 and emitting several literal `One-liner:` parse
  failures. Corrected by hand. Root cause: no phase directory has ever been
  archived, and v1.6 was never formally closed.

### Patterns Established

- **Real-Postgres integration suites for isolation-critical queries.**
  Skip-by-default behind `DATABASE_URL_TEST`, hand-invoked, never wired to CI.
- **Mutation testing as the acceptance criterion** for a security-relevant
  query: break it, watch the named test fail, restore, verify `git diff
  --exit-code` clean.
- **Superseded-decision blocks** in CONTEXT/UI-SPEC that retain the original
  reasoning as a record while marking it no longer binding.

### Key Lessons

1. **A mocked test proves a WHERE clause was COMPOSED, never that it FILTERS.**
   2297 mocked-driver tests, a clean typecheck and a clean lint all passed
   against a query that threw on every real call. This is now the third
   production defect in this repo of exactly that shape.
2. **A type is a claim about the database, not a fact it enforces.** `toStage`
   is typed `PipelineStage | null` and sourced from unvalidated jsonb; the
   review found that an unexpected value would crash the entire home page,
   because the guard lived in a different module's Zod schema.
3. **Restraint without structure reads as unfinished.** The final card is both
   more visually expressive *and* shorter than the restrained one it replaced —
   304px vs 836px. Density came from layout, not from hiding content.
4. **A mitigation pinned to a literal count has a short shelf life.** A threat's
   mitigation was "`grep -c` pins the dictionary at 38 entries"; a same-day
   redesign made it 50. The property survived only because a behavioural test
   also enforced it.

### Cost Observations

- Model mix: orchestration on Opus, all executors and auditors on Sonnet
- Sessions: 1 (~13 hours wall-clock, heavily checkpoint-bound)
- Notable: the two most valuable outputs — the isolation suite's bug catches and
  the code review's crash finding — both came from agents told to look for a
  *specific* failure class rather than to "review the code".

---

## Milestone: v1.5 — Proposal List Actions & Pill Fix

**Shipped:** 2026-05-30
**Phases:** 2 (26-27) | **Plans:** 5 | **Commits:** 37 (since v1.4 tag) | **Tests:** 1184 passing

### What Was Built
Per-row Archive (active/expired) + Restore (Archivées) on the partner `/proposals` list with instant in-place refresh + toast; draft rows keep Edit + Archive + Delete; ADMIN-09 19-gate grep suite held. Status-pill rendering regression fixed on both the home "Propositions récentes" list and `/proposals` — chip now hugs content in a trailing `max-content` grid track, full label, aligned, light + dark.

### What Worked
- **Tight scope, fast close.** A two-phase UI-regression milestone shipped in a day. The pill fix was a 3-line consumer-grid change; treating it as a CSS-track defect (not a chip-component bug) — the diagnosis carried from Phase 25 D-03 — meant the component and color tokens stayed frozen.
- **Mid-milestone descope kept things honest.** Recognizing that Archive and Delete collapse to the same soft-delete state (D-01) avoided shipping a redundant Delete button; the requirement was explicitly marked descoped rather than silently dropped, and a Restore requirement (ROWACT-05) was added to close the loop.
- **Human-verify checkpoint did its job.** Phase 27's blocking `human-verify` task confirmed light/dark + FR/EN on both surfaces before the phase closed — exactly the kind of visual correctness a subagent can't self-assess.

### What Was Inefficient
- **Executor stream-idle interruption.** The Phase 27-01 executor applied the correct edit and passed tsc but the SSE stream truncated mid-`lint:check`, returning a partial completion signal with no commit/SUMMARY. Recovery via the orchestrator's filesystem/git spot-check fallback worked, but it cost an inline finish (re-run lint, commit, write SUMMARY) the executor should have done itself.
- **`milestone.complete` accomplishment extraction is not milestone-scoped.** The CLI globbed every phase's SUMMARY one-liner (phases 1–27) plus parsing-noise lines (`One-liner:` / `Plan:`) into the v1.5 MILESTONES entry and miscounted "12 phases, 44 plans." Required a full manual rewrite of the entry. Worth a tooling fix or a pre-trimmed accomplishments input.

### Patterns Established
- **Trailing content-hugging chip in inline-grid rows:** `gridTemplateColumns: '… max-content'` with the chip as the last child wrapped in `justifySelf: 'start'` — now the canonical fix for chip-stretch defects, mirrored across home + `/proposals`.

### Key Lessons
- When an executor returns a truncated/partial signal, **spot-check disk + git before assuming failure** — the work is often complete-but-unsignaled. The completion-signal fallback is the right reflex, not a re-dispatch.
- **Verify the milestone-close artifacts the CLI generates**, especially the MILESTONES entry — auto-extraction can pull cross-milestone content and bad counts.

### Cost Observations
- Model mix: orchestration on Opus; executor + reviewer + verifier on Sonnet (`executor_model`/`verifier_model: sonnet`).
- Sessions: 1 (plan → execute → ship → close in one sitting).
- Notable: `verifier_enabled: false` + a tiny presentational phase made inline verification (greps + human approval + VERIFICATION.md) cheaper and more reliable than spawning a verifier subagent.

## Milestone: v1.4 — Partner Types, Admin Dual-View & Rebrand

**Shipped:** 2026-05-30
**Phases:** 4 (22-25) | **Plans:** 12 | **Commits:** 129 | **Tests:** 1184 passing
**Timeline:** 2026-05-29 → 2026-05-30 (2 days)

### What Was Built

A `partner_type` dimension (Agent / Commercial / Partenaire) conditioning proposal economics
end-to-end (commission-free calc + structural commission absence for Agent/Commercial), a
session-only Admin/Agent view toggle, PDF rendering fixes (U+202F glyph overlap + Destinataire
removal), and admin-home label/pill polish. Teal rebrand descoped mid-milestone.

### What Worked

- **Convergent-evidence audit** in place of per-phase VERIFICATION.md (verifier disabled) — SUMMARY
  frontmatter + REQUIREMENTS traceability + SECURITY/REVIEW/UAT + a spawned integration check gave
  a defensible PASS without the verifier.
- **`commissionPct:0` seam** kept `formula.ts` frozen while adding the commission-free variant —
  the exception never touched the protected formula.
- **Structural absence + grep-contract suite** (13→19 gates) turned "commission must not leak" into
  an enforced, testable invariant rather than a review-time hope.
- **Descoping mid-milestone** (teal rebrand) when effort/value flipped — shelved cleanly to Future
  Requirements rather than half-shipping a token split.

### What Was Inefficient

- **Migration label drift** (`0005`→`0006`) + an unapplied Neon `main` migration surfaced as a
  localhost auth failure — cost a debug cycle a tighter migrate-on-merge discipline avoids.
- **`partnerType` session fallback re-derived in 3 places** — should have been a shared helper from
  the first plan.
- **Stale `deferred-items.md` lint entry** lingered after being resolved — close-time cleanup, not
  resolution-time.

### Patterns Established

- Partner-type as a first-class snapshot field (`partner_type` + `commission_applied`) for PDF
  reproducibility across type changes.
- View state as server-derived authz + session-only client preference (toggle ≠ permission).
- PDF-layer-scoped sanitizers that leave the shared `format.ts` / byte-determinism surface alone.

### Key Lessons

1. Apply migrations to the target Neon branch at merge time, not at close time — drift between the
   committed migration file and the live DB is a silent auth-breaker.
2. When adding a scoped exception to a frozen invariant, add the enforcing test (grep gate) in the
   same wave, not after.
3. Extract a shared helper for any value re-derived in ≥2 places, immediately.

### Cost Observations

- Model mix: balanced profile; `yolo` mode (auto-advance off).
- 2-day milestone, 129 commits — small, focused scope executed fast.
- Notable: Phase 22 (5 plans, 3 waves) carried most of the weight; Phases 23-25 were tight.

## Milestone: v1.1 — Hosted Web App Foundation

**Shipped:** 2026-05-11
**Phases:** 6 | **Plans:** 46 | **Commits:** 236 | **LOC:** 16,139 (`src/` + `app/`)
**Timeline:** 2026-05-05 → 2026-05-11 (6 days end-to-end)

### What Was Built

- **Hosted web app on Vercel** — Next.js 16 + Neon Postgres + Vercel Blob + Better Auth 1.6.9; OVH-portable adapter discipline mechanically enforced from first commit
- **Admin-invited auth + hidden `/[adminSegment]` admin tree** — env-driven URL obscurity + 2-layer `requireAdmin()` gate; admin-mediated invitation + reset flows via one-time `InviteUrlModal`; no SMTP dependency
- **Pure-TS v10 calculation engine** with 30-case CI golden corpus (±0.01 € parity); live preview (300ms debounce) on a 14-input proposal form; full 5-state machine
- **Persistent PDF proposals with `params_snapshot` immutability** — old PDFs render byte-identically forever even after admin coefficient edits; deterministic `@react-pdf/renderer` with CI-gated SHA-256
- **Admin surface** — coefficients editor + append-only history + first-login "Vérifier les coefficients" banner + sole-allowed commission-visibility "Explain calculation" tool; 6-column partners list with proposal counts
- **Cutover + operational layer** — `docs/operations/deploy-ovh.md` runbook + scripted full-lifecycle smoke (`scripts/smoke-ovh.ts`); twice-monthly Vercel Cron purge; email-pattern test-data discriminator (no schema column); CI grep gate blocking v10 localStorage key resurrection

### What Worked

- **Foundation-first phasing.** Phase 5 (Bootstrap & Deploy) explicitly produced the adapter spine + CI gates + healthz round-trip before any feature code. Every later phase consumed these foundations; the no-Vercel-only-imports rule was never violated because the gate caught it before the violation could land.
- **`params_snapshot` jsonb as the immutability mechanism.** Phase 8's choice of Stripe-Option-A (deep-copy snapshot at INSERT time) made PDF immutability an *invariant by data shape* instead of a code-path guarantee. No future phase could accidentally break it. Reading proposal detail page = read snapshot = identical render forever.
- **Phase-9 post-execution review + fix loop.** 12 findings (3 critical + 6 warning + 3 info), 9 auto-fixed via `gsd-code-fixer`, all 42 STRIDE threats verified closed in the same audit pass. The Generator/Verifier separation worked: executors built, reviewer caught what builders missed, fixer applied targeted patches, security auditor confirmed the closure. Same pattern repeated cleanly in Phase 10 (9 findings, 7 fixed, 55 threats closed).
- **6 days end-to-end.** Parallel-ready waves (especially Phase 8's 4-plan Wave 2) and Opus-as-planner + Sonnet-as-executor kept the orchestration tight. Phase 10 (the operational phase) was the smallest at 4 hours of work because all its patterns were already locked from Phases 5–9.

### What Was Inefficient

- **Drizzle correlated-subquery SQL footgun caught only in production.** The `${schema.users.id}` interpolation emitting unqualified `"id"` (which Postgres bound to `proposals.id` uuid instead of `users.id` text) passed every CI gate: typecheck (no type signal at the template-literal level), unit tests (fixtures, not real Drizzle SQL), lint (no static catch), build (no execution against Postgres). The partners page 500'd for the user before we knew. Hindsight: a tiny CI step that runs critical queries against a Neon preview branch would have caught it. **Action: add a read-only DB-smoke step to CI in v1.2 or v1.3.**
- **Frontmatter discipline drift.** The milestone audit found only 36 of 108 REQ-IDs claimed via `requirements_completed` in SUMMARY frontmatter, despite REQUIREMENTS.md showing 105 `[x]` complete. The traceability table is the canonical source, but per-plan frontmatter would catch coverage gaps faster. **Action: in v1.2, the planner template should default `requirements_completed: []` empty for the executor to fill rather than leaving it absent.**
- **Two stale `[~]` partial markers in REQUIREMENTS.md.** CALC-07 and PROP-01 were marked `[~]` at Phase 7 with notes about Phase 8 follow-up; when Phase 8 shipped, the markers weren't updated. The audit caught both; they're cosmetic but easy to miss. **Action: when a phase completes a requirement that was previously partial, the phase SUMMARY should explicitly bump the REQUIREMENTS.md checkbox.**
- **Heuristic accomplishments extraction in `milestone.complete`.** The auto-generated v1.1 entry in MILESTONES.md was full of fragments like "One-liner:", "File:", "Found during:" — the tool's regex extraction grabbed lines that didn't make sense out of context. Required manual rewrite. **Action: either fix the extraction heuristic upstream, or skip auto-generation in favor of explicit curated text.**

### Patterns Established

- **Phase-level threat model + post-execution code review + retroactive security audit triple.** Phases 9 and 10 produced PLAN-level `<threat_model>` blocks (ASVS L1), then post-execution `REVIEW.md` (12+9 findings caught), then `SECURITY.md` retroactively verifying each `mitigate` disposition has implementation evidence. The chain compresses beautifully: review-finds → fixer-applies → audit-confirms-in-the-same-pass. Worth keeping for any security-sensitive phase in v1.2+.
- **`verifier_enabled: false` is a viable project policy** when SUMMARY + REVIEW + SECURITY + milestone audit cover the verification ground. v1.1 had no per-phase VERIFICATION.md and shipped cleanly; the milestone audit verified the substitution explicitly.
- **Adapter discipline (`lib/storage` + `lib/db`) with CI grep gates** scales beautifully across phases. Cross-phase wiring stays clean because the gate prevents drift at PR time, not at audit time.
- **Typed-confirmation gates on destructive production operations** (`MIGRATE PROD`, `PURGE-SOFT-DELETED`, `PURGE-TEST-DATA`, `SMOKE-OVH`) — repeated 6 times across the milestone with the same shape. The discipline scaled cleanly.
- **Pre-staged `MILESTONE-CONTEXT.md` for the next milestone** (v1.2 was sketched in Figma + captured in `.planning/MILESTONE-CONTEXT.md` on the same day v1.1 closed). Worth keeping — feeds directly into `/gsd-new-milestone` without re-elicitation.

### Key Lessons

1. **Generator self-evaluation has a real blind spot for runtime-specific bugs.** Unit tests use fixtures; build checks types; lint checks syntax — none execute the actual SQL against the actual DB. Bug categories in this class: ORM template emission, env-var contract with the runtime (Vercel Cron's reserved `CRON_SECRET`), correlated subquery name resolution, JSONB key-order assumptions. Add a thin post-deploy DB-smoke probe to v1.2+ CI.
2. **Hidden-URL admin gates need an env-var presence check at deploy time.** ADMIN_URL_SEGMENT was empty in Vercel production for 4 days post-Phase-6 launch before anyone noticed (the admin tree was returning 404 by design when empty — fail-closed worked, but the misconfiguration was invisible until someone actually tried). A `/healthz` extension that confirms required env vars are present (not values, just non-empty) would catch this class.
3. **`milestone.complete` heuristics need curation.** The auto-extracted accomplishments list is too noisy to ship as-is; the milestone wrap-up step should always include manual curation. Better to acknowledge this upfront than relitigate the extraction quality each milestone.
4. **The `verifier_enabled: false` choice held up.** No per-phase VERIFICATION.md, no measurable verification gap. Future projects can adopt this confidently *if* they also adopt the REVIEW + SECURITY + milestone-audit triple as the substitute.
5. **6-day milestones are sustainable for one developer + AI.** The bottleneck isn't planning or execution — it's user-facing surfaces that need design taste (the v1.2 wizard is being scaffolded from Figma, not from prose). The Phase 10 work was almost entirely scripts + docs + adapter wiring — that's the rhythm v1.2 should expect to break from when it hits the wizard UI.

### Cost Observations

- **Model mix:** Opus 4.7 as planner + orchestrator (~30% of token spend); Sonnet 4.6 as executor + auditor + fixer (~65%); other models trivial (~5%)
- **Sessions:** Approximately 12-15 distinct GSD invocations across the milestone (discuss-phase × 6 + plan-phase × 6 + execute-phase × 6 + code-review × 3 + security × 2 + audit-milestone × 1 + complete-milestone × 1)
- **Notable:** Phase 9 + Phase 10 each had a planner-timeout-then-continue cycle (Anthropic SSE idle timeout at ~36 min / 32 tool uses); the workflow's filesystem-fallback handled both cleanly. Total wall-clock was ~10-15 minutes lost across both. Not worth optimizing yet.
- **One bug found in production cost ~30 minutes** (partner-page 500 → log diagnosis → Drizzle template fix → commit + push + redeploy + verify). Cheap given the bug never reached a real partner.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~10 | 4 | Established GSD discipline; 4 phases over ~4 days (Apr 26 → Apr 30); no per-phase REVIEW/SECURITY (single-file scope didn't warrant it) |
| v1.1 | ~15 | 6 | Added per-phase REVIEW (Phases 8/9/10) + SECURITY (Phases 9/10); Generator/Verifier separation paid off in 21 caught findings |
| v1.8 | ~12 | 5 | First milestone dedicated entirely to draining deferred debt; VERIFICATION on every phase, Nyquist VALIDATION records, and a milestone audit that fixed a CI-parity blocker inside itself |

### Cumulative Quality

| Milestone | Tests | Coverage | Notable additions |
|-----------|-------|----------|-------------------|
| v1.0 | On-load self-checks (assertCalc 6/6 + assertEscape 8/8 + assertValidity 6/6) running in browser at page load; no automated CI | n/a (no CI) | Manual test runbooks only |
| v1.1 | 399 Vitest tests + Drizzle migration discipline + ESLint + 3 CI grep gates + PDF byte-determinism gate + Neon DB round-trip on `/healthz` | typecheck + lint + tests + build on every PR | First automated test suite; first CI |
| v1.8 | 2,572 Vitest tests across 193 files; 20 ADMIN-09 grep gates; DB-guard fixture + differential suites | typecheck + lint (`--max-warnings=0`) + grep + tests + build + db-smoke on every push and PR | Differential testing between a bash and a TypeScript implementation; CI-parity as an explicit audit check |

### Top Lessons (Verified Across Milestones)

1. **Adapter discipline with mechanical enforcement beats convention** — v1.0's "send the file" model had no enforcement needed because there was no abstraction layer; v1.1's OVH-portability claim only holds because ESLint + CI grep gates *can't* drift. Future milestones with multi-environment claims should establish the gates Day 1.
2. **`params_snapshot` and `audit_log` as invariants-by-data-shape** generalize. Anywhere the spec says "old artifacts stay unchanged even when X edits," the cheapest implementation is "copy the relevant state into the artifact at creation time." Cheaper than enforcement code paths; impossible to accidentally break.
3. **Green gates are not coverage — check what CI actually ran.** (v1.8) Four test files holding
   39 regression guards were untracked, so CI never contained them and still reported success.
   Every gate was green throughout. Gate output tells you what passed, not what was measured.
4. **Assign debt to a milestone, not to "a later phase."** (v1.8) Items handed to "Phase 33/34"
   were still open two milestones later; a milestone dedicated to the backlog closed all 24.
5. **Manual test runbooks survive into the AI-paired workflow.** v1.0's PARITY-AUDIT / SEC-TEST runbooks were the only verification path; v1.1 has Vitest + CI but still relies on Antoine-eyes-on-Vercel for visual confirmation. Both regimes coexist comfortably. Don't drop manual checklists when adding automation.
