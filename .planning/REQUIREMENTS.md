# Requirements: Matrice Commerciale v1.8 — Deferred Items

**Defined:** 2026-09-05
**Milestone:** v1.8
**Core value (unchanged since v1.0):** A partner fills client info + amount + duration and gets a
pixel-correct PDF proposal with the correct lease calculation. v1.8 adds **no** product capability —
it closes what earlier milestones deferred.

**Source of truth:** the deferred-item sweep of 2026-09-05 across `STATE.md` § Deferred Items, all
seven `deferred-items.md` files, the `*-UAT.md` / `*-VERIFICATION.md` artifacts, `v1.6-MILESTONE-AUDIT.md`,
the previous `REQUIREMENTS.md` § Future Requirements, and the "Known gaps" sections of the v1.1 and
v1.4 entries in `MILESTONES.md`. No domain research (`workflow.research: false`, and there is no new
domain — every requirement traces to an item a shipped milestone already deferred).

**Phase numbering:** continues from Phase 35 — v1.8's first phase is **Phase 36**.

---

## The problem this milestone solves

v1.7 closed carrying 8 deferred items and **none of them originated in v1.7**. Every one is an
inherited v1.0–v1.6 artifact. The backlog has stopped draining:

- Phase 30 deferred the `/proposals/[id]` admin bypass explicitly *to "Phase 33/34"*. Both phases
  shipped. Nobody re-read the deferral note.
- The Phase 28 browser-verification backlog was marked "v1.6 opportunistic". v1.6 shipped. It was
  not picked up.
- Four v1.1-era CONTEXT questions were resolved in 2026-05 but never edited in the files, so the
  auditor re-reports them at *every* milestone close — noise that trains the reader to skim.
- v1.6 has a git tag and no `MILESTONES.md` entry, and its only audit was written on 2026-09-01
  when phases 31/33/34 had not started. `/gsd-cleanup` and the milestone auditor have been
  operating on incomplete inputs ever since — which is how the v1.7 archive came to claim all 35
  phases on disk.

One item is not merely hygiene: the shared `leasetic2026` admin password was flagged at the v1.1
close as something to retire **before the first real partner is onboarded**. It is still shared.

**The resolution is subtractive.** No new tables, no new surfaces, no formula change. Each
requirement names an item that already exists in the record and states the condition under which it
stops existing.

---

## v1.8 Requirements

### Closure & Verification Debt (CLOSE)

- [ ] **CLOSE-01**: Phase 30's four pending UAT scenarios (2 — Clients nav per role; 9 — admin
  relationship detail; 10 — sales-role parity and admin exclusion; 12 — no regression) are walked
  and recorded, leaving `30-UAT.md` at `pending: 0`.
- [ ] **CLOSE-02**: Phase 31.1's two human checks are performed — the dark-theme shell renders the
  six pinned Colibris tokens with no flash of light chrome on first paint, and the PDF surface still
  renders white-on-`#1a2832` in dark mode — leaving `31.1-VERIFICATION.md` at `status: passed`.
- [ ] **CLOSE-03**: Phase 33's residual human items are walked — the Space → ArrowRight → Space
  keyboard drag produces exactly one write, and D-08's gate is confirmed against a **production
  build** rather than `next dev` — leaving `33-VERIFICATION.md` at `status: passed`.
- [ ] **CLOSE-04**: Phase 34 has a goal-backward `34-VERIFICATION.md` and a `34-REVIEW.md`; it
  shipped 13 plans with neither.
- [ ] **CLOSE-05**: Phase 29 has a `29-VALIDATION.md` recording Nyquist coverage, and INFRA-05's
  write-isolation is either empirically probed or its architectural-inference basis is recorded as
  the final answer with that limitation stated.
- [ ] **CLOSE-06**: v1.6 is formally closed — a `MILESTONES.md` entry describing what actually
  shipped, `milestones/v1.6-ROADMAP.md` and `v1.6-REQUIREMENTS.md` snapshots, an audit re-run
  against the finished milestone (the existing one predates phases 31/33/34), and `ROADMAP.md`
  no longer showing v1.6 as IN PROGRESS while its milestone list calls it shipped.
- [ ] **CLOSE-07**: Phase 28 is attributed to a milestone in `ROADMAP.md`'s phase table, and
  phases 28–35 are archived into their `milestones/v{X.Y}-phases/` directories.
- [ ] **CLOSE-08**: Phase 28's browser-verification backlog is walked — wizard step 1, `/proposals`,
  coefficients history, `/parametres`, and the six `PartnersList` / `LcReferencesList` padding
  sites — in light and dark.

### Functional Gaps (GAP)

- [ ] **GAP-01**: An admin following the oversight click-through from a relationship to one of its
  proposals reaches the proposal detail page instead of a 404, with an explicit recorded decision on
  whether the ADMIN-09 commission-invisibility envelope needs adjusting for that surface (it renders
  more inputs than the row/list view).
- [ ] **GAP-02**: Every icon-only dialog close control announces an accessible name in the viewer's
  language — the shared `dialog.tsx` primitive currently hardcodes English `"Close"` in a
  French-default product.
- [ ] **GAP-03**: Phase 35's two INFO findings are resolved — the redundant `!isAdmin` check beside
  an already-null-gated `momentum` value is removed, and `BADGE_THRESHOLDS` is no longer exported as
  a mutable object.
- [ ] **GAP-04**: The "Charger plus" pagination control and the `.btn-out` class agree with the app's
  declared conventions — on-grid padding and the standard focus treatment — or the spec is updated to
  record a deliberate exception. Today `.btn-out` carries `0.6rem` vertical padding (9.6px, off the
  4px grid) and a third hardcoded focus shadow.
- [ ] **GAP-05**: The admin accounts list shows a real last-login date for a partner who has signed
  in — ADMIN-05's `users.last_login_at` is read by that page but written nowhere, so every row shows `—`.

### Operational Gates (OPS)

- [ ] **OPS-01**: The shared `leasetic2026` admin password is retired and each admin holds an
  individual strong credential. *Flagged at the v1.1 close as required before the first real partner
  is onboarded.*
- [ ] **OPS-02**: Better Auth `trustedOrigins` is explicitly configured rather than left to its
  default. Deferred since v1.2 on the grounds that SameSite=Lax + `__Secure-` cookies are the actual
  CSRF defense — that reasoning is recorded or revised, not merely inherited.
- [ ] **OPS-03**: `scripts/smoke-ovh.ts` has been executed against a real OVH target with its result
  recorded, **or** the OVH cutover is formally re-dated with a decision. The capability shipped in
  v1.1 against a "September 2026" date that has arrived. *External dependency — must be closable by
  a recorded decision.*
- [ ] **OPS-04**: DATA-11's 10-year PDF retention carries a recorded legal position — Thomas's
  sign-off, or an explicit interim decision naming who accepts the risk until it arrives.
  *External dependency — must be closable by a recorded decision.*

### Housekeeping (HOUSE)

- [x] **HOUSE-01**: `npm run lint:check` reports zero errors on a clean tree. It currently reports
  559, every one of them inside two stray `.claude/worktrees/*` copies that nobody is editing —
  a gate whose output has become safe to ignore.
- [x] **HOUSE-02**: A milestone audit no longer re-reports resolved v1.1-era questions — the
  `<open_questions>` blocks in `06-CONTEXT.md`, `07-CONTEXT.md`, `08-CONTEXT.md` and `31-CONTEXT.md`
  carry their real resolved-or-deferred status.
- [x] **HOUSE-03**: The stale `[~]` markers on CALC-07 and PROP-01 read `[x]`, and
  `scripts/seed-partner-launch.ts` is reachable through an npm script rather than by path.
- [ ] **HOUSE-04**: The 18 dead vendored ReUI blocks (816K, zero imports) carry a recorded
  keep-or-delete decision with its rationale, superseding the provisional "Delete nothing yet"
  of 2026-08-31.

---

## Future Requirements (deferred beyond v1.8)

| Requirement | Target | Note |
|---|---|---|
| Contract-tool integration — win-event handoff | v1.9+ | Seams shipped in v1.6 (CRM-08, PIPE-02, PIPE-05); needs the in-house app's customer schema, still unseen. |
| Contract-tool inbound status feedback | v1.9+ | Drives PIPE-02's system-owned stages; retires the pipeline-rot risk. |
| HubSpot retirement | v1.9+ | Only after the registry and pipeline prove out in real use. |
| Sales-team reporting & cross-book dashboards | v1.9+ | ROLE-01..03 shipped the access model; reporting is a separate surface. |
| "Encours total" — portfolio value month over month | v1.9+ | Phase 35 Deferred Ideas: possibly a stronger motivator than streaks or badges. Depends on signed contract amounts, so it waits on the contract tool. |
| Teal accent rebrand (`#2D7A8C`) | undecided | Descoped from v1.4 Phase 25; needs the `--gd` token split, ~63 recolored sites, fresh light+dark WCAG audit. |
| Playwright browser coverage | undecided | 1213 Vitest tests were green while a duplicate radius scale shipped across five commits. Added when it becomes the blocker. |
| Mobile-optimized layout | undecided | Degrades gracefully today. |
| SMTP self-service password reset | undecided | Invitations and resets stay admin-mediated. |
| Sentry / APM observability beyond Vercel logs | undecided | — |

---

## Out of Scope (explicit exclusions)

- **`admin.companies.search.*` placeholder copy** — the companies search reads "client ou référence"
  on a surface that searches company name and SIREN. Reviewed by Antoine 2026-09-02 and **accepted as
  shipped**; kept as a recorded observation in `30-UAT.md`, not an action item.
- **Deleting the vendored ReUI blocks** — HOUSE-04 makes the call. If the call is "delete", the
  deletion is its own work, not this milestone's.
- **Any new product capability** — no new tables, no new surfaces, no new user-facing features.
- **Changing the calculation formula or tranche boundaries** — frozen (continuing constraint).
- **Removing the "commission invisible" rule** — non-negotiable (continuing constraint).
- **Mutating already-saved PDFs** — the snapshot invariant is permanent (continuing constraint).

---

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| CLOSE-01 | Phase 37 — CRM Stack Closure | Pending |
| CLOSE-02 | Phase 38 — Shell, Dialogs & Visual Conventions | Pending |
| CLOSE-03 | Phase 37 — CRM Stack Closure | Pending |
| CLOSE-04 | Phase 37 — CRM Stack Closure | Pending |
| CLOSE-05 | Phase 36 — Gate Repair & Planning-Record Hygiene | Pending |
| CLOSE-06 | Phase 40 — Milestone Record Closure | Pending |
| CLOSE-07 | Phase 40 — Milestone Record Closure | Pending |
| CLOSE-08 | Phase 38 — Shell, Dialogs & Visual Conventions | Pending |
| GAP-01 | Phase 37 — CRM Stack Closure | Pending |
| GAP-02 | Phase 38 — Shell, Dialogs & Visual Conventions | Pending |
| GAP-03 | Phase 37 — CRM Stack Closure | Pending |
| GAP-04 | Phase 38 — Shell, Dialogs & Visual Conventions | Pending |
| GAP-05 | Phase 39 — Operational & Credential Gates | Pending |
| OPS-01 | Phase 39 — Operational & Credential Gates | Pending |
| OPS-02 | Phase 39 — Operational & Credential Gates | Pending |
| OPS-03 | Phase 39 — Operational & Credential Gates | Pending |
| OPS-04 | Phase 39 — Operational & Credential Gates | Pending |
| HOUSE-01 | Phase 36 — Gate Repair & Planning-Record Hygiene | Complete |
| HOUSE-02 | Phase 36 — Gate Repair & Planning-Record Hygiene | Complete |
| HOUSE-03 | Phase 36 — Gate Repair & Planning-Record Hygiene | Complete |
| HOUSE-04 | Phase 36 — Gate Repair & Planning-Record Hygiene | Pending |

**Coverage: 21/21 requirements mapped to exactly one phase — no orphans, no duplicates.**

| Phase | Requirements | Count |
|---|---|---|
| 36 — Gate Repair & Planning-Record Hygiene | HOUSE-01, HOUSE-02, HOUSE-03, HOUSE-04, CLOSE-05 | 5 |
| 37 — CRM Stack Closure | CLOSE-01, CLOSE-03, CLOSE-04, GAP-01, GAP-03 | 5 |
| 38 — Shell, Dialogs & Visual Conventions | CLOSE-02, CLOSE-08, GAP-02, GAP-04 | 4 |
| 39 — Operational & Credential Gates | OPS-01, OPS-02, OPS-03, OPS-04, GAP-05 | 5 |
| 40 — Milestone Record Closure | CLOSE-06, CLOSE-07 | 2 |

*Traceability filled 2026-09-05 by the roadmapper. Phase details in `.planning/ROADMAP.md`.*
