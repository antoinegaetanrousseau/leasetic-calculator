/**
 * Phase 30 Plan 07 Task 3 — ContactFormDialog tests.
 *
 * Coverage (per <behavior>):
 *   1. mode="create" renders four fields and the submit label
 *      "Enregistrer le contact".
 *   2. mode="edit" pre-fills defaultValues and shows
 *      "Enregistrer les modifications".
 *   3. Only "Nom" carries the required asterisk.
 *   4. An invalid email shows error.field.email.invalid under the field and
 *      does not call the action.
 *   5. Create calls createContactAction(relationshipId, values); edit calls
 *      updateContactAction(contactId, values).
 *   6. Neither component calls the native browser confirm prompt.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const {
  routerRefreshMock,
  toastSuccessMock,
  toastErrorMock,
  createContactActionMock,
  updateContactActionMock,
} = vi.hoisted(() => ({
  routerRefreshMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  createContactActionMock: vi.fn(),
  updateContactActionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock('@/lib/crm/actions', () => ({
  createContactAction: createContactActionMock,
  updateContactAction: updateContactActionMock,
}));

import { ContactFormDialog } from './ContactFormDialog';

const EXISTING_CONTACT = {
  id: 'contact-1',
  name: 'Jeanne Dupont',
  role: 'Acheteuse',
  phone: '06 00 00 00 00',
  email: 'jeanne@example.com',
};

beforeEach(() => {
  routerRefreshMock.mockClear();
  toastSuccessMock.mockClear();
  toastErrorMock.mockClear();
  createContactActionMock.mockReset();
  updateContactActionMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ContactFormDialog (Plan 30-07 Task 3)', () => {
  it('Test 1: mode="create" renders four fields and "Enregistrer le contact"', () => {
    render(
      <ContactFormDialog
        mode="create"
        relationshipId="rel-1"
        open
        onOpenChange={vi.fn()}
        lang="fr"
      />,
    );

    expect(screen.getByLabelText(/Nom/)).toHaveValue('');
    expect(screen.getByLabelText('Fonction')).toBeInTheDocument();
    expect(screen.getByLabelText('Téléphone')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer le contact' })).toBeInTheDocument();
  });

  it('Test 2: mode="edit" pre-fills defaultValues and shows "Enregistrer les modifications"', () => {
    render(
      <ContactFormDialog
        mode="edit"
        relationshipId="rel-1"
        contact={EXISTING_CONTACT}
        open
        onOpenChange={vi.fn()}
        lang="fr"
      />,
    );

    expect(screen.getByLabelText(/Nom/)).toHaveValue('Jeanne Dupont');
    expect(screen.getByLabelText('Fonction')).toHaveValue('Acheteuse');
    expect(screen.getByLabelText('Téléphone')).toHaveValue('06 00 00 00 00');
    expect(screen.getByLabelText('Email')).toHaveValue('jeanne@example.com');
    expect(
      screen.getByRole('button', { name: 'Enregistrer les modifications' }),
    ).toBeInTheDocument();
  });

  it('Test 3: only "Nom" carries the required asterisk', () => {
    render(
      <ContactFormDialog
        mode="create"
        relationshipId="rel-1"
        open
        onOpenChange={vi.fn()}
        lang="fr"
      />,
    );

    const nameLabel = screen.getByText('Nom').closest('label');
    expect(nameLabel?.querySelector('.text-destructive')).not.toBeNull();

    for (const label of ['Fonction', 'Téléphone', 'Email']) {
      const fieldLabel = screen.getByText(label).closest('label');
      expect(fieldLabel?.querySelector('.text-destructive')).toBeNull();
    }
  });

  it('Test 4: an invalid email shows error.field.email.invalid and does not call the action', async () => {
    render(
      <ContactFormDialog
        mode="create"
        relationshipId="rel-1"
        open
        onOpenChange={vi.fn()}
        lang="fr"
      />,
    );

    fireEvent.change(screen.getByLabelText(/Nom/), { target: { value: 'Jeanne Dupont' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le contact' }));

    await screen.findByText("Format d'email invalide.");
    expect(createContactActionMock).not.toHaveBeenCalled();
  });

  it('Test 5a: create calls createContactAction(relationshipId, values), toasts, refreshes, and closes', async () => {
    createContactActionMock.mockResolvedValueOnce({ id: 'new-contact' });
    const onOpenChange = vi.fn();
    render(
      <ContactFormDialog
        mode="create"
        relationshipId="rel-1"
        open
        onOpenChange={onOpenChange}
        lang="fr"
      />,
    );

    fireEvent.change(screen.getByLabelText(/Nom/), { target: { value: 'Jeanne Dupont' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le contact' }));

    await waitFor(() => expect(createContactActionMock).toHaveBeenCalledTimes(1));
    expect(createContactActionMock).toHaveBeenCalledWith(
      'rel-1',
      expect.objectContaining({ name: 'Jeanne Dupont' }),
    );
    expect(toastSuccessMock).toHaveBeenCalledWith('Contact ajouté.');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
    expect(updateContactActionMock).not.toHaveBeenCalled();
  });

  it('Test 5b: edit calls updateContactAction(contactId, values), toasts, refreshes, and closes', async () => {
    updateContactActionMock.mockResolvedValueOnce(undefined);
    const onOpenChange = vi.fn();
    render(
      <ContactFormDialog
        mode="edit"
        relationshipId="rel-1"
        contact={EXISTING_CONTACT}
        open
        onOpenChange={onOpenChange}
        lang="fr"
      />,
    );

    fireEvent.change(screen.getByLabelText(/Nom/), { target: { value: 'Jeanne D.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    await waitFor(() => expect(updateContactActionMock).toHaveBeenCalledTimes(1));
    expect(updateContactActionMock).toHaveBeenCalledWith(
      'contact-1',
      expect.objectContaining({ name: 'Jeanne D.' }),
    );
    expect(toastSuccessMock).toHaveBeenCalledWith('Contact mis à jour.');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
    expect(createContactActionMock).not.toHaveBeenCalled();
  });

  it('Test 6: a rejected action fires the generic error toast and leaves the dialog open', async () => {
    createContactActionMock.mockRejectedValueOnce(new Error('clients.toast.error'));
    const onOpenChange = vi.fn();
    render(
      <ContactFormDialog
        mode="create"
        relationshipId="rel-1"
        open
        onOpenChange={onOpenChange}
        lang="fr"
      />,
    );

    fireEvent.change(screen.getByLabelText(/Nom/), { target: { value: 'Jeanne Dupont' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le contact' }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.'),
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('Test 7: never calls the native browser confirm prompt', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(
      <ContactFormDialog
        mode="create"
        relationshipId="rel-1"
        open
        onOpenChange={vi.fn()}
        lang="fr"
      />,
    );
    fireEvent.change(screen.getByLabelText(/Nom/), { target: { value: 'Jeanne Dupont' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le contact' }));
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
