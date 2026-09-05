---
status: passed
phase: 27-status-pill-rendering-fix
verified: 2026-05-30
method: source-verification + human-verify checkpoint (verifier subagent disabled via config)
requirements_checked: [UIFIX-02, UIFIX-03]
requirements_unaccounted: []
must_haves_total: 7
must_haves_verified: 7
score: 7/7
tests: 1184 passed | 4 skipped (0 failed)
gates:
  typecheck: pass
  lint: pass (eslint --max-warnings=0)
  code_review: issues_found (0 critical, 0 warning, 2 info — non-blocking)
  regression: pass (full vitest suite)
  schema_drift: none
---

# Phase 27: status-pill-rendering-fix — Verification

**Status: PASSED** — both ROADMAP success criteria met; UIFIX-02 + UIFIX-03 fully accounted for.

## Phase Goal
Content-hugging `.chip` sizing on the home "Propositions récentes" list and the `/proposals` table; light + dark verified.

## Requirement Traceability
| Requirement | Source | Disposition |
|-------------|--------|-------------|
| UIFIX-02 | 27-01 (source fix) + 27-02 (visual) | ✓ Verified |
| UIFIX-03 | 27-02 (re-verification) | ✓ Verified |

No requirement IDs from the phase PLAN frontmatter are unaccounted for.

## Must-Haves
| # | Must-have | Evidence | Verdict |
|---|-----------|----------|---------|
| 1 | Home chip renders full label, no clipping, no fixed-width stretch | grep `90px 1fr auto auto` → 0; `max-content` → 1; human-verify approved (FR + EN, multiple widths) | ✓ |
| 2 | Home row order clientCo → lcRef → amount → chip (trailing) | `git diff` shows StatusChip moved to last grid child | ✓ |
| 3 | Chip hugs content (content track + non-stretching justify-self) | `gridTemplateColumns: '1fr auto auto max-content'` + `justifySelf:'start'` wrapper | ✓ |
| 4 | Other inline row styles preserved (clientCo 1fr ellipsis, fonts, paddings, amount tabular-nums) | diff confirms three text spans unchanged | ✓ |
| 5 | /proposals chip content-hugging on draft/active/expired/archived in light+dark, no Phase-26 regression | human-verify approved across all variants + both themes | ✓ |
| 6 | Any regression fixed at consumer grid track, not chip colors | No regression found → no fix needed; globals.css `.chip*` + StatusChip.tsx untouched | ✓ |
| 7 | Both surfaces read the same (trailing, content-hugging) | human-verify approved parity | ✓ |

## Gates
- `npx tsc --noEmit` — no error in page.tsx.
- `npm run lint:check` (eslint --max-warnings=0) — 0 warnings.
- Code review (standard depth) — 0 critical / 0 warning / 2 info (inert CSS observations, non-blocking).
- Full vitest suite — 1184 passed, 4 skipped, 0 failed (no cross-phase regression).
- Schema drift — none (pure client-side CSS; no schema files touched).

## Human Verification
Checkpoint 27-02 (`checkpoint:human-verify`, blocking) approved by user: home + /proposals chips render content-hugging, full-label, aligned in light AND dark mode.

## Conclusion
Phase 27 achieved its goal. Both surfaces render the status chip content-hugging and consistent across themes with no clipping, stretch, or misalignment. No gaps.
