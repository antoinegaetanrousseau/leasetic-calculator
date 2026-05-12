import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WizardActionBar } from './WizardActionBar';

// Mock sonner.toast so we can assert which variant fires after onSaveDraft
// resolves/rejects without rendering the real Toaster.
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from 'sonner';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('WizardActionBar', () => {
  // Helper to build a primary CTA spec quickly.
  const linkPrimary = { kind: 'link' as const, href: '/proposals/new/calcul', label: 'Continuer →' };
  const actionPrimary = (overrides: Partial<{ isSubmitting: boolean; onClick: () => void }> = {}) =>
    ({
      kind: 'action' as const,
      onClick: overrides.onClick ?? vi.fn(),
      label: 'Confirmer & Générer le PDF',
      spinnerLabel: 'Génération en cours…',
      isSubmitting: overrides.isSubmitting ?? false,
    }) as const;

  it('AC-WAB-01: renders Précédent link with aria-label "Étape précédente" when currentStep === 2', () => {
    render(
      <WizardActionBar
        currentStep={2}
        draftId="abc-123"
        onSaveDraft={async () => {}}
        primary={linkPrimary}
        lang="fr"
      />,
    );
    expect(screen.getByLabelText(/étape précédente/i)).toBeInTheDocument();
  });

  it('AC-WAB-02: omits Précédent link when currentStep === 1', () => {
    render(
      <WizardActionBar
        currentStep={1}
        draftId="abc-123"
        onSaveDraft={async () => {}}
        primary={linkPrimary}
        lang="fr"
      />,
    );
    expect(screen.queryByLabelText(/étape précédente/i)).not.toBeInTheDocument();
  });

  it('AC-WAB-03: renders primary CTA as anchor (Link) when primary.kind === "link"', () => {
    render(
      <WizardActionBar
        currentStep={1}
        draftId="abc-123"
        onSaveDraft={async () => {}}
        primary={linkPrimary}
        lang="fr"
      />,
    );
    // The link CTA should be an <a> with the configured href.
    const cta = screen.getByRole('link', { name: /continuer/i });
    expect(cta.tagName).toBe('A');
    expect(cta).toHaveAttribute('href', '/proposals/new/calcul');
  });

  it('AC-WAB-04: renders primary CTA as <button> when primary.kind === "action"', () => {
    render(
      <WizardActionBar
        currentStep={3}
        draftId="abc-123"
        onSaveDraft={async () => {}}
        primary={actionPrimary()}
        lang="fr"
      />,
    );
    const cta = screen.getByRole('button', { name: /confirmer.*générer le pdf/i });
    expect(cta.tagName).toBe('BUTTON');
  });

  it('AC-WAB-05: shows Loader2 SVG + spinnerLabel + aria-busy=true when action.isSubmitting === true (D-24)', () => {
    render(
      <WizardActionBar
        currentStep={3}
        draftId="abc-123"
        onSaveDraft={async () => {}}
        primary={actionPrimary({ isSubmitting: true })}
        lang="fr"
      />,
    );
    const cta = screen.getByRole('button', { name: /génération en cours/i });
    expect(cta).toHaveAttribute('aria-busy', 'true');
    expect(cta).toBeDisabled();
    // Loader2 from lucide-react renders an <svg>; the CTA must contain it.
    expect(cta.querySelector('svg')).not.toBeNull();
    expect(cta.textContent).toContain('Génération en cours');
  });

  it('AC-WAB-06: calls onSaveDraft when "Enregistrer comme brouillon" is clicked', async () => {
    const onSaveDraft = vi.fn(async () => {});
    render(
      <WizardActionBar
        currentStep={1}
        draftId="abc-123"
        onSaveDraft={onSaveDraft}
        primary={linkPrimary}
        lang="fr"
      />,
    );
    const saveBtn = screen.getByRole('button', { name: /enregistrer comme brouillon/i });
    fireEvent.click(saveBtn);
    await waitFor(() => expect(onSaveDraft).toHaveBeenCalledTimes(1));
  });

  it('AC-WAB-07: disables save button while save-action is pending (useTransition)', async () => {
    let resolveSave: () => void = () => {};
    const onSaveDraft = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    render(
      <WizardActionBar
        currentStep={1}
        draftId="abc-123"
        onSaveDraft={onSaveDraft}
        primary={linkPrimary}
        lang="fr"
      />,
    );
    const saveBtn = screen.getByRole('button', { name: /enregistrer comme brouillon/i });
    fireEvent.click(saveBtn);
    await waitFor(() => expect(saveBtn).toBeDisabled());
    // Cleanup the suspended promise so React doesn't warn.
    resolveSave();
  });

  it('AC-WAB-08: shows success toast after onSaveDraft resolves (sonner.toast.success)', async () => {
    const onSaveDraft = vi.fn(async () => {});
    render(
      <WizardActionBar
        currentStep={1}
        draftId="abc-123"
        onSaveDraft={onSaveDraft}
        primary={linkPrimary}
        lang="fr"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /enregistrer comme brouillon/i }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Brouillon enregistré ✓'),
    );
  });

  it('AC-WAB-09: shows error toast after onSaveDraft throws (sonner.toast.error)', async () => {
    const onSaveDraft = vi.fn(async () => {
      throw new Error('boom');
    });
    render(
      <WizardActionBar
        currentStep={1}
        draftId="abc-123"
        onSaveDraft={onSaveDraft}
        primary={linkPrimary}
        lang="fr"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /enregistrer comme brouillon/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'enregistrement. Réessayez."),
    );
  });
});
