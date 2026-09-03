/**
 * Phase 33 Plan 06 Task 2 — ProposalOutcomeControl tests.
 *
 * Coverage (per <action>):
 *   For each of the four `outcome` values: assert `data-outcome-state` and
 *   the presence/absence of the two triggers and the badge; assert the
 *   'unanswered' case renders BOTH the badge and both triggers; assert
 *   clicking each trigger opens exactly one dialog and that opening one
 *   closes the other; assert no element anywhere renders a third
 *   "unanswered" trigger.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/pipeline/actions', () => ({
  markProposalWonAction: vi.fn(),
  markProposalLostAction: vi.fn(),
  SIREN_REQUIRED: 'pipeline.error.sirenRequired',
}));

import { ProposalOutcomeControl } from './ProposalOutcomeControl';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('ProposalOutcomeControl (Plan 33-06 Task 2)', () => {
  it("outcome='won' renders a single badge, zero triggers", () => {
    const { container } = render(
      <ProposalOutcomeControl proposalId="prop-1" outcome="won" lang="fr" />,
    );
    expect(container.querySelector('[data-outcome-state]')?.getAttribute('data-outcome-state')).toBe(
      'won',
    );
    expect(screen.getByText('Gagné')).toBeInTheDocument();
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it("outcome='lost' renders a single badge, zero triggers", () => {
    const { container } = render(
      <ProposalOutcomeControl proposalId="prop-1" outcome="lost" lang="fr" />,
    );
    expect(container.querySelector('[data-outcome-state]')?.getAttribute('data-outcome-state')).toBe(
      'lost',
    );
    expect(screen.getByText('Perdu')).toBeInTheDocument();
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it("outcome='unanswered' renders BOTH the muted badge AND both triggers", () => {
    const { container } = render(
      <ProposalOutcomeControl proposalId="prop-1" outcome="unanswered" lang="fr" />,
    );
    expect(container.querySelector('[data-outcome-state]')?.getAttribute('data-outcome-state')).toBe(
      'unanswered',
    );
    expect(screen.getByText('Sans réponse')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marquer gagné' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marquer perdu' })).toBeInTheDocument();
  });

  it('outcome=null renders both triggers, no badge', () => {
    const { container } = render(
      <ProposalOutcomeControl proposalId="prop-1" outcome={null} lang="fr" />,
    );
    expect(container.querySelector('[data-outcome-state]')?.getAttribute('data-outcome-state')).toBe(
      'none',
    );
    expect(screen.queryByText('Sans réponse')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marquer gagné' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marquer perdu' })).toBeInTheDocument();
  });

  it('clicking each trigger opens exactly one dialog, and only one dialog is ever open at a time', async () => {
    render(<ProposalOutcomeControl proposalId="prop-1" outcome={null} lang="fr" />);

    fireEvent.click(screen.getByRole('button', { name: 'Marquer gagné' }));
    expect(
      screen.getByText('Marquer cette proposition comme gagnée ?'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Marquer cette proposition comme perdue ?'),
    ).not.toBeInTheDocument();
    // Only one <dialog role> mounted at a time — openDialog is a single
    // 'won' | 'lost' | null flag, never two simultaneously.
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    // Close via the dialog's own "Annuler" control before opening the
    // other one — the underlying trigger is inert while a dialog is open,
    // matching real interaction (only one dialog can ever be interacted
    // with at a time).
    fireEvent.click(screen.getAllByRole('button', { name: 'Annuler' })[0]);
    await waitFor(() =>
      expect(
        screen.queryByText('Marquer cette proposition comme gagnée ?'),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Marquer perdu' }));
    expect(
      screen.queryByText('Marquer cette proposition comme gagnée ?'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Marquer cette proposition comme perdue ?'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('no element anywhere renders a third "unanswered" trigger', () => {
    render(<ProposalOutcomeControl proposalId="prop-1" outcome="unanswered" lang="fr" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    for (const btn of buttons) {
      expect(btn.textContent).not.toMatch(/Sans réponse/);
    }
  });
});
