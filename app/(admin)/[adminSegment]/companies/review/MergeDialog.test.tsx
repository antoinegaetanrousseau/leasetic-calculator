/**
 * Phase 31 Plan 06 Task 3 — MergeDialog tests.
 *
 * Coverage (per <action>):
 *   - The default survivor is the side with more proposals.
 *   - The tie-break falls to relationship count, then to side A.
 *   - The compound warning sentence renders inside the dialog when the pair
 *     has one, and not when it does not.
 *   - Submitting calls mergeCompanyPairAction with the selected survivor id.
 *   - A rejected action shows the error toast and leaves the dialog open
 *     (onOpenChange(false) not called).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AdminPairSide, AdminPendingPairRow } from '@/lib/db/queries';

vi.mock('server-only', () => ({}));

const { routerRefreshMock, toastSuccessMock, toastErrorMock, mergeCompanyPairActionMock } = vi.hoisted(
  () => ({
    routerRefreshMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    mergeCompanyPairActionMock: vi.fn(),
  }),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock('@/lib/reconcile/actions', () => ({
  mergeCompanyPairAction: mergeCompanyPairActionMock,
  keepPairSeparateAction: vi.fn(),
}));

import { MergeDialog } from './MergeDialog';

function buildSide(overrides: Partial<AdminPairSide> = {}): AdminPairSide {
  return {
    companyId: 'company-a',
    name: 'Acme SARL',
    siren: '123456789',
    relationsCount: 1,
    contactsCount: 2,
    proposalsCount: 3,
    owners: [],
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

/**
 * The checked radio's accessible name comes from its wrapping <label>.
 * `DialogContent` renders through a portal to `document.body`, not inside
 * RTL's `container`, so this searches the whole document.
 */
function checkedSideName(): string | null {
  const checked = document.querySelector('[role="radio"][aria-checked="true"]');
  const label = checked?.closest('label');
  return label?.querySelector('.text-\\[14\\.5px\\]')?.textContent ?? null;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MergeDialog (Plan 31-06 Task 3)', () => {
  it('Test 1: default survivor is the side with more proposals (5 vs 2 pre-selects side A)', () => {
    const pair = buildPair({
      sideA: buildSide({ companyId: 'company-a', name: 'Acme SARL', proposalsCount: 5 }),
      sideB: buildSide({ companyId: 'company-b', name: 'Acme SAS', proposalsCount: 2 }),
    });
    render(<MergeDialog pair={pair} open onOpenChange={vi.fn()} lang="fr" />);
    expect(checkedSideName()).toBe('Acme SARL');
  });

  it('Test 1b: default survivor is the side with more proposals (2 vs 5 pre-selects side B)', () => {
    const pair = buildPair({
      sideA: buildSide({ companyId: 'company-a', name: 'Acme SARL', proposalsCount: 2 }),
      sideB: buildSide({ companyId: 'company-b', name: 'Acme SAS', proposalsCount: 5 }),
    });
    render(<MergeDialog pair={pair} open onOpenChange={vi.fn()} lang="fr" />);
    expect(checkedSideName()).toBe('Acme SAS');
  });

  it('Test 2: equal proposals ties break on relationship count', () => {
    const pair = buildPair({
      sideA: buildSide({ companyId: 'company-a', name: 'Acme SARL', proposalsCount: 3, relationsCount: 1 }),
      sideB: buildSide({ companyId: 'company-b', name: 'Acme SAS', proposalsCount: 3, relationsCount: 4 }),
    });
    render(<MergeDialog pair={pair} open onOpenChange={vi.fn()} lang="fr" />);
    expect(checkedSideName()).toBe('Acme SAS');
  });

  it('Test 3: equal proposals and relations further tie-break to side A', () => {
    const pair = buildPair({
      sideA: buildSide({ companyId: 'company-a', name: 'Acme SARL', proposalsCount: 3, relationsCount: 1 }),
      sideB: buildSide({ companyId: 'company-b', name: 'Acme SAS', proposalsCount: 3, relationsCount: 1 }),
    });
    render(<MergeDialog pair={pair} open onOpenChange={vi.fn()} lang="fr" />);
    expect(checkedSideName()).toBe('Acme SARL');
  });

  it('Test 4: the compound warning renders inside the dialog when the pair has one', () => {
    const pair = buildPair({
      compoundMergeWarning: { ownerName: 'Jeanne Dupont', ownerType: 'partner' },
      compoundOwnerCount: 1,
    });
    render(<MergeDialog pair={pair} open onOpenChange={vi.fn()} lang="fr" />);
    expect(screen.getByText(/Jeanne Dupont détient une relation avec les deux sociétés/)).toBeInTheDocument();
  });

  it('Test 5: no compound warning text when the pair does not have one', () => {
    const pair = buildPair({ compoundMergeWarning: null, compoundOwnerCount: 0 });
    render(<MergeDialog pair={pair} open onOpenChange={vi.fn()} lang="fr" />);
    expect(screen.queryByText(/détient une relation avec les deux sociétés/)).not.toBeInTheDocument();
  });

  it('Test 6: submitting calls mergeCompanyPairAction with the selected (default) survivor id, toasts, refreshes, closes', async () => {
    mergeCompanyPairActionMock.mockResolvedValueOnce(undefined);
    const onOpenChange = vi.fn();
    const pair = buildPair({
      sideA: buildSide({ companyId: 'company-a', name: 'Acme SARL', proposalsCount: 5 }),
      sideB: buildSide({ companyId: 'company-b', name: 'Acme SAS', proposalsCount: 2 }),
    });
    render(<MergeDialog pair={pair} open onOpenChange={onOpenChange} lang="fr" />);

    fireEvent.click(screen.getByRole('button', { name: 'Fusionner' }));

    await vi.waitFor(() =>
      expect(mergeCompanyPairActionMock).toHaveBeenCalledWith('pair-1', 'company-a'),
    );
    expect(toastSuccessMock).toHaveBeenCalledWith('Sociétés fusionnées.');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('Test 7: a rejected merge fires the error toast and leaves the dialog open (onOpenChange(false) not called)', async () => {
    mergeCompanyPairActionMock.mockRejectedValueOnce(new Error('admin.reconciliation.toast.error'));
    const onOpenChange = vi.fn();
    render(<MergeDialog pair={buildPair()} open onOpenChange={onOpenChange} lang="fr" />);

    fireEvent.click(screen.getByRole('button', { name: 'Fusionner' }));

    await vi.waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.'),
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });
});
