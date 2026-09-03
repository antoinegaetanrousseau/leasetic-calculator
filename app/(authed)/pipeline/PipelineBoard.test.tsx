/**
 * Phase 33 Plan 07 Task 1 — PipelineBoard tests.
 *
 * Structural assertions (1-4, 8) render the real `PipelineBoard`, which
 * renders the real `Kanban`/`KanbanColumn`/`KanbanColumnContent`/`KanbanItem`
 * primitives — confirmed safe to render in jsdom without a pointer/touch
 * drag ever firing.
 *
 * Behavioral assertions (5-7) call the exported `handleKanbanMove` directly
 * with a captured event shape, matching the plan's own guidance ("expose
 * handleMove for test by invoking the onMove prop... either is acceptable").
 * This avoids driving a real dnd-kit pointer/keyboard drag through jsdom,
 * whose zero-sized `getBoundingClientRect` results make cross-column
 * collision detection unreliable — the three `onMove` branches are fully
 * exercised regardless of how the event was produced.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { PipelineCardRow } from '@/lib/db/queries/pipeline';
import { PIPELINE_STAGES, type PipelineStage } from '@/lib/pipeline/stages';

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

import { PipelineBoard, handleKanbanMove } from './PipelineBoard';

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

describe('PipelineBoard (Plan 33-07 Task 1) — structure', () => {
  it('Test 1: renders exactly seven columns in PIPELINE_STAGES order', () => {
    const { container } = render(<PipelineBoard initial={makeEmptyBoard()} lang="fr" />);
    const cols = Array.from(container.querySelectorAll('[data-slot="kanban-column"]'));
    expect(cols.map((c) => c.getAttribute('data-value'))).toEqual([...PIPELINE_STAGES]);
  });

  it('Test 2: reserved columns carry data-disabled="true", render the reserved caption, and no cards', () => {
    const { container } = render(<PipelineBoard initial={makeEmptyBoard()} lang="fr" />);
    for (const stage of ['signe', 'debloque']) {
      const col = container.querySelector(`[data-slot="kanban-column"][data-value="${stage}"]`);
      expect(col).not.toBeNull();
      expect(col?.getAttribute('data-disabled')).toBe('true');
      expect(col?.textContent).toContain('Réservé à une intégration future.');
      expect(col?.querySelector('[data-slot="kanban-item"]')).toBeNull();
    }
  });

  it('Test 3: no KanbanColumnHandle and no add-stage control render anywhere', () => {
    const { container } = render(<PipelineBoard initial={makeEmptyBoard()} lang="fr" />);
    expect(container.querySelector('[data-slot="kanban-column-handle"]')).toBeNull();
    expect(screen.queryByRole('button', { name: /add.?stage/i })).toBeNull();
  });

  it("Test 4: perdu's cards are hidden until the disclosure trigger is clicked, whose label carries the count", () => {
    const initial = makeEmptyBoard();
    initial.perdu = [makeRow({ relationshipId: 'rel-perdu', stage: 'perdu' })];
    const { container } = render(<PipelineBoard initial={initial} lang="fr" />);

    const perduCol = container.querySelector(
      '[data-slot="kanban-column"][data-value="perdu"]',
    ) as HTMLElement;
    expect(perduCol.querySelector('[data-slot="kanban-item"]')).toBeNull();

    const trigger = within(perduCol).getByText('Afficher les dossiers perdus (1)');
    fireEvent.click(trigger);

    expect(perduCol.querySelector('[data-slot="kanban-item"]')).not.toBeNull();
    expect(within(perduCol).getByText('Masquer')).toBeInTheDocument();
  });

  it('Test 8: every rendered card node carries a tabIndex attribute (A-5 keyboard-focusability)', () => {
    const initial = makeEmptyBoard();
    initial.prospect = [makeRow()];
    const { container } = render(<PipelineBoard initial={initial} lang="fr" />);
    const item = container.querySelector('[data-slot="kanban-item"]');
    expect(item).not.toBeNull();
    expect(item?.getAttribute('tabindex')).not.toBeNull();
  });
});

describe('PipelineBoard — handleKanbanMove (Plan 33-07 Task 1)', () => {
  it('Test 5: dropping on a reserved lane toasts dropRefused and never calls the action', async () => {
    const columns = makeEmptyBoard();
    columns.prospect = [makeRow()];
    const setColumns = vi.fn();
    const refresh = vi.fn();

    await handleKanbanMove({
      activeContainer: 'prospect',
      activeIndex: 0,
      overContainer: 'signe',
      overIndex: 0,
      columns,
      setColumns,
      lang: 'fr',
      refresh,
    });

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Cette étape est réservée. Vous ne pouvez pas y déplacer un dossier.',
    );
    expect(advanceRelationshipStageActionMock).not.toHaveBeenCalled();
    expect(setColumns).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('Test 5b: a same-lane reorder calls neither the action nor setColumns', async () => {
    const columns = makeEmptyBoard();
    columns.prospect = [makeRow()];
    const setColumns = vi.fn();
    const refresh = vi.fn();

    await handleKanbanMove({
      activeContainer: 'prospect',
      activeIndex: 0,
      overContainer: 'prospect',
      overIndex: 0,
      columns,
      setColumns,
      lang: 'fr',
      refresh,
    });

    expect(setColumns).not.toHaveBeenCalled();
    expect(advanceRelationshipStageActionMock).not.toHaveBeenCalled();
  });

  it('Test 6: a legal move calls the action exactly once with the moved id and destination, and shows no success toast', async () => {
    advanceRelationshipStageActionMock.mockResolvedValueOnce(undefined);
    const columns = makeEmptyBoard();
    columns.prospect = [makeRow({ relationshipId: 'rel-42' })];
    const setColumns = vi.fn();
    const refresh = vi.fn();

    await handleKanbanMove({
      activeContainer: 'prospect',
      activeIndex: 0,
      overContainer: 'negociation',
      overIndex: 0,
      columns,
      setColumns,
      lang: 'fr',
      refresh,
    });

    expect(advanceRelationshipStageActionMock).toHaveBeenCalledTimes(1);
    expect(advanceRelationshipStageActionMock).toHaveBeenCalledWith({
      relationshipId: 'rel-42',
      toStage: 'negociation',
    });
    expect(setColumns).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('Test 7: a rejected action restores the prior column contents and toasts the bounded error', async () => {
    advanceRelationshipStageActionMock.mockRejectedValueOnce(new Error('boom'));
    const columns = makeEmptyBoard();
    columns.prospect = [makeRow({ relationshipId: 'rel-7' })];
    const setColumns = vi.fn();
    const refresh = vi.fn();

    await handleKanbanMove({
      activeContainer: 'prospect',
      activeIndex: 0,
      overContainer: 'qualifie',
      overIndex: 0,
      columns,
      setColumns,
      lang: 'fr',
      refresh,
    });

    expect(setColumns).toHaveBeenCalledTimes(2);
    expect(setColumns).toHaveBeenLastCalledWith(columns);
    expect(toastErrorMock).toHaveBeenCalledWith('Une erreur est survenue. Réessayez.');
    expect(refresh).not.toHaveBeenCalled();
  });
});
