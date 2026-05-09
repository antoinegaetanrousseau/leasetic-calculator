# Phase 8 Discussion Log

**Date:** 2026-05-09
**Phase:** 8 — Persistence + PDF Pipeline
**Discussant:** Antoine Rousseau (product owner, sole reviewer)
**Mode:** default (4 single-question turns batched into 4 AskUserQuestion calls — area-driven)

---

## Process

The orchestrator presented Phase 8's domain boundary, listed 16 already-locked decisions carried forward from PROJECT.md / ARCHITECTURE.md / PITFALLS.md / Phase 6 + 7 CONTEXT (PDF library, immutability strategy, blob path, stream route, Node runtime, eager generation, single-page, self-hosted fonts, explicit Intl locales, byte-determinism CI gate, soft-delete + 10-year retention, ILIKE search, duplicate-snapshots-current-params, append-only global_params, Phase 6 deferring schema to Phase 8), then surfaced 4 clusters of remaining gray areas.

The user selected ALL 4 clusters via multiSelect. Each cluster was deep-dived with a single batched AskUserQuestion call (3 sub-questions per cluster). The user's selection in each call was consistent with the orchestrator's "(Recommended)" annotation, with one substantive divergence on soft-delete UX (Area C, Q3) where the user chose the more partner-friendly "Recently Deleted" filter toggle over the simpler 5-second undo toast.

---

## Area A: PDF layout & content (3 questions)

### Q1 — How close should the v1.1 PDF look to v10's print output?

**Options presented:**
- (a) Professional, not v10-equivalent — own clean layout, don't translate v10 print CSS, baseline scope (Recommended)
- (b) Near-v10 fidelity — translate v10 multi-column / page-break / backgrounds; PITFALLS §4.3 estimates 5-10x more layout work
- (c) Side-by-side prototype before deciding — 1-2 day spike

**Selected:** (a) — **Professional, not v10-equivalent.**

**Rationale:** PROP-15 already drops v10's RSE second page, so v1.1 is intentionally different. PITFALLS §4.3 is explicit that translating v10's `@media print` CSS into `@react-pdf/renderer`'s flexbox-ish subset is 5-10x more work. The "core value" phrasing in PROJECT.md ("pixel-correct 2-page PDF") was for v9→v10 parity, not for v1.1.

**Locked as:** D-A1.

### Q2 — What language does a generated PDF use?

**Options presented:**
- (a) Partner's current session language — committed at gen time, immutable (Recommended)
- (b) Always FR — simpler, matches v10
- (c) Partner picks at submit — toggle in submit step

**Selected:** (a) — **Partner's current session language, committed at gen time.**

**Rationale:** Matches Phase 6's i18n discipline (FR/EN throughout the app). PDF immutability invariant covers the language too.

**Locked as:** D-A2.

### Q3 — What goes in the PDF footer?

**Options presented:**
- (a) Minimal — LC reference + creation date + page number only (Recommended)
- (b) Rich — with signature line ("Bon pour accord, le ___" + partner contact block)
- (c) Rich — with mentions légales (SIRET, RCS, capital social)

**Selected:** (a) — **Minimal.**

**Rationale:** Decouples PDF render from legal/branding copy that may not be ready. Reduces coupling to Open Q3 (10-year retention legal sign-off). Mentions légales can move to email templates if needed.

**Locked as:** D-A3.

---

## Area B: Submit flow + failure recovery (3 questions)

### Q1 — What happens when row inserts but PDF render/upload fails?

**Options presented:**
- (a) Synchronous fail-loud — rollback row, return error, partner retries (Recommended)
- (b) Insert row first, regenerate via background job — adds job runner dep
- (c) Transactional rollback — DB transaction wraps PDF flow; orphan-blob risk

**Selected:** (a) — **Synchronous fail-loud.**

**Rationale:** No job-runner dep; PDF render is deterministic so failure modes are timeouts or blob auth issues, not flaky logic; idempotency key (Q2) makes retries safe; cleanest data invariant.

**Locked as:** D-B1.

### Q2 — Should the submit endpoint be idempotent?

**Options presented:**
- (a) Yes — client-generated UUIDv4 idempotency key (Recommended)
- (b) No — disable submit button on first click

**Selected:** (a) — **Client-generated UUIDv4 sent as Idempotency-Key header.**

**Rationale:** Standard Stripe pattern; protects against double-clicks, network retries, browser back-forward navigation. Simple to implement (one `useState(() => crypto.randomUUID())` + header).

**Locked as:** D-B2.

### Q3 — What does the partner see during PDF generation?

**Options presented:**
- (a) Sonner loading toast → success/error (Recommended)
- (b) Full-page loading skeleton — adds polling complexity
- (c) Inline button spinner only — minimal but feels less responsive

**Selected:** (a) — **Sonner loading toast pattern.**

**Rationale:** Matches Phase 6/7 sonner discipline. PDF gen is ~1-3s sync; loading toast is sufficient feedback.

**Locked as:** D-B3.

---

## Area C: List + search + soft-delete UX (3 questions)

### Q1 — How should the home-page list paginate past the first 20?

**Options presented:**
- (a) Cursor-based 'Load more' button — cursor = (created_at, id) of last row (Recommended)
- (b) Offset-based pages — simpler URL state but skipped/duplicate row risk
- (c) Infinite scroll — smooth UX but harder to bookmark

**Selected:** (a) — **Cursor-based 'Load more'.**

**Rationale:** Matches PROP-05's "load more" phrasing; stable under concurrent inserts; database-friendly query.

**Locked as:** D-C1.

### Q2 — When does search fire?

**Options presented:**
- (a) Debounced as you type, 300ms (Recommended)
- (b) Submit on Enter / button click
- (c) Client-side filter of last 20 only

**Selected:** (a) — **Debounced as-you-type, 300ms.**

**Rationale:** Matches Phase 7's live-preview debounce (300ms — D-7-02). Snappy feeling. Server-side ILIKE handles full proposal history.

**Locked as:** D-C2.

### Q3 — What happens after a partner soft-deletes a proposal?

**Options presented:**
- (a) Toast with 5-second Undo button (Recommended)
- (b) Toast confirmation + 'Recently deleted' filter toggle on home list — partner-side recovery via Restore button, 30-day window
- (c) Native confirm() before delete + fire-and-forget — like Phase 7's reset

**Selected:** (b) — **Toast confirmation + 'Recently deleted' filter toggle.**

**Rationale (substantive divergence from recommended):** User chose the more partner-friendly recovery surface. Trade-off accepted: Phase 8 must ship the toggle UI + Restore button + filter logic + audit log entries on restore. The 5-second undo is too short for partners who navigate away and want to recover later. The 30-day window gives a real recovery affordance without bloating to a full "Trash" view.

**Locked as:** D-C3. Phase 8 plans must include the 'Recently deleted' UI as a deliverable.

---

## Area D: Seed coefficients & launch ordering (3 questions)

### Q1 — What coefficients does Phase 8's DATA-12 seed migration insert?

**Options presented:**
- (a) Ship Phase 8 with Phase 7 placeholders; Phase 9 admin-edits before partner onboarding (Recommended)
- (b) Block Phase 8 deploy until Antoine extracts canonical v10 baseline
- (c) Phase 8 plans the migration but defers seed commit to a separate ops task

**Selected:** (a) — **Ship with Phase 7 placeholders.**

**Rationale:** Decouples Phase 8 schema work from Antoine's data-extraction task. Single source of truth (Phase 7's `seedParams` constant) preserved. Phase 8 testing produces placeholder loyer values — acceptable for internal smoke. Real partners aren't onboarded until Phase 9 admin UI ships AND admin has edited values.

**Locked as:** D-D1.

### Q2 — How does Phase 8 handle the Phase 5 Neon branch-split follow-up (⚠ PARTIAL)?

**Options presented:**
- (a) Treat as separate ops task before first Phase 8 prod deploy (Recommended)
- (b) Add a Phase 8 plan for it + verification probe

**Selected:** (a) — **Separate ops task.**

**Rationale:** ~30min ops task for Antoine; not worth coupling to Phase 8 plan schedule. Documented as launch-checklist item.

**Locked as:** D-D2.

### Q3 — Does Phase 8 ship the schema_version field with `'1.0'` or use a different scheme?

**Options presented:**
- (a) Semver string starting at '1.0.0' (Recommended)
- (b) Integer starting at 1
- (c) Date string YYYY-MM-DD

**Selected:** (a) — **Semver string `'1.0.0'`.**

**Rationale:** Distinguishes formula (MAJOR), layout (MINOR), and copy (PATCH) changes. Compatibility communicated via human-readable string. CHECK constraint validates shape.

**Locked as:** D-D3.

---

## Decisions Summary

| ID | Area | Decision |
|---|---|---|
| D-A1 | PDF | Professional layout, not v10-equivalent fidelity |
| D-A2 | PDF | Session-language at gen time, immutable per proposal |
| D-A3 | PDF | Minimal footer (LC ref + date + page number) |
| D-B1 | Submit | Synchronous fail-loud (rollback row on PDF/blob fail) |
| D-B2 | Submit | Client-generated UUIDv4 idempotency key |
| D-B3 | Submit | Sonner loading toast → success/error |
| D-C1 | List | Cursor-based 'Load more' button |
| D-C2 | List | Debounced as-you-type search, 300ms |
| D-C3 | List | Toast + 'Recently deleted' filter toggle (30-day window) |
| D-D1 | Schema | Seed migration uses Phase 7 placeholder values |
| D-D2 | Ops | Neon branch-split = separate ops task (not Phase 8 plan) |
| D-D3 | Schema | schema_version = semver string '1.0.0' |

---

## Deferred Ideas (captured, not in scope)

- 30-day soft-delete hard-purge cron job (Phase 10)
- 10-year PDF retention enforcement (Phase 10, Open Q3 dependency)
- PROP-26 validity-expiry email notifications (v1.2)
- PDF.js embed (Phase 9/10 if browser issues surface)
- pg_trgm fuzzy search (post v1.1 if dataset scales)
- Excel export, LC dashboard, mobile views (v1.2+)
- `duplicated_from_id` audit column — planner discretion (recommend YES)
- Phase 5 follow-up Neon branch split (per D-D2, separate ops task)
- Phase 6 follow-up admin password rotation (separate ops task)
- Phase 6 follow-up Better Auth trustedOrigins investigation (Phase 9 hardening)

---

## Open Questions Carried Forward

- Open Q1 (Cutover ownership) — fire ask now (Phase 10)
- Open Q3 (Legal — 10-year retention) — fire ask now (Phase 10 gate, Phase 8 unblocked)
- Open Q5 (OVH stack) — fire ask now (Phase 10 gate)
- Antoine's canonical coefficients — Phase 8 unblocked (D-D1); needed before first partner onboard
