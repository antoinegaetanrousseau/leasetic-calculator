# Milestone Summary — v1.4 Partner Types, Admin Dual-View & Rebrand

**Status:** ✅ Shipped 2026-05-30 · **Phases:** 22–25 (4 phases, 12 plans) · **Tests:** 1184 passing / 4 skipped / 0 failed · **Commits:** 129 (`6893a4f..effb59c`) · **Code:** +12,244 / −1,421 across 155 files · **Timeline:** 2026-05-29 → 2026-05-30 (2 days)

## 1. What Shipped

A focused four-phase milestone that added a **partner-type dimension** to proposal economics and
gave admins a **self-service view toggle**, plus PDF rendering fixes and admin-home copy/polish.

The headline: partners now carry a type — **Agent**, **Commercial**, or **Partenaire**. For
Agent/Commercial, a proposal's monthly loyer is computed **without the commission factor**
(`loyer = montant HT × coefficient / 100`), and commission is **structurally absent** from every
surface — wizard, live preview, dashboards, PDF, server logs, and audit payloads — not merely
hidden. `Partenaire` behaviour is unchanged; every pre-existing account was backfilled to
`Partenaire`. This is the first approved exception to the frozen-formula constraint, and it stays
tightly scoped: the `Partenaire` formula and all tranche boundaries remain frozen.

Alongside: a session-only **Admin/Agent view toggle** (admins experience the partner nav without
losing admin rights), a **PDF typography fix** (U+202F glyph overlap) + Destinataire-block
removal, and admin-home **label changes + status-pill sizing fix**. The **teal rebrand** that
originally anchored Phase 25 was **descoped mid-milestone** and shelved to Future Requirements.

## 2. Phase-by-Phase

**Phase 22 — Partner Types & Commission-Free Proposals (5 plans).** Added the `partner_type`
column (Drizzle migration `0006` + Better Auth additionalField + idempotent backfill to
`Partenaire`), a commission-free calc variant via a `commissionPct:0` seam (12 golden cases,
±0.01 €, `formula.ts` frozen), a required type selector on the create form + audited
`adminUpdatePartnerType`, commission structural absence across wizard steps 2+3 / live preview /
finalize snapshot, and a commission-free PDF variant. The `params_snapshot` now records
`partner_type` + `commission_applied`. The ADMIN-09 grep-contract suite grew 13 → 19 gates.
21 STRIDE threats closed (ASVS L1); UAT 6/7 verified.

**Phase 23 — PDF Rendering Fixes (3 plans).** Root-caused the number/typography glyph overlap to
the U+202F narrow-no-break-space separator; fixed via a PDF-scoped `sanitizePdfNumber`
(U+202F/U+00A0 → space) wired into `document.tsx` with a reproduction test, leaving `format.ts`
untouched. Removed the Destinataire block (+ dead LABELS/lbl helpers + recipient i18n keys) with
a clean reflow. Regenerated the byte-determinism SHA-256 fixture and extended the golden corpus
with an Agent/Commercial commission-free fixture.

**Phase 24 — Admin Dual-View Toggle (2 plans).** A session-only view store
(`sessionStorage` + `useSyncExternalStore`, cleared on logout) and a `ViewToggle` behind an
`isAdmin` gate in the bottom-left settings area. `effectiveView` remaps the sidebar nav between
admin and agent route sets. Authorization is unchanged in both views — nav is keyed on
server-derived `isAdmin`, so a forged view flag can't escalate (VIEW-04). 7 STRIDE threats closed;
5 code-review warnings fixed.

**Phase 25 — Admin-Home Labels & Pill Fix (2 plans).** Admin-home relabels (COPY-01..04:
"Toutes les propositions", "Coefficients & Commissions", "Dernière Modif Coef") shipped FR+EN with
the `_EnHasAllFrKeys` parity proof green, and the status-pill sizing fix (UIFIX-01:
`.list-row` status track → `max-content`) so chips hug their text. The teal rebrand
(BRAND-01/02/03) was descoped during this phase's discussion.

## 3. Cross-Cutting Threads

- **ADMIN-09 commission invisibility** — extended from a 13-gate to a 19-gate grep-contract suite
  covering calc output, UI, PDF render path, server logs, and audit payloads for all three partner
  types. Structural absence, not conditional hiding.
- **`params_snapshot` immutability** — preserved and extended; stored proposals + PDFs stay frozen
  even after a partner's type changes.
- **PDF byte-determinism** — gate stayed green across the Phase 23 layout change and the Phase 22
  commission-free variant.
- **i18n parity** — `_EnHasAllFrKeys` compile-time proof stayed green through the COPY relabels and
  the recipient-key removal.
- **Frozen formula** — `Partenaire` formula + tranche boundaries untouched; only the scoped
  Agent/Commercial commission-free variant was added.

## 4. Technical Decisions That Matter

- **Formula exception, tightly scoped** — only Agent/Commercial drop the commission factor.
- **Structural absence over CSS hiding** — defense-in-depth against commission leakage.
- **Server-derived authz for the view toggle** — the toggle is a nav convenience, never a
  permission change.
- **PDF-scoped sanitizer** — confine the U+202F fix to the PDF layer; don't perturb `format.ts`.
- **Teal rebrand descoped** — `--gd` token split + WCAG re-audit across ~63 sites judged too much
  effort for too little value; shelved (revisitable), not killed.

## 5. Known Gaps & Tech Debt

All non-blocking, Info-level (see `milestones/v1.4-MILESTONE-AUDIT.md` frontmatter `tech_debt`):

- Stale `deferred-items.md` lint entry in Phase 22 (already resolved in 22-05; delete the file).
- Migration label drift `0005` → `0006_workable_yellow_claw.sql` reconciled 2026-05-30 (doc-only).
- Phase 24 Info items: dead `fullWidth` prop on `ViewToggle`; unused `adminHrefs.history`;
  duplicated `rgba(18,150,87,0.10)` active-tint literal (extract to a CSS var); retained
  back-compat i18n keys.
- `partnerType` session fallback re-derived in 3 places (finalize route + calcul + verification) —
  a shared helper would reduce drift risk.

## 6. Deferred Items (Carry-Forward Candidates for v1.5+)

From REQUIREMENTS.md → Future Requirements:

- **Teal accent rebrand** (`#2D7A8C`) — descoped from Phase 25. Needs splitting the overloaded
  `--gd` token into distinct accent (→ teal) vs. success (→ `#129657`) tokens, recoloring ~63
  sites + hardcoded `rgba(18,150,87,…)` tints, then a fresh light+dark WCAG AA audit.
- Account v2 — avatar upload (Blob image infra), phone field, editable email (needs SMTP).
- SMTP-driven self-service password reset; MFA on admin accounts.
- Centralized forms-i18n / Zod error-localization helper (remove EN-leak duplication).
- OVH production deployment + smoke-deploy execution (September 2026 target).
- Webhook notifications to Leasétic on proposal generation; generic audit-log viewer.
- Mobile-optimized layout; automated browser tests (Playwright); Sentry/APM observability.
- `/accounts` 308 redirect sunset.

**Acknowledged-deferred at close (stale planning artifacts, non-blocking):** 4 — see STATE.md
Deferred Items section (Phase 22 UAT marked partial with 0 open scenarios; context questions on
already-shipped phases 06/07/08).

## 7. Deploy Gate (pre-onboarding)

Migration `0006_workable_yellow_claw.sql` + the `partner_type` backfill
(`db:backfill:partner-type`, `BACKFILL_CONFIRM=YES`) must be applied to Neon `main` via the
`MIGRATE PROD` GitHub Action **before the first real Agent/Commercial partner is onboarded**. Per
session record the 0005→0006 reconcile + Neon apply occurred 2026-05-30 — **confirm applied**
before onboarding. (Not a code blocker; an operational gate.)

## 8. For the Next Session

- v1.4 is shipped and archived. ROADMAP collapsed; REQUIREMENTS removed (fresh for next milestone).
- Start the next milestone with `/gsd-new-milestone` (questioning → research → requirements →
  roadmap). Phase numbering continues at **Phase 26**.
- First candidate for v1.5: the shelved teal rebrand, if the token-split effort is judged worth it.
