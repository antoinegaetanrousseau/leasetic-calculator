/**
 * Phase 34 Plan 12 Task 2 — ClientHeader tests (FICHE-03, FICHE-05, ACTV-04,
 * PIPE-02, D-18).
 *
 * The header is the page's only always-visible surface, so it carries the two
 * things a partner changes most often — the stage and the next action — plus
 * the shared-tier edit. It is the one client component in the rebuild that
 * owns state, and the state it owns is which dialog is open.
 *
 * Base UI's `Select` needs a full pointer-event sequence (`pointerdown` +
 * `pointerup` + `click`) to open and select in jsdom; the helper below is
 * lifted from `PipelineMobileList.test.tsx`, which established it.
 *
 * Coverage (per <behavior>):
 *   1. The display name renders; a SIREN renders beside it when present and is
 *      omitted ENTIRELY when null — never a dash in a header.
 *   2. The stage picker lists all seven stages, with the two reserved ones
 *      disabled and suffixed (PIPE-02); choosing one calls the same action the
 *      board calls, then refreshes.
 *   3. The next action renders its date and note when set and the
 *      "no action planned" wording when not, and opens NextActionDialog.
 *   4. "Modifier" opens EditCompanyDialog pre-filled with the four shared-tier
 *      values — and only those four.
 *   5. The two dialogs can never both be open.
 *   6. Source: no comparison of a caught error's message (33-REVIEW CR-01),
 *      and no registry column reachable from this file (D-02).
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { routerRefreshMock, toastErrorMock, advanceRelationshipStageActionMock } = vi.hoisted(
  () => ({
    routerRefreshMock: vi.fn(),
    toastErrorMock: vi.fn(),
    advanceRelationshipStageActionMock: vi.fn(),
  }),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: toastErrorMock },
}));

vi.mock('@/lib/pipeline/actions', () => ({
  advanceRelationshipStageAction: advanceRelationshipStageActionMock,
}));

// The two dialogs are stubbed — each has its own suite. The stubs echo their
// `open` flag and their pre-filled values so the header's ONE job here (which
// dialog is open, and with what) is what the assertions read.
vi.mock('./EditCompanyDialog', () => ({
  EditCompanyDialog: ({
    open,
    defaultValues,
  }: {
    open: boolean;
    defaultValues: Record<string, unknown>;
  }) => (
    <div
      data-testid="edit-company-dialog"
      data-open={open ? 'true' : 'false'}
      data-defaults={JSON.stringify(defaultValues)}
    />
  ),
}));

vi.mock('./NextActionDialog', () => ({
  NextActionDialog: ({
    open,
    defaultValues,
  }: {
    open: boolean;
    defaultValues: Record<string, unknown>;
  }) => (
    <div
      data-testid="next-action-dialog"
      data-open={open ? 'true' : 'false'}
      data-defaults={JSON.stringify(defaultValues)}
    />
  ),
}));

import { ClientHeader } from './ClientHeader';
import { t } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';

const REL_ID = '11111111-1111-4111-8111-111111111111';

const BASE_PROPS = {
  relationshipId: REL_ID,
  companyName: 'Dupont Menuiserie',
  siren: '552100554',
  stage: 'prospect' as const,
  nextActionAt: null as Date | null,
  nextActionNote: null as string | null,
  company: {
    name: 'Dupont Menuiserie',
    website: 'dupont-menuiserie.fr',
    phone: '04 78 00 00 00',
    siren: '552100554',
  },
  lang: 'fr' as const,
};

function renderHeader(overrides: Partial<typeof BASE_PROPS> = {}) {
  return render(<ClientHeader {...BASE_PROPS} {...overrides} />);
}

/** Full pointer sequence Base UI's Select needs in jsdom. */
function pointerActivate(el: Element) {
  fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(el, { button: 0, pointerType: 'mouse' });
  fireEvent.click(el);
}

async function chooseStage(optionLabel: string) {
  const trigger = screen.getByRole('combobox', {
    name: t('pipeline.mobile.stagePicker.label', 'fr'),
  });
  pointerActivate(trigger);
  const listbox = await screen.findByRole('listbox');
  const option = within(listbox)
    .getAllByRole('option')
    .find((o) => o.textContent === optionLabel);
  if (!option) throw new Error(`option "${optionLabel}" not found`);
  pointerActivate(option);
}

beforeEach(() => {
  routerRefreshMock.mockClear();
  toastErrorMock.mockClear();
  advanceRelationshipStageActionMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ClientHeader — name, SIREN, stage, next action', () => {
  it('Test 1: renders the display name as the page heading, with the SIREN beside it', () => {
    renderHeader();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Dupont Menuiserie');
    expect(screen.getByText('552100554')).toBeTruthy();
  });

  it('Test 1b: a null SIREN is omitted entirely — no dash placeholder', () => {
    const { container } = renderHeader({ siren: null });

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Dupont Menuiserie');
    expect(container.textContent).not.toContain('552100554');
    expect(container.textContent).not.toContain('—');
  });

  it('Test 2: the stage picker lists all seven stages, reserved ones disabled and suffixed (PIPE-02)', async () => {
    renderHeader();

    const trigger = screen.getByRole('combobox', {
      name: t('pipeline.mobile.stagePicker.label', 'fr'),
    });
    pointerActivate(trigger);
    const options = within(await screen.findByRole('listbox')).getAllByRole('option');

    expect(options).toHaveLength(7);
    const signe = options.find((o) => o.textContent === 'Signé (réservé)');
    const debloque = options.find((o) => o.textContent === 'Débloqué (réservé)');
    expect(signe?.getAttribute('aria-disabled')).toBe('true');
    expect(debloque?.getAttribute('aria-disabled')).toBe('true');
    expect(
      options.find((o) => o.textContent === 'Négociation')?.getAttribute('aria-disabled'),
    ).not.toBe('true');
  });

  it('Test 2b: choosing another stage calls advanceRelationshipStageAction once, then refreshes', async () => {
    advanceRelationshipStageActionMock.mockResolvedValueOnce(undefined);
    renderHeader();

    await chooseStage('Négociation');

    await waitFor(() => {
      expect(advanceRelationshipStageActionMock).toHaveBeenCalledTimes(1);
    });
    expect(advanceRelationshipStageActionMock).toHaveBeenCalledWith({
      relationshipId: REL_ID,
      toStage: 'negociation',
    });
    await waitFor(() => {
      expect(routerRefreshMock).toHaveBeenCalled();
    });
  });

  it('Test 2c: choosing the current stage is a no-op', async () => {
    renderHeader();

    await chooseStage('Prospect');

    expect(advanceRelationshipStageActionMock).not.toHaveBeenCalled();
  });

  it('Test 2d: a rejected stage change toasts the bounded pipeline error', async () => {
    advanceRelationshipStageActionMock.mockRejectedValueOnce(new Error('boom'));
    renderHeader();

    await chooseStage('Négociation');

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(t('pipeline.toast.error', 'fr'));
    });
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it('Test 3: with no next action set, the "no action planned" wording renders', () => {
    renderHeader();

    expect(screen.getByText(t('clients.detail.header.noNextAction', 'fr'))).toBeTruthy();
  });

  it('Test 3b: with a next action set, its date and note render', () => {
    const when = new Date('2026-10-01T00:00:00Z');
    renderHeader({ nextActionAt: when, nextActionNote: 'Rappeler le gérant' });

    const expected = t('clients.detail.header.nextAction', 'fr').replace(
      '{0}',
      formatDate(when, 'fr', { year: 'numeric', month: 'short', day: 'numeric' }),
    );
    expect(screen.getByText(expected)).toBeTruthy();
    expect(screen.getByText('Rappeler le gérant')).toBeTruthy();
  });

  it('Test 3c: the next-action control opens NextActionDialog, pre-filled as YYYY-MM-DD', () => {
    const when = new Date('2026-10-01T00:00:00Z');
    renderHeader({ nextActionAt: when, nextActionNote: 'Rappeler le gérant' });

    const dialog = screen.getByTestId('next-action-dialog');
    expect(dialog.getAttribute('data-open')).toBe('false');

    fireEvent.click(screen.getByTestId('client-header-next-action'));

    expect(screen.getByTestId('next-action-dialog').getAttribute('data-open')).toBe('true');
    expect(JSON.parse(screen.getByTestId('next-action-dialog').getAttribute('data-defaults')!)).toEqual(
      { nextActionAt: '2026-10-01', nextActionNote: 'Rappeler le gérant' },
    );
  });

  it('Test 4: "Modifier" opens EditCompanyDialog pre-filled with the four shared-tier values', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: t('clients.detail.header.modify', 'fr') }));

    const dialog = screen.getByTestId('edit-company-dialog');
    expect(dialog.getAttribute('data-open')).toBe('true');
    expect(JSON.parse(dialog.getAttribute('data-defaults')!)).toEqual({
      name: 'Dupont Menuiserie',
      website: 'dupont-menuiserie.fr',
      phone: '04 78 00 00 00',
      siren: '552100554',
    });
  });

  it('Test 5: the two dialogs can never both be open — opening one closes the other', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: t('clients.detail.header.modify', 'fr') }));
    expect(screen.getByTestId('edit-company-dialog').getAttribute('data-open')).toBe('true');
    expect(screen.getByTestId('next-action-dialog').getAttribute('data-open')).toBe('false');

    fireEvent.click(screen.getByTestId('client-header-next-action'));
    expect(screen.getByTestId('next-action-dialog').getAttribute('data-open')).toBe('true');
    expect(screen.getByTestId('edit-company-dialog').getAttribute('data-open')).toBe('false');
  });
});

describe('ClientHeader — source contracts', () => {
  const source = readFileSync('app/(authed)/clients/[id]/ClientHeader.tsx', 'utf-8');

  it('Test 6: never compares a caught error message (33-REVIEW CR-01)', () => {
    expect(source).not.toMatch(/(?:\w+\.message\s*[!=]==?\s*)|(?:[!=]==?\s*\w+\.message\b)/);
  });

  it('Test 6b: no registry column is reachable from the header (D-02)', () => {
    expect(source).not.toMatch(
      /legalName|addressLine|nafCode|nafSection|headcountBand|foundedOn|registryState/,
    );
  });

  it('Test 6c: the reserved stages are disabled here too (PIPE-02)', () => {
    expect(source).toContain('isReservedStage');
  });
});
