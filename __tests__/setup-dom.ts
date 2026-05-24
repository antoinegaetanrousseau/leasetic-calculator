// Phase 11 — DOM testing setup.
// Registers @testing-library/jest-dom custom matchers (toBeInTheDocument, toHaveAttribute, etc.)
// on Vitest's expect. Loaded by vitest.config.ts via `setupFiles`.
import '@testing-library/jest-dom/vitest';

// Phase 18 (Rule 3 auto-fix) — jsdom 25 + Node 25 + Vitest 2.1.8 combination
// surfaces a regression where `window.localStorage` is undefined inside the
// VM context. The Web Storage API spec is straightforward (RFC: WHATWG HTML);
// add a minimal in-memory polyfill so tests that exercise it
// (RetractableSidebar persistence, future sessionStorage-based banners) can
// run without each test having to re-stub. Idempotent — only installs when
// missing, so a future jsdom upgrade that restores native Storage doesn't
// double-wrap.
function installStoragePolyfill(target: 'localStorage' | 'sessionStorage') {
  if (typeof globalThis === 'undefined') return;
  const w = globalThis as unknown as Record<string, unknown>;
  const existing = w[target];
  if (existing && typeof (existing as { clear?: unknown }).clear === 'function') return;
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() { return store.size; },
    clear() { store.clear(); },
    getItem(key: string) { return store.has(key) ? store.get(key)! : null; },
    key(index: number) {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
    removeItem(key: string) { store.delete(key); },
    setItem(key: string, value: string) { store.set(key, String(value)); },
  };
  Object.defineProperty(globalThis, target, { value: storage, writable: true, configurable: true });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, target, { value: storage, writable: true, configurable: true });
  }
}

installStoragePolyfill('localStorage');
installStoragePolyfill('sessionStorage');
