# Phase 37: CRM Stack Closure - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Every surface v1.6 and v1.7 shipped — client book, admin oversight, pipeline board, fiche client,
momentum — is walked, evidenced, and free of the gap its own phase deferred. Scope is exactly
CLOSE-01, CLOSE-03, CLOSE-04, GAP-01 and GAP-03 from `.planning/REQUIREMENTS.md`.

**Not in this phase:** Phase 38 owns the dark-theme walk, the shared `dialog.tsx` close label and
`.btn-out`; Phase 39 owns credentials, `trustedOrigins`, OVH and DATA-11; Phase 40 owns the v1.6
formal close and the phases 28-35 archive. Do not reach into them.

</domain>

<decisions>
## Implementation Decisions

### GAP-01 — the `/proposals/[id]` admin dead end

- **D-37-01: Unconditional server-derived `role === 'admin'` bypass on the detail page.**
  `app/(authed)/proposals/[id]/page.tsx:47` currently gates flatly on
  `proposal.userId !== session.user.id → notFound()`. An admin gets the bypass; everyone else is
  unchanged.

  **Explicitly rejected, and why:**
  - *Mirroring the list page's `?user_id=` override.* `src/components/proposals/ProposalRow.tsx:157`
    builds a bare `href = /proposals/${row.id}`, and that component is shared by the partner list and
    the admin relationship page. Threading an override through it would teach a shared presentation
    component about admin context and would put the partner's user id into the URL. The tighter
    scoping is not worth either cost.
  - *Relationship-scoped authorization.* Needs a join on every detail-page load and introduces an
    authorization concept the codebase does not have.

  **This closes an inconsistency rather than widening reach.** Phase 18 (D-11) already lets an admin
  list any partner's proposals via `?user_id=` on `app/(authed)/proposals/page.tsx:84`. The detail
  page is the one surface that never got the same treatment. Note also that **D-18 URL-secrecy is not
  implicated** — it governs the admin *tree* returning 404 rather than 403 to non-admins, not
  proposal ids.

  The role must be read server-side from the session, never from a client-supplied flag — same
  posture as Phase 24's `effectiveView`, where a forged flag is short-circuited by the server-derived
  `isAdmin`.

### ADMIN-09 envelope for that surface

- **D-37-02: The envelope needs NO adjustment — and a 20th grep gate is added to pin that.**
  Verified 2026-09-05: `app/(authed)/proposals/[id]/page.tsx` renders partner co/name, client co,
  `amountHT`, `durationMonths`, coefficient and `loyerHT`. **Zero `commission` matches, and
  `params_snapshot` — where `commission_pct` actually lives — is never read in the render path.**
  Commission is structurally absent, not hidden.

  So the roadmap's criterion-1 question ("does the envelope need adjusting for a surface that renders
  more inputs than the row/list view?") resolves to **no**. Phase 30's deferral note was right that
  the page renders more inputs; it does not reach commission.

  The gate is added anyway, as a regression guard: the surface has just become admin-reachable, and
  `tests/admin-09-grep-contracts.test.ts` — 19 gates across 5 admin surfaces plus the XLSX export —
  is this project's established mechanism for making commission-absence *enforced* rather than
  incidental. None of the existing 19 covers `/proposals/[id]`.

  Follow the existing gate style (render the component, assert zero commission strings). The suite
  must be green either way — the phase does not ship with a red ADMIN-09 gate.

### CLOSE-04 — Phase 34's missing artifacts

- **D-37-03: Full goal-backward verification; code review scoped, not phase-wide.**
  Phase 34 shipped 13 plans with no `34-VERIFICATION.md` and no `34-REVIEW.md`. It does already have
  `34-SECURITY.md` and a completed `34-WALKTHROUGH.md`.

  - **Verification: full.** Goal-backward against all ten requirements — FICHE-01..05 and
    ACTV-01..05 — checked against the codebase rather than against the plans' own SUMMARY prose.
  - **Review: scoped to the highest-risk files** — authorization and ownership checks, the
    `relationship_events` write path, and the server actions. Not a standard-depth review of the
    whole 13-plan diff.

  **The reason for the asymmetry is a cost the operator accepted explicitly:** Phase 36's code review
  found 4 Critical and 8 Warning findings in one 223-line script and took two fix-and-re-review
  rounds. A phase-wide review of 13 plans could plausibly swallow Phase 37. The scoped review targets
  where a real defect would actually hurt.

  `34-REVIEW.md` must state its own scope explicitly, so a future reader knows what was and was not
  examined and does not mistake it for a full review.

### CLOSE-01 + CLOSE-03 — the operator walks

- **D-37-04: One consolidated walk, at the end, after all code has landed.**
  Six items in a single scripted session: `30-UAT.md` scenarios 2 (Clients nav per role), 9 (admin
  relationship detail), 10 (sales-role parity and admin exclusion) and 12 (no regression); the
  Space → ArrowRight → Space keyboard drag on the pipeline board; and D-08's gate confirmed against a
  **production build**, not `next dev`.

  **Ordering is load-bearing, not a preference.** UAT scenario 9 is titled "Admin relationship detail
  — and its known dead end". Walking it before D-37-01 lands would re-record the dead end. After the
  bypass, the same scenario exercises the real click-through, which is exactly what roadmap criterion
  2 asks for.

  Phase 33's item is a **walk, not a defect**: WR-02 was fixed in `52d03e1`, the component's direct
  arrow path stands down while `data-dragging` is true, and `PipelineBoard.test.tsx` Test 9b already
  pins it. Only the operator confirmation is outstanding. Do not re-open it as a bug.

  The walk must produce written results: `30-UAT.md` reaching `pending: 0`, and
  `33-VERIFICATION.md` reaching `status: passed`.

### GAP-03 — Phase 35's two INFO findings

- **D-37-05: Both fixed, with rendering held identical.**
  - IN-01 — the redundant `!isAdmin` beside an already-null-gated `momentum` at
    `app/(authed)/page.tsx:158`.
  - IN-02 — `BADGE_THRESHOLDS` exported mutable at `src/lib/momentum/badges.ts:23-27`.

  Acceptance is that the momentum card renders identically before and after. These are hygiene
  fixes; any change in output means the fix was wrong.

### UI design contract

- **D-37-06: No UI-SPEC is required for this phase — plan with `--skip-ui`.**
  `ROADMAP.md` marks Phase 37 "UI hint: yes", which makes `/gsd-plan-phase`'s step 5.6 demand a
  UI-SPEC. Nothing here creates or redesigns UI: D-37-01 is an authorization change on a page that
  renders identically, D-37-05's own acceptance criterion is that rendering does not change, and
  CLOSE-01/03/04 produce walks and documents. A design contract for surfaces nobody is redesigning
  would be ceremony.

### Claude's Discretion

- The exact shape of the admin bypass in code (an early `role === 'admin'` short-circuit versus
  folding it into the existing condition), so long as the role is server-derived.
- Which files the scoped Phase 34 review covers, within the stated risk areas.
- Whether `34-VERIFICATION.md` and `34-REVIEW.md` are produced by one agent or two.
- The order of the non-walk work, subject to D-37-04's constraint that all code lands before the walk.
- The wording of the walk script, provided every one of the six items is individually recorded.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § Phase 37: CRM Stack Closure — goal, the five success criteria, and the
  `Depends on: Phase 36` note (a clean `lint:check` is how this phase's changes prove themselves)
- `.planning/REQUIREMENTS.md` § CLOSE-01, CLOSE-03, CLOSE-04, GAP-01, GAP-03

### GAP-01 — the admin bypass
- `app/(authed)/proposals/[id]/page.tsx` — line 47 carries the flat ownership check; lines 189-299
  are the render path that reads `inputs` and `computed` and never `params_snapshot`
- `app/(authed)/proposals/page.tsx` lines 69-96 — Phase 18 D-11's `adminUserIdOverride`: the
  precedent that admins may already see any partner's proposals, and the pattern deliberately NOT
  copied here
- `src/components/proposals/ProposalRow.tsx:157` — the shared `href` that makes the override
  approach expensive
- `.planning/phases/30-company-contact-registry/deferred-items.md` — the original deferral, including
  its "good candidate for Phase 33/34" line that neither phase picked up

### ADMIN-09
- `tests/admin-09-grep-contracts.test.ts` — 19 gates over 5 admin surfaces plus the XLSX export;
  read the existing gate style before adding the 20th. Note the D-30 exception block, which
  documents the "Explain calculation" debug tool as the sole authorised commission-visible surface
- `.planning/PROJECT.md` § Out of scope — commission invisibility as a continuing, non-negotiable
  constraint

### CLOSE-04 — Phase 34
- `.planning/phases/34-fiche-client/34-WALKTHROUGH.md` — the completed operator walk
- `.planning/phases/34-fiche-client/34-SECURITY.md` — existing threat coverage
- `.planning/phases/34-fiche-client/34-0{1..13}-SUMMARY.md` — claims to verify AGAINST the codebase,
  not to accept
- `.planning/milestones/v1.6-REQUIREMENTS.md` — FICHE-01..05 and ACTV-01..05 as written
- `.planning/phases/35-sales-motivation/35-VERIFICATION.md` — the model for goal-backward
  verification depth and honesty in this project

### CLOSE-01 / CLOSE-03 — the walks
- `.planning/phases/30-company-contact-registry/30-UAT.md` — scenarios 2, 9, 10, 12 and the
  "Bookkeeping Correction" note explaining why they are pending rather than passed
- `.planning/phases/33-pipeline/33-VERIFICATION.md` § Addendum 2026-09-03 — items 1 and 3, and why
  item 3 is a walk rather than a defect

### GAP-03
- `.planning/phases/35-sales-motivation/35-REVIEW.md` § IN-01, IN-02 — exact file:line targets
- `app/(authed)/page.tsx:158` and `src/lib/momentum/badges.ts:23-27`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/(authed)/proposals/page.tsx`'s Phase 18 D-11 block is the reference for server-derived role
  gating — read it for the posture, even though its `?user_id=` mechanism is deliberately not copied.
- `tests/admin-09-grep-contracts.test.ts` has a documented harness note (around line 64) about
  `renderToString()` running server components without a request context. The 20th gate must follow
  the same harness, not invent one.
- `PipelineBoard.test.tsx` Test 9b already pins the keyboard-drag behaviour; the walk confirms it in
  a browser, it does not re-derive it.

### Established Patterns
- **Authorization is server-derived and short-circuits forged client state** (Phase 24 VIEW-04).
- **Commission is structurally absent, never CSS-hidden** (Phase 22) — the grep suite exists because
  absence is the enforcement mechanism.
- **Verification is goal-backward and adversarial in this project** — Phase 35's verifier and Phase
  36's both re-derived claims rather than accepting SUMMARY prose. `34-VERIFICATION.md` should meet
  that bar.

### Integration Points
- `app/(authed)/proposals/[id]/page.tsx` is reached from the partner list, from the admin
  `?user_id=` list, and now from the admin relationship detail page via `ProposalRow`.
- CI runs `lint:check`, `typecheck`, `test` and `build`; the baseline this phase must hold is
  **2320 tests passing, 61 skipped**.

</code_context>

<specifics>
## Specific Ideas

- Phase 36's lesson applies directly and was already borne out during this discussion: **scout before
  trusting a deferral note.** Phase 30's note said the fix "widens the authorization model"; Phase 18
  had already widened it for the list surface, so the detail page was the inconsistency, not the
  precedent. Two of Phase 36's five requirements turned out to be differently-shaped than their notes
  claimed. Expect the same here, particularly for the Phase 34 verification.
- The recurring defect shape across v1.8 so far is **a guard that does not guard** — a check computed
  independently of the thing it checks. When adding the 20th ADMIN-09 gate, confirm it actually fails
  on a surface that renders commission, rather than assuming a passing test proves anything.

</specifics>

<deferred>
## Deferred Ideas

None — the discussion stayed inside the phase boundary. No new capability was proposed.

Adjacent items deliberately left to their own v1.8 phases: the dark-theme and dialog work and
`.btn-out` (Phase 38); credentials, `trustedOrigins`, OVH and DATA-11 (Phase 39); the v1.6 formal
close and the phases 28-35 archive (Phase 40). The read-only Neon role surfaced during Phase 36 is
filed for Phase 39 / OPS-01.

</deferred>

---

*Phase: 37-crm-stack-closure*
*Context gathered: 2026-09-05*
