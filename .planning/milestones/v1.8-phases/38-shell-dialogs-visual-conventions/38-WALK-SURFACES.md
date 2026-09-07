# 38-WALK-SURFACES.md — Measured `.btn-green`/`.btn-navy`/`.btn-out` enumeration for the CLOSE-08 walk

**Measured:** 2026-09-06, after plan 38-02's Task 1 (padding + focus fix) landed, per D-38-04's
"fix first, then walk once." Plan 38-04 consumes this file as its input surface list — it does not
need to re-derive it.

**Commands run (raw counts, not hand-transcribed):**

```
$ grep -rl "btn-green" src app | wc -l
21
$ grep -rl "btn-navy" src app | wc -l
3
$ grep -rl "btn-out" src app | wc -l
19
$ grep -rl "btn-green\|btn-navy\|btn-out" src app | wc -l
32
```

## Drift against 38-UI-SPEC.md's A-38-01 figures

A-38-01 stated **18 / 2 / 18 / 31** (green / navy / out / distinct-total), noting that figure was
itself a correction of D-38-13's original "17 `.btn-out` sites" undercount. The plan's own
`<objective>` section re-measured on 2026-09-06 *before planning* and got **21 / 3 / 19 / 32** —
this execution-time re-measurement (also 2026-09-06, after Task 1 landed) reproduces that same
**21 / 3 / 19 / 32**. No further drift between planning-time and execution-time measurement. The
+3/+1/+1/+1 drift from A-38-01's 18/2/18/31 is real and is attributed to Phase 37's additions
landing after A-38-01 was measured (per the plan's own objective note) — it is recorded here, not
smoothed over.

Note: each per-class count and the distinct-file total include `app/globals.css` itself (the CSS
source file matches its own selector text) — this is consistent with how A-38-01's original counts
were produced (`grep -rl … src app`, which does not exclude `globals.css`), so the totals above are
apples-to-apples with A-38-01's figures.

---

## Table 1 — The five CLOSE-08 named surfaces (per `28-CONTEXT.md` §"Carry-forward #3")

| # | Named surface | Route | File(s) | Classes rendered |
|---|---|---|---|---|
| 1 | Wizard step 1 | `/proposals/new/parametres` | `src/components/proposal/ProposalForm.tsx` | `.btn-out` (line 537, Cancel), `.btn-navy` (line 547, submit) |
| 2 | `/proposals` | `/proposals` | `app/(authed)/proposals/page.tsx` (`.btn-green` "Nouvelle proposition" CTA), `src/components/proposals/LoadMoreButton.tsx` (`.btn-out`, this plan's Task 2 edit), `app/(authed)/proposals/_components/ExportButton.tsx` (`.btn-out`) | `.btn-green`, `.btn-out` |
| 3 | Coefficients history | `/[adminSegment]/coefficients` | `app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx` | `.btn-out` (line 169, "Charger plus") |
| 4 | `/parametres` | `/parametres` | `app/(authed)/parametres/ParametresForm.tsx` | `.btn-out` (line 582, secondary), `.btn-green` (line 594, submit) |
| 5 | PartnersList / LcReferencesList padding sites | `/[adminSegment]/partners`, `/[adminSegment]/lc-references` | `app/(admin)/[adminSegment]/partners/PartnersList.tsx` (`.btn-green` line 111 "Inviter" CTA, `.btn-out` line 213 per-row link), `app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.tsx` (`.btn-out` line 167 per-row link) | `.btn-green`, `.btn-out` |

---

## Table 2 — Every other file touching one of the three classes (incidental, not CLOSE-08-named)

| File | Classes | Note |
|---|---|---|
| `app/globals.css` | `.btn-green`, `.btn-navy`, `.btn-out` (declaration site) | The CSS source this plan's Task 1 edited — not a rendered surface itself |
| `src/components/SetPasswordForm.tsx` | `.btn-green` | Set-password submit |
| `src/components/LoginForm.tsx` | `.btn-green` | Login submit |
| `src/components/ui/NotFoundCard.tsx` | `.btn-green` | 404 "Home" link |
| `src/components/InviteUrlModal.tsx` | `.btn-green`, `.btn-out` | Invite-URL modal Confirm/Cancel pair — **row-alignment spot** |
| `src/components/proposals/RestoreButtonClient.tsx` | `.btn-green` | Restore-from-archive button |
| `app/error.tsx` | `.btn-green` | App error boundary CTA |
| `app/(authed)/aide/commencer-ici/page.tsx` | `.btn-green` | End-of-article CTA |
| `app/(authed)/aide/commencer-ici/page.test.tsx` | `.btn-green` | Test file, asserts the CTA class — not a rendered surface |
| `app/(admin)/[adminSegment]/coefficients/SaveConfirmModal.tsx` | `.btn-green`, `.btn-out` | Save-confirm modal Confirm/Cancel pair — **row-alignment spot** |
| `app/(authed)/proposals/[id]/page.tsx` | `.btn-green`, `.btn-navy` | Proposal detail page actions |
| `app/(admin)/[adminSegment]/partners/CreatePartnerModal.tsx` | `.btn-green`, `.btn-out` | Create-partner modal Confirm/Cancel pair — **row-alignment spot** |
| `app/(admin)/[adminSegment]/partners/page.tsx` | `.btn-green` | Partners admin page-level action |
| `app/(admin)/[adminSegment]/page.tsx` | `.btn-green` | Admin landing action |
| `app/(admin)/[adminSegment]/coefficients/CoefficientsEditor.tsx` | `.btn-green` | Coefficients editor submit |
| `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` | `.btn-green`, `.btn-out` | Create-partner form Annuler/Envoyer pair — **row-alignment spot** (named in 38-UI-SPEC.md) |
| `app/(admin)/[adminSegment]/partners/PartnersList.tsx` | `.btn-green`, `.btn-out` | Also a CLOSE-08 named surface (Table 1) — listed here for its `.btn-green` "Inviter" CTA, distinct from the `.btn-out` row link |
| `app/(admin)/[adminSegment]/partners/PartnersList.test.tsx` | `.btn-green` | Test file, asserts CTA class — not a rendered surface |
| `src/components/proposal/CopyRefButton.tsx` | `.btn-out` | Copy-reference button |
| `src/components/proposals/DeleteButtonClient.tsx` | `.btn-out` | Delete-proposal button |
| `app/(authed)/clients/ClientsGrid.tsx` | `.btn-out` | Per-row client action |
| `app/(public)/invite/[token]/page.tsx` | `.btn-out` | Public invite page action |
| `app/(public)/reset/[token]/page.tsx` | `.btn-out` | Public password-reset page action |
| `app/(admin)/[adminSegment]/companies/CompaniesList.tsx` | `.btn-out` | Per-row company action |
| `app/(admin)/[adminSegment]/companies/review/PairReviewList.tsx` | `.btn-out` | Per-row pair-review action |

---

## Row-alignment inspection spots

38-UI-SPEC.md names `CreatePartnerForm.tsx` and `SaveConfirmModal.tsx` explicitly. Reading both
plus every other file where `.btn-out` and `.btn-green` render in the same flex row confirms these
additional spots — all are Annuler/Confirm-style button pairs in a `justifyContent: flex-end` (or
`space-between`) row, which is exactly what changes when the shared base rule's height moves from
~39px to ~36px:

1. `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` (lines 465/476) — Annuler
   (`.btn-out`) / "Envoyer l'invitation" (`.btn-green`) pair. Named in 38-UI-SPEC.md.
2. `app/(admin)/[adminSegment]/coefficients/SaveConfirmModal.tsx` (lines 219/226) — Cancel
   (`.btn-out`) / "Enregistrer" (`.btn-green`) pair. Named in 38-UI-SPEC.md.
3. `src/components/InviteUrlModal.tsx` (lines 264/286) — Confirm (`.btn-green`) / Cancel
   (`.btn-out`) pair in a `justifyContent: flex-end` row. **Not named in 38-UI-SPEC.md — found
   during this plan's measurement.**
4. `app/(admin)/[adminSegment]/partners/CreatePartnerModal.tsx` (lines 270/278) — Cancel
   (`.btn-out`) / Confirm (`.btn-green`) pair in a `justifyContent: flex-end` row. **Not named in
   38-UI-SPEC.md — found during this plan's measurement.**

For each: confirm the pair renders at the same ~36px height post-fix (not that one shrank past the
other), and note `.btn-out`'s residual ~2px border-driven delta over its `.btn-green` sibling is
expected and not a defect (A-38-02) — the walk should not flag that residual delta.

No file in the 32-file blast radius pairs a `.btn-*` class with an actual shadcn `<Button>`
component in the same row (the `HistoryTable.tsx` `<Button variant="link">` is inside a table cell,
in a different row than its file's separate `.btn-out` "Charger plus" control below the table) —
38-UI-SPEC.md's "real shadcn Button" phrasing describes these `.btn-out`/`.btn-green` legacy pairs
loosely; the actual row-alignment risk is between the two legacy classes' own heights, corrected
here.

---

## 2026-09-07 errata — Phase 40, HOUSE-06

**HOUSE-06 correction (pagination controls, Table 1 rows 2, 3 and 5).** Table 1 above describes
`PartnersList.tsx:213` and `LcReferencesList.tsx:167` (row 5) as a "per-row link". That language
does not match what either site renders. Along with `HistoryTable.tsx:169` (row 3) and
`LoadMoreButton` (row 2, `src/components/proposals/LoadMoreButton.tsx`), all **four** sites are the
same thing: a **"Charger plus" pagination control**, rendered only inside `{nextCursor && ...}`.
None of the four renders on a single-page dataset, which is exactly why the Phase 38 walk that
produced Table 1 could not observe them as rendered surfaces — the walk measured real, rendered
`.btn-out` instances, and a pagination control gated on `nextCursor` simply does not appear when
there is only one page of results. Verifying these four sites needs a multi-page dataset. Per
D-40-14, this correction is the closure — a follow-up item to actually observe them rendered
against a multi-page dataset was considered and deliberately not filed (see
`.planning/phases/40-milestone-record-closure/40-CONTEXT.md` Deferred Ideas). The original Table 1
rows above are left exactly as written; this block corrects the description without editing them.

**HOUSE-05 cross-reference (Table 1 row 1).** Row 1 cites
`src/components/proposal/ProposalForm.tsx` `.btn-out` (line 537, Cancel) and `.btn-navy` (line 547,
submit) as wizard step 1's rendered surface. Plan 40-02 deleted that component on 2026-09-07 as
HOUSE-05's resolution (commits `bf82050`, `178eacd`) — `ProposalFormProvider` was kept, but
`ProposalForm` itself (and its `.btn-out`/`.btn-navy` action row) is gone, so those two line
citations now point into removed code. This is the same finding already recorded as F-38-03:
38-CONTEXT.md D-38-04's premise "every CLOSE-08 surface renders a `.btn-out`" is FALSE for wizard
step 1. This paragraph is a distinct finding from the HOUSE-06 pagination correction above and is
not merged with it.
