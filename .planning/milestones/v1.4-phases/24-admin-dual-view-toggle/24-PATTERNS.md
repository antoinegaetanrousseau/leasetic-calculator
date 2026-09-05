# Phase 24: Admin Dual-View Toggle - Pattern Map

**Mapped:** 2026-05-30
**Files analyzed:** 7 new/modified files
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/ui/RetractableSidebar.tsx` | component | event-driven | self (modified) | exact |
| `src/components/ViewToggle.tsx` | component | event-driven | `src/components/LocaleToggle.tsx` | exact |
| `app/(authed)/layout.tsx` | layout | request-response | self (modified) | exact |
| `src/lib/view-store.ts` | utility | event-driven | collapse store inside `RetractableSidebar.tsx` lines 82–117 | exact |
| `src/lib/i18n/dictionaries.ts` | config | — | self (modified) | exact |
| `src/components/UserMenu.tsx` | component | request-response | self (modified) | exact |
| `src/lib/route-meta.ts` | utility | transform | self (read-only reference) | exact |

---

## Pattern Assignments

### `src/lib/view-store.ts` (utility, event-driven) — NEW FILE

**Analog:** The collapse store defined inline in `src/components/ui/RetractableSidebar.tsx` lines 82–117.

The entire `useSyncExternalStore` triple (subscribe / getSnapshot / getServerSnapshot) must be extracted into a standalone module so it can be consumed by both `RetractableSidebar` (for the nav-set decision) and `ViewToggle` (for the current-value display and the setter).

**Storage key + event constant pattern** (RetractableSidebar.tsx lines 82–84):
```typescript
const STORAGE_KEY = 'leasetic.sidebar.collapsed';
const TOGGLE_EVENT = 'leasetic-sidebar-toggled';
```
Mirror exactly for the view store:
```typescript
export const VIEW_STORAGE_KEY = 'leasetic.view';
export const VIEW_TOGGLE_EVENT = 'leasetic-view-toggled';
export type ViewMode = 'admin' | 'agent';
export const DEFAULT_VIEW: ViewMode = 'admin';
```

**getSnapshot pattern** (RetractableSidebar.tsx lines 91–94):
```typescript
function getCollapsedSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'collapsed';
}
```
Mirror for sessionStorage:
```typescript
export function getViewSnapshot(): ViewMode {
  if (typeof window === 'undefined') return DEFAULT_VIEW;
  const stored = window.sessionStorage.getItem(VIEW_STORAGE_KEY);
  return stored === 'agent' ? 'agent' : 'admin';
}
```

**getServerSnapshot pattern** (RetractableSidebar.tsx lines 101–103):
```typescript
function getServerCollapsedSnapshot(): boolean {
  return false;
}
```
Mirror:
```typescript
export function getServerViewSnapshot(): ViewMode {
  return DEFAULT_VIEW;
}
```

**subscribe pattern** (RetractableSidebar.tsx lines 110–117):
```typescript
function subscribeCollapsed(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(TOGGLE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(TOGGLE_EVENT, callback);
  };
}
```
Mirror exactly, substituting `VIEW_TOGGLE_EVENT`:
```typescript
export function subscribeView(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(VIEW_TOGGLE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(VIEW_TOGGLE_EVENT, callback);
  };
}
```

**Setter pattern** (RetractableSidebar.tsx lines 194–202 — the `toggle` useCallback):
```typescript
const toggle = useCallback(() => {
  const current = window.localStorage.getItem(STORAGE_KEY) === 'collapsed';
  const next = !current;
  window.localStorage.setItem(STORAGE_KEY, next ? 'collapsed' : 'expanded');
  window.dispatchEvent(new Event(TOGGLE_EVENT));
}, []);
```
Mirror as a named export (not a hook — called from ViewToggle before router.push):
```typescript
export function setView(mode: ViewMode): void {
  window.sessionStorage.setItem(VIEW_STORAGE_KEY, mode);
  window.dispatchEvent(new Event(VIEW_TOGGLE_EVENT));
}
```

**clearView for logout** (no existing analog — new export):
```typescript
export function clearView(): void {
  window.sessionStorage.removeItem(VIEW_STORAGE_KEY);
}
```

---

### `src/components/ViewToggle.tsx` (component, event-driven) — NEW FILE

**Analog:** `src/components/LocaleToggle.tsx` (entire file, 49 lines) — exact structural template.

**Imports pattern** (LocaleToggle.tsx lines 1–5):
```typescript
'use client';

import { setLang } from '@/lib/i18n/actions';
import { startTransition } from 'react';
import type { Lang } from '@/lib/i18n/dictionaries';
```
ViewToggle replaces server-action imports with local store + router:
```typescript
'use client';

import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeView, getViewSnapshot, getServerViewSnapshot, setView, type ViewMode } from '@/lib/view-store';
import { t, type Lang } from '@/lib/i18n/dictionaries';
```

**Expanded segmented-control pattern** (LocaleToggle.tsx lines 7–49):
```typescript
export function LocaleToggle({ current, fullWidth = false }: { current: Lang; fullWidth?: boolean }) {
  const options: Lang[] = ['fr', 'en'];
  return (
    <div
      className={
        fullWidth
          ? "flex items-center rounded-full border p-1"
          : "inline-flex items-center rounded-full border p-1"
      }
      style={{
        background: 'var(--paper)',
        borderColor: 'var(--border)',
        ...(fullWidth ? { width: '100%' } : {}),
      }}
      role="radiogroup"
      aria-label="Language"
    >
      {options.map((value) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => startTransition(() => { void setLang(value); })}
            className="rounded-full px-3 py-1.5 uppercase"
            style={{
              background: active ? 'var(--gd)' : 'transparent',
              color: active ? '#ffffff' : 'var(--muted)',
              fontSize: '11.5px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              ...(fullWidth ? { flex: 1, textAlign: 'center' as const } : {}),
            }}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
```

**Key divergences from LocaleToggle for ViewToggle:**

1. `current` comes from `useSyncExternalStore(subscribeView, getViewSnapshot, getServerViewSnapshot)` — not a prop — because the value must survive sidebar remount (C-01).
2. The component receives `isAdmin: boolean` (real role gate, C-03) and `adminHrefs: { home: string }` (for redirect target on switch to admin view, D-01).
3. `onClick` calls `setView(value)` then `router.push(value === 'admin' ? adminHrefs.home : '/')` — no `startTransition`/server action.
4. Selected segment background: `rgba(18, 150, 87, 0.10)` (not `var(--gd)`) per UI-SPEC color contract. Selected color: `var(--ink)` (not `#ffffff`).
5. Vertical padding: `py-2` (8px), NOT `py-1.5` — per UI-SPEC spacing section.
6. `aria-label` on wrapper uses `t('sidebar.view.aria', lang)` — not a hardcoded string.
7. Keyboard handler (`onKeyDown`) for ArrowLeft/ArrowRight per UI-SPEC interaction contract.
8. The component renders `null` when `!isAdmin` (C-03 gate).

**Full expanded-state markup delta** (copy LocaleToggle, apply these changes):
```typescript
// wrapper: aria-label from i18n, same className/style
role="radiogroup"
aria-label={t('sidebar.view.aria', lang)}

// segment button: py-2 not py-1.5; tint not --gd; ink not white
className="rounded-full px-3 py-2 uppercase transition-colors"
style={{
  background: active ? 'rgba(18, 150, 87, 0.10)' : 'transparent',
  color: active ? 'var(--ink)' : 'var(--muted)',
  fontWeight: 600,
  fontSize: '11.5px',
  letterSpacing: '0.04em',
  ...(fullWidth ? { flex: 1, textAlign: 'center' as const } : {}),
}}
```

**Collapsed pill pattern** (RetractableSidebar.tsx lines 353–370 — the collapsed lang button):
```typescript
<button
  type="button"
  onClick={cycleLang}
  aria-label={t('sidebar.lang.cycle', lang)}
  style={{
    width: 36,
    height: 28,
    borderRadius: 9999,
    background: 'var(--paper)',
    border: '1px solid var(--border)',
    color: 'var(--ink)',
    fontSize: '11.5px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  }}
>
  {lang}
</button>
```
Mirror for the collapsed ViewToggle pill (content changes: initial letter, aria-label key, onClick):
```typescript
<button
  type="button"
  onClick={cycleView}
  aria-label={t('sidebar.view.cycle', lang)}
  style={{
    width: 36,
    height: 28,
    borderRadius: 9999,
    background: 'var(--paper)',
    border: '1px solid var(--border)',
    color: 'var(--ink)',
    fontSize: '11.5px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  }}
>
  {currentView === 'admin' ? 'A' : 'G'}
</button>
```

**ViewToggle component signature:**
```typescript
interface ViewToggleProps {
  lang: Lang;
  adminHrefs: { home: string };
  /** When true, render the full segmented control (expanded sidebar). */
  fullWidth?: boolean;
  /** When false, render the collapsed pill. */
  collapsed?: boolean;
}
// Renders null when not admin (C-03 gate applied by caller in RetractableSidebar).
export function ViewToggle({ lang, adminHrefs, fullWidth = false, collapsed = false }: ViewToggleProps)
```

---

### `src/components/ui/RetractableSidebar.tsx` (component, event-driven) — MODIFIED

**Analog:** self (the existing file is the template; changes are additive).

**useSyncExternalStore consumption pattern** (lines 177–181) — replicate for view store:
```typescript
const collapsed = useSyncExternalStore(
  subscribeCollapsed,
  getCollapsedSnapshot,
  getServerCollapsedSnapshot,
);
```
Add immediately after, consuming the new view-store module:
```typescript
const storedView = useSyncExternalStore(
  subscribeView,
  getViewSnapshot,
  getServerViewSnapshot,
);
// D-02: being on any (admin) route forces Admin view regardless of stored flag.
// adminSegment is only set from (admin) layout, so its presence = admin route.
const effectiveView: ViewMode = adminSegment ? 'admin' : storedView;
```

**isAdmin nav-set decision** (lines 204–209):
```typescript
const navItems: NavItem[] = isAdmin
  ? adminNavItems(
      adminHrefs ?? { home: '/', coefficients: '/', partners: '/', history: '/' },
    )
  : partnerNavItems();
```
Replace with view-aware decision (isAdmin is the real role; effectiveView drives the nav):
```typescript
const navItems: NavItem[] =
  isAdmin && effectiveView === 'admin'
    ? adminNavItems(adminHrefs ?? { home: '/', coefficients: '/', partners: '/', history: '/' })
    : partnerNavItems();
```

**Collapsed footer stack insertion point** (lines 351–394) — ViewToggle pill goes first:
```typescript
{collapsed ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
    {/* NEW: ViewToggle pill — first child, admin-only */}
    {isAdmin && <ViewToggle lang={lang} adminHrefs={adminHrefs ?? { home: '/' }} collapsed />}
    <button type="button" onClick={cycleLang} ...>{lang}</button>
    <button type="button" onClick={cycleTheme} ...>...</button>
  </div>
```

**Expanded footer stack insertion point** (lines 396–399) — ViewToggle goes first in the flex column:
```typescript
) : (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {/* NEW: ViewToggle — first child, admin-only */}
    {isAdmin && <ViewToggle lang={lang} adminHrefs={adminHrefs ?? { home: '/' }} fullWidth />}
    <LocaleToggle current={lang} fullWidth />
    <ThemeToggle current={theme} fullWidth />
  </div>
)}
```

**New imports to add** (after line 44):
```typescript
import { ViewToggle } from '../ViewToggle';
import { subscribeView, getViewSnapshot, getServerViewSnapshot, type ViewMode } from '@/lib/view-store';
```

---

### `app/(authed)/layout.tsx` (layout, request-response) — MODIFIED

**Analog:** self. The change is a single prop addition to `<Shell>`.

**Current Shell invocation** (lines 31–38):
```typescript
return (
  <Shell
    isAdmin={role === 'admin'}
    lang={lang}
    theme={theme}
    displayName={displayName}
    email={u.email}
  >
    {children}
  </Shell>
);
```

The `isAdmin` prop passed to Shell must remain `role === 'admin'` (real role). The view-flag override happens inside `RetractableSidebar` (client boundary), not at the server layout level. No change to this file's Shell invocation is required — the `effectiveView` logic lives in the client component.

However, `adminSegment` is currently not passed from `(authed)/layout.tsx` to Shell (no adminSegment in the authed layout). This is correct — agent-view redirect to admin home is handled via `adminHrefs.home` forwarded through the sidebar prop chain. No change needed here.

---

### `app/(admin)/[adminSegment]/layout.tsx` (layout, request-response) — READ-ONLY REFERENCE

**No modification required.** This layout already hardcodes `isAdmin={true}` and passes `adminSegment` to Shell (lines 63–70). The `adminSegment` presence in `RetractableSidebar` is the D-02 auto-reconcile signal — no code change needed in this file.

**Current Shell invocation** (lines 63–70):
```typescript
return (
  <Shell
    isAdmin={true}
    lang={lang}
    theme={theme}
    displayName={displayName}
    email={u.email}
    adminSegment={adminSegment}
  >
    {children}
  </Shell>
);
```

---

### `src/lib/i18n/dictionaries.ts` (config) — MODIFIED

**Analog:** self. Pattern is to add new dot-notation keys in both `fr` and `en` blocks, in the `sidebar.*` namespace cluster (FR around lines 41–54, EN around lines 960–973).

**Existing sidebar.* keys as positional anchor** (FR, lines 41–54):
```typescript
'sidebar.brand': 'Leasétic',
'sidebar.collapse': 'Réduire le menu',
'sidebar.expand': 'Déployer le menu',
'sidebar.lang.cycle': 'Changer de langue',
'sidebar.theme.cycle': 'Changer de thème',
'sidebar.eyebrow.navigation': 'NAVIGATION',
```

**New FR keys to insert** (after `sidebar.theme.cycle` line):
```typescript
'sidebar.view.admin': 'Admin',
'sidebar.view.agent': 'Agent',
'sidebar.view.cycle': 'Changer de vue',
'sidebar.view.aria': 'Vue',
```

**New EN keys to insert** (after `sidebar.theme.cycle` in the `en` block, ~line 964):
```typescript
'sidebar.view.admin': 'Admin',
'sidebar.view.agent': 'Agent',
'sidebar.view.cycle': 'Switch view',
'sidebar.view.aria': 'View',
```

The `_EnHasAllFrKeys` compile-time type at the bottom of the file will enforce parity automatically — add both blocks or the build fails.

---

### `src/components/UserMenu.tsx` (component, request-response) — MODIFIED

**Analog:** self. The only change is adding `clearView()` before the router redirect in `handleLogout`.

**Existing handleLogout** (lines 54–61):
```typescript
const handleLogout = async () => {
  // AUTH-18 / D-24: official client function only — never custom POST.
  await authClient.signOut();
  // The Sonner success toast is shown on /login via the ?logged_out=1 query
  // param pickup in LoginForm (Plan 06-05).
  router.push('/login?logged_out=1');
  router.refresh();
};
```

**Modified handleLogout** (add `clearView()` after `signOut`, before redirect):
```typescript
const handleLogout = async () => {
  await authClient.signOut();
  // D-04: clear view flag so fresh login always starts in Admin view (VIEW-03).
  clearView();
  router.push('/login?logged_out=1');
  router.refresh();
};
```

**New import to add** (after line 7):
```typescript
import { clearView } from '@/lib/view-store';
```

---

## Shared Patterns

### useSyncExternalStore external store (sessionStorage)
**Source:** `src/components/ui/RetractableSidebar.tsx` lines 82–117, 177–181
**Apply to:** `src/lib/view-store.ts` (new), `src/components/ui/RetractableSidebar.tsx` (consumer)

The pattern is: constants (key + event name) → `getSnapshot` (reads storage, guards `typeof window`) → `getServerSnapshot` (returns default) → `subscribe` (adds/removes both `'storage'` and custom event listeners) → setter (writes storage, dispatches custom event for same-tab reactivity).

The `storage` browser event covers cross-tab sync; the custom `dispatchEvent(new Event(...))` covers same-tab reactivity (the `storage` event does NOT fire in the same tab that made the write).

### Segmented control markup
**Source:** `src/components/LocaleToggle.tsx` (entire file)
**Apply to:** `src/components/ViewToggle.tsx`

Wrapper: `div[role="radiogroup"]` with `className="flex items-center rounded-full border p-1"` and inline `background: var(--paper); borderColor: var(--border)`. Segments: `button[role="radio"][aria-checked]` with `className="rounded-full px-3 py-2 uppercase transition-colors"`. Full-width: `flex: 1; textAlign: center` on each segment + `width: 100%` on wrapper.

### Active-state tint (selected segment)
**Source:** `src/components/ui/RetractableSidebar.tsx` lines 322–325
**Apply to:** `src/components/ViewToggle.tsx` selected segment

```typescript
background: isActive ? 'rgba(18, 150, 87, 0.10)' : 'transparent',
color: isActive ? 'var(--ink)' : 'var(--muted)',
fontWeight: isActive ? 600 : 500,
```
Do NOT use `var(--gd)` + `#ffffff` for the selected segment (fails WCAG AA at 11.5px/600, per UI-SPEC color section). The tint pattern is the only WCAG-compliant "selected" affordance for small-text segments in this app.

### Collapsed pill geometry
**Source:** `src/components/ui/RetractableSidebar.tsx` lines 353–370 (collapsed lang button)
**Apply to:** `src/components/ViewToggle.tsx` collapsed state

Exact geometry: `width: 36, height: 28, borderRadius: 9999, background: 'var(--paper)', border: '1px solid var(--border)', color: 'var(--ink)', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer'`.

### i18n key addition
**Source:** `src/lib/i18n/dictionaries.ts` lines 41–54 (FR) and 960–973 (EN)
**Apply to:** all new UI strings

Pattern: add dot-notation key in alphabetical/grouped order in both `fr` and `en` blocks. The `_EnHasAllFrKeys` type at file bottom is a compile-time completeness check — both blocks must be updated together or `tsc` fails.

### Footer stack ordering
**Source:** `src/components/ui/RetractableSidebar.tsx` lines 351–399
**Apply to:** ViewToggle insertion

Expanded footer: `<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>` — ViewToggle is first child (above LocaleToggle, above ThemeToggle). Collapsed footer: `<div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>` — ViewToggle pill is first child.

---

## No Analog Found

None — all files have close analogs in the codebase.

---

## Metadata

**Analog search scope:** `src/components/`, `src/components/ui/`, `src/lib/i18n/`, `src/lib/`, `app/(authed)/`, `app/(admin)/`
**Files scanned:** 8 source files read in full
**Pattern extraction date:** 2026-05-30
