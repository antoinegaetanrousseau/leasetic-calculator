# Phase 37: CRM Stack Closure — Discussion Log

**Date:** 2026-09-05
**Mode:** default (interactive)
**Areas discussed:** 4 of 4 offered — all selected

> Human reference only. Downstream agents read `37-CONTEXT.md`, not this file.

---

## Pre-discussion scouting

Scouted before generating gray areas, following the habit Phase 36 established. Four findings
shaped the questions:

| Finding | How established |
|---|---|
| **The detail page renders no commission.** Partner co/name, client co, `amountHT`, `durationMonths`, coefficient, `loyerHT`. Zero `commission` matches; `params_snapshot` never read in the render path. | `grep` over `app/(authed)/proposals/[id]/page.tsx` |
| **The 19-gate ADMIN-09 suite covers 5 admin surfaces plus XLSX — none is `/proposals/[id]`.** So the surface is currently ungated whatever we decide. | `tests/admin-09-grep-contracts.test.ts` |
| **The list page already lets admins see any partner's proposals** via `?user_id=`, honoured only when `role === 'admin'` (Phase 18 D-11, lines 84-86). The detail page gates flatly at line 47. | both files |
| **Phase 33's item 3 is a walk, not a defect.** WR-02 was fixed in `52d03e1`; `PipelineBoard.test.tsx` Test 9b pins it. Only operator confirmation is outstanding. | `33-VERIFICATION.md:377` |

The first two reframed the ADMIN-09 question. The roadmap's criterion asks whether the envelope
"needs adjusting"; the honest answer is no, which turns the real decision into whether to *pin* the
existing absence.

---

## Area 1 — Admin bypass shape (GAP-01)

**Additional detail surfaced mid-area:** `ProposalRow.tsx:157` builds a bare
`href = /proposals/${row.id}`, and that component is shared between the partner list and the admin
relationship page. Also clarified that D-18 URL-secrecy governs the admin *tree*'s 404-not-403
behaviour, not proposal ids — so it does not constrain this choice.

**Options presented:**
1. Unconditional server-derived `role === 'admin'` bypass (recommended)
2. Mirror the list page's `?user_id=` override
3. Relationship-scoped authorization

**Selected: 1.**

**Notes.** Option 2 would have required teaching a shared presentation component about admin context
and putting the partner's user id in the URL. Option 3 introduces an authorization concept the
codebase lacks and a join on every load. Captured as D-37-01, including the framing that this closes
an inconsistency left by Phase 18 rather than widening admin reach.

---

## Area 2 — ADMIN-09 gate for the detail page

**Options presented:**
1. Add a 20th gate (recommended)
2. Record the decision, leave the suite at 19
3. Add the gate plus a source-level assertion that `params_snapshot` is never read

**Selected: 1.**

**Notes.** The envelope itself needs no adjustment — commission is structurally absent, not hidden.
The gate is a regression guard on a surface that has just become admin-reachable. Captured as
D-37-02, with the instruction to follow the existing harness (the file documents a
`renderToString()` caveat around line 64) rather than invent one, and to keep the suite green.

---

## Area 3 — Phase 34 verification depth (CLOSE-04)

**Scale established first:** 13 plans, 10 requirements (FICHE-01..05, ACTV-01..05), `34-SECURITY.md`
present, `34-WALKTHROUGH.md` completed. Missing: `34-VERIFICATION.md` and `34-REVIEW.md`.

**Risk flagged before asking:** Phase 36's code review found 4 Critical + 8 Warning in a single
223-line script and needed two fix-and-re-review rounds. A standard-depth review of 13 plans could
swallow Phase 37.

**Options presented:**
1. Verification full, review scoped to highest-risk files (recommended)
2. Both full
3. Verification only, no review

**Selected: 1.**

**Notes.** Captured as D-37-03, with the requirement that `34-REVIEW.md` state its own scope
explicitly so a future reader does not mistake it for a full review. Risk areas named: authorization
and ownership checks, the `relationship_events` write path, server actions.

---

## Area 4 — Human-walk sequencing (CLOSE-01, CLOSE-03)

**Options presented:**
1. One consolidated walk at the end (recommended)
2. Two walks — CRM, then pipeline
3. Per-area, as each fix lands

**Selected: 1.**

**Notes.** The ordering is load-bearing rather than a convenience: UAT scenario 9 is titled "Admin
relationship detail — and its known dead end", so walking it before the bypass lands would re-record
the dead end. Captured as D-37-04, with the six items enumerated and the requirement that the walk
produce written results (`30-UAT.md` → `pending: 0`, `33-VERIFICATION.md` → `status: passed`).

---

## Decided without asking

- **D-37-05 (GAP-03)** — both Phase 35 INFO findings fixed, with "the momentum card renders
  identically" as the acceptance. No trade-off to put to the operator; the review already specified
  the fixes and the file:line targets.
- **D-37-06 (no UI-SPEC)** — `ROADMAP.md` marks the phase "UI hint: yes", which would make
  `/gsd-plan-phase` demand a design contract. Nothing in the phase creates or redesigns UI, and
  D-37-05's own acceptance criterion is that rendering does not change. Recorded with rationale so
  planning is not blocked; it changes only which command the operator runs (`--skip-ui`).

## Claude's Discretion

Recorded in `37-CONTEXT.md`: the code shape of the bypass (role must be server-derived), which files
the scoped review covers, whether one agent or two produce Phase 34's artifacts, the order of
non-walk work, and the wording of the walk script.

## Deferred Ideas

None. No scope creep occurred.

---

*Phase: 37-crm-stack-closure*
*Logged: 2026-09-05*
