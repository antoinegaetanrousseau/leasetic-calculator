/**
 * Phase 34 Plan 12 Task 1 — IdentityPanel tests (FICHE-02, D-01 tier one,
 * D-02, D-06, D-11).
 *
 * The panel is the registry tier made visible, and D-02 made observable: the
 * registry owns identity, so there is no editable control on this surface at
 * all. Test 1 asserts that by COUNTING form controls rather than by trusting a
 * reviewer, which is why it is the first case in the file.
 *
 * Coverage (per <behavior>):
 *   1. Zero form controls of any kind (D-02).
 *   2. Present fields render with their label; an absent field is omitted
 *      entirely rather than rendered as a blank row.
 *   3. Headcount band '32' → "250 à 499 salariés"; an unknown code → the raw
 *      code (D-06's deliberate fallback).
 *   4. NAF section 'M' renders its section label beside the raw NAF code.
 *   5. An administrative state of 'C' renders the "Cessée" wording with
 *      visible weight — a partner must see a ceased company before quoting
 *      it (D-11).
 *   6. `pending` + a null sync timestamp renders "Jamais synchronisé" and the
 *      UIC-05 empty state, not a panel of blank rows.
 *   7. The refresh control renders only when the company has a SIREN.
 *   8. The sync timestamp renders through `clients.registry.syncedAt` with
 *      `{0}` interpolated at the call site.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/crm/actions', () => ({
  refreshCompanyRegistryAction: vi.fn(),
}));

import { IdentityPanel, type RegistryIdentity } from './IdentityPanel';
import { t } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';

const REL_ID = '11111111-1111-4111-8111-111111111111';

const EMPTY_IDENTITY: RegistryIdentity = {
  legalName: null,
  addressLine: null,
  postalCode: null,
  city: null,
  legalForm: null,
  nafCode: null,
  nafSection: null,
  headcountBand: null,
  foundedOn: null,
  registryState: null,
  registryStatus: 'pending',
  registrySyncedAt: null,
};

const SYNCED_IDENTITY: RegistryIdentity = {
  legalName: 'DUPONT MENUISERIE SARL',
  addressLine: '12 RUE DES LILAS',
  postalCode: '69003',
  city: 'LYON',
  legalForm: '5499',
  nafCode: '43.32A',
  nafSection: 'M',
  headcountBand: '32',
  foundedOn: '2001-03-04',
  registryState: 'A',
  registryStatus: 'synced',
  registrySyncedAt: new Date('2026-09-01T10:30:00Z'),
};

function renderPanel(
  identity: RegistryIdentity = SYNCED_IDENTITY,
  siren: string | null = '552100554',
) {
  return render(
    <IdentityPanel relationshipId={REL_ID} identity={identity} siren={siren} lang="fr" />,
  );
}

afterEach(() => {
  cleanup();
});

describe('IdentityPanel — the read-only registry tier (D-02)', () => {
  it('Test 1: renders ZERO form controls — the registry tier is read-only by construction', () => {
    const { container } = renderPanel();

    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelectorAll('select')).toHaveLength(0);
    expect(container.querySelectorAll('textarea')).toHaveLength(0);
  });

  it('Test 1b: still zero form controls on the never-synced path', () => {
    const { container } = renderPanel(EMPTY_IDENTITY);

    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelectorAll('select')).toHaveLength(0);
    expect(container.querySelectorAll('textarea')).toHaveLength(0);
  });

  it('Test 2: renders each present field with its label', () => {
    renderPanel();

    expect(screen.getByText(t('clients.registry.field.legalName', 'fr'))).toBeTruthy();
    expect(screen.getByText('DUPONT MENUISERIE SARL')).toBeTruthy();
    expect(screen.getByText(t('clients.registry.field.address', 'fr'))).toBeTruthy();
    expect(screen.getByText(/12 RUE DES LILAS/)).toBeTruthy();
    expect(screen.getByText(/69003 LYON/)).toBeTruthy();
    expect(screen.getByText(t('clients.registry.field.legalForm', 'fr'))).toBeTruthy();
    expect(screen.getByText('5499')).toBeTruthy();
  });

  it('Test 2b: omits a field entirely when its value is null — never a blank row', () => {
    renderPanel({ ...SYNCED_IDENTITY, legalForm: null, foundedOn: null });

    expect(screen.queryByText(t('clients.registry.field.legalForm', 'fr'))).toBeNull();
    expect(screen.queryByText(t('clients.registry.field.foundedOn', 'fr'))).toBeNull();
    // The fields that ARE present are untouched by the omission.
    expect(screen.getByText(t('clients.registry.field.legalName', 'fr'))).toBeTruthy();
  });

  it('Test 3: a headcount band of "32" renders "250 à 499 salariés"', () => {
    renderPanel();

    expect(screen.getByText(t('clients.registry.field.headcount', 'fr'))).toBeTruthy();
    expect(screen.getByText('250 à 499 salariés')).toBeTruthy();
  });

  it('Test 3b: an unrecognised headcount code renders the raw code (D-06 fallback)', () => {
    renderPanel({ ...SYNCED_IDENTITY, headcountBand: '99' });

    expect(screen.getByText('99')).toBeTruthy();
  });

  it('Test 4: a NAF section of "M" renders its section label beside the raw NAF code', () => {
    renderPanel();

    expect(screen.getByText(t('clients.registry.field.activity', 'fr'))).toBeTruthy();
    const activity = screen.getByTestId('identity-field-activity');
    expect(activity.textContent).toContain('43.32A');
    expect(activity.textContent).toContain('Activités spécialisées, scientifiques et techniques');
  });

  it('Test 5: a ceased company renders the ceased wording with visible weight (D-11)', () => {
    renderPanel({ ...SYNCED_IDENTITY, registryState: 'C' });

    const state = screen.getByTestId('identity-field-state');
    expect(state.textContent).toContain(t('clients.registry.state.ceased', 'fr'));
    expect(state.getAttribute('data-ceased')).toBe('true');
    // UIC-03: prominence comes from weight, never a destructive fill.
    expect(state.innerHTML).not.toContain('destructive');
  });

  it('Test 5b: an active company renders the active wording, unweighted', () => {
    renderPanel();

    const state = screen.getByTestId('identity-field-state');
    expect(state.textContent).toContain(t('clients.registry.state.active', 'fr'));
    expect(state.getAttribute('data-ceased')).toBe('false');
  });

  it('Test 6: pending + never synced renders the neverSynced line and the UIC-05 empty state', () => {
    renderPanel(EMPTY_IDENTITY);

    expect(screen.getByText(t('clients.registry.neverSynced', 'fr'))).toBeTruthy();
    expect(screen.getByText(t('clients.registry.empty', 'fr'))).toBeTruthy();
    expect(screen.getByText(t('clients.registry.status.pending', 'fr'))).toBeTruthy();
    // No blank rows stood in for the absent fields.
    expect(screen.queryByText(t('clients.registry.field.legalName', 'fr'))).toBeNull();
  });

  it('Test 7: the refresh control renders when the company has a SIREN', () => {
    renderPanel(EMPTY_IDENTITY, '552100554');

    expect(screen.getByRole('button', { name: t('clients.registry.refresh', 'fr') })).toBeTruthy();
  });

  it('Test 7b: the refresh control is absent when the company has no SIREN', () => {
    renderPanel(EMPTY_IDENTITY, null);

    expect(screen.queryByRole('button', { name: t('clients.registry.refresh', 'fr') })).toBeNull();
  });

  it('Test 8: the sync timestamp renders through clients.registry.syncedAt with {0} interpolated', () => {
    renderPanel();

    const expected = t('clients.registry.syncedAt', 'fr').replace(
      '{0}',
      formatDate(SYNCED_IDENTITY.registrySyncedAt as Date, 'fr', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    );
    expect(screen.getByText(expected)).toBeTruthy();
    expect(screen.queryByText(/\{0\}/)).toBeNull();
  });
});
