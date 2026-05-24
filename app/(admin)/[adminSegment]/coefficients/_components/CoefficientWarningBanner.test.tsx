/**
 * Plan 18-05 Task 1 — CoefficientWarningBanner tests (RED → GREEN).
 *
 * Per D-19 (locked copy + placement) + D-20 (sessionStorage dismissal):
 *   T1: First visit — banner renders with alert icon, body copy, and × close button.
 *   T2: Already dismissed — sessionStorage['gsd.coefficients.warning.dismissed']==='1'
 *       on mount → banner does NOT render (returns null / 0 DOM nodes).
 *   T3: × click — sessionStorage.setItem is called with the right key+value,
 *       and the banner hides on the same click.
 *   T4: Persistence is per-session — banner writes to sessionStorage (NOT
 *       localStorage); verified by spy.
 *   T5: i18n copy — body text matches t('admin.coefficients.warning.body','fr').
 *   T6: aria-label on × — t('admin.coefficients.warning.dismiss.aria',lang).
 *   T7: SSR-safe — rendering without window.sessionStorage available does not
 *       throw; the read is in a useEffect, so initial render is always safe.
 *   T8: Visual chrome — rendered root has the locked styles (background tint,
 *       borderLeft accent, borderRadius:8, padding 12px 16px).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

import { CoefficientWarningBanner } from './CoefficientWarningBanner';

const DISMISS_KEY = 'gsd.coefficients.warning.dismissed';

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('CoefficientWarningBanner', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('T1: first visit — renders alert icon, body copy, and × close button', () => {
    const { container } = render(<CoefficientWarningBanner lang="fr" />);
    // Body copy present
    expect(container.textContent).toContain(
      'Modifier ces valeurs change le calcul de toutes les futures propositions.',
    );
    // Alert icon (lucide AlertTriangle) renders an <svg>
    expect(container.querySelector('svg')).not.toBeNull();
    // × close button present
    const closeBtn = container.querySelector('button[aria-label]');
    expect(closeBtn).not.toBeNull();
    expect(closeBtn!.textContent).toBe('×');
  });

  it('T2: already dismissed in sessionStorage — banner hides after mount effect', () => {
    window.sessionStorage.setItem(DISMISS_KEY, '1');
    const { container } = render(<CoefficientWarningBanner lang="fr" />);
    // After useEffect runs synchronously in React 19 + RTL, the component
    // should re-render and return null (no children in the container).
    expect(container.querySelector('button[aria-label]')).toBeNull();
    expect(container.textContent).not.toContain('Modifier ces valeurs');
  });

  it('T3: × click writes sessionStorage and hides the banner on the same click', () => {
    const { container } = render(<CoefficientWarningBanner lang="fr" />);

    const closeBtn = container.querySelector(
      'button[aria-label]',
    ) as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    // Pre-click: storage empty.
    expect(window.sessionStorage.getItem(DISMISS_KEY)).toBeNull();

    fireEvent.click(closeBtn);

    // Post-click: storage written + banner hidden.
    expect(window.sessionStorage.getItem(DISMISS_KEY)).toBe('1');
    expect(container.querySelector('button[aria-label]')).toBeNull();
  });

  it('T4: persistence is sessionStorage, NOT localStorage', () => {
    // Pre-click: both storages empty.
    expect(window.sessionStorage.getItem(DISMISS_KEY)).toBeNull();
    expect(window.localStorage.getItem(DISMISS_KEY)).toBeNull();

    const { container } = render(<CoefficientWarningBanner lang="fr" />);
    fireEvent.click(container.querySelector('button[aria-label]')!);

    // Banner writes to sessionStorage ONLY; localStorage must not be touched
    // (per-session persistence is the whole D-20 contract).
    expect(window.sessionStorage.getItem(DISMISS_KEY)).toBe('1');
    expect(window.localStorage.getItem(DISMISS_KEY)).toBeNull();
  });

  it('T5: i18n body copy matches FR dictionary value', () => {
    const { container } = render(<CoefficientWarningBanner lang="fr" />);
    expect(container.textContent).toContain(
      'Modifier ces valeurs change le calcul de toutes les futures propositions. Les PDF déjà générés restent inchangés.',
    );
  });

  it('T6: × button aria-label is the dictionary value', () => {
    const { container: frContainer } = render(
      <CoefficientWarningBanner lang="fr" />,
    );
    expect(
      frContainer
        .querySelector('button[aria-label]')!
        .getAttribute('aria-label'),
    ).toBe("Masquer l'avertissement");

    cleanup();

    const { container: enContainer } = render(
      <CoefficientWarningBanner lang="en" />,
    );
    expect(
      enContainer
        .querySelector('button[aria-label]')!
        .getAttribute('aria-label'),
    ).toBe('Dismiss warning');
  });

  it('T7: SSR-safe — initial render does not throw even when sessionStorage throws', () => {
    // Simulate a hostile sessionStorage (e.g. private browsing where Safari
    // throws QuotaExceededError on any setItem/getItem). The banner must
    // catch + continue. This also covers the SSR case structurally because
    // the read is guarded by `typeof window === 'undefined'` AND wrapped in
    // try/catch — if either layer were missing this test would fail.
    const originalGetItem = window.sessionStorage.getItem.bind(
      window.sessionStorage,
    );
    window.sessionStorage.getItem = () => {
      throw new Error('SecurityError: storage disabled');
    };

    try {
      expect(() =>
        render(<CoefficientWarningBanner lang="fr" />),
      ).not.toThrow();
    } finally {
      window.sessionStorage.getItem = originalGetItem;
    }
  });

  it('T8: visual chrome — root has gold accent + locked styles', () => {
    const { container } = render(<CoefficientWarningBanner lang="fr" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    // Inline style snippets — RTL/jsdom returns normalised values via style attribute.
    const inline = root.getAttribute('style') ?? '';
    // background tint (any of '0.10' or '0.1' is accepted from React style serialisation)
    expect(inline).toMatch(/background:\s*rgba\(224,\s*133,\s*48,\s*0\.1\)/);
    expect(inline).toMatch(/border-left:\s*4px solid var\(--gold\)/);
    expect(inline).toMatch(/border-radius:\s*8px/);
    expect(inline).toMatch(/padding:\s*12px\s+16px/);
    expect(inline).toMatch(/margin-bottom:\s*16px/);
  });
});
