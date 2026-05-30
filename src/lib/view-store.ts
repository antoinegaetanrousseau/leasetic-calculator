/**
 * view-store.ts — sessionStorage-backed useSyncExternalStore triple for the
 * admin/agent view toggle (Phase 24, VIEW-03 / D-04).
 *
 * WHY sessionStorage:
 *   C-01 — The view flag must survive a sidebar remount. D-01's redirect on
 *   view switch crosses route-group boundaries ((authed) ↔ (admin)), which
 *   remounts the sidebar. A pure in-memory React flag would be wiped on the
 *   jump. sessionStorage persists for the duration of the browser tab session
 *   without surviving logout (D-04 mandates clearView() after signOut).
 *
 * WHY two listener types in subscribeView:
 *   - `storage` event: fires on cross-tab writes (same origin, different tab).
 *   - `leasetic-view-toggled` custom event: fires on same-tab writes via setView().
 *     The native `storage` event does NOT fire in the tab that made the write —
 *     that is why a custom dispatchEvent is required for same-tab reactivity.
 *   This is the same dual-listener pattern used by the collapse store in
 *   RetractableSidebar.tsx (lines 110–117) for localStorage.
 *
 * Default: 'admin' — absent key (fresh login) always lands in Admin view (VIEW-03).
 */

export const VIEW_STORAGE_KEY = 'leasetic.view';
export const VIEW_TOGGLE_EVENT = 'leasetic-view-toggled';
export type ViewMode = 'admin' | 'agent';
export const DEFAULT_VIEW: ViewMode = 'admin';

/**
 * Read view mode from sessionStorage (client only).
 * Returns DEFAULT_VIEW during SSR + initial client render.
 * Only 'agent' yields 'agent' — any absent, junk, or unknown value defaults to 'admin'.
 */
export function getViewSnapshot(): ViewMode {
  if (typeof window === 'undefined') return DEFAULT_VIEW;
  const stored = window.sessionStorage.getItem(VIEW_STORAGE_KEY);
  return stored === 'agent' ? 'agent' : 'admin';
}

/**
 * Server-rendered snapshot: always DEFAULT_VIEW ('admin').
 * Matches VIEW-03 — a fresh login always starts in Admin view.
 */
export function getServerViewSnapshot(): ViewMode {
  return DEFAULT_VIEW;
}

/**
 * Subscribe to view-state changes:
 * - `storage` event fires on cross-tab writes (browser native)
 * - `leasetic-view-toggled` custom event fires on same-tab writes via setView()
 *
 * Returns a cleanup function that removes both listeners (useSyncExternalStore contract).
 */
export function subscribeView(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(VIEW_TOGGLE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(VIEW_TOGGLE_EVENT, callback);
  };
}

/**
 * Set the active view mode. Writes to sessionStorage then dispatches
 * VIEW_TOGGLE_EVENT for same-tab useSyncExternalStore reactivity.
 *
 * Exported as a plain function (NOT a hook) — ViewToggle calls it imperatively
 * before router.push so the new view is already in storage when the remounted
 * sidebar reads it post-redirect.
 */
export function setView(mode: ViewMode): void {
  window.sessionStorage.setItem(VIEW_STORAGE_KEY, mode);
  window.dispatchEvent(new Event(VIEW_TOGGLE_EVENT));
}

/**
 * Remove the view flag from sessionStorage.
 * Called by UserMenu.handleLogout after signOut (D-04 / VIEW-03):
 * clears the session view flag so a subsequent login always starts in Admin view.
 * No event dispatched — the session is ending; no subscriber needs to react.
 */
export function clearView(): void {
  window.sessionStorage.removeItem(VIEW_STORAGE_KEY);
}
