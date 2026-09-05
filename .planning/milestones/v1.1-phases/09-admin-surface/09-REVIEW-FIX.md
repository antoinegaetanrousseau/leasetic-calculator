---
phase: 09-admin-surface
fixed_at: 2026-05-10T02:00:00Z
review_path: .planning/phases/09-admin-surface/09-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-05-10T02:00:00Z
**Source review:** `.planning/phases/09-admin-surface/09-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (CR-01..03 + WR-01..06; IN-01..03 excluded per fix_scope=critical_warning)
- Fixed: 9
- Skipped: 0

All fixes verified with: `tsc --noEmit` (0 errors), `npm run lint` (0 errors), `npm test` (399/399 pass), `npm run build` (clean).

---

## Fixed Issues

### CR-01 + WR-02: Double-submit guard and RHF baseline reset in SaveConfirmModal

**Files modified:** `app/(admin)/[adminSegment]/coefficients/SaveConfirmModal.tsx`, `app/(admin)/[adminSegment]/coefficients/CoefficientsEditor.tsx`
**Commit:** `fb55362`
**Applied fix:** CR-01 and WR-02 share the same root cause (save-state-machine gap) and were fixed atomically per the reviewer's suggestion.

- Added `isSaving: boolean` state to `SaveConfirmModal`.
- `onConfirm` returns early if `isSaving` is already true; sets it on entry; clears it in the error handler so admin can retry without reopening.
- Confirm button gets `disabled`, `aria-disabled`, and `aria-busy` attributes while saving, plus a `Loader2` spinner icon.
- Added optional `onResetForm?: (saved: CoeffEditorValues) => void` prop to `SaveConfirmModal`; called on success so `CoefficientsEditor` can reset RHF `defaultValues` to the just-saved values immediately.
- In `CoefficientsEditor`: added `onResetForm` callback that calls `form.reset(saved)` with `note: ''`; added a `useEffect` keyed on `latestParams.id` that also resets RHF after `router.refresh()` delivers new server props (handles the case where the component stays mounted).

### CR-02: Replace undefined `btn-ghost` with `btn-out` in InviteUrlModal

**Files modified:** `src/components/InviteUrlModal.tsx`
**Commit:** `0f39a5a`
**Applied fix:** Changed `className="btn-ghost"` to `className="btn-out"` on the Close button at line 287. `btn-ghost` does not exist in `globals.css`; `btn-out` is the correct secondary-action class (transparent bg, ink text, border) used throughout the admin surface.

### CR-03: Strip raw error from `adminUpdateGlobalParams` console.error

**Files modified:** `src/lib/admin/actions.ts`
**Commit:** `0f736e4`
**Applied fix:** Replaced `console.error('[adminUpdateGlobalParams] failed:', e)` with:
```ts
const msg = e instanceof Error ? e.message : String(e);
console.error('[adminUpdateGlobalParams] failed:', msg);
```
This prevents postgres.js/Drizzle from dumping commission_pct query parameter values into server logs, satisfying ADMIN-09 §9.4. The other `console.error` calls in `actions.ts` (for user/invitation actions that do not touch global_params) were intentionally left unchanged as they are not subject to this invariant.

### WR-01: Audit temporary disable/re-enable in `adminReissueInvitation`

**Files modified:** `src/lib/admin/actions.ts`
**Commit:** `b739b51`
**Applied fix:** Added `writeAuditLog({ action: 'user.disable', ... })` immediately after the temporary `deletedAt = new Date()` flip, and `writeAuditLog({ action: 'user.re_enable', ... })` after `createInvitation` completes on the happy path. Also added a `user.re_enable` entry in the error-restore path (when `createInvitation` throws) so the trail is complete even on failures. All audit payloads include a `note` field explaining the workaround context and exclude financial rate fields (D-09-09b).

### WR-03: Validate pagination cursor in `loadMoreHistory` server action

**Files modified:** `app/(admin)/[adminSegment]/coefficients/history-load-more.action.ts`
**Commit:** `63eacea`
**Applied fix:** Added ISO timestamp regex (`/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/`) and UUID regex validation before passing the client-supplied cursor to `listGlobalParamsHistory`. A malformed `effectiveFrom` value would otherwise propagate as an unhandled Postgres error. Returns the structured key `'admin.coefficients.history.load.error'` on validation failure (the same key the `HistoryTable` already toasts on error).

### WR-04: Route hardcoded French strings in ExplainTool through `t()`

**Files modified:** `app/(admin)/[adminSegment]/coefficients/ExplainTool.tsx`, `src/lib/i18n/dictionaries.ts`
**Commit:** `65632c1`
**Applied fix:** Added 3 new i18n keys to both FR and EN sections of `dictionaries.ts`:
- `admin.coefficients.explain.formula.symbolic` — symbolic formula string
- `admin.coefficients.explain.result.per_month` — "/ mois" / "/ month"
- `admin.coefficients.explain.result.duration_validity` — "{0} mois · {1} jours" / "{0} months · {1} days"

Replaced the three hardcoded French literals in `FormulaTrail` with `t()` calls. The duration/validity string uses `.replace('{0}', ...).replace('{1}', ...)` for interpolation, consistent with the project's i18n discipline. All 199 dictionary parity tests (including the compile-time `_EnHasAllFrKeys` check) pass.

### WR-05: JOIN users in `listGlobalParamsHistory` to display admin name

**Files modified:** `src/lib/db/queries/global-params.ts`, `src/lib/db/queries/index.ts`, `app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx`
**Commit:** `102fafd`
**Applied fix:** Added `GlobalParamsHistoryRow` type (extends `GlobalParamsRow` with `createdByDisplay: string | null`). Updated `listGlobalParamsHistory` to use explicit `.select()` with a `LEFT JOIN users ON users.id = global_params.created_by` and `COALESCE(displayName, email)` for `createdByDisplay`. Exported the new type from `queries/index.ts`. Updated `HistoryTable` to import `GlobalParamsHistoryRow` (replacing the `GlobalParamsRow` import from `@/db/schema`), type its state correctly, and render `row.createdByDisplay ?? '—'` instead of `row.createdBy ?? '—'`. Satisfies D-09-02 / UI-SPEC §3.1.3.2.

**Phase 8 note:** Checked the Phase 8 home-page partner list — it does not use the stale `useState(initialX)` pattern. No changes needed there.

### WR-06: Remove stale `useState` for partners list in `AccountsList`

**Files modified:** `app/(admin)/[adminSegment]/accounts/AccountsList.tsx`
**Commit:** `a657e31`
**Applied fix:** Removed `const [partners] = useState<PartnerWithCount[]>(initialPartners)` and replaced all three references (`filtered` useMemo, empty-state guard, useMemo dependency array) with direct reads of `initialPartners`. React does not re-initialize `useState` when props change; reading the prop directly lets `router.refresh()` deliver fresh server-component data that the component immediately reflects without stale chips or status values.

**Phase 8 check:** Searched the full `app/` tree for the `useState.*initial` pattern — only `AccountsList.tsx` and `HistoryTable.tsx` (which correctly mutates its list via `setRows` for the load-more flow) were found. No Phase 8 pages have the same issue.

---

## Skipped Issues

None — all 9 in-scope findings were fixed.

---

_Fixed: 2026-05-10T02:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
