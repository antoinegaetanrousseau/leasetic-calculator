/**
 * Phase 18 Plan 03 Task 2 — PartnersFilterPillTabs tests (D-09).
 *
 * UI-SPEC §Partners list lines 294-326 — 4-tab variant (user-confirmed
 * deviation from the Figma 3-tab default). Tabs are <Link> navigations
 * (server component, no client state). The `currentStatus` server prop
 * drives the active-pill state — no useSearchParams hook.
 *
 * Tests:
 *   1: renders 4 pills (Tous / Actifs / Invités / Désactivés).
 *   2: active pill derives from currentStatus prop.
 *   3: hrefs follow the (status=KEY, no-param for Tous) shape, preserving q.
 *   4: each pill has data-testid="partner-filter-pill-{key}" per UI-SPEC line 326.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

import { PartnersFilterPillTabs } from './PartnersFilterPillTabs';

afterEach(() => {
  cleanup();
});

describe('PartnersFilterPillTabs — D-09 4-tab variant', () => {
  it('Test 1: renders exactly 4 pills with FR labels Tous / Actifs / Invités / Désactivés', () => {
    const { container } = render(
      <PartnersFilterPillTabs
        currentStatus={undefined}
        currentQ={undefined}
        adminSegment="admin-secret"
        lang="fr"
      />,
    );
    const pills = container.querySelectorAll('[data-testid^="partner-filter-pill-"]');
    expect(pills.length).toBe(4);
    const texts = Array.from(pills).map((p) => (p.textContent ?? '').trim());
    expect(texts).toEqual(['Tous', 'Actifs', 'Invités', 'Désactivés']);
  });

  it('Test 1 (en): EN labels resolve correctly', () => {
    const { container } = render(
      <PartnersFilterPillTabs
        currentStatus={undefined}
        currentQ={undefined}
        adminSegment="admin-secret"
        lang="en"
      />,
    );
    const pills = container.querySelectorAll('[data-testid^="partner-filter-pill-"]');
    const texts = Array.from(pills).map((p) => (p.textContent ?? '').trim());
    expect(texts).toEqual(['All', 'Active', 'Invited', 'Disabled']);
  });

  it('Test 2: currentStatus="invited" → the Invités pill is the active variant', () => {
    const { container } = render(
      <PartnersFilterPillTabs
        currentStatus="invited"
        currentQ={undefined}
        adminSegment="admin-secret"
        lang="fr"
      />,
    );
    const invitedPill = container.querySelector(
      '[data-testid="partner-filter-pill-invited"]',
    ) as HTMLAnchorElement;
    expect(invitedPill).not.toBeNull();
    // Active pill uses the .chip-active tint via inline style → fontWeight 600.
    const cs = invitedPill.style;
    expect(cs.fontWeight).toBe('600');
    // Non-active pills have weight 500.
    const allPill = container.querySelector(
      '[data-testid="partner-filter-pill-all"]',
    ) as HTMLAnchorElement;
    expect(allPill.style.fontWeight).toBe('500');
  });

  it('Test 2 (cont.): currentStatus=undefined → the "all" pill is active', () => {
    const { container } = render(
      <PartnersFilterPillTabs
        currentStatus={undefined}
        currentQ={undefined}
        adminSegment="admin-secret"
        lang="fr"
      />,
    );
    const allPill = container.querySelector(
      '[data-testid="partner-filter-pill-all"]',
    ) as HTMLAnchorElement;
    expect(allPill.style.fontWeight).toBe('600');
  });

  it('Test 3: hrefs — Tous = /<seg>/partners (no status); Actifs = /<seg>/partners?status=active', () => {
    const { container } = render(
      <PartnersFilterPillTabs
        currentStatus={undefined}
        currentQ={undefined}
        adminSegment="admin-secret"
        lang="fr"
      />,
    );
    const allPill = container.querySelector(
      '[data-testid="partner-filter-pill-all"]',
    ) as HTMLAnchorElement;
    const activePill = container.querySelector(
      '[data-testid="partner-filter-pill-active"]',
    ) as HTMLAnchorElement;
    const invitedPill = container.querySelector(
      '[data-testid="partner-filter-pill-invited"]',
    ) as HTMLAnchorElement;
    const inactivePill = container.querySelector(
      '[data-testid="partner-filter-pill-inactive"]',
    ) as HTMLAnchorElement;
    expect(allPill.getAttribute('href')).toBe('/admin-secret/partners');
    expect(activePill.getAttribute('href')).toBe('/admin-secret/partners?status=active');
    expect(invitedPill.getAttribute('href')).toBe('/admin-secret/partners?status=invited');
    expect(inactivePill.getAttribute('href')).toBe('/admin-secret/partners?status=inactive');
  });

  it('Test 3 (cont.): currentQ preserved through href when set', () => {
    const { container } = render(
      <PartnersFilterPillTabs
        currentStatus="active"
        currentQ="marie"
        adminSegment="admin-secret"
        lang="fr"
      />,
    );
    const allPill = container.querySelector(
      '[data-testid="partner-filter-pill-all"]',
    ) as HTMLAnchorElement;
    const activePill = container.querySelector(
      '[data-testid="partner-filter-pill-active"]',
    ) as HTMLAnchorElement;
    // Tous keeps q
    expect(allPill.getAttribute('href')).toBe('/admin-secret/partners?q=marie');
    // Actifs keeps q + status
    expect(activePill.getAttribute('href')).toBe('/admin-secret/partners?status=active&q=marie');
  });

  it('Test 4: each pill has data-testid="partner-filter-pill-{key}"', () => {
    const { container } = render(
      <PartnersFilterPillTabs
        currentStatus={undefined}
        currentQ={undefined}
        adminSegment="admin-secret"
        lang="fr"
      />,
    );
    for (const key of ['all', 'active', 'invited', 'inactive']) {
      expect(
        container.querySelector(`[data-testid="partner-filter-pill-${key}"]`),
      ).not.toBeNull();
    }
  });
});
