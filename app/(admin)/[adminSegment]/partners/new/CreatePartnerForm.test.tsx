/**
 * Plan 14-02 Task 2 — CreatePartnerForm client-component tests (RED → GREEN).
 * Plan 18-04 Task 1 — extended with D-15/D-16/D-17/D-18 behaviors.
 *
 * Tests RHF + zodResolver onBlur validation, submit → server-action wiring,
 * InviteUrlModal mount on success, duplicate-error toast path, and the
 * char-counter behavior past 1000 chars (Phase 14 carry).
 *
 * Phase 18 additions:
 *   - D-15 action card separation (form card + action card siblings)
 *   - D-15 submit label = t('admin.partners.form.submit') = "Envoyer l'invitation →"
 *   - D-15 submit spinner = t('admin.partners.form.submit.spinner') = "Envoi en cours…"
 *   - D-16 inline error state: aria-invalid + aria-describedby + red border via .invalid
 *     (global CSS rule `input[aria-invalid="true"] { border-color: var(--danger) }`)
 *   - D-18 dirty-form confirm dialog on Annuler (window.confirm baseline)
 *
 * Coverage (Phase 18 numbering matches 18-04 PLAN.md):
 *   - Test 3 (Phase 14): blurring firstName empty → aria-invalid="true" + .error-msg
 *   - Test 4 (Phase 14): happy-path submit → action call + InviteUrlModal mounts (D-17)
 *   - Test 5 (Phase 14): duplicate-email → toast.error with duplicate FR copy
 *   - Test 6 (Phase 14): textarea > 1000 chars → counter danger color + aria-invalid
 *   - Test 7 (Phase 14): cancel control points back to /partners list
 *   - Test 8 (18-04 D-15): rendered structure has form card + action card siblings
 *   - Test 9 (18-04 D-15): submit button label = "Envoyer l'invitation →"
 *   - Test 10 (18-04 D-15): submitting state shows "Envoi en cours…" spinner copy
 *   - Test 11 (18-04 D-16): invalid email blur → red border (.invalid) + aria-invalid + aria-describedby + error <p>
 *   - Test 12 (18-04 D-18): clean form Annuler → no confirm, navigates to /partners
 *   - Test 13 (18-04 D-18): dirty form Annuler → confirm dialog opens with FR copy
 *   - Test 14 (18-04 D-18): confirm OK → router.push to /partners
 *   - Test 15 (18-04 D-18): confirm cancel → stays on form, no navigation
 *   - Test 16 (18-04 D-16): server-action error → toast.error fires with generic copy
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
  vi.unstubAllGlobals();
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

  it('Test 4: happy-path submit → calls createPartnerAction + mounts InviteUrlModal on ok:true (D-17 unchanged)', async () => {
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
    // D-15: submit button label is now "Envoyer l'invitation →"
    fireEvent.submit(screen.getByRole('button', { name: /Envoyer l'invitation/ }).closest('form')!);

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
    fireEvent.submit(screen.getByRole('button', { name: /Envoyer l'invitation/ }).closest('form')!);

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

    // Counter switches to danger color via inline style.
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

  it('Test 7: cancel control points back to /<seg>/partners (Phase 14 path; D-18 wires button onClick in Phase 18)', () => {
    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={vi.fn()}
      />,
    );

    // Phase 18 D-15/D-18 — Annuler is now a <button type="button"> (not a <Link>)
    // so it can run the dirty-form confirm gate before navigating. The
    // destination (/<seg>/partners) is verified via Test 12 (router.push).
    const cancelButton = screen.getByRole('button', { name: /Annuler/ });
    expect(cancelButton).toBeDefined();
    expect(cancelButton.getAttribute('type')).toBe('button');
  });

  // ─── Phase 18 Plan 04 additions (D-15 / D-16 / D-18) ──────────────────────

  it('Test 8 (D-15): rendered structure exposes TWO sibling .card elements (form card + action card)', () => {
    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={vi.fn()}
      />,
    );

    // Both cards must live INSIDE the same <form> per D-15 contract (action
    // card is a separate visual block but still part of the form submission).
    const form = document.querySelector('form');
    expect(form).not.toBeNull();
    const cardsInForm = form!.querySelectorAll('.card');
    expect(cardsInForm.length).toBeGreaterThanOrEqual(2);

    // Action card sits BELOW the form card (DOM order = visual order).
    const cards = Array.from(cardsInForm);
    const formCard = cards[0]!;
    const actionCard = cards[cards.length - 1]!;
    expect(formCard).not.toBe(actionCard);

    // Action card layout per D-15: marginTop:16 + flex justifyContent space-between.
    const actionCardStyle = actionCard.getAttribute('style') ?? '';
    expect(actionCardStyle).toMatch(/margin-top:\s*16px/);
    expect(actionCardStyle).toMatch(/justify-content:\s*space-between/);

    // Action card contains BOTH buttons.
    const annulerInAction = actionCard.querySelector('button[type="button"]');
    expect(annulerInAction).not.toBeNull();
    expect(annulerInAction!.textContent).toMatch(/Annuler/);
    const submitInAction = actionCard.querySelector('button[type="submit"]');
    expect(submitInAction).not.toBeNull();
  });

  it('Test 9 (D-15): submit button label uses t(admin.partners.form.submit) = "Envoyer l\'invitation →"', () => {
    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={vi.fn()}
      />,
    );
    // Submit copy comes from the NEW key admin.partners.form.submit (Phase 18-01).
    const btn = screen.getByRole('button', { name: /Envoyer l'invitation/ });
    expect(btn).toBeDefined();
    expect(btn.getAttribute('type')).toBe('submit');
    expect(btn.textContent).toContain("Envoyer l'invitation");
  });

  it('Test 10 (D-15): while submitting → button shows t(admin.partners.form.submit.spinner) = "Envoi en cours…"', async () => {
    // Hold the promise open so we observe the in-flight state.
    let resolveAction: (v: { ok: true; url: string; kind: 'invite' }) => void = () => undefined;
    const pending = new Promise<{ ok: true; url: string; kind: 'invite' }>((r) => {
      resolveAction = r;
    });
    const createPartnerAction = vi.fn().mockReturnValue(pending);

    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={createPartnerAction}
      />,
    );

    fillRequiredFields();
    fireEvent.submit(screen.getByRole('button', { name: /Envoyer l'invitation/ }).closest('form')!);

    // During in-flight state the button text switches to the spinner copy.
    await waitFor(() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      expect(submitBtn!.textContent).toContain('Envoi en cours');
    });

    // Resolve so test cleanup doesn't leak.
    resolveAction({ ok: true, url: 'https://app/invite/x', kind: 'invite' });
    await waitFor(() => expect(createPartnerAction).toHaveBeenCalled());
  });

  it('Test 11 (D-16): invalid email blur → input.invalid + aria-invalid + aria-describedby + sibling error <p>', async () => {
    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={vi.fn()}
      />,
    );

    const emailInput = screen.getByLabelText(/^Email/);
    // Type a syntactically invalid email so the Zod email() check fires.
    fireEvent.input(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(emailInput.getAttribute('aria-invalid')).toBe('true');
    });

    // D-16: input gets the .invalid class (which the global CSS rule maps to
    // border-color: var(--danger) — global CSS rule `input.invalid` covers it).
    expect(emailInput.className).toMatch(/\binvalid\b/);

    // D-16: aria-describedby points at the error <p>.
    const describedBy = emailInput.getAttribute('aria-describedby');
    expect(describedBy).toBe('cpf-email-error');
    const errorP = document.getElementById('cpf-email-error');
    expect(errorP).not.toBeNull();
    expect(errorP!.tagName).toBe('P');
    // Error text rendered via t() — FR "Format d'email invalide." per existing key.
    expect(errorP!.textContent).toMatch(/email/i);
  });

  it('Test 12 (D-18): clean form Annuler → NO confirm dialog, immediate navigate to /<seg>/partners', () => {
    const confirmSpy = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirmSpy);

    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={vi.fn()}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /Annuler/ });
    fireEvent.click(cancelBtn);

    // Clean form → confirm() NEVER called.
    expect(confirmSpy).not.toHaveBeenCalled();
    // Navigation happens immediately.
    expect(routerPushMock).toHaveBeenCalledWith('/admin-secret/partners');
  });

  it('Test 13 (D-18): dirty form Annuler → confirm() opens with FR "non enregistrés. Continuer ?" copy', () => {
    const confirmSpy = vi.fn().mockReturnValue(false);
    vi.stubGlobal('confirm', confirmSpy);

    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={vi.fn()}
      />,
    );

    // Dirty the form — typing into ANY registered field flips RHF isDirty true.
    fireEvent.input(screen.getByLabelText(/Prénom/), { target: { value: 'Marie' } });

    const cancelBtn = screen.getByRole('button', { name: /Annuler/ });
    fireEvent.click(cancelBtn);

    // Confirm dialog opened with the FR copy from admin.partners.form.cancel.confirm.
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const msg = String(confirmSpy.mock.calls[0]![0]);
    expect(msg).toContain('non enregistrés');
    expect(msg).toContain('Continuer');
  });

  it('Test 14 (D-18): dirty form + confirm OK → router.push to /<seg>/partners', () => {
    const confirmSpy = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirmSpy);

    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={vi.fn()}
      />,
    );

    fireEvent.input(screen.getByLabelText(/Prénom/), { target: { value: 'Marie' } });
    fireEvent.click(screen.getByRole('button', { name: /Annuler/ }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(routerPushMock).toHaveBeenCalledWith('/admin-secret/partners');
  });

  it('Test 15 (D-18): dirty form + confirm cancel → stays on form, no navigation', () => {
    const confirmSpy = vi.fn().mockReturnValue(false);
    vi.stubGlobal('confirm', confirmSpy);

    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={vi.fn()}
      />,
    );

    fireEvent.input(screen.getByLabelText(/Prénom/), { target: { value: 'Marie' } });
    fireEvent.click(screen.getByRole('button', { name: /Annuler/ }));

    expect(confirmSpy).toHaveBeenCalled();
    // No navigation when user declined the confirm.
    expect(routerPushMock).not.toHaveBeenCalled();

    // Form still mounted with the typed value preserved (no reset on cancel-cancel).
    const firstName = screen.getByLabelText(/Prénom/) as HTMLInputElement;
    expect(firstName.value).toBe('Marie');
  });

  it('Test 16 (D-16): server-action returns generic error → toast.error fires with partners.new.toast.error FR copy', async () => {
    const createPartnerAction = vi.fn().mockResolvedValue({
      ok: false,
      error: 'internal_server_error',
    });

    render(
      <CreatePartnerForm
        lang="fr"
        adminSegment="admin-secret"
        createPartnerAction={createPartnerAction}
      />,
    );

    fillRequiredFields();
    fireEvent.submit(screen.getByRole('button', { name: /Envoyer l'invitation/ }).closest('form')!);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
    const msg = String(toastErrorMock.mock.calls[0]![0]);
    // Generic error toast — FR "Erreur lors de la création. Réessayez."
    expect(msg).toMatch(/Erreur lors de la création/);
  });
});
