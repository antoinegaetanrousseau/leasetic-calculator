/**
 * `resolveDomLang()` — direct unit tests (WR-02, phase 38 code review).
 *
 * GAP-02 routes every dialog/sheet close label through this helper, and plan
 * 38-01 shipped it with only INDIRECT coverage: `tests/dialog-close-label.test.ts`
 * asserts that the primitives *call* it, never that it *returns the right thing*.
 * The phase-38 review flagged that gap precisely because this is the one piece of
 * SSR-sensitive logic GAP-02 introduced.
 *
 * The environment is jsdom (vitest.config), so `document` exists here. The
 * `typeof document === 'undefined'` branch therefore cannot be exercised by
 * simply deleting the global — jsdom's `document` is a non-configurable getter on
 * some setups — so that branch is covered by re-importing the module with the
 * global stubbed, which is the honest way to reach it rather than asserting it
 * from the outside and hoping.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveDomLang } from '../src/lib/i18n/dom-lang';

const originalLang = document.documentElement.lang;

afterEach(() => {
  document.documentElement.lang = originalLang;
  vi.resetModules();
});

describe('resolveDomLang()', () => {
  it('returns "fr" when <html lang> is fr', () => {
    document.documentElement.lang = 'fr';
    expect(resolveDomLang()).toBe('fr');
  });

  it('returns "en" when <html lang> is en', () => {
    document.documentElement.lang = 'en';
    expect(resolveDomLang()).toBe('en');
  });

  it('is case-insensitive', () => {
    document.documentElement.lang = 'EN';
    expect(resolveDomLang()).toBe('en');
    document.documentElement.lang = 'FR';
    expect(resolveDomLang()).toBe('fr');
  });

  it('narrows regional English tags to "en" (en-GB, en-US)', () => {
    for (const tag of ['en-GB', 'en-US', 'en_us']) {
      document.documentElement.lang = tag;
      expect(resolveDomLang(), `${tag} should narrow to en`).toBe('en');
    }
  });

  it('falls back to "fr" for an empty, unknown or unrelated lang', () => {
    for (const tag of ['', 'de', 'es-ES', 'fr-CA', 'nonsense']) {
      document.documentElement.lang = tag;
      expect(resolveDomLang(), `${tag} should fall back to fr`).toBe('fr');
    }
  });

  it('does not treat a lang merely CONTAINING "en" as English (e.g. "de", "sv-en" suffix)', () => {
    // Guards the difference between startsWith('en') and includes('en') — a
    // substring check would misclassify tags like 'sv-en' or 'zen'.
    document.documentElement.lang = 'sv-en';
    expect(resolveDomLang()).toBe('fr');
  });

  it('returns "fr" on the server, where `document` is undefined', async () => {
    vi.resetModules();
    const originalDocument = globalThis.document;
    // Reproduce the SSR condition the guard exists for.
    Reflect.deleteProperty(globalThis as Record<string, unknown>, 'document');
    try {
      expect(typeof (globalThis as Record<string, unknown>).document).toBe('undefined');
      const mod = await import('../src/lib/i18n/dom-lang');
      expect(mod.resolveDomLang()).toBe('fr');
    } finally {
      (globalThis as Record<string, unknown>).document = originalDocument;
    }
  });
});
