/**
 * Phase 33 Plan 06 Task 1 — MarkWonDialog tests.
 *
 * Coverage (per <action>):
 *   1. Renders the title, both base fields, and the submit label "Marquer
 *      gagné", with NO SIREN field present initially.
 *   2. Submitting calls markProposalWonAction once with the proposal id and
 *      a date, and no `siren` key.
 *   3. A SIREN_REQUIRED rejection keeps the dialog open, reveals the SIREN
 *      input + banner, preserves the previously entered date/reason, flips
 *      the submit label, and never calls toast.error.
 *   4. Resubmitting after entering a SIREN calls the action a second time
 *      with siren normalized to '123456789'.
 *   5. A generic rejection toasts pipeline.toast.error and leaves the
 *      dialog open.
 *   6. A success closes the dialog and calls router.refresh.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { routerRefreshMock, toastSuccessMock, toastErrorMock, markProposalWonActionMock } =
  vi.hoisted(() => ({
    routerRefreshMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    markProposalWonActionMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock('@/lib/pipeline/actions', () => ({
  markProposalWonAction: markProposalWonActionMock,
  SIREN_REQUIRED: 'pipeline.error.sirenRequired',
}));

import { MarkWonDialog } from './MarkWonDialog';

beforeEach(() => {
  routerRefreshMock.mockClear();
  toastSuccessMock.mockClear();
  toastErrorMock.mockClear();
  markProposalWonActionMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderDialog(onOpenChange = vi.fn()) {
  render(
    <MarkWonDialog proposalId="prop-1" open onOpenChange={onOpenChange} lang="fr" />,
  );
  return { onOpenChange };
}

describe('MarkWonDialog (Plan 33-06 Task 1)', () => {
  it('Test 1: renders the title, both base fields, submit label, no SIREN field initially', () => {
    renderDialog();

    expect(
      screen.getByText('Marquer cette proposition comme gagnée ?'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Date de signature/)).toBeInTheDocument();
    expect(screen.getByLabelText('Motif (facultatif)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marquer gagné' })).toBeInTheDocument();
    expect(screen.queryByLabelText('SIREN')).not.toBeInTheDocument();
  });

  it('Test 2: submitting calls the action once with the proposal id and a date, no siren key', async () => {
    markProposalWonActionMock.mockResolvedValueOnce(undefined);
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Marquer gagné' }));

    await waitFor(() => expect(markProposalWonActionMock).toHaveBeenCalledTimes(1));
    const call = markProposalWonActionMock.mock.calls[0][0];
    expect(call.proposalId).toBe('prop-1');
    expect(call.date).toBeTruthy();
    expect('siren' in call).toBe(false);
  });

  it('Test 3: SIREN_REQUIRED rejection reveals the SIREN field, preserves values, relabels submit, no toast.error', async () => {
    markProposalWonActionMock.mockRejectedValueOnce(new Error('pipeline.error.sirenRequired'));
    renderDialog();

    fireEvent.change(screen.getByLabelText(/Date de signature/), {
      target: { value: '2026-05-01' },
    });
    fireEvent.change(screen.getByLabelText('Motif (facultatif)'), {
      target: { value: 'Signature confirmée par mail' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Marquer gagné' }));

    await screen.findByLabelText('SIREN');
    expect(
      screen.getByText(
        "Cette société n'a pas de SIREN enregistré. Ajoutez-en un pour confirmer.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Date de signature/)).toHaveValue('2026-05-01');
    expect(screen.getByLabelText('Motif (facultatif)')).toHaveValue(
      'Signature confirmée par mail',
    );
    expect(
      screen.getByRole('button', { name: 'Enregistrer le SIREN et confirmer' }),
    ).toBeInTheDocument();
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Test 4: resubmitting after entering a SIREN calls the action a second time with the normalized siren', async () => {
    markProposalWonActionMock.mockRejectedValueOnce(new Error('pipeline.error.sirenRequired'));
    markProposalWonActionMock.mockResolvedValueOnce(undefined);
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Marquer gagné' }));
    await screen.findByLabelText('SIREN');

    fireEvent.change(screen.getByLabelText('SIREN'), { target: { value: '123 456 789' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Enregistrer le SIREN et confirmer' }),
    );

    await waitFor(() => expect(markProposalWonActionMock).toHaveBeenCalledTimes(2));
    const secondCall = markProposalWonActionMock.mock.calls[1][0];
    expect(secondCall.siren).toBe('123456789');
    expect(secondCall.proposalId).toBe('prop-1');
  });

  it('Test 5: a generic rejection toasts pipeline.toast.error and leaves the dialog open', async () => {
    markProposalWonActionMock.mockRejectedValueOnce(new Error('boom'));
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Marquer gagné' }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Test 6: a success closes the dialog and calls router.refresh', async () => {
    markProposalWonActionMock.mockResolvedValueOnce(undefined);
    const { onOpenChange } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Marquer gagné' }));

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith('Proposition marquée comme gagnée.'),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });
});
