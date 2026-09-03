/**
 * Phase 33 Plan 06 Task 2 — MarkLostDialog tests.
 *
 * Coverage (per <action>):
 *   1. Renders the lost title and the outline-variant confirm button.
 *   2. Calls markProposalLostAction with the id and a date.
 *   3. Toasts the lost success key and closes on success.
 *   4. Toasts pipeline.toast.error and stays open on failure.
 *   5. No SIREN field under any circumstance, including a rejection
 *      carrying the SIREN_REQUIRED string.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { routerRefreshMock, toastSuccessMock, toastErrorMock, markProposalLostActionMock } =
  vi.hoisted(() => ({
    routerRefreshMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    markProposalLostActionMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock('@/lib/pipeline/actions', () => ({
  markProposalLostAction: markProposalLostActionMock,
}));

import { MarkLostDialog } from './MarkLostDialog';

beforeEach(() => {
  routerRefreshMock.mockClear();
  toastSuccessMock.mockClear();
  toastErrorMock.mockClear();
  markProposalLostActionMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderDialog(onOpenChange = vi.fn()) {
  render(<MarkLostDialog proposalId="prop-1" open onOpenChange={onOpenChange} lang="fr" />);
  return { onOpenChange };
}

describe('MarkLostDialog (Plan 33-06 Task 2)', () => {
  it('Test 1: renders the lost title and the outline-variant confirm', () => {
    renderDialog();

    expect(
      screen.getByText('Marquer cette proposition comme perdue ?'),
    ).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Marquer perdu' });
    expect(submit).toBeInTheDocument();
    expect(submit.className).not.toContain('bg-primary');
    expect(submit.className).not.toContain('bg-destructive');
  });

  it('Test 2: calls markProposalLostAction with the id and a date', async () => {
    markProposalLostActionMock.mockResolvedValueOnce(undefined);
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Marquer perdu' }));

    await waitFor(() => expect(markProposalLostActionMock).toHaveBeenCalledTimes(1));
    const call = markProposalLostActionMock.mock.calls[0][0];
    expect(call.proposalId).toBe('prop-1');
    expect(call.date).toBeTruthy();
  });

  it('Test 3: toasts the lost success key and closes on success', async () => {
    markProposalLostActionMock.mockResolvedValueOnce(undefined);
    const { onOpenChange } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Marquer perdu' }));

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith('Proposition marquée comme perdue.'),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('Test 4: toasts pipeline.toast.error and stays open on failure', async () => {
    markProposalLostActionMock.mockRejectedValueOnce(new Error('boom'));
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Marquer perdu' }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Test 5: no SIREN field ever appears, even on a SIREN_REQUIRED-shaped rejection', async () => {
    markProposalLostActionMock.mockRejectedValueOnce(new Error('pipeline.error.sirenRequired'));
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Marquer perdu' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    expect(screen.queryByLabelText('SIREN')).not.toBeInTheDocument();
    expect(screen.queryByText(/SIREN/)).not.toBeInTheDocument();
  });
});
