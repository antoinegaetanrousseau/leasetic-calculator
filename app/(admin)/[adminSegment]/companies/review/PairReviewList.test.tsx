/**
 * Phase 31 Plan 06 Task 2 — PairReviewList tests.
 *
 * Coverage (per <action>):
 *   - Empty state renders the success copy and no button.
 *   - A two-pair list renders two cards.
 *   - A side with zero relations renders the literal "0" (never an em dash).
 *   - A null compoundMergeWarning with compoundOwnerCount: 2 renders no
 *     warning text (UI-SPEC Access & Non-Leakage point 4).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { AdminPendingPairRow, AdminPairSide } from '@/lib/db/queries';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/reconcile/actions', () => ({
  mergeCompanyPairAction: vi.fn(),
  keepPairSeparateAction: vi.fn(),
}));

import { PairReviewList } from './PairReviewList';

function buildSide(overrides: Partial<AdminPairSide> = {}): AdminPairSide {
  return {
    companyId: 'company-a',
    name: 'Acme SARL',
    siren: '123456789',
    relationsCount: 1,
    contactsCount: 2,
    proposalsCount: 3,
    owners: [{ ownerId: 'owner-1', ownerDisplayName: 'Jeanne Dupont', isInternal: false }],
    ...overrides,
  };
}

function buildPair(overrides: Partial<AdminPendingPairRow> = {}): AdminPendingPairRow {
  return {
    pairId: 'pair-1',
    reason: 'differing',
    nameNormalized: 'acme',
    sideA: buildSide({ companyId: 'company-a', name: 'Acme SARL' }),
    sideB: buildSide({ companyId: 'company-b', name: 'Acme SAS' }),
    compoundMergeWarning: null,
    compoundOwnerCount: 0,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PairReviewList (Plan 31-06 Task 2)', () => {
  it('Test 1: the empty state renders the success copy and no button', () => {
    render(<PairReviewList rows={[]} nextCursor={null} lang="fr" adminSegment="admin-secret" />);
    expect(screen.getByText('Aucune paire à examiner.')).toBeInTheDocument();
    expect(screen.getByText('Toutes les sociétés détectées ont été résolues.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('Test 2: a two-pair list renders two cards', () => {
    const rows = [buildPair({ pairId: 'pair-1' }), buildPair({ pairId: 'pair-2' })];
    render(<PairReviewList rows={rows} nextCursor={null} lang="fr" adminSegment="admin-secret" />);
    expect(screen.getAllByText('Acme SARL')).toHaveLength(2);
    expect(screen.getAllByText('Acme SAS')).toHaveLength(2);
  });

  it('Test 3: a side with zero relations renders the literal "0"', () => {
    const rows = [
      buildPair({
        sideA: buildSide({ companyId: 'company-a', name: 'Zero SARL', relationsCount: 0, contactsCount: 0, proposalsCount: 0, owners: [] }),
      }),
    ];
    render(<PairReviewList rows={rows} nextCursor={null} lang="fr" adminSegment="admin-secret" />);
    const line = screen.getByText('0 relations · 0 contacts · 0 propositions');
    expect(line.textContent).not.toContain('—');
  });

  it('Test 4: a null compoundMergeWarning with compoundOwnerCount: 2 renders no warning text', () => {
    const rows = [buildPair({ compoundMergeWarning: null, compoundOwnerCount: 2 })];
    render(<PairReviewList rows={rows} nextCursor={null} lang="fr" adminSegment="admin-secret" />);
    expect(screen.queryByText(/détient une relation avec les deux sociétés/)).not.toBeInTheDocument();
  });

  it('Test 5: renders the "Charger plus" footer link when a nextCursor is present', () => {
    const rows = [buildPair()];
    render(<PairReviewList rows={rows} nextCursor="cursor-abc" lang="fr" adminSegment="admin-secret" />);
    const link = screen.getByRole('link', { name: 'Charger plus' });
    expect(link).toHaveAttribute('href', '/admin-secret/companies/review?cursor=cursor-abc');
  });
});
