/**
 * Phase 34 Plan 11 Task 2 — NoteComposer (ACTV-03).
 *
 * Coverage (per <behavior>):
 *   1. A labelled textarea and an optional date input render.
 *   2. A non-empty body calls the action, clears the form, refreshes and toasts.
 *   3. A date is passed coerced; no date omits the key entirely.
 *   4. An empty body is rejected inline and the action is never called.
 *   5. A rejected submit KEEPS the typed body and toasts the bounded key.
 *   6. Fields and submit are disabled while submitting, and the form is aria-busy.
 *   7. Structural — nothing in the file compares a caught error's message.
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { t } from '@/lib/i18n/dictionaries';

vi.mock('server-only', () => ({}));

const { routerRefreshMock, toastSuccessMock, toastErrorMock, addNoteActionMock } = vi.hoisted(() => ({
  routerRefreshMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  addNoteActionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock('@/lib/relationship/actions', () => ({
  addRelationshipNoteAction: addNoteActionMock,
}));

import { NoteComposer } from './NoteComposer';

const REL_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_PATH = 'app/(authed)/clients/[id]/NoteComposer.tsx';

function bodyField(): HTMLTextAreaElement {
  return screen.getByLabelText(t('clients.timeline.note.label', 'fr')) as HTMLTextAreaElement;
}

function dateField(): HTMLInputElement {
  return screen.getByLabelText(t('clients.timeline.note.dateLabel', 'fr')) as HTMLInputElement;
}

function submitButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: t('clients.timeline.note.submit', 'fr') }) as HTMLButtonElement;
}

beforeEach(() => {
  routerRefreshMock.mockClear();
  toastSuccessMock.mockClear();
  toastErrorMock.mockClear();
  addNoteActionMock.mockReset();
  addNoteActionMock.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NoteComposer — ACTV-03', () => {
  it('Test 1: renders a labelled textarea and an optional date input', () => {
    render(<NoteComposer relationshipId={REL_ID} lang="fr" />);

    expect(bodyField().tagName).toBe('TEXTAREA');
    expect(bodyField()).toHaveAttribute(
      'placeholder',
      t('clients.timeline.note.placeholder', 'fr'),
    );
    expect(dateField()).toHaveAttribute('type', 'date');
    expect(submitButton()).toBeInTheDocument();
  });

  it('Test 2: a non-empty body is sent, then the form clears and the page refreshes', async () => {
    render(<NoteComposer relationshipId={REL_ID} lang="fr" />);

    fireEvent.change(bodyField(), { target: { value: 'Relancé la DAF, rappel jeudi' } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(addNoteActionMock).toHaveBeenCalledTimes(1));

    const arg = addNoteActionMock.mock.calls[0][0];
    expect(arg.relationshipId).toBe(REL_ID);
    expect(arg.body).toBe('Relancé la DAF, rappel jeudi');

    await waitFor(() => expect(bodyField()).toHaveValue(''));
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledWith(t('clients.timeline.note.toast.added', 'fr'));
  });

  it('Test 3: a date is coerced and passed; no date omits the key entirely', async () => {
    render(<NoteComposer relationshipId={REL_ID} lang="fr" />);

    fireEvent.change(bodyField(), { target: { value: 'Note antidatée' } });
    fireEvent.change(dateField(), { target: { value: '2026-08-20' } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(addNoteActionMock).toHaveBeenCalledTimes(1));
    const dated = addNoteActionMock.mock.calls[0][0];
    expect(dated.occurredAt).toBeInstanceOf(Date);
    expect((dated.occurredAt as Date).toISOString()).toContain('2026-08-20');

    cleanup();
    addNoteActionMock.mockClear();
    render(<NoteComposer relationshipId={REL_ID} lang="fr" />);

    fireEvent.change(bodyField(), { target: { value: 'Note du jour' } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(addNoteActionMock).toHaveBeenCalledTimes(1));
    const undated = addNoteActionMock.mock.calls[0][0];
    // Absent, not null and not an empty string — "now" is resolved in SQL.
    expect('occurredAt' in undated).toBe(false);
  });

  it('Test 4: an empty body is rejected inline and the action is never called', async () => {
    render(<NoteComposer relationshipId={REL_ID} lang="fr" />);

    fireEvent.change(bodyField(), { target: { value: '   ' } });
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(t('error.field.required', 'fr')),
    );
    expect(addNoteActionMock).not.toHaveBeenCalled();
  });

  it('Test 5: a rejected submit keeps the typed body and toasts the bounded key', async () => {
    addNoteActionMock.mockRejectedValue(new Error('boom'));
    render(<NoteComposer relationshipId={REL_ID} lang="fr" />);

    fireEvent.change(bodyField(), { target: { value: 'Texte à ne pas perdre' } });
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(t('relationship.toast.error', 'fr')),
    );
    // Nothing typed is lost — the partner can retry without re-entering it.
    expect(bodyField()).toHaveValue('Texte à ne pas perdre');
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it('Test 6: fields and submit are disabled while submitting, and the form is aria-busy', async () => {
    let release: () => void = () => {};
    addNoteActionMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = () => resolve();
        }),
    );

    const { container } = render(<NoteComposer relationshipId={REL_ID} lang="fr" />);
    const form = container.querySelector('form') as HTMLFormElement;

    fireEvent.change(bodyField(), { target: { value: 'En cours' } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(submitButton()).toBeDisabled());
    expect(bodyField()).toBeDisabled();
    expect(dateField()).toBeDisabled();
    expect(form).toHaveAttribute('aria-busy', 'true');

    release();
    await waitFor(() => expect(submitButton()).not.toBeDisabled());
  });

  it('Test 7: nothing in the file branches on a caught error message (33-REVIEW CR-01)', () => {
    const source = readFileSync(SOURCE_PATH, 'utf-8');
    const withoutComments = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    expect(withoutComments).not.toMatch(
      /(?:\w+\.message\s*[!=]==?\s*)|(?:[!=]==?\s*\w+\.message\b)/,
    );
  });
});
