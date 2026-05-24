/**
 * Plan 17-04 Task 1 — FilterPillRow tests (RED → GREEN).
 *
 * Phase 17 PROPS-02 / D-11. Two pills rendered as Next.js <Link> elements
 * (NOT imperative router.replace) for full SSR re-render + shareable URLs.
 * The `archived` boolean is server-derived from `searchParams.archived === '1'`
 * and passed as a prop — the client component does NOT read useSearchParams
 * (per D-11; stable SSR-rendered active state).
 *
 * 6 AC tests per PLAN.md <behavior>:
 *   AC-FPR-01: archived=false — Actives pill active, Archivées inactive
 *   AC-FPR-02: archived=true — Archivées active, Actives inactive
 *   AC-FPR-03: Actives pill href = /proposals
 *   AC-FPR-04: Archivées pill href = /proposals?archived=1
 *   AC-FPR-05: both pills carry data-testid attributes
 *   AC-FPR-06: copy from i18n keys proposals.filter.actives + .archived (FR + EN)
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FilterPillRow } from './FilterPillRow';

afterEach(() => cleanup());

describe('FilterPillRow (Phase 17 PROPS-02, D-11)', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // AC-FPR-01 — archived=false → Actives active styling, Archivées inactive
  // ──────────────────────────────────────────────────────────────────────────
  it('AC-FPR-01: archived=false → Actives pill has active styling, Archivées inactive', () => {
    render(<FilterPillRow archived={false} lang="fr" />);

    const activesPill = screen.getByTestId('filter-pill-actives');
    const archivedPill = screen.getByTestId('filter-pill-archived');

    const activesStyle = activesPill.getAttribute('style') ?? '';
    const archivedStyle = archivedPill.getAttribute('style') ?? '';

    // Active styling on Actives: tinted bg + --gd-text + 600 weight
    expect(activesStyle).toMatch(/background:\s*rgba\(18,\s*150,\s*87,\s*0\.10?\)/);
    expect(activesStyle).toMatch(/color:\s*var\(--gd-text\)/);
    expect(activesStyle).toMatch(/font-weight:\s*600/);

    // Inactive styling on Archivées: transparent bg + --muted + 500 weight
    expect(archivedStyle).toMatch(/background:\s*transparent/);
    expect(archivedStyle).toMatch(/color:\s*var\(--muted\)/);
    expect(archivedStyle).toMatch(/font-weight:\s*500/);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-FPR-02 — archived=true → Archivées active styling, Actives inactive
  // ──────────────────────────────────────────────────────────────────────────
  it('AC-FPR-02: archived=true → Archivées pill has active styling, Actives inactive', () => {
    render(<FilterPillRow archived={true} lang="fr" />);

    const activesPill = screen.getByTestId('filter-pill-actives');
    const archivedPill = screen.getByTestId('filter-pill-archived');

    const activesStyle = activesPill.getAttribute('style') ?? '';
    const archivedStyle = archivedPill.getAttribute('style') ?? '';

    // Active styling on Archivées
    expect(archivedStyle).toMatch(/background:\s*rgba\(18,\s*150,\s*87,\s*0\.10?\)/);
    expect(archivedStyle).toMatch(/color:\s*var\(--gd-text\)/);
    expect(archivedStyle).toMatch(/font-weight:\s*600/);

    // Inactive styling on Actives
    expect(activesStyle).toMatch(/background:\s*transparent/);
    expect(activesStyle).toMatch(/color:\s*var\(--muted\)/);
    expect(activesStyle).toMatch(/font-weight:\s*500/);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-FPR-03 — Actives pill href = /proposals
  // ──────────────────────────────────────────────────────────────────────────
  it('AC-FPR-03: Actives pill href = "/proposals" (no query params)', () => {
    render(<FilterPillRow archived={false} lang="fr" />);

    const activesPill = screen.getByTestId('filter-pill-actives');
    expect(activesPill.tagName).toBe('A');
    expect(activesPill.getAttribute('href')).toBe('/proposals');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-FPR-04 — Archivées pill href = /proposals?archived=1
  // ──────────────────────────────────────────────────────────────────────────
  it('AC-FPR-04: Archivées pill href = "/proposals?archived=1"', () => {
    render(<FilterPillRow archived={false} lang="fr" />);

    const archivedPill = screen.getByTestId('filter-pill-archived');
    expect(archivedPill.tagName).toBe('A');
    expect(archivedPill.getAttribute('href')).toBe('/proposals?archived=1');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-FPR-05 — both pills carry data-testid attributes
  // ──────────────────────────────────────────────────────────────────────────
  it('AC-FPR-05: both pills carry data-testid attributes filter-pill-actives + filter-pill-archived', () => {
    const { container } = render(<FilterPillRow archived={false} lang="fr" />);

    const actives = container.querySelector('[data-testid="filter-pill-actives"]');
    const archived = container.querySelector('[data-testid="filter-pill-archived"]');

    expect(actives).not.toBeNull();
    expect(archived).not.toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-FPR-06 — i18n copy (FR + EN)
  // ──────────────────────────────────────────────────────────────────────────
  it('AC-FPR-06: pills render copy from i18n keys proposals.filter.actives / .archived (FR + EN)', () => {
    // FR — Actives / Archivées
    const { container: frContainer } = render(
      <FilterPillRow archived={false} lang="fr" />,
    );
    expect(
      frContainer.querySelector('[data-testid="filter-pill-actives"]')!.textContent,
    ).toContain('Actives');
    expect(
      frContainer.querySelector('[data-testid="filter-pill-archived"]')!.textContent,
    ).toContain('Archivées');

    cleanup();

    // EN — Active / Archived
    const { container: enContainer } = render(
      <FilterPillRow archived={false} lang="en" />,
    );
    expect(
      enContainer.querySelector('[data-testid="filter-pill-actives"]')!.textContent,
    ).toContain('Active');
    expect(
      enContainer.querySelector('[data-testid="filter-pill-archived"]')!.textContent,
    ).toContain('Archived');
  });
});
