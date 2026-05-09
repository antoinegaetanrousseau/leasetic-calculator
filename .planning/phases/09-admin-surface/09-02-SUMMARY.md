---
phase: 09-admin-surface
plan: "02"
subsystem: admin-coefficients-ui
tags: [admin, coefficients, react-hook-form, zod, history, explain, commission-invisibility, cursor-pagination]
dependency_graph:
  requires:
    - 09-01 (coeffEditorSchema, adminUpdateGlobalParams, listGlobalParamsHistory, i18n keys, CSS classes)
    - 08-persistence-pdf-pipeline (global_params schema, getLatestGlobalParams)
    - 07-calc-engine (computeLoyer, tKey, ComputeLoyerResult)
    - 06-auth-shell (requireAdmin, getCurrentLang)
  provides:
    - app/(admin)/[adminSegment]/coefficients/page.tsx (route: /[adminSegment]/coefficients)
    - app/(admin)/[adminSegment]/coefficients/CoefficientsEditor.tsx
    - app/(admin)/[adminSegment]/coefficients/SaveConfirmModal.tsx
    - app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx
    - app/(admin)/[adminSegment]/coefficients/HistoryDiff.tsx
    - app/(admin)/[adminSegment]/coefficients/ExplainTool.tsx
    - app/(admin)/[adminSegment]/coefficients/history-load-more.action.ts
  affects:
    - src/lib/i18n/dictionaries.ts (2 new keys: explain.formula.label + explain.substitution.label)
    - Plan 09-03 accounts page — can reuse HistoryDiff and the admin layout pattern
tech_stack:
  added: []
  patterns:
    - RHF useForm<Input,unknown,Output> with z.input/z.infer split (ProposalForm.tsx pattern)
    - zodResolver(coeffEditorSchema) mode=onBlur same-schema discipline (SHELL-11)
    - computeDiffPairs pure-client diff at modal-open (D-09-01 — no extra DB read)
    - Cursor pagination for history (loadMoreHistory server action — mirrors Phase 8 D-C1)
    - ExplainTool: useMemo over computeLoyer inputs, ComputeLoyerResult discriminated union narrowing
    - Focus trap + Escape handler from InviteUrlModal pattern (Phase 6 06-07)
    - force-dynamic + independent requireAdmin on every server boundary (AUTH-15)
key_files:
  created:
    - app/(admin)/[adminSegment]/coefficients/page.tsx (75 lines)
    - app/(admin)/[adminSegment]/coefficients/CoefficientsEditor.tsx (351 lines)
    - app/(admin)/[adminSegment]/coefficients/SaveConfirmModal.tsx (226 lines)
    - app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx (207 lines)
    - app/(admin)/[adminSegment]/coefficients/HistoryDiff.tsx (112 lines)
    - app/(admin)/[adminSegment]/coefficients/ExplainTool.tsx (273 lines)
    - app/(admin)/[adminSegment]/coefficients/history-load-more.action.ts (24 lines)
  modified:
    - src/lib/i18n/dictionaries.ts (2 keys added: fr + en)
decisions:
  - "z.input<typeof coeffEditorSchema> for TFieldValues in useForm generic (mirrors ProposalForm z.input pattern) to handle z.coerce.number() making validityDays unknown in the input type"
  - "row.createdBy rendered as raw user.id with '—' fallback (displayName JOIN deferred to Plan 03 follow-up — see Known Stubs section)"
  - "FormulaTrail renders commissionPct as a plain number in JSX expressions (not JSXText) — SHELL-06 no-JSXText rule satisfied because numeric values are in {commissionPct} expression containers"
  - "admin.coefficients.explain.formula.label + substitution.label added to dictionaries (fr+en) to satisfy ESLint SHELL-06 rule that catches 2+ alpha char JSXText including technical labels like FORMULE/SUBSTITUTION"
metrics:
  duration_minutes: 8
  completed_date: "2026-05-10"
  tasks_completed: 3
  tasks_total: 3
  files_created: 7
  files_modified: 1
---

# Phase 9 Plan 02: Coefficients Page UI Summary

**One-liner:** RHF+Zod coefficients editor (4×3 grid, commission, max amount, validity, note) with client-side save-confirm modal showing field-by-field diff, cursor-paginated history table with rendered diffs, and pure-client ExplainTool formula trail — ADMIN-09 commission_pct fenced to editor input + formula trail only.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Page server component + HistoryTable + HistoryDiff + server action | 19dd7f2 | page.tsx, HistoryDiff.tsx, HistoryTable.tsx, history-load-more.action.ts |
| 2 | CoefficientsEditor + SaveConfirmModal | cde5d40 | CoefficientsEditor.tsx, SaveConfirmModal.tsx |
| 3 | ExplainTool + i18n keys | e1f9665 | ExplainTool.tsx, dictionaries.ts |

## Commission Invisibility Confirmation (ADMIN-09 / UI-SPEC §13)

`commission_pct` is rendered on **exactly** these surfaces:

1. **CoefficientsEditor** — `register('commissionPct')` input field (editor must show to allow editing)
2. **ExplainTool FormulaTrail** — `{commissionPct}` JSX expression in the substitution lines (D-09-07 sole non-editor surface)
3. **SaveConfirmModal via HistoryDiff** — when `commissionPct` is a changed field, `computeDiffPairs` includes it in the diff and `HistoryDiff` renders `commissionPct: X → Y`
4. **HistoryTable via HistoryDiff** — same: when `commissionPct` changed between rows, the rendered diff cell shows it

`commission_pct` does **NOT** appear:
- As a standalone column in HistoryTable (verified by grep gate — 0 matches for `commissionPct` outside HistoryDiff delegation)
- In any route handler response beyond the page render of `latestParams`
- In any toast message or error log

## adminUpdateGlobalParams Call Ordering (D-09-01)

The modal opens **before** the server action fires. Sequence:
1. Admin submits valid form → `onOpenConfirm(data)` stores `pending`
2. Modal renders → `computeDiffPairs(latestParams, pending)` computed client-side — no DB read
3. Admin clicks Confirmer → `adminUpdateGlobalParams(...)` fires via `toast.promise`
4. On success → `onConfirmed()` + `router.refresh()` → page server component re-runs → fresh `latestParams` + `initialHistory`

No race condition: the modal is dismissed synchronously on success; a double-click on Confirmer would fire two sequential server action calls. Second call creates a new `global_params` row whose diff vs the first new row shows no changes (append-only schema; documented as T-09-02-11 accept).

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `row.createdBy ?? '—'` renders raw user.id | HistoryTable.tsx | 130 | UI-SPEC §3.1.3.2 requests displayName??email; requires a JOIN on users table not yet wired in listGlobalParamsHistory. Plan 03 follow-up: extend query with a LEFT JOIN or pass admin user map from page. |

This stub does **not** prevent the plan's goal from being achieved — the history table renders correctly; the admin column shows user IDs instead of display names. Both Phase 9 admins (Antoine + Emmanuel) have stable, recognizable IDs.

## ComputeLoyer Return Shape Binding

`ComputeLoyerResult.computed` is a discriminated union (`state: 'idle' | 'on-demand' | 'missing' | 'computed'`). The ExplainTool narrows correctly:

```typescript
const isOnDemand = result?.computed?.state === 'on-demand';
const computedState = result?.computed?.state === 'computed' ? result.computed : null;
// Then: computedState.coeff, computedState.loyerHT (typed as string by formula.ts)
```

No `@ts-expect-error` directives needed — the discriminated union narrowing is fully type-safe per `formula.ts` `ComputeLoyerState` type definition.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RHF generic type mismatch for z.coerce.number()**
- **Found during:** Task 2 (typecheck after writing CoefficientsEditor)
- **Issue:** `z.coerce.number()` in `coeffEditorSchema` produces `unknown` as the Zod INPUT type for `validityDays`, causing `Resolver<TFieldValues>` type mismatch when using `CoeffEditorValues` (= output type) as the form generic
- **Fix:** Applied `z.input<typeof coeffEditorSchema>` as `TFieldValues` and `CoeffEditorValues` as `TTransformed` (three-generic `useForm<Input, unknown, Output>`) — same pattern as `ProposalFormProvider` in ProposalForm.tsx
- **Files modified:** CoefficientsEditor.tsx
- **Commit:** cde5d40

**2. [Rule 2 - Missing i18n] SHELL-06 ESLint violations for formula trail labels and unit suffixes**
- **Found during:** Task 3 (lint after writing ExplainTool)
- **Issue:** ESLint `no-restricted-syntax` rule `JSXText[value=/[a-zA-ZÀ-ÿ]{2,}/]` flagged: `€ HT` (suffix span in CoefficientsEditor + ExplainTool — "HT" is 2 alpha chars), `FORMULE` and `SUBSTITUTION` (JSXText labels in FormulaTrail)
- **Fix:** 
  - `€ HT` → `{t('common.ht', lang)}` (existing key in Phase 6 dictionaries)
  - `FORMULE` → `{t('admin.coefficients.explain.formula.label', lang)}` (new key)
  - `SUBSTITUTION` → `{t('admin.coefficients.explain.substitution.label', lang)}` (new key)
  - Added 2 new keys × 2 langs (fr/en) to dictionaries.ts
- **Files modified:** CoefficientsEditor.tsx, ExplainTool.tsx, src/lib/i18n/dictionaries.ts
- **Commit:** e1f9665

## Verification Results

```
npm run typecheck  → exit 0 ✓
npm run lint       → exit 0 ✓
npm run build      → exit 0 ✓ (/[adminSegment]/coefficients appears as ƒ dynamic route)
npm run test       → exit 0 ✓ (399/399 tests, including dictionaries.test.ts parity check)
```

## Threat Flags

No new threat surface introduced beyond what the plan's threat model covers. All routes are admin-gated (layout + independent requireAdmin calls). ExplainTool adds no network surface. The two new i18n keys add no security surface.

## Self-Check: PASSED

All 7 files created and confirmed present. Commits 19dd7f2, cde5d40, e1f9665 verified in git log.
