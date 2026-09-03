/**
 * Phase 34 Plan 10 Task 1 — NextActionDialog tests (ACTV-04, FICHE-05, D-18).
 *
 * Coverage (per <behavior>):
 *   7.  A date input and a note field, both pre-filled from props.
 *   8.  Submitting with a date calls setNextActionAction with a coerced Date
 *       and the note, then closes and refreshes.
 *   9.  The distinct clear control calls setNextActionAction with
 *       `nextActionAt: null` and sends NO note key — clearing the date clears
 *       the note server-side (src/lib/relationship/actions.ts), so a second
 *       value here would only be a way to disagree with it.
 *   10. The clear control is absent when no next action is set.
 *   11. A rejected action leaves the dialog open with the typed values intact.
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { routerRefreshMock, toastSuccessMock, toastErrorMock, setNextActionActionMock } = vi.hoisted(
  () => ({
    routerRefreshMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    setNextActionActionMock: vi.fn(),
  }),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock('@/lib/relationship/actions', () => ({
  setNextActionAction: setNextActionActionMock,
}));

import { NextActionDialog } from './NextActionDialog';

const REL_ID = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  routerRefreshMock.mockClear();
  toastSuccessMock.mockClear();
  toastErrorMock.mockClear();
  setNextActionActionMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NextActionDialog (Plan 34-10 Task 1)', () => {
  it('Test 7: renders a date input and a note field, both pre-filled from props', () => {
    render(
      <NextActionDialog
        open
        onOpenChange={vi.fn()}
        relationshipId={REL_ID}
        defaultValues={{ nextActionAt: '2026-09-10', nextActionNote: 'Relancer par téléphone.' }}
        lang="fr"
      />,
    );

    const date = screen.getByLabelText(/Date/);
    expect(date).toHaveAttribute('type', 'date');
    expect(date).toHaveValue('2026-09-10');

    const note = screen.getByLabelText('Note (facultatif)');
    expect(note.tagName).toBe('TEXTAREA');
    expect(note).toHaveValue('Relancer par téléphone.');
  });

  it('Test 8: submitting with a date calls the action with a coerced Date and the note, then closes and refreshes', async () => {
    setNextActionActionMock.mockResolvedValueOnce(undefined);
    const onOpenChange = vi.fn();

    render(
      <NextActionDialog
        open
        onOpenChange={onOpenChange}
        relationshipId={REL_ID}
        defaultValues={{ nextActionAt: null, nextActionNote: null }}
        lang="fr"
      />,
    );

    fireEvent.change(screen.getByLabelText(/Date/), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('Note (facultatif)'), {
      target: { value: 'Envoyer le devis révisé.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(setNextActionActionMock).toHaveBeenCalledTimes(1));
    expect(setNextActionActionMock).toHaveBeenCalledWith({
      relationshipId: REL_ID,
      nextActionAt: new Date('2026-09-10'),
      nextActionNote: 'Envoyer le devis révisé.',
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Prochaine action enregistrée.');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('Test 9: the clear control sends nextActionAt: null and no note key at all', async () => {
    setNextActionActionMock.mockResolvedValueOnce(undefined);
    const onOpenChange = vi.fn();

    render(
      <NextActionDialog
        open
        onOpenChange={onOpenChange}
        relationshipId={REL_ID}
        defaultValues={{ nextActionAt: '2026-09-10', nextActionNote: 'Relancer par téléphone.' }}
        lang="fr"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));

    await waitFor(() => expect(setNextActionActionMock).toHaveBeenCalledTimes(1));
    const payload = setNextActionActionMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toEqual({ relationshipId: REL_ID, nextActionAt: null });
    expect(Object.keys(payload).sort()).toEqual(['nextActionAt', 'relationshipId']);
    expect(toastSuccessMock).toHaveBeenCalledWith('Prochaine action retirée.');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('Test 10: the clear control is absent when there is no next action set', () => {
    render(
      <NextActionDialog
        open
        onOpenChange={vi.fn()}
        relationshipId={REL_ID}
        defaultValues={{ nextActionAt: null, nextActionNote: null }}
        lang="fr"
      />,
    );

    expect(screen.queryByRole('button', { name: 'Retirer' })).toBeNull();
  });

  it('Test 11: a rejected action leaves the dialog open with the typed values intact', async () => {
    setNextActionActionMock.mockRejectedValueOnce(new Error('relationship.toast.error'));
    const onOpenChange = vi.fn();

    render(
      <NextActionDialog
        open
        onOpenChange={onOpenChange}
        relationshipId={REL_ID}
        defaultValues={{ nextActionAt: null, nextActionNote: null }}
        lang="fr"
      />,
    );

    fireEvent.change(screen.getByLabelText(/Date/), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('Note (facultatif)'), {
      target: { value: 'Ne pas reperdre ceci.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.'),
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByLabelText('Note (facultatif)')).toHaveValue('Ne pas reperdre ceci.');
    expect(screen.getByLabelText(/Date/)).toHaveValue('2026-09-10');
  });

  it('Test 11b: the component never compares a caught rejection message to anything', () => {
    const source = readFileSync('app/(authed)/clients/[id]/NextActionDialog.tsx', 'utf-8');
    const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(stripped).not.toMatch(/(?:\w+\.message\s*[!=]==?\s*)|(?:[!=]==?\s*\w+\.message\b)/);
  });
});
