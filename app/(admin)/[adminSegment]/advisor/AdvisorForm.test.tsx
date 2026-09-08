/**
 * Phase 42 Plan 07 Task 2 — AdvisorForm client-component tests
 * (PROF-03 / D-06 / D-07 / D-08 / D-09).
 *
 * Coverage (matches the plan's <behavior> block verbatim):
 *   - Test 1: prefill from `initial`
 *   - Test 2: `initial={null}` renders 4 empty inputs, no throw
 *   - Test 3: blank-field submit surfaces error.field.required + does NOT
 *     call adminUpdateAdvisor
 *   - Test 4: valid submit calls adminUpdateAdvisor once with all 4 values
 *   - Test 5: success toast on { ok: true }
 *   - Test 6: error toast on { ok: false }
 *   - Test 7: Annuler after edits restores `initial` values, no navigation
 *   - Test 8: all four labels render a required asterisk
 *
 * Mocks `adminUpdateAdvisor` (module import, per the plan's read_first note)
 * and `sonner`'s `toast`, the same shape `CreatePartnerForm.test.tsx` uses
 * for its own action + toast mocks.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { LeaseticAdvisorRow } from '@/db/schema';

const { adminUpdateAdvisorMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  adminUpdateAdvisorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/lib/admin/advisor-actions', () => ({
  adminUpdateAdvisor: adminUpdateAdvisorMock,
}));
vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

import { AdvisorForm } from './AdvisorForm';

const FILLED: LeaseticAdvisorRow = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Marie Durand',
  fonction: 'Chargée de clientèle',
  telephone: '0612345678',
  email: 'm@leasetic.fr',
  updatedAt: new Date('2026-09-01T00:00:00Z'),
  updatedBy: null,
};

beforeEach(() => {
  adminUpdateAdvisorMock.mockReset();
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdvisorForm (PROF-03 / D-07 / D-08 / D-09)', () => {
  it('Test 1: prefills all four inputs from `initial`', () => {
    render(<AdvisorForm lang="fr" initial={FILLED} />);

    expect((screen.getByLabelText(/^Nom/) as HTMLInputElement).value).toBe('Marie Durand');
    expect((screen.getByLabelText(/^Fonction/) as HTMLInputElement).value).toBe(
      'Chargée de clientèle',
    );
    expect((screen.getByLabelText(/^Téléphone/) as HTMLInputElement).value).toBe('0612345678');
    expect((screen.getByLabelText(/^Email/) as HTMLInputElement).value).toBe('m@leasetic.fr');
  });

  it('Test 2: `initial={null}` renders four empty inputs and does not throw', () => {
    expect(() => render(<AdvisorForm lang="fr" initial={null} />)).not.toThrow();

    expect((screen.getByLabelText(/^Nom/) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/^Fonction/) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/^Téléphone/) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/^Email/) as HTMLInputElement).value).toBe('');
  });

  it('Test 3: submitting with a blank field surfaces error.field.required and does NOT call adminUpdateAdvisor', async () => {
    render(<AdvisorForm lang="fr" initial={null} />);

    // Fill every field EXCEPT fonction, then submit.
    fireEvent.input(screen.getByLabelText(/^Nom/), { target: { value: 'Marie Durand' } });
    fireEvent.input(screen.getByLabelText(/^Téléphone/), { target: { value: '0612345678' } });
    fireEvent.input(screen.getByLabelText(/^Email/), { target: { value: 'm@leasetic.fr' } });

    fireEvent.submit(screen.getByRole('button', { name: /Enregistrer le profil/ }).closest('form')!);

    await waitFor(() => {
      const err = document.querySelector('[role="alert"]');
      expect(err).not.toBeNull();
      expect(err!.textContent).toContain('Ce champ est requis.');
    });
    expect(adminUpdateAdvisorMock).not.toHaveBeenCalled();
  });

  it('Test 4 + 5: valid submit calls adminUpdateAdvisor once with all four values and shows the saved toast', async () => {
    adminUpdateAdvisorMock.mockResolvedValue({ ok: true });

    render(<AdvisorForm lang="fr" initial={null} />);

    fireEvent.input(screen.getByLabelText(/^Nom/), { target: { value: 'Marie Durand' } });
    fireEvent.input(screen.getByLabelText(/^Fonction/), {
      target: { value: 'Chargée de clientèle' },
    });
    fireEvent.input(screen.getByLabelText(/^Téléphone/), { target: { value: '0612345678' } });
    fireEvent.input(screen.getByLabelText(/^Email/), { target: { value: 'm@leasetic.fr' } });

    fireEvent.submit(screen.getByRole('button', { name: /Enregistrer le profil/ }).closest('form')!);

    await waitFor(() => {
      expect(adminUpdateAdvisorMock).toHaveBeenCalledTimes(1);
    });
    const payload = adminUpdateAdvisorMock.mock.calls[0]![0];
    expect(payload.name).toBe('Marie Durand');
    expect(payload.fonction).toBe('Chargée de clientèle');
    expect(payload.telephone).toBe('06 12 34 56 78'); // PhoneInput auto-formats.
    expect(payload.email).toBe('m@leasetic.fr');

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });

  it('Test 6: a failed save shows the error toast', async () => {
    adminUpdateAdvisorMock.mockResolvedValue({ ok: false, error: 'admin.advisor.error.save' });

    render(<AdvisorForm lang="fr" initial={null} />);

    fireEvent.input(screen.getByLabelText(/^Nom/), { target: { value: 'Marie Durand' } });
    fireEvent.input(screen.getByLabelText(/^Fonction/), {
      target: { value: 'Chargée de clientèle' },
    });
    fireEvent.input(screen.getByLabelText(/^Téléphone/), { target: { value: '0612345678' } });
    fireEvent.input(screen.getByLabelText(/^Email/), { target: { value: 'm@leasetic.fr' } });

    fireEvent.submit(screen.getByRole('button', { name: /Enregistrer le profil/ }).closest('form')!);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
    // The bounded fallback key renders — the action's own error string is
    // never echoed into the toast.
    const msg = String(toastErrorMock.mock.calls[0]![0]);
    expect(msg).toBe('Une erreur est survenue. Réessayez.');
  });

  it('Test 7: clicking Annuler after edits restores the initial values and does not navigate', () => {
    render(<AdvisorForm lang="fr" initial={FILLED} />);

    fireEvent.input(screen.getByLabelText(/^Nom/), { target: { value: 'Someone Else' } });
    expect((screen.getByLabelText(/^Nom/) as HTMLInputElement).value).toBe('Someone Else');

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect((screen.getByLabelText(/^Nom/) as HTMLInputElement).value).toBe('Marie Durand');
    expect((screen.getByLabelText(/^Fonction/) as HTMLInputElement).value).toBe(
      'Chargée de clientèle',
    );
    expect((screen.getByLabelText(/^Téléphone/) as HTMLInputElement).value).toBe('0612345678');
    expect((screen.getByLabelText(/^Email/) as HTMLInputElement).value).toBe('m@leasetic.fr');

    // Cancel never calls the save action or navigates anywhere — this is a
    // singleton page with no router usage at all.
    expect(adminUpdateAdvisorMock).not.toHaveBeenCalled();
  });

  it('Test 8: all four labels render a required asterisk', () => {
    render(<AdvisorForm lang="fr" initial={null} />);

    for (const forId of ['advf-name', 'advf-fonction', 'advf-telephone', 'advf-email']) {
      const label = document.querySelector(`label[for="${forId}"]`);
      expect(label).not.toBeNull();
      expect(label!.textContent).toContain('*');
    }
  });
});
