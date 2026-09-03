/**
 * Phase 30 Plan 06 Task 2 — ClientsGrid tests.
 *
 * Coverage (one case per <behavior> bullet):
 *   1. Renders each row's company, SIREN and last-activity labels, plus the sort Select.
 *   2. Null siren renders "—"; zero proposalsCount renders "0".
 *   3. No checkbox column, no page-number control, no total-count text.
 *   4. Clicking a row navigates to /clients/{relationshipId}.
 *   5. Choosing 'Nom A → Z' in the sort Select pushes sort=company&dir=asc
 *      and deletes cursor.
 *   6. rows.length === 0, no q → zero-state title + "Nouveau client" CTA.
 *   7. rows.length === 0, q set → search-empty title, no CTA.
 *   8. nextCursor set → "Charger plus" link preserving q/sort/dir.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ClientBookRow } from '@/lib/db/queries';

vi.mock('server-only', () => ({}));

const { routerPushMock, routerReplaceMock } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
}));

let currentSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock, replace: routerReplaceMock }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/crm/actions', () => ({
  createClientRelationshipAction: vi.fn(async () => ({ relationshipId: 'rel-new' })),
}));

import { ClientsGrid } from './ClientsGrid';

/** Full pointer sequence Base UI's Select needs in jsdom (see PipelineMobileList.test.tsx). */
function pointerActivate(el: Element) {
  fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(el, { button: 0, pointerType: 'mouse' });
  fireEvent.click(el);
}

const ROW_WITH_SIREN: ClientBookRow = {
  relationshipId: 'rel-1',
  companyId: 'co-1',
  companyName: 'Dupont Menuiserie',
  siren: '123456789',
  proposalsCount: 3,
  lastActivityAt: new Date('2026-05-15T10:00:00Z'),
  createdAt: new Date('2026-04-01T12:00:00Z'),
};

const ROW_NO_SIREN_ZERO_PROPOSALS: ClientBookRow = {
  relationshipId: 'rel-2',
  companyId: 'co-2',
  companyName: 'Atelier Sans Siren',
  siren: null,
  proposalsCount: 0,
  lastActivityAt: null,
  createdAt: new Date('2026-04-02T12:00:00Z'),
};

beforeEach(() => {
  currentSearchParams = new URLSearchParams();
  routerPushMock.mockClear();
  routerReplaceMock.mockClear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ClientsGrid (Plan 30-06 Task 2)', () => {
  it('Test 1: renders company, SIREN and last-activity labels per row, plus the sort Select', () => {
    render(
      <ClientsGrid rows={[ROW_WITH_SIREN]} nextCursor={null} lang="fr" />,
    );
    expect(screen.getByText('Dupont Menuiserie')).toBeInTheDocument();
    expect(screen.getByText('SIREN')).toBeInTheDocument();
    expect(screen.getByText('123456789')).toBeInTheDocument();
    expect(screen.getByText('Dernière activité')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Trier par' })).toBeInTheDocument();
  });

  it('Test 2: null siren renders "—"; proposalsCount 0 renders "0"', () => {
    render(
      <ClientsGrid rows={[ROW_NO_SIREN_ZERO_PROPOSALS]} nextCursor={null} lang="fr" />,
    );
    // "—" renders for BOTH the absent siren AND the null lastActivityAt fallback.
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('Test 3: no checkbox column, no page-number control, no total-count text', () => {
    render(
      <ClientsGrid rows={[ROW_WITH_SIREN, ROW_NO_SIREN_ZERO_PROPOSALS]} nextCursor={null} lang="fr" />,
    );
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByText(/résultats?/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+ sur \d+$/)).not.toBeInTheDocument();
  });

  it('Test 4: clicking a row navigates to /clients/{relationshipId}', () => {
    render(
      <ClientsGrid rows={[ROW_WITH_SIREN]} nextCursor={null} lang="fr" />,
    );
    fireEvent.click(screen.getByText('Dupont Menuiserie'));
    expect(routerPushMock).toHaveBeenCalledWith('/clients/rel-1');
  });

  it('Test 5: choosing "Nom A → Z" in the sort Select pushes sort=company&dir=asc, deletes cursor', async () => {
    currentSearchParams = new URLSearchParams('cursor=abc&q=dupont');
    render(
      <ClientsGrid
        rows={[ROW_WITH_SIREN]}
        nextCursor={null}
        lang="fr"
        q="dupont"
        sort="lastActivity"
        dir="desc"
      />,
    );
    pointerActivate(screen.getByRole('combobox', { name: 'Trier par' }));
    const listbox = await screen.findByRole('listbox');
    const option = within(listbox)
      .getAllByRole('option')
      .find((o) => o.textContent === 'Nom A → Z');
    expect(option).toBeDefined();
    pointerActivate(option!);

    expect(routerReplaceMock).toHaveBeenCalledTimes(1);
    const [href] = routerReplaceMock.mock.calls[0];
    const params = new URLSearchParams(href.replace(/^\?/, ''));
    expect(params.get('sort')).toBe('company');
    expect(params.get('dir')).toBe('asc');
    expect(params.has('cursor')).toBe(false);
    expect(params.get('q')).toBe('dupont');
  });

  it('Test 6: rows.length === 0, no q → first-run title + body + "Nouveau client" CTA', () => {
    render(<ClientsGrid rows={[]} nextCursor={null} lang="fr" />);
    expect(screen.getByText('Votre portefeuille client démarre ici.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Aucun client pour le moment — créez le premier et construisons votre pipeline commercial.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nouveau client' })).toBeInTheDocument();
  });

  it('Test 7: rows.length === 0, q set → search-empty title, no CTA', () => {
    render(<ClientsGrid rows={[]} nextCursor={null} lang="fr" q="introuvable" />);
    expect(
      screen.getByText('Aucun résultat ne correspond à votre recherche.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nouveau client' })).not.toBeInTheDocument();
  });

  it('Test 8: nextCursor set → "Charger plus" link preserving q/sort/dir', () => {
    render(
      <ClientsGrid
        rows={[ROW_WITH_SIREN]}
        nextCursor="next-page-token"
        lang="fr"
        q="dupont"
        sort="company"
        dir="asc"
      />,
    );
    const link = screen.getByRole('link', { name: 'Charger plus' });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('cursor=next-page-token');
    expect(href).toContain('q=dupont');
    expect(href).toContain('sort=company');
    expect(href).toContain('dir=asc');
  });
});
