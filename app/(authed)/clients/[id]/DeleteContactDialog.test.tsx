/**
 * Phase 30 Plan 07 Task 3 — DeleteContactDialog tests.
 *
 * Coverage (per <behavior>):
 *   - Renders title "Supprimer ce contact ?" and a description interpolating
 *     the contact's name.
 *   - Confirming calls deleteContactAction(contactId) and fires the
 *     "Contact supprimé." toast.
 *   - Cancelling calls nothing.
 *   - Never calls the native browser confirm prompt.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { routerRefreshMock, toastSuccessMock, toastErrorMock, deleteContactActionMock } = vi.hoisted(
  () => ({
    routerRefreshMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    deleteContactActionMock: vi.fn(),
  }),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock('@/lib/crm/actions', () => ({
  deleteContactAction: deleteContactActionMock,
}));

import { DeleteContactDialog } from './DeleteContactDialog';

const CONTACT = { id: 'contact-1', name: 'Jeanne Dupont' };

beforeEach(() => {
  routerRefreshMock.mockClear();
  toastSuccessMock.mockClear();
  toastErrorMock.mockClear();
  deleteContactActionMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DeleteContactDialog (Plan 30-07 Task 3)', () => {
  it('Test 1: renders title "Supprimer ce contact ?" and a description interpolating the contact name', () => {
    render(
      <DeleteContactDialog contact={CONTACT} open onOpenChange={vi.fn()} lang="fr" />,
    );
    expect(screen.getByText('Supprimer ce contact ?')).toBeInTheDocument();
    expect(
      screen.getByText('Cette action est définitive et retirera Jeanne Dupont de la fiche client.'),
    ).toBeInTheDocument();
  });

  it('Test 2: confirming calls deleteContactAction(contactId), toasts, refreshes, and closes', async () => {
    deleteContactActionMock.mockResolvedValueOnce(undefined);
    const onOpenChange = vi.fn();
    render(<DeleteContactDialog contact={CONTACT} open onOpenChange={onOpenChange} lang="fr" />);

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => expect(deleteContactActionMock).toHaveBeenCalledWith('contact-1'));
    expect(toastSuccessMock).toHaveBeenCalledWith('Contact supprimé.');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('Test 3: a rejected delete fires the generic error toast and does not close the dialog', async () => {
    deleteContactActionMock.mockRejectedValueOnce(new Error('clients.toast.error'));
    const onOpenChange = vi.fn();
    render(<DeleteContactDialog contact={CONTACT} open onOpenChange={onOpenChange} lang="fr" />);

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.'),
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it('Test 4: cancelling calls nothing — no action, no toast', () => {
    render(<DeleteContactDialog contact={CONTACT} open onOpenChange={vi.fn()} lang="fr" />);

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(deleteContactActionMock).not.toHaveBeenCalled();
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('Test 5: never calls the native browser confirm prompt', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(<DeleteContactDialog contact={CONTACT} open onOpenChange={vi.fn()} lang="fr" />);
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
