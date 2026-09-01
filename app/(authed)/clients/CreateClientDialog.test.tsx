/**
 * Phase 30 Plan 06 Task 3 — CreateClientDialog tests.
 *
 * Coverage (one case per <behavior> bullet):
 *   1. Trigger renders "Nouveau client" as the page's one accent CTA
 *      (default Button variant).
 *   2. Dialog contains exactly two fields: name (required, asterisk) and
 *      SIREN (optional, no asterisk, helper text).
 *   3. Submitting a 4-digit SIREN shows error.field.siren.invalid, does not
 *      call the action.
 *   4. Valid submit → calls createClientRelationshipAction, closes dialog,
 *      "Client créé." toast, navigates to /clients/{relationshipId}.
 *   5. Rejected action → generic error toast, dialog stays open.
 *   6. No autocomplete/typeahead/lookup surface anywhere in the dialog.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { routerPushMock, toastSuccessMock, toastErrorMock, createClientRelationshipActionMock } =
  vi.hoisted(() => ({
    routerPushMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    createClientRelationshipActionMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock('@/lib/crm/actions', () => ({
  createClientRelationshipAction: createClientRelationshipActionMock,
}));

import { CreateClientDialog } from './CreateClientDialog';

beforeEach(() => {
  routerPushMock.mockClear();
  toastSuccessMock.mockClear();
  toastErrorMock.mockClear();
  createClientRelationshipActionMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Nouveau client' }));
  await screen.findByRole('dialog');
}

describe('CreateClientDialog (Plan 30-06 Task 3)', () => {
  it('Test 1: trigger renders "Nouveau client" as the default-variant accent CTA', () => {
    render(<CreateClientDialog lang="fr" />);
    const trigger = screen.getByRole('button', { name: 'Nouveau client' });
    expect(trigger).toBeInTheDocument();
    // Default Button variant carries bg-primary (this surface's one accent use).
    expect(trigger.className).toContain('bg-primary');
  });

  it('Test 2: dialog contains exactly two fields — name (required) and SIREN (optional, no asterisk)', async () => {
    render(<CreateClientDialog lang="fr" />);
    await openDialog();

    const nameInput = screen.getByLabelText(/Nom de la société/);
    expect(nameInput).toBeInTheDocument();
    const nameLabel = screen.getByText('Nom de la société').closest('label');
    expect(nameLabel?.querySelector('.text-destructive')).not.toBeNull();

    const sirenInput = screen.getByLabelText('SIREN');
    expect(sirenInput).toBeInTheDocument();
    const sirenLabel = screen.getByText('SIREN').closest('label');
    expect(sirenLabel?.querySelector('.text-destructive')).toBeNull();

    expect(screen.getByText('Facultatif. 9 chiffres, sans espaces.')).toBeInTheDocument();
  });

  it('Test 3: a 4-digit SIREN shows error.field.siren.invalid and does not call the action', async () => {
    render(<CreateClientDialog lang="fr" />);
    await openDialog();

    fireEvent.change(screen.getByLabelText(/Nom de la société/), {
      target: { value: 'Dupont Menuiserie' },
    });
    fireEvent.change(screen.getByLabelText('SIREN'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer le client' }));

    await screen.findByText('SIREN invalide (9 chiffres requis).');
    expect(createClientRelationshipActionMock).not.toHaveBeenCalled();
  });

  it('Test 4: valid submit calls the action, toasts success, closes, and navigates', async () => {
    createClientRelationshipActionMock.mockResolvedValueOnce({ relationshipId: 'rel-99' });
    render(<CreateClientDialog lang="fr" />);
    await openDialog();

    fireEvent.change(screen.getByLabelText(/Nom de la société/), {
      target: { value: 'Dupont Menuiserie' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer le client' }));

    await waitFor(() => expect(createClientRelationshipActionMock).toHaveBeenCalledTimes(1));
    expect(toastSuccessMock).toHaveBeenCalledWith('Client créé.');
    expect(routerPushMock).toHaveBeenCalledWith('/clients/rel-99');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('Test 5: a rejected action fires the generic error toast and leaves the dialog open', async () => {
    createClientRelationshipActionMock.mockRejectedValueOnce(new Error('clients.toast.error'));
    render(<CreateClientDialog lang="fr" />);
    await openDialog();

    fireEvent.change(screen.getByLabelText(/Nom de la société/), {
      target: { value: 'Dupont Menuiserie' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer le client' }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.'),
    );
    expect(routerPushMock).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Test 6: no autocomplete/typeahead/lookup surface anywhere in the dialog', async () => {
    const { container } = render(<CreateClientDialog lang="fr" />);
    await openDialog();

    expect(container.querySelector('datalist')).toBeNull();
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(container.querySelector('[role="combobox"]')).toBeNull();
    const nameInput = screen.getByLabelText(/Nom de la société/);
    expect(nameInput.getAttribute('autocomplete')).toBe('off');
    const sirenInput = screen.getByLabelText('SIREN');
    expect(sirenInput.getAttribute('autocomplete')).toBe('off');
  });
});
