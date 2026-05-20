/**
 * Plan 14-02 Task 2 — CreatePartnerForm client-component tests (RED → GREEN).
 *
 * Tests RHF + zodResolver onBlur validation, submit → server-action wiring,
 * InviteUrlModal mount on success, duplicate-error toast path, and the
 * char-counter behavior past 1000 chars.
 *
 * Coverage:
 *   - Test 3: blurring firstName empty → aria-invalid="true" + .error-msg
 *     containing the i18n key 'error.field.required' (which resolves to FR
 *     "Ce champ est requis.").
 *   - Test 4: happy-path submit calls createPartnerAction with full payload;
 *     on { ok: true, url, kind: 'invite' } mounts <InviteUrlModal>.
 *   - Test 5: server returns { ok: false, error: 'admin.accounts.modal.error.email.exists' }
 *     → toast.error fires with the duplicate-error key.
 *   - Test 6: textarea > 1000 chars → char counter has the danger color class
 *     AND textarea gets aria-invalid="true" after blur.
 *   - Test 7: cancel link has href=/<seg>/partners and the aria-label resolved
 *     from partners.new.cancel.aria.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/link', () => ({
  // Minimal Link shim: keep href + children pass-through.
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={typeof href === 'string' ? href : ''} {...rest}>
      {children}
    </a>
  ),
}));

const { routerPushMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock, replace: vi.fn() }),
}));
vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));
vi.mock('@/components/InviteUrlModal', () => ({
  InviteUrlModal: ({ url, kind, onClose }: { url: string; kind: string; onClose: () => void }) => (
    <div data-testid="invite-url-modal" data-url={url} data-kind={kind}>
      <button type="button" onClick={onClose} data-testid="invite-modal-close">
        close
      </button>
    </div>
  ),
}));

import { CreatePartnerForm } from './CreatePartnerForm';

const VALID = {
  firstName: 'Marie',
  lastName: 'Dupont',
  email: 'marie@example.com',
  companyName: 'Acme SAS',
  phone: '01 23 45 67 89',
};

function fillRequiredFields() {
  fireEvent.input(screen.getByLabelText(/Prénom/), { target: { value: VALID.firstName } });
  fireEvent.input(screen.getByLabelText(/^Nom/), { target: { value: VALID.lastName } });
  fireEvent.input(screen.getByLabelText(/^Email/), { target: { value: VALID.email } });
  fireEvent.input(screen.getByLabelText(/Société/), { target: { value: VALID.companyName } });
  fireEvent.input(screen.getByLabelText(/Téléphone/), { target: { value: VALID.phone } });
}

beforeEach(() => {
  routerPushMock.mockReset();
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CreatePartnerForm (D-07 + D-08 + UI-SPEC §5.1)', () => {
  it('Test 3: blurring firstName empty → aria-invalid="true" + .error-msg with FR required text', async () => {
    const createPartnerAction = vi.fn();
    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={createPartnerAction}
      />,
    );

    const firstNameInput = screen.getByLabelText(/Prénom/);
    fireEvent.focus(firstNameInput);
    fireEvent.blur(firstNameInput);

    await waitFor(() => {
      expect(firstNameInput.getAttribute('aria-invalid')).toBe('true');
    });
    // The error-msg appears with the FR-resolved text.
    await waitFor(() => {
      const err = document.querySelector('.error-msg');
      expect(err).not.toBeNull();
      expect(err!.textContent).toContain('Ce champ est requis.');
    });
  });

  it('Test 4: happy-path submit → calls createPartnerAction + mounts InviteUrlModal on ok:true', async () => {
    const createPartnerAction = vi.fn().mockResolvedValue({
      ok: true,
      url: 'https://app/invite/abc',
      kind: 'invite',
    });

    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={createPartnerAction}
      />,
    );

    fillRequiredFields();
    fireEvent.submit(screen.getByRole('button', { name: /Créer le partenaire/ }).closest('form')!);

    await waitFor(() => {
      expect(createPartnerAction).toHaveBeenCalledTimes(1);
    });
    const payload = createPartnerAction.mock.calls[0]![0];
    expect(payload.firstName).toBe(VALID.firstName);
    expect(payload.lastName).toBe(VALID.lastName);
    expect(payload.email).toBe(VALID.email);
    expect(payload.companyName).toBe(VALID.companyName);
    expect(payload.phone).toBe(VALID.phone);

    // Success toast fires + InviteUrlModal mounts with the returned URL.
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
      const modal = document.querySelector('[data-testid="invite-url-modal"]');
      expect(modal).not.toBeNull();
      expect(modal!.getAttribute('data-url')).toBe('https://app/invite/abc');
      expect(modal!.getAttribute('data-kind')).toBe('invite');
    });
  });

  it('Test 5: duplicate-email error → toast.error fires with partners.new.toast.error.duplicate FR copy', async () => {
    const createPartnerAction = vi.fn().mockResolvedValue({
      ok: false,
      error: 'admin.accounts.modal.error.email.exists',
    });

    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={createPartnerAction}
      />,
    );

    fillRequiredFields();
    fireEvent.submit(screen.getByRole('button', { name: /Créer le partenaire/ }).closest('form')!);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
    // The duplicate-error message (FR resolved) must be the one displayed.
    const msg = String(toastErrorMock.mock.calls[0]![0]);
    expect(msg).toMatch(/Un partenaire avec cet email existe déjà\./);
  });

  it('Test 6: textarea > 1000 chars → counter shows danger color AND textarea aria-invalid="true" after blur', async () => {
    const createPartnerAction = vi.fn();
    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={createPartnerAction}
      />,
    );

    const textarea = screen.getByLabelText(/Message d'invitation/);
    fireEvent.input(textarea, { target: { value: 'x'.repeat(1001) } });

    // Counter switches to danger color via inline style or class — the form
    // applies a `--danger` color via inline style on the counter span.
    await waitFor(() => {
      const counter = document.querySelector('[data-testid="char-counter"]');
      expect(counter).not.toBeNull();
      const style = counter!.getAttribute('style') ?? '';
      expect(style).toMatch(/var\(--danger\)/);
    });

    // Blur triggers RHF validation → aria-invalid on textarea.
    fireEvent.blur(textarea);
    await waitFor(() => {
      expect(textarea.getAttribute('aria-invalid')).toBe('true');
    });
  });

  it('Test 7: cancel link has href=/<seg>/partners and the aria-label resolved from partners.new.cancel.aria', () => {
    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={vi.fn()}
      />,
    );

    const cancelLink = Array.from(document.querySelectorAll('a')).find((a) =>
      (a.textContent ?? '').match(/Annuler/),
    );
    expect(cancelLink).toBeDefined();
    expect(cancelLink!.getAttribute('href')).toBe('/admin-secret/partners');
    expect(cancelLink!.getAttribute('aria-label')).toBe(
      'Annuler et retourner à la liste des partenaires',
    );
  });
});
