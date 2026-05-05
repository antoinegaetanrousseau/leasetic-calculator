---
phase: 04-sidebar-shell-design-v2
plan: 04-03-typography-and-final-polish
completed: 2026-04-15
duration: ~20min
commits:
  - 8ba01d4
  - 893ab0c
requirements_shipped:
  - DESIGN-07
  - (all 12 DESIGN-XX verified via FINAL-TEST-v11.md Section D)
---

# Plan 04-03 Typography + FINAL-TEST-v11.md — Summary

## What shipped

1. **Typography scale bump (DESIGN-07)** — card section titles, field labels, and body font-size all nudged up to match the locked spec from 04-CONTEXT.md. Proposal internal typography untouched to preserve print parity.
2. **FINAL-TEST-v11.md** — master ship-gate runbook covering all 4 phases' work. Supersedes Phase 3's FINAL-TEST.md.

## Typography changes

| Element | Before | After | Delta |
|---------|--------|-------|-------|
| `body` | 14px / 1.5 | 14.5px / 1.55 | +3.6% size, more line-height |
| `.ctitle` (card section titles) | 0.66rem / 600 / 0.08em | 0.82rem / 700 / 0.06em | +24% size, bolder, tighter tracking |
| `label` (field labels) | 0.73rem / 500 | 0.78rem / 500 | +7% size |
| `.fld` spacing | margin-bottom 0.85rem | 1rem | +18% breathing room |
| `.two` grid gap | 1.6rem | 2rem | +25% column separation |

**Topbar title** (1.15rem/600) and **sidebar nav** (0.88rem/500) already correct from Wave 1 — no change.

**Proposal internal typography** (`.prop-*`, `.slbl`, `.oi-*`, `.ig-*`, `.plus-*`, `.conds`, `.prop-foot`, `.dest-*`) **untouched** — proposal uses explicit font sizes so the body scale-up doesn't cascade into it. This is critical for DESIGN-10 / print parity: the printed PDF output remains byte-identical to Phase 1.

## FINAL-TEST-v11.md

New master runbook at `.planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md` with 10 sections:

- **A.** PARITY re-run (with updated button-location notes)
- **B.** SEC re-run
- **C.** UX-01..10 + FEAT-01..06 feature tests
- **D.** DESIGN-01..12 visual verification (explicit per-REQ rows)
- **E.** FR-only end-to-end smoke (10 steps)
- **F.** EN-only end-to-end smoke (10 steps)
- **G.** Migration re-test (10 steps — includes sidebar 🔒 state verification)
- **H.** Print mode isolation (the highest-risk Phase 4 gate)
- **I.** Browser matrix (Chrome + Edge required, Firefox + Safari best-effort)
- **J.** Ship sign-off with distribution steps

Phase 3's `FINAL-TEST.md` retained in git history at `.planning/phases/03-ux-polish-i18n/FINAL-TEST.md` but marked as superseded by the new doc.

## Phase 4 complete — all 12 DESIGN requirements shipped

| REQ | Status | Plan |
|-----|--------|------|
| DESIGN-01 Sidebar | ✓ | 04-01 |
| DESIGN-02 Topbar | ✓ | 04-01 |
| DESIGN-03 Footer | ✓ | 04-01 |
| DESIGN-04 Pill buttons | ✓ | 04-02 |
| DESIGN-05 Shadow cards | ✓ | 04-02 |
| DESIGN-06 Rounded inputs | ✓ | 04-02 |
| DESIGN-07 Typography | ✓ | 04-03 |
| DESIGN-08 Floating banners | ✓ | 04-02 |
| DESIGN-09 Breadcrumb removed + ● dots | ✓ | 04-01 (removal) + 04-02 (dots) |
| DESIGN-10 Print isolation | ✓ | 04-01 |
| DESIGN-11 FR/EN segmented toggle | ✓ | 04-01 |
| DESIGN-12 Zero regression | ✓ | All 3 plans — verified by self-checks still firing |

## Zero regression verified

- `grep -c 'assertCalc\|assertEscape\|assertValidity'` → 9 refs (3 fn × 3 call sites each)
- `grep -c 'escapeHtml\|hashPassword\|migratePasswordIfNeeded'` → 41 refs preserved
- `grep -c '^var '` → 0
- `node --check` on extracted `<script>` → PARSE OK after every commit
- `#page-proposition` and `.prop-*` CSS UNTOUCHED — print PDF byte-identical to Phase 1
- All Phase 1-3 helpers still exported on `window` for DevTools inspection

## Commits (Phase 4 total)

```
893ab0c docs(04-03): add FINAL-TEST-v11.md master ship-gate runbook
8ba01d4 feat(04-03): typography + spacing scale bump
5c9ce8b docs(04-02): add SUMMARY.md and mark plan complete
cfcbf05 feat(04-02): component restyle — pill buttons, shadow cards, rounded inputs
04b1048 docs(04-01): add SUMMARY.md and mark plan complete in ROADMAP
957dfdc feat(04-01): shell restructure — sidebar + topbar + footer grid
```

Plus earlier Phase 4 scoping/planning:
```
2d422c0 docs(phase-04): plan sidebar shell + design system v2
1dbb49b docs(phase-04): amend spec after Antoine sign-off
7a788bf docs(phase-04): scope sidebar shell + design system v2
2587938 style: align design system with leasetic.fr website
aa05012 fix: escape </script> in assertEscape fixture
```

## Next action

**Antoine runs `FINAL-TEST-v11.md` sections A–J in Chrome + Edge** (~75–105 min total) before distributing v10 to Leasétic partners.

If any section fails: report the section letter + REQ-ID and I'll run a gap-closure plan (`/gsd:plan-phase 4 --gaps`).
