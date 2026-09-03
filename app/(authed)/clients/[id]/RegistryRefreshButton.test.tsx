/**
 * Phase 34 Plan 10 Task 3 — RegistryRefreshButton tests (FICHE-02, D-24).
 *
 * Coverage (per <behavior>):
 *   1. Clicking calls refreshCompanyRegistryAction({ relationshipId }) once.
 *   2. { ok: true } → success toast + router.refresh().
 *   3. { ok: false, reason: 'not_found' } → the settled-answer toast, and NO
 *      refresh: nothing changed, so nothing needs re-fetching.
 *   4. { ok: false, reason: 'unavailable' } → the retryable toast.
 *   5. { ok: false, reason: 'no_siren' } → the same retryable toast; the
 *      control should not have been reachable at all.
 *   6. A REJECTED action → the bounded crm toast from the catch, with no
 *      inspection of the rejection anywhere in the file.
 *   7. Disabled with the "refreshing" label while in flight, re-enabled
 *      afterwards on EVERY branch including the rejection.
 *   8. A double-click fires the action once.
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { routerRefreshMock, toastSuccessMock, toastErrorMock, refreshCompanyRegistryActionMock } =
  vi.hoisted(() => ({
    routerRefreshMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    refreshCompanyRegistryActionMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock('@/lib/crm/actions', () => ({
  refreshCompanyRegistryAction: refreshCompanyRegistryActionMock,
}));

import { RegistryRefreshButton } from './RegistryRefreshButton';

const REL_ID = '44444444-4444-4444-8444-444444444444';

function renderButton() {
  render(<RegistryRefreshButton relationshipId={REL_ID} lang="fr" />);
  return screen.getByRole('button', { name: 'Actualiser' });
}

beforeEach(() => {
  routerRefreshMock.mockClear();
  toastSuccessMock.mockClear();
  toastErrorMock.mockClear();
  refreshCompanyRegistryActionMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RegistryRefreshButton (Plan 34-10 Task 3)', () => {
  it('Test 1: clicking calls refreshCompanyRegistryAction({ relationshipId }) exactly once', async () => {
    refreshCompanyRegistryActionMock.mockResolvedValueOnce({ ok: true });
    fireEvent.click(renderButton());

    await waitFor(() => expect(refreshCompanyRegistryActionMock).toHaveBeenCalledTimes(1));
    expect(refreshCompanyRegistryActionMock).toHaveBeenCalledWith({ relationshipId: REL_ID });
  });

  it('Test 2: { ok: true } toasts the synced copy and refreshes', async () => {
    refreshCompanyRegistryActionMock.mockResolvedValueOnce({ ok: true });
    fireEvent.click(renderButton());

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith('Informations mises à jour depuis le registre.'),
    );
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("Test 3: reason 'not_found' toasts the settled answer and does NOT refresh", async () => {
    refreshCompanyRegistryActionMock.mockResolvedValueOnce({ ok: false, reason: 'not_found' });
    fireEvent.click(renderButton());

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Aucune entreprise trouvée pour ce SIREN.'),
    );
    expect(routerRefreshMock).not.toHaveBeenCalled();
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it("Test 4: reason 'unavailable' toasts the retryable copy", async () => {
    refreshCompanyRegistryActionMock.mockResolvedValueOnce({ ok: false, reason: 'unavailable' });
    fireEvent.click(renderButton());

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Le registre est indisponible. Réessayez plus tard.',
      ),
    );
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it("Test 5: reason 'no_siren' toasts the same retryable copy", async () => {
    refreshCompanyRegistryActionMock.mockResolvedValueOnce({ ok: false, reason: 'no_siren' });
    fireEvent.click(renderButton());

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Le registre est indisponible. Réessayez plus tard.',
      ),
    );
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it('Test 6: a rejected action toasts the bounded crm key from the catch', async () => {
    refreshCompanyRegistryActionMock.mockRejectedValueOnce(new Error('clients.toast.error'));
    fireEvent.click(renderButton());

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.'),
    );
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it('Test 6b: the component never compares a caught rejection message to anything', () => {
    const source = readFileSync('app/(authed)/clients/[id]/RegistryRefreshButton.tsx', 'utf-8');
    const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(stripped).not.toMatch(/(?:\w+\.message\s*[!=]==?\s*)|(?:[!=]==?\s*\w+\.message\b)/);
  });

  it('Test 7: disabled with the refreshing label while in flight, re-enabled on the ok branch', async () => {
    let release: ((v: { ok: true }) => void) | undefined;
    refreshCompanyRegistryActionMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve as (v: { ok: true }) => void;
        }),
    );

    const button = renderButton();
    fireEvent.click(button);

    const pending = await screen.findByRole('button', { name: 'Actualisation…' });
    expect(pending).toBeDisabled();

    release?.({ ok: true });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Actualiser' })).not.toBeDisabled(),
    );
  });

  it('Test 7b: the control re-enables after a rejection too', async () => {
    refreshCompanyRegistryActionMock.mockRejectedValueOnce(new Error('clients.toast.error'));
    fireEvent.click(renderButton());

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Actualiser' })).not.toBeDisabled();
  });

  it('Test 8: a double-click does not fire the action twice', async () => {
    let release: ((v: { ok: true }) => void) | undefined;
    refreshCompanyRegistryActionMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve as (v: { ok: true }) => void;
        }),
    );

    const button = renderButton();
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(refreshCompanyRegistryActionMock).toHaveBeenCalledTimes(1));
    release?.({ ok: true });
    await waitFor(() => expect(routerRefreshMock).toHaveBeenCalledTimes(1));
    expect(refreshCompanyRegistryActionMock).toHaveBeenCalledTimes(1);
  });
});
