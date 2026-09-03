/**
 * Phase 34 Plan 10 Task 1 — EditRelationDialog tests (FICHE-04, FICHE-05, D-18).
 *
 * Coverage (per <behavior>):
 *   1. The source picker lists exactly the five LEAD_SOURCES, each labelled
 *      through LEAD_SOURCE_DICT_KEY — plus the "no source recorded"
 *      placeholder, which is what makes clearing the field expressible.
 *   2. The description textarea is pre-filled from `defaultValues`.
 *   3. Submitting calls updateRelationDetailsAction with the relationship id
 *      and the two values, then closes and refreshes.
 *   4. A rejected action leaves the dialog OPEN with the typed values intact.
 *   5. The component file contains no comparison against a caught rejection's
 *      message property (33-REVIEW CR-01, asserted locally so the failure
 *      names this file).
 *   6. Inputs are disabled while submitting and the form carries aria-busy.
 *
 * Base UI's `Select` needs a full pointer-event sequence
 * (`pointerdown` + `pointerup` + `click`) to open in jsdom — a bare
 * `fireEvent.click` does not register with its interaction layer. The helper
 * below is the one `PipelineMobileList.test.tsx` verified against the real
 * primitive.
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { LEAD_SOURCES, LEAD_SOURCE_DICT_KEY } from '@/lib/relationship/kinds';
import { t } from '@/lib/i18n/dictionaries';

vi.mock('server-only', () => ({}));

const { routerRefreshMock, toastSuccessMock, toastErrorMock, updateRelationDetailsActionMock } =
  vi.hoisted(() => ({
    routerRefreshMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    updateRelationDetailsActionMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock('@/lib/relationship/actions', () => ({
  updateRelationDetailsAction: updateRelationDetailsActionMock,
}));

import { EditRelationDialog } from './EditRelationDialog';

/** Full pointer sequence Base UI's Select needs in jsdom (see file header). */
function pointerActivate(el: Element) {
  fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(el, { button: 0, pointerType: 'mouse' });
  fireEvent.click(el);
}

const NO_DEFAULTS = { leadSource: null, description: null } as const;

beforeEach(() => {
  routerRefreshMock.mockClear();
  toastSuccessMock.mockClear();
  toastErrorMock.mockClear();
  updateRelationDetailsActionMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EditRelationDialog (Plan 34-10 Task 1)', () => {
  it('Test 1: the source picker lists exactly the five LEAD_SOURCES, labelled from the shared map', async () => {
    render(
      <EditRelationDialog
        open
        onOpenChange={vi.fn()}
        relationshipId="11111111-1111-4111-8111-111111111111"
        defaultValues={NO_DEFAULTS}
        lang="fr"
      />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Source' });
    pointerActivate(trigger);

    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    // Every label comes from LEAD_SOURCE_DICT_KEY, never a literal in the
    // component — so this expectation is derived, not restated.
    const expectedLabels = LEAD_SOURCES.map((v) => t(LEAD_SOURCE_DICT_KEY[v], 'fr'));
    const sourceOptions = options.filter((o) => expectedLabels.includes(o.textContent ?? ''));

    expect(sourceOptions).toHaveLength(5);
    expect(sourceOptions.map((o) => o.textContent)).toEqual(expectedLabels);

    // The placeholder is the sixth entry and the only non-source one: without
    // it "no source recorded" would be unreachable once a source was picked.
    expect(options).toHaveLength(6);
    expect(
      options.some((o) => o.textContent === t('clients.relation.source.placeholder', 'fr')),
    ).toBe(true);
  });

  it('Test 2: the description textarea is pre-filled from defaultValues', () => {
    render(
      <EditRelationDialog
        open
        onOpenChange={vi.fn()}
        relationshipId="11111111-1111-4111-8111-111111111111"
        defaultValues={{ leadSource: 'salon', description: 'Rencontré au salon de Lyon.' }}
        lang="fr"
      />,
    );

    const textarea = screen.getByLabelText('Description');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveValue('Rencontré au salon de Lyon.');
    expect(screen.getByRole('combobox', { name: 'Source' }).textContent).toContain('Salon');
  });

  it('Test 3: submitting calls the action with the relationship id and both values, then closes and refreshes', async () => {
    updateRelationDetailsActionMock.mockResolvedValueOnce(undefined);
    const onOpenChange = vi.fn();

    render(
      <EditRelationDialog
        open
        onOpenChange={onOpenChange}
        relationshipId="11111111-1111-4111-8111-111111111111"
        defaultValues={{ leadSource: 'prospection', description: null }}
        lang="fr"
      />,
    );

    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Rappelé après le devis.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(updateRelationDetailsActionMock).toHaveBeenCalledTimes(1));
    expect(updateRelationDetailsActionMock).toHaveBeenCalledWith({
      relationshipId: '11111111-1111-4111-8111-111111111111',
      leadSource: 'prospection',
      description: 'Rappelé après le devis.',
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Relation mise à jour.');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('Test 4: a rejected action leaves the dialog open with the typed values intact', async () => {
    updateRelationDetailsActionMock.mockRejectedValueOnce(new Error('relationship.toast.error'));
    const onOpenChange = vi.fn();

    render(
      <EditRelationDialog
        open
        onOpenChange={onOpenChange}
        relationshipId="11111111-1111-4111-8111-111111111111"
        defaultValues={NO_DEFAULTS}
        lang="fr"
      />,
    );

    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'À ne pas perdre.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.'),
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByLabelText('Description')).toHaveValue('À ne pas perdre.');
  });

  it('Test 5: the component never compares a caught rejection message to anything', () => {
    const source = readFileSync('app/(authed)/clients/[id]/EditRelationDialog.tsx', 'utf-8');
    const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(stripped).not.toMatch(/(?:\w+\.message\s*[!=]==?\s*)|(?:[!=]==?\s*\w+\.message\b)/);
  });

  it('Test 6: every input is disabled while submitting and the form carries aria-busy', async () => {
    let release: (() => void) | undefined;
    updateRelationDetailsActionMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const { container } = render(
      <EditRelationDialog
        open
        onOpenChange={vi.fn()}
        relationshipId="11111111-1111-4111-8111-111111111111"
        defaultValues={NO_DEFAULTS}
        lang="fr"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(screen.getByLabelText('Description')).toBeDisabled());
    expect(screen.getByRole('combobox', { name: 'Source' })).toBeDisabled();
    expect(container.ownerDocument.querySelector('form')).toHaveAttribute('aria-busy', 'true');

    release?.();
    await waitFor(() => expect(updateRelationDetailsActionMock).toHaveBeenCalledTimes(1));
  });
});
