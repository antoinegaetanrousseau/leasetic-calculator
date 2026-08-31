/**
 * ParametresForm characterization tests.
 *
 * Written BEFORE the Phase 5 ReUI/Maia migration of this file, against the
 * pre-migration markup, so they describe behaviour that must survive it rather
 * than whatever the refactor happens to produce. The form had no coverage at
 * all: 754 lines carrying a password-change flow and the D-06c partial-success
 * matrix, where tsc/lint/build all pass a dropped `{...register()}` spread.
 *
 * Everything asserted here is behaviour or accessibility contract — control
 * bindings, aria-invalid, role="alert", the D-08 revokeOtherSessions
 * invariant, the D-06c matrix. Deliberately NOT asserted: inline styles,
 * padding, colours, or element tag names, all of which the migration changes
 * on purpose.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { updateUserMock, changePasswordMock, refreshMock, toastMock } = vi.hoisted(() => ({
  updateUserMock: vi.fn(),
  changePasswordMock: vi.fn(),
  refreshMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast: toastMock }));
vi.mock('@/lib/auth/client', () => ({
  authClient: {
    updateUser: (...args: unknown[]) => updateUserMock(...args),
    changePassword: (...args: unknown[]) => changePasswordMock(...args),
  },
}));

import { ParametresForm } from './ParametresForm';

const PROPS = {
  lang: 'fr' as const,
  initialFirstName: 'Antoine',
  initialLastName: 'Rousseau',
  initialEmail: 'antoine@leasetic.com',
  emailEditable: false,
};

const renderForm = (overrides: Partial<typeof PROPS> = {}) =>
  render(<ParametresForm {...PROPS} {...overrides} />);

/** RHF registers on change; fireEvent.change is what drives its state. */
const type = async (el: HTMLElement, value: string) => {
  await act(async () => {
    fireEvent.change(el, { target: { value } });
  });
};

const blur = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.blur(el);
  });
};

const firstNameInput = () => screen.getByLabelText('Prénom');
const lastNameInput = () => screen.getByLabelText('Nom');
const currentPwInput = () => screen.getByLabelText('Ancien mot de passe');
const newPwInput = () => screen.getByLabelText('Nouveau mot de passe');
const saveButton = () =>
  screen.getByRole('button', { name: 'Enregistrer les modifications' });

beforeEach(() => {
  updateUserMock.mockReset().mockResolvedValue({ error: null });
  changePasswordMock.mockReset().mockResolvedValue({ error: null });
  refreshMock.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ParametresForm', () => {
  // ── Control bindings ──────────────────────────────────────────────────────

  it('Test 1: identity inputs are labelled and seeded from props', () => {
    renderForm();
    expect((firstNameInput() as HTMLInputElement).value).toBe('Antoine');
    expect((lastNameInput() as HTMLInputElement).value).toBe('Rousseau');
  });

  it('Test 2: identity inputs are registered — typing reaches form state', async () => {
    renderForm();
    // If the {...register()} spread is dropped the input still renders and
    // still accepts text; only Save's dirty-gating reveals the broken binding.
    expect(saveButton()).toBeDisabled();
    await type(firstNameInput(), 'Marie');
    await waitFor(() => expect(saveButton()).not.toBeDisabled());
  });

  it('Test 3 (D-06d): email renders as static text plus the read-only notice', () => {
    const { container } = renderForm();
    expect(container.textContent).toContain('antoine@leasetic.com');
    // No editable email control in the read-only build.
    expect(
      container.querySelector('input[type="email"]'),
    ).toBeNull();
    expect(container.textContent).toMatch(/administrateur/i);
  });

  it('Test 4 (D-06d): the editable branch renders an email input instead', () => {
    const { container } = renderForm({ emailEditable: true });
    expect(container.querySelector('input[type="email"]')).not.toBeNull();
  });

  // ── Password visibility toggles ───────────────────────────────────────────

  it('Test 5: each password field has its own show/hide toggle', async () => {
    renderForm();
    expect((currentPwInput() as HTMLInputElement).type).toBe('password');
    expect((newPwInput() as HTMLInputElement).type).toBe('password');

    const toggles = screen.getAllByRole('button', {
      name: 'Afficher le mot de passe',
    });
    expect(toggles).toHaveLength(2);

    await act(async () => {
      fireEvent.click(toggles[0]);
    });
    // Only the first field flips — the toggles are independent.
    expect((currentPwInput() as HTMLInputElement).type).toBe('text');
    expect((newPwInput() as HTMLInputElement).type).toBe('password');
    expect(
      screen.getAllByRole('button', { name: 'Masquer le mot de passe' }),
    ).toHaveLength(1);
  });

  // ── Validation surfaces ───────────────────────────────────────────────────

  it('Test 6: clearing a required identity field marks it aria-invalid with an alert', async () => {
    renderForm();
    const first = firstNameInput();
    await type(first, '');
    await blur(first);

    await waitFor(() => {
      expect(first.getAttribute('aria-invalid')).toBe('true');
    });
    const alert = document.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert!.textContent).toContain('Champ requis.');
  });

  it('Test 7 (D-06c edge case): filling one password field errors the OTHER one', async () => {
    renderForm();
    await type(newPwInput(), 'NewPassword123!');
    await act(async () => {
      fireEvent.click(saveButton());
    });

    // The empty currentPassword gets the required.pair message — the section
    // must never be silently treated as untouched.
    await waitFor(() => {
      expect(currentPwInput().getAttribute('aria-invalid')).toBe('true');
    });
    const alerts = Array.from(document.querySelectorAll('[role="alert"]'));
    expect(
      alerts.some((a) =>
        /Champ requis pour modifier le mot de passe/i.test(a.textContent ?? ''),
      ),
    ).toBe(true);
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  // ── D-06c save matrix ─────────────────────────────────────────────────────

  it('Test 8: identity-only save calls updateUser with the joined name, not changePassword', async () => {
    renderForm();
    await type(firstNameInput(), 'Marie');
    await act(async () => {
      fireEvent.click(saveButton());
    });

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledTimes(1));
    expect(updateUserMock).toHaveBeenCalledWith({ name: 'Marie Rousseau' });
    expect(changePasswordMock).not.toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalled();
  });

  it('Test 9 (D-08): password save always sends revokeOtherSessions: true', async () => {
    renderForm();
    await type(currentPwInput(), 'OldPassword123!');
    await type(newPwInput(), 'NewPassword123!');
    await act(async () => {
      fireEvent.click(saveButton());
    });

    await waitFor(() => expect(changePasswordMock).toHaveBeenCalledTimes(1));
    expect(changePasswordMock).toHaveBeenCalledWith({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      revokeOtherSessions: true,
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it('Test 10 (Plr-9): INVALID_PASSWORD surfaces inline on the current-password field', async () => {
    changePasswordMock.mockResolvedValue({ error: { code: 'INVALID_PASSWORD' } });
    renderForm();
    await type(currentPwInput(), 'WrongPassword1!');
    await type(newPwInput(), 'NewPassword123!');
    await act(async () => {
      fireEvent.click(saveButton());
    });

    await waitFor(() => {
      const alerts = Array.from(document.querySelectorAll('[role="alert"]'));
      expect(
        alerts.some((a) =>
          /Ancien mot de passe incorrect/i.test(a.textContent ?? ''),
        ),
      ).toBe(true);
    });
    expect(currentPwInput().getAttribute('aria-invalid')).toBe('true');
  });

  it('Test 11: both sections dirty → identity runs before password', async () => {
    const order: string[] = [];
    updateUserMock.mockImplementation(async () => {
      order.push('identity');
      return { error: null };
    });
    changePasswordMock.mockImplementation(async () => {
      order.push('password');
      return { error: null };
    });

    renderForm();
    await type(firstNameInput(), 'Marie');
    await type(currentPwInput(), 'OldPassword123!');
    await type(newPwInput(), 'NewPassword123!');
    await act(async () => {
      fireEvent.click(saveButton());
    });

    await waitFor(() => expect(order).toEqual(['identity', 'password']));
  });

  // ── Save gating + cancel ──────────────────────────────────────────────────

  it('Test 12: Save is disabled until something is dirty, and Cancel resets', async () => {
    renderForm();
    expect(saveButton()).toBeDisabled();

    await type(firstNameInput(), 'Marie');
    await waitFor(() => expect(saveButton()).not.toBeDisabled());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    });
    await waitFor(() => {
      expect((firstNameInput() as HTMLInputElement).value).toBe('Antoine');
      expect(saveButton()).toBeDisabled();
    });
  });

  it('Test 13: a password value alone enables Save (passwordEitherFilled)', async () => {
    renderForm();
    expect(saveButton()).toBeDisabled();
    await type(newPwInput(), 'x');
    await waitFor(() => expect(saveButton()).not.toBeDisabled());
  });

  // ── Strength meter (Plr-3) ────────────────────────────────────────────────

  it('Test 14: the strength hint responds to the new password value', async () => {
    const { container } = renderForm();
    const before = container.textContent ?? '';
    await type(newPwInput(), 'Str0ng!Passw0rd#2026');
    await waitFor(() => {
      expect(container.textContent).not.toBe(before);
    });
  });
});
