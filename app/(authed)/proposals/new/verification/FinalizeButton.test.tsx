/**
 * Plan 13-05 Task 1 — FinalizeButton tests (RED → GREEN).
 *
 * 8 assertions per PLAN.md `<behavior>` block. Strategy:
 *   - Mock `next/navigation` useRouter (capture push calls).
 *   - Mock `sonner` toast (capture success/error calls).
 *   - Mock `global.fetch` for the /api/proposals/finalize POST.
 *   - The WizardActionBar is NOT mocked — we render it real to verify the
 *     primary CTA wiring (label / spinner morph / aria-busy / onClick fires).
 *
 * Coverage:
 *   - Test 1: renders WizardActionBar with currentStep=3, primary.kind='action'
 *     + label = "Confirmer & Générer le PDF" (FR)
 *   - Test 2: spinner label = "Génération en cours…" surfaces during submit
 *   - Test 3: clicking the primary CTA fires POST /api/proposals/finalize with
 *     body { draftId: <prop value> } and Content-Type: application/json
 *   - Test 4: during the in-flight fetch, the button is aria-busy=true and disabled
 *   - Test 5: 200 response with { id: 'new-id' } → router.push('/proposals/new-id')
 *     + toast.success(<fr key>)
 *   - Test 6: 500 response → CTA re-enables; toast.error with 5s duration
 *   - Test 7: fetch throws (network error) → toast.error + CTA re-enables
 *   - Test 8: onSaveDraft prop is invoked when the "Enregistrer comme brouillon"
 *     ghost button is clicked (bound server-action wrapper from parent)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const {
  routerPushMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

// Import AFTER all mocks are in place.
import { FinalizeButton } from './FinalizeButton';

const ORIGINAL_FETCH = global.fetch;

beforeEach(() => {
  routerPushMock.mockReset();
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  global.fetch = ORIGINAL_FETCH;
});

const noopSave = async () => {};

describe('FinalizeButton (Plan 13-05 Task 1 — D-16 / D-24)', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Test 1 — primary CTA label
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 1: renders WizardActionBar with primary CTA label "Confirmer & Générer le PDF" (FR)', () => {
    render(
      <FinalizeButton
        draftId="d-1"
        onSaveDraft={noopSave}
        lang="fr"
      />,
    );
    expect(
      screen.getByRole('button', { name: /Confirmer & Générer le PDF/ }),
    ).toBeTruthy();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2 — spinner label morphs during in-flight submit
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 2: while finalize is in flight, primary CTA label morphs to "Génération en cours…"', async () => {
    // Build a fetch promise we can resolve manually so the in-flight state
    // is observable.
    let resolveFetch: (v: Response) => void = () => {};
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    global.fetch = vi.fn(() => pendingResponse) as unknown as typeof fetch;

    render(
      <FinalizeButton draftId="d-1" onSaveDraft={noopSave} lang="fr" />,
    );

    const cta = screen.getByRole('button', {
      name: /Confirmer & Générer le PDF/,
    });
    await act(async () => {
      fireEvent.click(cta);
    });

    // Now in flight → label morphed.
    expect(
      screen.getByRole('button', { name: /Génération en cours…/ }),
    ).toBeTruthy();

    // Drain the pending fetch to keep the test clean.
    await act(async () => {
      resolveFetch(
        new Response(JSON.stringify({ id: 'p-1' }), { status: 200 }),
      );
      await pendingResponse;
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 3 — onClick POSTs to /api/proposals/finalize with the right body
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 3: clicking the primary CTA fires POST /api/proposals/finalize with body { draftId }', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: 'p-new' }), { status: 200 }),
    ) as unknown as typeof fetch;
    global.fetch = fetchMock;

    render(
      <FinalizeButton draftId="d-42" onSaveDraft={noopSave} lang="fr" />,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Confirmer & Générer le PDF/ }),
      );
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const callArgs = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(callArgs[0]).toBe('/api/proposals/finalize');
    const init = callArgs[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(
      (init.headers as Record<string, string>)['Content-Type'],
    ).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ draftId: 'd-42' });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 4 — in-flight aria-busy/disabled
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 4: during the in-flight fetch, primary CTA is aria-busy=true and disabled', async () => {
    let resolveFetch: (v: Response) => void = () => {};
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    global.fetch = vi.fn(() => pendingResponse) as unknown as typeof fetch;

    render(
      <FinalizeButton draftId="d-1" onSaveDraft={noopSave} lang="fr" />,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Confirmer & Générer le PDF/ }),
      );
    });

    const ctaWhileBusy = screen.getByRole('button', {
      name: /Génération en cours…/,
    });
    expect(ctaWhileBusy.getAttribute('aria-busy')).toBe('true');
    expect((ctaWhileBusy as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      resolveFetch(
        new Response(JSON.stringify({ id: 'p-1' }), { status: 200 }),
      );
      await pendingResponse;
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 5 — 200 success → router.push + toast.success
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 5: 200 response { id: "p-99" } → router.push("/proposals/p-99") + toast.success(wizard.toast.finalize.success)', async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ id: 'p-99' }), { status: 200 }),
    ) as unknown as typeof fetch;

    render(
      <FinalizeButton draftId="d-1" onSaveDraft={noopSave} lang="fr" />,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Confirmer & Générer le PDF/ }),
      );
    });

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith('/proposals/p-99');
    });
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock.mock.calls[0][0]).toBe('Proposition générée ✓');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 6 — 500 error → toast.error (5s duration) + CTA re-enables
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 6: 500 response → toast.error(wizard.toast.finalize.error, duration: 5000) + CTA re-enables', async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'FinalizeFailed' }), {
        status: 500,
      }),
    ) as unknown as typeof fetch;

    render(
      <FinalizeButton draftId="d-1" onSaveDraft={noopSave} lang="fr" />,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Confirmer & Générer le PDF/ }),
      );
    });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });
    expect(toastErrorMock.mock.calls[0][0]).toBe(
      'Erreur lors de la génération. Réessayez.',
    );
    // UI-SPEC §7.10 — error toast has duration: 5000.
    expect(toastErrorMock.mock.calls[0][1]).toMatchObject({ duration: 5000 });
    // CTA re-enables (label back to default, not the spinner label).
    const cta = screen.getByRole('button', {
      name: /Confirmer & Générer le PDF/,
    });
    expect((cta as HTMLButtonElement).disabled).toBe(false);
    expect(cta.getAttribute('aria-busy')).not.toBe('true');
    // No navigation on failure.
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 7 — fetch throws (network error) → same error path
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 7: fetch throws (network error) → toast.error + CTA re-enables', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('Network down');
    }) as unknown as typeof fetch;

    render(
      <FinalizeButton draftId="d-1" onSaveDraft={noopSave} lang="fr" />,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Confirmer & Générer le PDF/ }),
      );
    });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });
    expect(toastErrorMock.mock.calls[0][0]).toBe(
      'Erreur lors de la génération. Réessayez.',
    );
    const cta = screen.getByRole('button', {
      name: /Confirmer & Générer le PDF/,
    });
    expect((cta as HTMLButtonElement).disabled).toBe(false);
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 8 — onSaveDraft prop wired through to the ghost button
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 8: onSaveDraft prop is invoked when the "Enregistrer comme brouillon" ghost button is clicked', async () => {
    const onSaveDraft = vi.fn(async () => {});
    render(
      <FinalizeButton draftId="d-1" onSaveDraft={onSaveDraft} lang="fr" />,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Enregistrer comme brouillon/ }),
      );
    });

    await waitFor(() => expect(onSaveDraft).toHaveBeenCalledTimes(1));
  });
});

describe('FinalizeButton — Phase 42 bounded-code branches (D-05 / D-18)', () => {
  it('1: a 200 response behaves exactly as today — success toast then router.push', async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ id: 'p-99' }), { status: 200 }),
    ) as unknown as typeof fetch;

    render(<FinalizeButton draftId="d-1" onSaveDraft={noopSave} lang="fr" />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Confirmer & Générer le PDF/ }),
      );
    });

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith('/proposals/p-99');
    });
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);
  });

  it('2: a MissingPartnerTelephone failure opens the dialog, resets isSubmitting, and shows NO toast', async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'MissingPartnerTelephone' }), {
        status: 500,
      }),
    ) as unknown as typeof fetch;

    render(<FinalizeButton draftId="d-1" onSaveDraft={noopSave} lang="fr" />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Confirmer & Générer le PDF/ }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Coordonnées manquantes')).toBeTruthy();
    });
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(toastSuccessMock).not.toHaveBeenCalled();
    // The background CTA is now behind the open modal (aria-hidden/inert per
    // Base UI's Dialog) — pass `hidden: true` to still locate it in the DOM.
    const cta = screen.getByRole('button', {
      name: /Confirmer & Générer le PDF/,
      hidden: true,
    });
    expect((cta as HTMLButtonElement).disabled).toBe(false);
  });

  it('3: the dialog title/body come from the dictionary and the primary action links to /parametres', async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'MissingPartnerTelephone' }), {
        status: 500,
      }),
    ) as unknown as typeof fetch;

    render(<FinalizeButton draftId="d-1" onSaveDraft={noopSave} lang="fr" />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Confirmer & Générer le PDF/ }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Coordonnées manquantes')).toBeTruthy();
    });
    expect(
      screen.getByText(
        'Votre numéro de téléphone doit être renseigné avant de finaliser une proposition. Ajoutez-le dans vos paramètres.',
      ),
    ).toBeTruthy();
    const cta = screen.getByRole('link', { name: 'Aller à Paramètres' });
    expect(cta.getAttribute('href')).toBe('/parametres');
  });

  it('4: dismissing the dialog closes it and performs no navigation', async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'MissingPartnerTelephone' }), {
        status: 500,
      }),
    ) as unknown as typeof fetch;

    render(<FinalizeButton draftId="d-1" onSaveDraft={noopSave} lang="fr" />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Confirmer & Générer le PDF/ }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Coordonnées manquantes')).toBeTruthy();
    });

    // Two "Fermer" buttons exist: the dialog's built-in icon-only close (X,
    // accessible name from common.close.aria) plus our own footer dismiss
    // button — the footer dismiss renders first (it's part of `children`;
    // the icon close is appended after).
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Fermer' })[0]);
    });

    await waitFor(() => {
      expect(screen.queryByText('Coordonnées manquantes')).toBeNull();
    });
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it('5: a LegacyDraftIncomplete failure shows the legacy toast and redirects to step 1 (NOT the dialog)', async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'LegacyDraftIncomplete' }), {
        status: 500,
      }),
    ) as unknown as typeof fetch;

    render(<FinalizeButton draftId="d-legacy" onSaveDraft={noopSave} lang="fr" />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Confirmer & Générer le PDF/ }),
      );
    });

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith(
        '/proposals/new/parametres?draft_id=d-legacy',
      );
    });
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock.mock.calls[0][0]).toBe(
      "Ce brouillon a été créé avant l'ajout du SIRET. Complétez l'étape 1 pour finaliser.",
    );
    expect(screen.queryByText('Coordonnées manquantes')).toBeNull();
  });

  it('6: a non-JSON error body still produces the generic toast', async () => {
    global.fetch = vi.fn(async () => {
      const res = new Response('not json', { status: 500 });
      return res;
    }) as unknown as typeof fetch;

    render(<FinalizeButton draftId="d-1" onSaveDraft={noopSave} lang="fr" />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Confirmer & Générer le PDF/ }),
      );
    });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });
    expect(toastErrorMock.mock.calls[0][0]).toBe(
      'Erreur lors de la génération. Réessayez.',
    );
    expect(screen.queryByText('Coordonnées manquantes')).toBeNull();
  });

  it('7: an unrecognized bounded error code still produces the generic toast (no dialog, no legacy redirect)', async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'FinalizeFailed' }), {
        status: 500,
      }),
    ) as unknown as typeof fetch;

    render(<FinalizeButton draftId="d-1" onSaveDraft={noopSave} lang="fr" />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Confirmer & Générer le PDF/ }),
      );
    });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });
    expect(toastErrorMock.mock.calls[0][0]).toBe(
      'Erreur lors de la génération. Réessayez.',
    );
    expect(routerPushMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Coordonnées manquantes')).toBeNull();
  });
});
