/**
 * Phase 34 Plan 10 Task 2 — EditCompanyDialog tests (FICHE-03, D-01 tier two,
 * D-02, D-03).
 *
 * Coverage (per <behavior>):
 *   1. Exactly four inputs — display name, website, phone, SIREN — and no
 *      fifth. An added registry field fails this count, independently of the
 *      D-02 grep gate, so the rule has two guards rather than one.
 *   2. The shared-visibility hint is rendered under the title and associated
 *      with the form, not hidden behind a tooltip. It is D-03's informed
 *      consent: a partner must see it BEFORE submitting.
 *   3. Submitting sends all four values plus the relationship id, then closes
 *      and refreshes.
 *   4. Formatting spaces are accepted and normalised away; a SIREN that cannot
 *      yield nine digits is rejected inline and the action is NOT called.
 *   5. An empty display name is rejected inline with error.field.required.
 *   6. A rejected action leaves the dialog open with the typed values intact.
 *   6b. A SIREN already held by another company reaches the client as that same
 *      bounded rejection (companies.siren is UNIQUE and the action collapses
 *      the violation deliberately), so the retry path must be the same one.
 *   7. The SIREN field carries the helper copy explaining that correcting it
 *      re-runs the registry lookup.
 */
import { readFileSync } from 'node:fs';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { routerRefreshMock, toastSuccessMock, toastErrorMock, updateCompanyDisplayActionMock } =
  vi.hoisted(() => ({
    routerRefreshMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    updateCompanyDisplayActionMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock('@/lib/crm/actions', () => ({
  updateCompanyDisplayAction: updateCompanyDisplayActionMock,
}));

import { EditCompanyDialog } from './EditCompanyDialog';

const REL_ID = '33333333-3333-4333-8333-333333333333';

const DEFAULTS = {
  name: 'Dupont Menuiserie',
  website: 'dupont-menuiserie.fr',
  phone: '04 78 00 00 00',
  siren: '552100554',
};

const HINT =
  'Ces informations sont partagées : les autres partenaires liés à cette société les voient aussi.';

function renderDialog(overrides: Partial<ComponentProps<typeof EditCompanyDialog>> = {}) {
  const onOpenChange = overrides.onOpenChange ?? vi.fn();
  render(
    <EditCompanyDialog
      open
      onOpenChange={onOpenChange}
      relationshipId={REL_ID}
      defaultValues={DEFAULTS}
      lang="fr"
      {...overrides}
    />,
  );
  return { onOpenChange };
}

function theForm(): HTMLFormElement {
  const form = document.querySelector('form');
  if (!form) throw new Error('no form rendered');
  return form as HTMLFormElement;
}

beforeEach(() => {
  routerRefreshMock.mockClear();
  toastSuccessMock.mockClear();
  toastErrorMock.mockClear();
  updateCompanyDisplayActionMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EditCompanyDialog (Plan 34-10 Task 2)', () => {
  it('Test 1: renders exactly four inputs — name, website, phone, SIREN — and no fifth', () => {
    renderDialog();

    const inputs = Array.from(theForm().querySelectorAll('input, textarea, select'));
    expect(inputs).toHaveLength(4);

    expect(screen.getByLabelText(/Nom affiché/)).toHaveValue('Dupont Menuiserie');
    expect(screen.getByLabelText('Site web')).toHaveValue('dupont-menuiserie.fr');
    expect(screen.getByLabelText('Téléphone')).toHaveValue('04 78 00 00 00');
    expect(screen.getByLabelText(/^SIREN/)).toHaveValue('552 100 554');
  });

  it('Test 2: the shared-visibility hint is rendered and associated with the form, not hidden behind a tooltip', () => {
    renderDialog();

    const hint = screen.getByText(HINT);
    expect(hint).toBeVisible();
    expect(hint.closest('[role="tooltip"]')).toBeNull();

    const describedBy = theForm().getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(describedBy?.split(/\s+/)).toContain(hint.id);
  });

  it('Test 3: submitting sends all four values plus the relationship id, then closes and refreshes', async () => {
    updateCompanyDisplayActionMock.mockResolvedValueOnce(undefined);
    const { onOpenChange } = renderDialog();

    fireEvent.change(screen.getByLabelText(/Nom affiché/), {
      target: { value: 'Dupont Menuiserie SAS' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(updateCompanyDisplayActionMock).toHaveBeenCalledTimes(1));
    expect(updateCompanyDisplayActionMock).toHaveBeenCalledWith({
      relationshipId: REL_ID,
      name: 'Dupont Menuiserie SAS',
      website: 'dupont-menuiserie.fr',
      phone: '04 78 00 00 00',
      siren: '552100554',
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Société mise à jour.');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('Test 4: formatting spaces are accepted; a SIREN that cannot yield nine digits is rejected inline', async () => {
    updateCompanyDisplayActionMock.mockResolvedValueOnce(undefined);
    renderDialog();

    const siren = screen.getByLabelText(/^SIREN/);

    // Interleaved non-digits are STRIPPED, not rejected: SirenInput's
    // formatSiren() drops them on change and normalizeSiren() would strip them
    // again on the schema side. Nine digits survive, so this value is valid by
    // design (src/lib/crm/schemas.ts documents the measured behaviour).
    fireEvent.change(siren, { target: { value: '1a2b3c4d5e6f7g8h9' } });
    expect(siren).toHaveValue('123 456 789');

    fireEvent.change(siren, { target: { value: '552 100 554' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(updateCompanyDisplayActionMock).toHaveBeenCalledTimes(1));
    expect(updateCompanyDisplayActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ siren: '552100554' }),
    );

    updateCompanyDisplayActionMock.mockClear();
    fireEvent.change(siren, { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await screen.findByText('SIREN invalide (9 chiffres requis).');
    expect(updateCompanyDisplayActionMock).not.toHaveBeenCalled();
  });

  it('Test 5: an empty display name is rejected inline with error.field.required', async () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText(/Nom affiché/), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await screen.findByText('Ce champ est requis.');
    expect(updateCompanyDisplayActionMock).not.toHaveBeenCalled();
  });

  it('Test 6: a rejected action toasts the bounded key and leaves the dialog open with values intact', async () => {
    updateCompanyDisplayActionMock.mockRejectedValueOnce(new Error('clients.toast.error'));
    const { onOpenChange } = renderDialog();

    fireEvent.change(screen.getByLabelText(/Nom affiché/), { target: { value: 'Dupont & Fils' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.'),
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByLabelText(/Nom affiché/)).toHaveValue('Dupont & Fils');
  });

  it('Test 6b: a SIREN already held by another company arrives as the same bounded rejection and keeps the typed SIREN', async () => {
    // companies.siren is UNIQUE. updateCompanyDisplayAction collapses the
    // violation into its single bounded key on purpose — telling the partner
    // "another company already has this SIREN" would disclose another
    // partner's data. So the recovery is the retry path, not a special branch.
    updateCompanyDisplayActionMock.mockRejectedValueOnce(new Error('clients.toast.error'));
    const { onOpenChange } = renderDialog();

    fireEvent.change(screen.getByLabelText(/^SIREN/), { target: { value: '732 829 320' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.'),
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByLabelText(/^SIREN/)).toHaveValue('732 829 320');
    expect(screen.getByLabelText(/Nom affiché/)).toHaveValue('Dupont Menuiserie');
  });

  it('Test 7: the SIREN field carries the helper copy about re-running the lookup', () => {
    renderDialog();

    const helper = screen.getByText(
      '9 chiffres, sans espaces. Corriger le SIREN relance la recherche au registre.',
    );
    expect(helper).toBeVisible();
    expect(screen.getByLabelText(/^SIREN/).getAttribute('aria-describedby')).toBe(helper.id);
  });

  it('Test 8: the component never compares a caught rejection message to anything', () => {
    const source = readFileSync('app/(authed)/clients/[id]/EditCompanyDialog.tsx', 'utf-8');
    const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(stripped).not.toMatch(/(?:\w+\.message\s*[!=]==?\s*)|(?:[!=]==?\s*\w+\.message\b)/);
  });
});
