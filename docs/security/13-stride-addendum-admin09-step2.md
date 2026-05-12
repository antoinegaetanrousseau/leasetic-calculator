# STRIDE Addendum to Phase 9 ADMIN-09 Threat Model — Partner-Facing Step-2/Step-3 Commission Relaxation (Phase 13)

**Date drafted:** 2026-05-12
**Author:** Claude Code, via Plan 13-06
**Reviewer:** Antoine Rousseau
**Status:** drafted, pending Antoine sign-off

**Scope:** Phase 13 (3-Step Proposal Wizard) introduces a single bounded
relaxation to the ADMIN-09 commission-invisibility cluster. This document
is the addendum that D-28 (CONTEXT 13-CONTEXT.md) mandates before Phase 13
can pass review.

**Anchors:** D-12 + D-28 (see `.planning/phases/13-3-step-proposal-wizard/13-CONTEXT.md`).

---

## 1. Context

Phase 9 + Phase 10 collectively closed **97 STRIDE threats** around the
ADMIN-09 invariant — *the leasing commission percentage and its derived
amount are never visible to the client, never present in the PDF, never
written to the `audit_log`, never logged to server stdout/stderr, never
traced in pre-finalize observability, and never surfaced on any
partner-facing UI*. (Phase 9: 42 threats; Phase 10: 55 threats. See
`.planning/phases/09-admin-surface/09-SECURITY.md` +
`.planning/phases/10-cutover-polish/10-SECURITY.md`.)

**Phase 13 D-12** (decision locked in 13-CONTEXT.md §Step 2) carves out
a single, bounded relaxation to that invariant:

> *The deal-owner partner can see their OWN commission amount on
> `/proposals/new/calcul` (step 2 Détail du calcul row) AND on
> `/proposals/new/verification` (step 3 ● CALCUL recap row).*

The parenthetical label `(non visible client)` on the surfaced row
explains to the partner that this number will NOT appear on the
client-facing PDF.

All other ADMIN-09 invariants remain in force.

**Why the relaxation?** Deal-owner transparency. Partners need to know
what commission they will earn on a deal before they finalize it. The
prior v1.1 design hid the commission entirely from the partner
(commission was an admin-only number used inside the calc engine);
partners had to infer their earnings post-hoc from the loyer. v1.2's
3-step wizard surfaces the commission on the partner-facing review
surfaces only — preserving the client-facing invariant (no commission
in the PDF the client receives) while removing the partner-facing
opacity.

---

## 2. Relaxation Envelope (precise)

| # | Surface | Commission visibility | Notes |
|---|---|---|---|
| 1 | `/proposals/new/calcul` (step 2) — `Détail du calcul` row 2 | **VISIBLE** to the deal-owner partner | Renders the formatted commission amount with the FR sublabel `(non visible client)` / EN `(not visible to client)`. Server-rendered into HTML. |
| 2 | `/proposals/new/verification` (step 3) — `● CALCUL` recap section row 3 | **VISIBLE** to the deal-owner partner | Same value, same formatting. Distinct surface from #1. |
| 3 | **All other surfaces** | INVISIBLE (no change from Phase 9 / 10) | See §3 below for the reaffirmation table. |

**Cross-user invariant:** the relaxation envelope is scoped to the
deal-owner partner ONLY. A partner B requesting `/proposals/new/calcul?draft_id=<A-uuid>`
is silently redirected (D-03) — Partner A's commission is never visible
to Partner B. Verified by `requireUser()` + `getDraftById(id, userId)`
predicate; the cross-user case is tested in plans 13-03 / 13-04 / 13-05
page.test.tsx files.

---

## 3. Invariants That Remain In Force (Reaffirmation)

Phase 9 + Phase 10 closed 97 STRIDE threats by establishing that commission
is invisible everywhere except specific admin-only surfaces (the
"Explain calculation" tool — Phase 9 D-09-08 — and the coefficient editor
itself). Phase 13 D-12 adds **TWO partner-facing surfaces** (step 2 + step 3
recap) to that list. **Every other invariant is preserved verbatim.**

| Surface | Commission visibility | Phase 13 verification |
|---|---|---|
| **Rendered PDF** (any of 30 golden corpus + production proposals) | **INVISIBLE** | `src/lib/pdf/no-commission.test.ts` — 30 fixture × 4 assertion layers (render-data prop + persisted computed jsonb + paramsSnapshot scope check + binary inspection on 4 representative PDFs via real `@react-pdf/renderer` invocation) |
| **`audit_log`** payloads (`proposal.create` + every other action) | **INVISIBLE** | `src/lib/api/proposals/finalize-wizard.test.ts` Test 10c (file-source assertion that `finalize-wizard.ts` NEVER calls `writeAuditLog` directly + grep contract that the source has zero `commission` substring outside comments). Phase 12 `finalizeDraft` writes only `{ lcRef }` as the audit payload (line ~484-490 in `src/lib/db/queries/proposals.ts`). |
| **Server logs** (Next.js prod logs on Vercel) | **INVISIBLE** | `finalize-wizard.ts` source-file grep contract verifies zero `console.log` references to commission. Route handler `app/api/proposals/finalize/route.ts` returns only bounded `safeCodes` (e.g. `DraftNotFound`, `ValidationFailed`, `NoGlobalParams`, `FinalizeFailed`) — never raw error payloads. |
| **Pre-finalize traces** (any logging during step-3 finalize POST handler) | **INVISIBLE** | Route handler's error path returns only bounded safeCodes; the `computed` jsonb passed to `finalizeDraft` has no commission key (verified per fixture by `no-commission.test.ts` Layer 2). |
| **Admin "Explain calculation" tool** (Phase 9 D-09-08) | **VISIBLE** per existing Phase 9 exception | UNCHANGED — admin-only surface, separate threat envelope. |
| **Admin "Liste des partenaires"** + admin proposal lists | **INVISIBLE** per Phase 9 (T-09-01-07 / T-09-03-02) | UNCHANGED — Phase 13 does not touch admin surfaces. |
| **Admin "Coefficient editor"** + "History sidebar" | **INVISIBLE** per Phase 9 (T-09-02-05 / T-09-02-07) | UNCHANGED — Phase 13 does not touch admin surfaces. |
| **Partner home** (post-Phase 14) `Brouillons` + `Active proposal list` rows | **INVISIBLE** | Phase 14 will verify; OUT OF SCOPE for this addendum. Phase 13 ships no partner-home surface changes. |
| **Cross-user view** (Partner A's commission visible to Partner B) | **INVISIBLE** | `requireUser()` + `getDraftById(id, userId)` predicate enforces ownership. D-03 silent-redirect on cross-user `draft_id`. Tested in plans 13-03 / 13-04 / 13-05 page.test.tsx files. |
| **Browser DevTools "View source"** on `/proposals/{id}` (finalized proposal detail page) | **INVISIBLE** | The saved proposal detail page does not surface commission (Phase 8 v1.1 invariant, unchanged in Phase 13). Smoke runbook Test 6 step 6 verifies. |

---

## 4. STRIDE Re-Review of the 97-Threat Closure

The 97 threats Phase 9 + Phase 10 closed fall into 6 clusters relative to
the ADMIN-09 invariant. Disposition under D-12:

### Cluster A — PDF binary leakage threats (Phase 8 + Phase 10)

**Disposition: UNCHANGED.** Phase 13's finalize-wizard preserves Phase 8's
PDF byte-determinism contract. Commission is excluded from:

- The `data` prop passed to `@react-pdf/renderer` (proven for every render
  call by `finalize-wizard.test.ts` Test 10 — single fixture — and now
  by `no-commission.test.ts` Layer 1 — all 30 golden fixtures).
- The persisted `computed` jsonb (proven by `no-commission.test.ts` Layer 2).
- The rendered PDF binary itself (proven by `no-commission.test.ts` Layer 4 —
  binary inspection on 4 PDFs across both languages with decompressed
  stream content scan via `node:zlib` + ToUnicode CMap reconstruction).

The Phase 8 `__pdf-fixtures__/render-fixtures.test.ts` byte-determinism
gate (PROP-17) remains intact and unmodified.

### Cluster B — `audit_log` leakage threats (Phase 9 + Phase 12)

**Disposition: UNCHANGED.** Phase 12's `finalizeDraft` writes the
`audit_log proposal.create` entry inside the same DB transaction as the
draft → active flip; the payload contains only `{ lcRef }`. Phase 13's
`finalize-wizard.ts`:

- Does NOT call `writeAuditLog` directly — proven by source-file grep
  in `finalize-wizard.test.ts` Test 10c.
- Has zero `commission` substring outside comments — enforced via the
  `finalize-helpers.ts` isolation barrier (the literal property name lives
  in `finalize-helpers.ts` only; `finalize-wizard.ts` accesses the
  configured snapshot via imported helper functions).

Phase 9's audit-log threats (T-09-01-04, T-09-01-05, T-09-02-04, T-09-03-04,
T-09-03-05, T-09-03-11, T-09-03-12) all remain closed.

### Cluster C — Server-log leakage threats (Phase 9 + Phase 10)

**Disposition: UNCHANGED.** No `console.log` calls in any Phase 13
finalize path. The route handler returns only bounded safeCodes
(no raw error payloads). The `proposals/new/calcul/page.tsx` and
`/verification/page.tsx` server components compute commission transiently
for partner-facing render only — they do NOT log it.

### Cluster D — Cross-user disclosure threats (Phase 9 + Phase 10)

**Disposition: UNCHANGED.** D-03 silent redirect on cross-user
`draft_id` is implemented in all 3 wizard route page.tsx files (verified
by plans 13-03 / 13-04 / 13-05 page.test.tsx cross-user assertions).
Partner B cannot observe Partner A's commission via URL manipulation.

Phase 6's `requireUser()` defense-in-depth (AUTH-15) runs on every
wizard route per D-01, providing a second authorization layer over the
layout's gate.

### Cluster E — Admin-surface disclosure threats (Phase 9)

**Disposition: UNCHANGED.** Phase 9 admin surfaces are untouched in
Phase 13. The Coefficient Editor, History Table, Explain Tool, Accounts
List, and InviteUrlModal all retain their existing disclosure envelope
(commission visible only where ADMIN-09's permitted exceptions were
explicitly enumerated in Phase 9 — D-09-08 ExplainTool + SaveConfirmModal +
HistoryDiff).

### Cluster F — Partner-facing UI disclosure threats (Phase 9 + Phase 10)

**Disposition: NEW BOUNDED RELAXATION** on the two partner-facing
surfaces enumerated in §2 above. All other partner-facing surfaces remain
UNCHANGED:

| Sub-surface | Disposition |
|---|---|
| `/proposals/new/calcul` (step 2 Détail du calcul row) | NEW relaxation per D-12 |
| `/proposals/new/verification` (step 3 ● CALCUL recap) | NEW relaxation per D-12 |
| `/proposals/{id}` (finalized proposal detail) | UNCHANGED — invisible |
| Partner home / list pages | UNCHANGED — invisible |
| `/proposals/new/parametres` (step 1) | UNCHANGED — invisible (partner has not yet seen calc output) |
| `<LiveLoyerPreview>` (v1.1 sticky pane) | NOT MOUNTED in Phase 13 — D-09 |
| `<DuplicatePrefillToast>` | UNCHANGED — invisible (no commission in toast copy) |

---

## 5. New Threats Introduced By The Relaxation (and their mitigations)

| Threat ID | Category | Description | Disposition | Mitigation / Rationale |
|---|---|---|---|---|
| T-13-NEW-01 | Information Disclosure | Partner A's commission is visible to anyone with screen-share access while Partner A is mid-wizard (e.g., screen-sharing during a sales call). | **accept** | Physical security is out of scope at application layer. `audit_log` records only that the deal-owner partner accessed the surface — provides forensic visibility if needed. The commission is in PRE-FINALIZE state — not yet a binding offer. Risk profile matches any other business-private number a partner might display in their browser. |
| T-13-NEW-02 | Information Disclosure | Partner copies the displayed commission value into an external tool (email to a colleague, spreadsheet, screenshot). | **accept** | Partner is the deal-owner — copying their own commission to a colleague is a legitimate business action (e.g., margin review with management). Out of scope for application-layer DLP. Same risk profile as any business-private number a logged-in user can see. |
| T-13-NEW-03 | Information Disclosure | Browser DOM inspection or copy-paste from `/calcul` or `/verification` reveals additional disclosure paths beyond the visible row. | **mitigate** | The commission value is server-rendered into normal JSX text. NO hidden inputs, NO `data-commission-*` attributes, NO `aria-label` containing the commission value, NO client-bundle JavaScript embedding the value. Copy-paste only reveals what the partner can already see on screen. Verified by Smoke Runbook Test 6 steps 2-3. |
| T-13-NEW-04 | Information Disclosure | Browser-extension keylogger or screen-capture malware exfiltrates the displayed commission. | **accept** | Out of scope for application-layer security. Partners use trusted browsers per company device policy. Same risk profile as any sensitive data the partner is authorized to view. |
| T-13-NEW-05 | Information Disclosure | Cached browser history of `/calcul?draft_id=<id>` URL reveals commission via shared device or back-button after logout. | **mitigate** | The URL contains a UUID `draft_id` — not the commission value itself. Re-visiting the URL post-logout triggers Better Auth's session gate → redirect to `/login`. Re-visiting while logged in as a DIFFERENT partner triggers D-03's silent redirect (Phase 13 plans 13-03 / 13-04 / 13-05 verify). Partner training should reinforce logout-on-shared-devices, but the URL itself does not embed sensitive data. |
| T-13-NEW-06 | Tampering | A malicious partner script (e.g., XSS) could read the commission from the DOM and exfiltrate it. | **accept** | Phase 13 introduces no new XSS surface. React's JSX text-interpolation auto-escapes — the commission is rendered as a string in a `<dd>` (or equivalent) text node. No raw-HTML injection APIs are used. No third-party scripts loaded in the wizard. CSP and existing Phase 8 / Phase 9 XSS protections are inherited unchanged. |
| T-13-NEW-07 | Information Disclosure | Phase 14's `Brouillons` MetricTile or partner home draft list could surface commission for in-progress drafts. | **out-of-scope** | Phase 14 territory. Flag for Phase 14 planner: commission MUST NOT appear in the `Brouillons` list rendering. Phase 14 ADMIN-09 verification needs its own no-commission test on the partner home surface. |

---

## 6. Verification Artifacts (locked)

These artifacts are the LOAD-BEARING ENFORCEMENT of the invariants
reaffirmed in §3:

1. **`src/lib/pdf/no-commission.test.ts`** — 36 assertions across 30
   golden corpus fixtures with 4-layer defense-in-depth (render-data /
   computed-jsonb / paramsSnapshot scope / binary inspection). Plan
   13-06 Task 2 deliverable. **D-28 mandatory.**

2. **`src/lib/api/proposals/finalize-wizard.test.ts`** Tests 10, 10b, 10c
   — single-fixture render-data + audit-log assertions, plus the
   structural grep contract that `finalize-wizard.ts` source has zero
   `commission` substring outside comments. Plan 13-02 deliverable.

3. **`src/lib/api/proposals/finalize-helpers.ts`** — the ADMIN-09
   isolation barrier. The literal `commission` property name lives
   here ONLY; `finalize-wizard.ts` accesses the snapshot via imported
   helper functions. Plan 13-02 deliverable. Verified by source-file
   grep in finalize-wizard.test.ts Test 10c.

4. **`app/(authed)/proposals/new/calcul/page.test.tsx`** Test 15 —
   commission appears EXACTLY ONCE on step 2. Plan 13-04 deliverable.

5. **`app/(authed)/proposals/new/verification/page.test.tsx`** Test 15 —
   commission appears EXACTLY ONCE on step 3 (in the ● CALCUL recap row,
   NOT in the `<PdfPreviewMock>`). Plan 13-05 deliverable.

6. **`src/lib/wizard/stepperBehavior.test.ts`** — Stepper state semantics
   (D-20/D-21/D-22/D-23). Plan 13-06 Task 1 deliverable. Not directly
   ADMIN-09-related but ensures the wizard's edit-invalidates-downstream
   rule cannot accidentally re-finalize a draft with stale commission state.

7. **`docs/smoke/13-wizard-runbook.md`** Test 6 — manual operator
   verification (Chrome + Edge) of:
   - Commission visible EXACTLY ONCE on step 2 (`view source` grep).
   - Commission visible EXACTLY ONCE on step 3.
   - Commission ZERO occurrences on `/proposals/{id}` (post-finalize).
   - Commission ZERO occurrences in the downloaded PDF (via `pdftotext`).
   - Commission ZERO in `audit_log.proposal.create` payload (optional DB query).

   Plan 13-06 Task 4 deliverable. **D-28 partner of the mandate.**

---

## 7. Out-of-Scope

The following are NOT covered by this addendum (flagged for future
phases / planners):

- **Phase 14 partner home `Brouillons` MetricTile + draft list rows.**
  Phase 14 ADMIN-09 verification must independently confirm commission
  invisibility on those surfaces. T-13-NEW-07 flags this.

- **Phase 14 admin coefficient history viewer enhancements.** Phase 9
  HistoryDiff already enforces commission disclosure within the
  permitted admin envelope; Phase 14 changes (if any) must re-verify
  against ADMIN-09.

- **Public-surface auth flows (login / invite / reset).** Out of
  Phase 13 scope; no commission disclosure surface in v1.1 and none
  added in v1.2.

- **Operating-system / browser-extension threat layer.** T-13-NEW-04
  enumerates this; accepted as out-of-scope for application-layer
  security.

---

## 8. Sign-Off

- **Date drafted:** 2026-05-12
- **Author:** Claude Code (via Plan 13-06, executor agent)
- **Reviewer:** Antoine Rousseau (manual review required before Phase 13 close)
- **Status:** drafted, pending Antoine sign-off

**Sign-off contract:** Antoine reviews this document end-to-end, confirms
the relaxation envelope (§2) and the new-threat dispositions (§5) match
his expectations, and signs off by:

1. Confirming all 7 verification artifacts in §6 exist and pass CI:
   - `npm test` exit code 0
   - `src/lib/pdf/no-commission.test.ts` 36 tests pass
   - `src/lib/wizard/stepperBehavior.test.ts` 9 tests pass
2. Confirming the manual smoke runbook (`docs/smoke/13-wizard-runbook.md`)
   Test 6 executes cleanly in Chrome + Edge.
3. Editing this file's `Status:` line to `signed-off by Antoine
   Rousseau on YYYY-MM-DD` and committing.

**Without that sign-off, Phase 13 cannot pass review (D-28 hard gate).**

---

## 9. References

- `.planning/phases/13-3-step-proposal-wizard/13-CONTEXT.md` D-12 + D-28
- `.planning/phases/09-admin-surface/09-CONTEXT.md` — ADMIN-09 cluster origin
- `.planning/phases/09-admin-surface/09-SECURITY.md` — 42 threats closed
- `.planning/phases/10-cutover-polish/10-SECURITY.md` — 55 threats closed (97 total)
- `.planning/PROJECT.md` §Current Milestone — commission invisibility constraint + PDF immutability invariant
- `.planning/REQUIREMENTS.md` ROUTE-01 — Phase 13 phase-blocking requirement
- `src/lib/pdf/no-commission.test.ts` — load-bearing ADMIN-09 PDF gate
- `src/lib/api/proposals/finalize-wizard.ts` — the finalize pipeline
- `src/lib/api/proposals/finalize-helpers.ts` — the ADMIN-09 isolation barrier
- `docs/smoke/13-wizard-runbook.md` — manual Chrome + Edge smoke runbook
