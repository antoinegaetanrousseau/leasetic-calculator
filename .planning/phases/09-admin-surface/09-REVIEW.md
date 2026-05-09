---
phase: 09-admin-surface
reviewed: 2026-05-10T00:00:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - app/(admin)/[adminSegment]/accounts/AccountsList.tsx
  - app/(admin)/[adminSegment]/accounts/CreatePartnerModal.tsx
  - app/(admin)/[adminSegment]/accounts/page.tsx
  - app/(admin)/[adminSegment]/accounts/timeAgo.ts
  - app/(admin)/[adminSegment]/coefficients/CoefficientsEditor.tsx
  - app/(admin)/[adminSegment]/coefficients/ExplainTool.tsx
  - app/(admin)/[adminSegment]/coefficients/HistoryDiff.tsx
  - app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx
  - app/(admin)/[adminSegment]/coefficients/SaveConfirmModal.tsx
  - app/(admin)/[adminSegment]/coefficients/history-load-more.action.ts
  - app/(admin)/[adminSegment]/coefficients/page.tsx
  - app/(admin)/[adminSegment]/page.tsx
  - app/(authed)/proposals/new/page.tsx
  - app/globals.css
  - src/components/InviteUrlModal.tsx
  - src/lib/admin/actions.ts
  - src/lib/admin/index.ts
  - src/lib/admin/schemas.ts
  - src/lib/calc/index.ts
  - src/lib/calc/seed-params.ts
  - src/lib/db/queries/audit-log.ts
  - src/lib/db/queries/global-params.ts
  - src/lib/db/queries/index.ts
  - src/lib/db/queries/users.ts
  - src/lib/i18n/dictionaries.ts
findings:
  critical: 3
  warning: 6
  info: 3
  total: 12
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-05-10
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Phase 9 delivers the admin surface (coefficients editor, explain-calculation tool, partner accounts management, audit-log retrofit). The architecture, requireAdmin() ordering, append-only global_params discipline, and ADMIN-09 commission-invisibility invariant are all structurally sound. However three blockers need fixing before shipping: a double-submit bug in the save-confirm modal that causes duplicate `global_params` rows on fast double-click, a missing CSS class that breaks the InviteUrlModal close button's visual styling, and a potential ADMIN-09 commission leak via `console.error` in `adminUpdateGlobalParams`. Six warnings cover audit-trail gaps in the reissue-invitation workaround, stale UI state after save, an unvalidated client-supplied cursor in the load-more action, and locale discipline violations in ExplainTool. Three info items round out the report.

---

## Critical Issues

### CR-01: Double-submit in SaveConfirmModal creates duplicate `global_params` rows

**File:** `app/(admin)/[adminSegment]/coefficients/SaveConfirmModal.tsx:213-220`

**Issue:** The "Confirmer" button has no disabled/loading guard. After the first click, `adminUpdateGlobalParams` is called via `toast.promise`; the button remains fully clickable while the promise is in flight. A second click issues a second `insertGlobalParams()` call, creating a duplicate history row. `insertGlobalParams` is a plain INSERT with no idempotency key — each call produces a new row. This directly violates the DATA-05 append-only discipline (which assumes one insert per deliberate admin action) and creates phantom history entries.

**Fix:**
```tsx
// Add a isPending state to the component:
const [isSaving, setIsSaving] = useState(false);

const onConfirm = () => {
  if (isSaving) return;
  setIsSaving(true);
  const promise = adminUpdateGlobalParams({ ... });
  toast.promise(promise, {
    loading: t('admin.coefficients.save.loading', lang),
    success: () => {
      onConfirmed();
      router.refresh();
      return t('admin.coefficients.toast.save.success', lang);
    },
    error: () => {
      setIsSaving(false);
      return t('admin.coefficients.toast.save.error', lang);
    },
  });
};

// On the button:
<button
  type="button"
  className="btn-green"
  onClick={onConfirm}
  disabled={pairs.length === 0 || isSaving}
  aria-disabled={pairs.length === 0 || isSaving || undefined}
  aria-busy={isSaving || undefined}
>
  {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> : null}
  {t('admin.coefficients.modal.confirm', lang)}
</button>
```

---

### CR-02: `btn-ghost` CSS class used in InviteUrlModal is not defined

**File:** `src/components/InviteUrlModal.tsx:287`

**Issue:** The "Close" button at the bottom of InviteUrlModal uses `className="btn-ghost"`. This class does not exist anywhere in `app/globals.css` or any imported stylesheet. The button renders without any styling — no border, no padding, no hover state, no focus ring — making it visually invisible against the modal background and inaccessible (no visible focus indicator). This breaks the Phase 6 D-09 one-time-URL discipline's accessibility floor (UI-SPEC §NON-NEGOTIABLE).

```tsx
// Line 287 in InviteUrlModal.tsx:
className="btn-ghost"   // <-- class does not exist in globals.css
```

**Fix:** Replace with an existing class. Based on globals.css, `btn-out` (transparent background, ink text, border) is the appropriate secondary-action style used throughout the admin surface:

```tsx
<button
  type="button"
  onClick={handleClose}
  className="btn-out"   // defined at globals.css:329
>
  {t('auth.modal.button.close', lang)}
</button>
```

---

### CR-03: `console.error` in `adminUpdateGlobalParams` may leak `commission_pct` in server logs

**File:** `src/lib/admin/actions.ts:119`

**Issue:** The catch block logs the raw error object `e`:

```ts
console.error('[adminUpdateGlobalParams] failed:', e);
```

If `insertGlobalParams` fails on a DB-layer constraint (e.g., a `NOT NULL` violation on `commission_pct` or a `CHECK` constraint), many Postgres drivers (including `postgres.js` used by Drizzle/Neon) include the full query with parameter values in the error message. This could print `commission_pct` to server logs, directly violating ADMIN-09 §9.4 ("admin-action logger writes use the explicit string set, never raw row dumps").

The other `console.error` calls in actions.ts (adminDisableUser, adminReEnableUser, etc.) do not handle global_params data and are not subject to this invariant.

**Fix:** Strip the raw error object from the log, or log only a safe subset:

```ts
} catch (e) {
  // ADMIN-09 / PITFALLS §9.4: do NOT log `e` directly — DB errors may contain
  // commission_pct in their query-parameter dump. Log message only.
  const msg = e instanceof Error ? e.message : String(e);
  console.error('[adminUpdateGlobalParams] failed:', msg);
  throw new Error('admin.coefficients.error.save');
}
```

---

## Warnings

### WR-01: `adminReissueInvitation` temporary-disable is not audited, creating a phantom state change

**File:** `src/lib/admin/actions.ts:314-319`

**Issue:** The re-issue workaround sets `deletedAt = new Date()` on the user row (line 317) without writing a `user.disable` audit log entry. The subsequent `createInvitation` call re-enables the user (sets `deletedAt = null`) as a side effect. An audit log inspector would see: no `user.disable` event, then a `invitation.create` event — with the user's `deletedAt` having briefly been non-null in the DB without explanation. The restore path (line 329) on error also sets `deletedAt = null` without any audit. This makes the audit trail misleading for any future log review.

**Fix:** Either (a) write `user.disable` + `user.re_enable` audit entries around the temporary disable, or (b) bypass the workaround by calling a lower-level Phase 6 primitive that reissues without the disable trick (the preferred longer-term fix noted as "Plan 03 follow-up"). For v1.1, option (a) is straightforward:

```ts
// After the temporary disable (line 318):
await writeAuditLog({
  actorId: session.user.id,
  action: 'user.disable',
  targetType: 'user',
  targetId: null,
  payload: { userId: userRow.id, note: 'temporary-disable for re-issue workaround' },
});
// After createInvitation succeeds (before line 335):
await writeAuditLog({
  actorId: session.user.id,
  action: 'user.re_enable',
  targetType: 'user',
  targetId: null,
  payload: { userId: userRow.id, note: 're-enabled by re-issue workaround' },
});
```

---

### WR-02: Save success leaves CoefficientsEditor showing stale form values

**File:** `app/(admin)/[adminSegment]/coefficients/SaveConfirmModal.tsx:83-85`

**Issue:** On save success, `onConfirmed()` calls `onCloseModal()` in the parent which sets `pending = null` (closes the modal). `router.refresh()` re-fetches the page server component, updating `HistoryTable`'s `initialRows` and `latestParams`. However, the `CoefficientsEditor`'s RHF form is not reset after save — its `defaultValues` are only set on mount. After a successful save, `isDirty` remains true (the form still holds the values the admin just typed), and the "No changes" hint and disabled save button do not reappear. If the admin clicks Save again immediately, the form is still dirty and another confirm modal opens — but the `latestParams` prop to `SaveConfirmModal` will be the OLD row (the page hasn't rehydrated the `CoefficientsEditor` props yet), causing an incorrect diff calculation.

**Fix:** After a confirmed save, call `form.reset(data)` inside the editor to sync RHF's baseline. One approach: expose a `resetRef` or callback from `CoefficientsEditor` that `SaveConfirmModal.onConfirmed` can call. Alternatively, reset in the editor after detecting `latestParams` changes via `useEffect`:

```tsx
// In CoefficientsEditor, after calling form.reset in a useEffect keyed on latestParams.id:
useEffect(() => {
  form.reset({
    commissionPct: String(latestParams.commissionPct),
    maxAmount: String(latestParams.maxAmount),
    validityDays: latestParams.validityDays,
    coefficients: latestParams.coefficients,
    note: '',
  });
}, [latestParams.id]); // reset when a new row becomes the "latest"
```

---

### WR-03: Unvalidated client-supplied cursor in `loadMoreHistory` server action

**File:** `app/(admin)/[adminSegment]/coefficients/history-load-more.action.ts:20-23`

**Issue:** The `cursor` parameter arrives from the React client as a `GlobalParamsCursor` object (plain `{ effectiveFrom: string; id: string }`). The Server Action trusts this shape entirely and passes it directly to `listGlobalParamsHistory`, which interpolates `cursor.effectiveFrom` and `cursor.id` directly into a Drizzle `sql` template literal (global-params.ts:97). While Drizzle parameterizes template values (safe from SQL injection), a malformed `effectiveFrom` (e.g., an invalid timestamptz string) will produce a Postgres error that propagates back to the client as an unhandled exception.

More importantly, `decodeGlobalParamsCursor` exists and already validates format (ISO timestamp regex + UUID regex) but is never used here. The client sends the raw object, not the encoded base64url form.

**Fix:** Validate the cursor shape server-side before passing to the query:

```ts
export async function loadMoreHistory(
  cursor: GlobalParamsCursor,
): Promise<GlobalParamsHistoryResult> {
  await requireAdmin();
  // Validate cursor before trusting client-supplied strings in SQL
  const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    !cursor ||
    typeof cursor.effectiveFrom !== 'string' ||
    typeof cursor.id !== 'string' ||
    !ISO_RE.test(cursor.effectiveFrom) ||
    !UUID_RE.test(cursor.id)
  ) {
    throw new Error('admin.coefficients.history.load.error');
  }
  return listGlobalParamsHistory({ cursor, limit: 20 });
}
```

---

### WR-04: Hardcoded French/locale-agnostic strings in ExplainTool formula trail violate SHELL-09

**File:** `app/(admin)/[adminSegment]/coefficients/ExplainTool.tsx:239, 258, 269`

**Issue:** Three JSX string literals in `FormulaTrail` are not translated through `t()`:

- Line 239: `'loyer = montantHT × (1 + commission/100) × coefficient / 100'` — French variable names and French mathematical notation hardcoded.
- Line 258: `' / mois'` — French "per month" unit.
- Line 269: `' mois · '` and `' jours'` — French duration/validity units.

These strings will always display in French regardless of the admin's language setting (`lang`), violating SHELL-06 (no hardcoded JSXText) and SHELL-09 (locale discipline). The admin may be operating in English (`lang='en'`).

**Fix:** Add i18n keys and route through `t()`:

```ts
// New dictionary keys (add to both fr and en sections):
'admin.coefficients.explain.formula.symbolic': 'loyer = montantHT × (1 + commission/100) × coefficient / 100'
// (EN equivalent): 'rent = amountHT × (1 + commission/100) × coefficient / 100'

'admin.coefficients.explain.result.per_month': '/ mois'   // EN: '/ month'
'admin.coefficients.explain.result.duration_validity': '{0} mois · {1} jours'  // EN: '{0} months · {1} days'
```

Then in the component:

```tsx
<div style={{ color: 'var(--muted)', marginBottom: 12 }}>
  {t('admin.coefficients.explain.formula.symbolic', lang)}
</div>
// ...
<div>{'= '}{formattedLoyer}{' '}{t('admin.coefficients.explain.result.per_month', lang)}</div>
// ...
<div style={{ marginTop: 12, ... }}>
  {t('admin.coefficients.explain.result.duration_validity', lang)
    .replace('{0}', String(durationMonths))
    .replace('{1}', String(validityDays))}
</div>
```

---

### WR-05: HistoryTable "admin" column renders raw `createdBy` user ID instead of display name

**File:** `app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx:127-131`

**Issue:** The comment at lines 127-131 acknowledges that `row.createdBy` is a raw `user.id` (text), but renders it directly:

```tsx
{row.createdBy ?? '—'}
```

D-09-02 and the UI-SPEC §3.1.3.2 explicitly require displaying `displayName ?? email`. UUIDs like `"a1b2c3d4-e5f6..."` displayed in the admin column make the history table unreadable in production. This is documented as a "Plan 03 follow-up" in the comment, but with no tracking mechanism it risks being permanently deferred. Since the `createdBy` column is a FK to `users.id`, joining to `users` at query time is straightforward.

**Fix:** Update `listGlobalParamsHistory` to JOIN `users` and return `createdByDisplay: string | null`:

```sql
-- In listGlobalParamsHistory, join users:
LEFT JOIN users ON users.id = global_params.created_by
-- Select:
createdByDisplay: coalesce(users.display_name, users.email, '—')
```

Or as a post-fetch lookup similar to how `listPartnersWithCounts` handles `hasUnredeemedInvite`. This is a non-trivial schema query change but is required to satisfy the stated spec.

---

### WR-06: `AccountsList` `partners` state is never updated after actions — UI becomes stale

**File:** `app/(admin)/[adminSegment]/accounts/AccountsList.tsx:43-44`

**Issue:**

```tsx
const [partners] = useState<PartnerWithCount[]>(initialPartners);
```

`partners` is initialized from `initialPartners` and never updated. `refreshAfterAction()` calls `router.refresh()` which triggers a new server-component render; this updates `initialPartners` prop. However, `useState` does NOT re-initialize from props when the prop changes — this is by React design. The result: after a disable/re-enable action, `router.refresh()` fires, but the `AccountsList` component continues showing the old list (with the old status chips, old `hasUnredeemedInvite` values, etc.) until the component is unmounted/remounted.

**Fix:** Replace `useState` with direct use of `initialPartners` as a derived prop (no state), letting `router.refresh()` cause a full re-render of the server-component tree which provides fresh props:

```tsx
// Remove: const [partners] = useState<PartnerWithCount[]>(initialPartners);
// Use initialPartners directly throughout, e.g.:
const filtered = useMemo(() => {
  if (!searchTerm.trim()) return initialPartners;
  // ...
  return initialPartners.filter(...);
}, [initialPartners, searchTerm]);
```

This is the standard Next.js App Router pattern for server-refreshed client lists: server component owns the data; client component renders it; `router.refresh()` replaces the data at the server level and React reconciles the fresh props.

---

## Info

### IN-01: `computeDiffPairs(before=null, after)` silently returns empty diff for the oldest loaded row

**File:** `app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx:106-107` / `HistoryDiff.tsx:19`

**Issue:** When `rows[idx + 1]` is `undefined` (the last/oldest row in the loaded set), `prevRow` is `null` and `computeDiffPairs(null, row)` returns `[]`. The "Changes" cell for the oldest row is blank. This is correct behavior when there truly is no prior row loaded, but when the admin loads more rows (clicks "Charger plus"), the previously-oldest row now has a predecessor — but its diff is never recomputed because the `pairs` are computed at render time for each row. This is a known limitation acceptable for v1.1, but should be documented in the component or tracked.

**Fix (optional, v1.2):** Annotate the blank-changes cell with a localised note like `t('admin.coefficients.history.diff.unavailable', lang)` = "— (antécédent non chargé)" / "(ancestor not loaded)" to prevent confusion.

---

### IN-02: `adminReissueInvitation` error message key mismatch — throws `'admin.accounts.toast.reissue.error'` but callers expect translatable toast key

**File:** `src/lib/admin/actions.ts:357`

**Issue:** The final catch in `adminReissueInvitation` throws:

```ts
throw new Error('admin.accounts.toast.reissue.error');
```

The caller in `AccountsList.tsx:145` catches this and calls `toast.error(t('admin.accounts.toast.reissue.error', lang))` — so the error is translated at the call site. However, the thrown message key is `admin.accounts.toast.reissue.error` (a UI toast key), while all other action wrappers throw semantic error keys like `admin.accounts.error.create`, `admin.accounts.error.disable`, etc. (the `error.*` namespace). The UI catch uses the toast key, which happens to work since both namespaces exist in the dictionary — but this breaks the pattern and could confuse future contributors who see an error key in the `toast.*` namespace being thrown from a server action.

**Fix:** Throw a consistent semantic error key and let the caller map it to the correct toast:

```ts
// In adminReissueInvitation catch:
throw new Error('admin.accounts.error.reissue');
// Add to dictionary: 'admin.accounts.error.reissue': 'Erreur lors du renvoi de l\'invitation.' (FR + EN)

// In AccountsList.tsx onReissue catch:
toast.error(t('admin.accounts.toast.reissue.error', lang)); // unchanged
```

---

### IN-03: TODO comment in `seed-params.ts` flags unconfirmed coefficient values destined for production

**File:** `src/lib/calc/seed-params.ts:40-41`

**Issue:**

```ts
// TODO: confirm against v10 baseline before CUT-06 — values lifted from v10
// assertCalc fixture coefficients (Matrice_2026_THE_Leasetic-v10.html lines 1922-1929).
```

This TODO marks coefficient values as unconfirmed placeholders pending Antoine's canonical baseline review before CUT-06. If these values are incorrect, every proposal generated before the admin edits the coefficients will use wrong financial parameters. The TODO has been present since Phase 7 and carries over through Phase 9 without a tracking mechanism.

**Fix:** Create a tracked issue or verify against the v10 HTML source before deploying to production. The comment already names the right person (Antoine) and the right milestone gate (CUT-06) — ensure this is in a task tracker, not just a code comment.

---

_Reviewed: 2026-05-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
