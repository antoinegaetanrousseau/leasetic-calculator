/**
 * Phase 33 Plan 07 Task 2 — PipelineMobileList tests.
 *
 * Base UI's `Select` needs a full pointer-event sequence
 * (`pointerdown` + `pointerup` + `click`) to open/select in jsdom — a bare
 * `fireEvent.click` alone does not register with its interaction layer.
 * Verified against the real primitive before writing this helper.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { PipelineCardRow } from '@/lib/db/queries/pipeline';
import { PIPELINE_STAGES, type PipelineStage } from '@/lib/pipeline/stages';
import { stageLabel } from '@/lib/pipeline/format';

vi.mock('server-only', () => ({}));

const { routerRefreshMock, toastSuccessMock, toastErrorMock, advanceRelationshipStageActionMock } =
  vi.hoisted(() => ({
    routerRefreshMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    advanceRelationshipStageActionMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock('@/lib/pipeline/actions', () => ({
  advanceRelationshipStageAction: advanceRelationshipStageActionMock,
}));

import { PipelineMobileList } from './PipelineMobileList';

function makeEmptyBoard(): Record<PipelineStage, PipelineCardRow[]> {
  return Object.fromEntries(
    PIPELINE_STAGES.map((stage) => [stage, [] as PipelineCardRow[]]),
  ) as Record<PipelineStage, PipelineCardRow[]>;
}

function makeRow(overrides: Partial<PipelineCardRow> = {}): PipelineCardRow {
  return {
    relationshipId: 'rel-1',
    companyId: 'co-1',
    companyName: 'Acme SARL',
    siren: '123456789',
    stage: 'prospect',
    contactsCount: 1,
    proposalsCount: 1,
    ...overrides,
  };
}

/** Full pointer sequence Base UI's Select needs in jsdom (see file header). */
function pointerActivate(el: Element) {
  fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(el, { button: 0, pointerType: 'mouse' });
  fireEvent.click(el);
}

async function chooseStage(trigger: HTMLElement, optionLabel: string) {
  pointerActivate(trigger);
  const listbox = await screen.findByRole('listbox');
  const option = within(listbox)
    .getAllByRole('option')
    .find((o) => o.textContent === optionLabel);
  if (!option) {
    throw new Error(`option "${optionLabel}" not found`);
  }
  pointerActivate(option);
}

function getSections(container: HTMLElement): HTMLElement[] {
  const root = container.firstElementChild as HTMLElement;
  return Array.from(root.children) as HTMLElement[];
}

beforeEach(() => {
  routerRefreshMock.mockClear();
  toastSuccessMock.mockClear();
  toastErrorMock.mockClear();
  advanceRelationshipStageActionMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PipelineMobileList (Plan 33-07 Task 2)', () => {
  it('Test 1: renders seven sections in PIPELINE_STAGES order', () => {
    const { container } = render(<PipelineMobileList initial={makeEmptyBoard()} lang="fr" />);
    const sections = getSections(container);
    expect(sections).toHaveLength(7);
    PIPELINE_STAGES.forEach((stage, i) => {
      expect(within(sections[i]).getByText(stageLabel(stage, 'fr'))).toBeInTheDocument();
    });
  });

  it('Test 2: reserved sections render the Réservé badge and expose no disclosure trigger', () => {
    const { container } = render(<PipelineMobileList initial={makeEmptyBoard()} lang="fr" />);
    const sections = getSections(container);
    const signeIndex = PIPELINE_STAGES.indexOf('signe');
    const debloqueIndex = PIPELINE_STAGES.indexOf('debloque');

    for (const index of [signeIndex, debloqueIndex]) {
      const section = sections[index];
      expect(within(section).getByText('Réservé')).toBeInTheDocument();
      expect(within(section).queryByRole('button')).not.toBeInTheDocument();
    }
  });

  it('Test 3: perdu starts collapsed and the other four partner-settable stages start expanded', () => {
    const initial = makeEmptyBoard();
    initial.perdu = [makeRow({ relationshipId: 'rel-perdu', stage: 'perdu' })];
    const { container } = render(<PipelineMobileList initial={initial} lang="fr" />);
    const sections = getSections(container);

    for (const stage of ['prospect', 'qualifie', 'proposition_envoyee', 'negociation'] as const) {
      const section = sections[PIPELINE_STAGES.indexOf(stage)];
      expect(within(section).getByText('Aucun dossier à cette étape.')).toBeInTheDocument();
    }

    const perduSection = sections[PIPELINE_STAGES.indexOf('perdu')];
    expect(within(perduSection).queryByText('Acme SARL')).not.toBeInTheDocument();

    pointerActivate(within(perduSection).getByRole('button'));
    expect(within(perduSection).getByText('Acme SARL')).toBeInTheDocument();
  });

  it('Test 4: an empty expandable section renders pipeline.mobile.accordion.empty', () => {
    const { container } = render(<PipelineMobileList initial={makeEmptyBoard()} lang="fr" />);
    const sections = getSections(container);
    const prospectSection = sections[PIPELINE_STAGES.indexOf('prospect')];
    expect(within(prospectSection).getByText('Aucun dossier à cette étape.')).toBeInTheDocument();
  });

  it('Test 5: the Select for a card lists all seven stages, reserved ones disabled with the suffix', async () => {
    const initial = makeEmptyBoard();
    initial.prospect = [makeRow()];
    render(<PipelineMobileList initial={initial} lang="fr" />);

    const trigger = screen.getByRole('combobox', { name: "Changer d'étape" });
    pointerActivate(trigger);
    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    expect(options).toHaveLength(7);
    const signe = options.find((o) => o.textContent === 'Signé (réservé)');
    const debloque = options.find((o) => o.textContent === 'Débloqué (réservé)');
    expect(signe).toBeDefined();
    expect(debloque).toBeDefined();
    expect(signe?.getAttribute('aria-disabled')).toBe('true');
    expect(debloque?.getAttribute('aria-disabled')).toBe('true');

    const negociation = options.find((o) => o.textContent === 'Négociation');
    expect(negociation?.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('Test 6: choosing negociation for a card currently in prospect calls the action once with that relationship id and toStage negociation', async () => {
    advanceRelationshipStageActionMock.mockResolvedValueOnce(undefined);
    const initial = makeEmptyBoard();
    initial.prospect = [makeRow({ relationshipId: 'rel-move' })];
    render(<PipelineMobileList initial={initial} lang="fr" />);

    const trigger = screen.getByRole('combobox', { name: "Changer d'étape" });
    await chooseStage(trigger, 'Négociation');

    expect(advanceRelationshipStageActionMock).toHaveBeenCalledTimes(1);
    expect(advanceRelationshipStageActionMock).toHaveBeenCalledWith({
      relationshipId: 'rel-move',
      toStage: 'negociation',
    });
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it('Test 7: choosing the card own current stage calls nothing', async () => {
    const initial = makeEmptyBoard();
    initial.prospect = [makeRow({ relationshipId: 'rel-noop' })];
    render(<PipelineMobileList initial={initial} lang="fr" />);

    const trigger = screen.getByRole('combobox', { name: "Changer d'étape" });
    await chooseStage(trigger, 'Prospect');

    expect(advanceRelationshipStageActionMock).not.toHaveBeenCalled();
  });

  it('Test 8: a rejected action restores the card to its original section and toasts pipeline.toast.error', async () => {
    advanceRelationshipStageActionMock.mockRejectedValueOnce(new Error('boom'));
    const initial = makeEmptyBoard();
    initial.prospect = [makeRow({ relationshipId: 'rel-fail' })];
    const { container } = render(<PipelineMobileList initial={initial} lang="fr" />);

    const trigger = screen.getByRole('combobox', { name: "Changer d'étape" });
    await chooseStage(trigger, 'Négociation');

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.'),
    );

    const sections = getSections(container);
    const prospectSection = sections[PIPELINE_STAGES.indexOf('prospect')];
    const negociationSection = sections[PIPELINE_STAGES.indexOf('negociation')];
    expect(within(prospectSection).getByText('Acme SARL')).toBeInTheDocument();
    expect(within(negociationSection).queryByText('Acme SARL')).not.toBeInTheDocument();
  });
});
