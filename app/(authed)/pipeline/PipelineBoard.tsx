'use client';

/**
 * Phase 33 Plan 07 Task 1 — the desktop kanban board (PIPE-01, PIPE-02,
 * PIPE-04). Owns D-09 in full: the three-layer reserved-lane drop refusal
 * and the single, auditable stage-advance mutation.
 *
 * `columns` is local state seeded from `initial` and reseeded whenever
 * `initial` changes identity (so a `router.refresh()` after a successful
 * move reconverges the board with the server). `Kanban`'s `onMove` mode
 * means this component — not the primitive — owns applying every item
 * move; `handleDragOver`'s auto-reshuffle path is skipped entirely because
 * `onMove` is set (`kanban.tsx`'s own comment: "the consumer owns applying
 * the item move").
 *
 * `handleKanbanMove` is exported as a standalone, testable function so the
 * three drop-outcome branches (reserved refusal, legal move, rejected
 * rollback) can be asserted directly without driving a real dnd-kit drag
 * through jsdom — the component wires it to `onMove` unchanged.
 *
 * Keyboard operability (33-UI-SPEC A-5, a hard acceptance gate): `KanbanItem`
 * spreads dnd-kit's `attributes` (`tabIndex`, `role`, `aria-roledescription`)
 * onto its own root, while the drag-start `listeners` reach only
 * `KanbanItemHandle` via `ItemContext`. Composing them as
 * `<KanbanItem value={id} render={<KanbanItemHandle cursor />}>` merges both
 * onto the SAME DOM node — `KanbanItemHandle`'s own `data-slot`/`data-dragging`
 * defaults lose to the outer, already-merged props (external props win in
 * `mergeProps`), so the final node still carries `data-slot="kanban-item"`
 * while gaining the pointer/keyboard listeners `KanbanItemHandle` alone
 * would have kept on a second node. Verified against the vendored
 * primitive's actual merge order before writing this composition.
 */
import { useState, type ReactNode } from 'react';
import type React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';

import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanMoveEvent,
} from '@/components/reui/kanban';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PipelineCard } from './PipelineCard';
import { PipelineColumnHeader } from './PipelineColumnHeader';
import { cn } from '@/lib/utils';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { stageLabel } from '@/lib/pipeline/format';
import { advanceRelationshipStageAction } from '@/lib/pipeline/actions';
import {
  PARTNER_SETTABLE_STAGES,
  PIPELINE_STAGES,
  isReservedStage,
  type PipelineStage,
} from '@/lib/pipeline/stages';
import type { PipelineCardRow } from '@/lib/db/queries/pipeline';

export interface PipelineBoardProps {
  initial: Record<PipelineStage, PipelineCardRow[]>;
  lang: Lang;
}

/**
 * Lane surfaces, adopted from ReUI's `kanban-board-1` block at the 33-09
 * acceptance checkpoint: every lane is a bordered, faintly tinted section of
 * one fixed width. Tints use only feedback tokens (`--warning`, `--success`,
 * `--destructive`, `--muted`) — none alias `--brand-accent`, so UIC-03's
 * four-item accent reserve list for this surface is untouched. The two
 * reserved lanes are dashed and quieter than everything else (D-04).
 */
const LANE_SURFACE: Record<PipelineStage, string> = {
  prospect: 'border-border bg-muted/25 dark:bg-muted/10',
  qualifie: 'border-border bg-muted/25 dark:bg-muted/10',
  proposition_envoyee:
    'border-warning/20 bg-warning/[0.045] dark:border-warning/25 dark:bg-warning/10',
  negociation: 'border-success/20 bg-success/[0.045] dark:border-success/25 dark:bg-success/10',
  perdu:
    'border-destructive/20 bg-destructive/[0.045] dark:border-destructive/25 dark:bg-destructive/10',
  signe: 'border-dashed border-border bg-muted/15 dark:bg-muted/5',
  debloque: 'border-dashed border-border bg-muted/15 dark:bg-muted/5',
};

const COLUMN_WIDTH = 'w-[17.5rem] min-w-[17.5rem] rounded-container';

const LANE_NOTICE_CLASS =
  'rounded-container border border-dashed border-border/70 bg-background/55 px-3 py-6 text-center text-xs text-muted-foreground transition-colors';

/**
 * The vendored `deal-pipeline.tsx`'s `BoardScrollArea`, copied near-verbatim
 * (33-UI-SPEC's prescribed horizontal-scroll-inside-capped-`<main>`
 * mechanism, UIC-09) — the board scrolls, the shell's `<main>` never widens.
 */
function BoardScrollArea({ children }: { children: ReactNode }) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className="relative w-full min-w-0 overflow-hidden pb-3"
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 w-full overflow-x-auto overflow-y-hidden transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        <ScrollAreaPrimitive.Content data-slot="scroll-area-content" className="w-max min-w-full">
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        data-slot="scroll-area-scrollbar"
        data-orientation="horizontal"
        orientation="horizontal"
        className="flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent"
      >
        <ScrollAreaPrimitive.Thumb
          data-slot="scroll-area-thumb"
          className="bg-foreground/15 relative flex-1 rounded-full"
        />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

export interface HandleKanbanMoveArgs {
  activeContainer: string;
  activeIndex: number;
  overContainer: string;
  overIndex: number;
  columns: Record<PipelineStage, PipelineCardRow[]>;
  setColumns: (columns: Record<PipelineStage, PipelineCardRow[]>) => void;
  lang: Lang;
  refresh: () => void;
}

/**
 * D-09.2 — the phase's ONLY desktop stage-write call site. Three branches:
 *
 * 1. Same-lane reorder (`overContainer === activeContainer`) — not a stage
 *    change; no state update, no server call (T-33-07-08).
 * 2. Reserved-lane drop (layer 3 of D-09.1's three-layer refusal) — no
 *    `setColumns` at all, so dnd-kit's own drop animation returns the card
 *    to its origin; a toast explains why. This branch runs identically for
 *    pointer, touch AND `KeyboardSensor` drags, so it protects keyboard
 *    users automatically.
 * 3. A legal move — optimistic `setColumns`, then the single deliberate
 *    mutation. Success: `refresh()`, no toast (the new position IS the
 *    confirmation). Rejection: roll back to `previous`, toast the bounded
 *    error key.
 */
export async function handleKanbanMove({
  activeContainer,
  activeIndex,
  overContainer,
  overIndex,
  columns,
  setColumns,
  lang,
  refresh,
}: HandleKanbanMoveArgs): Promise<void> {
  if (overContainer === activeContainer) {
    return;
  }

  if (isReservedStage(overContainer)) {
    toast.error(t('pipeline.toast.dropRefused', lang));
    return;
  }

  const activeRows = columns[activeContainer as PipelineStage];
  const movedRow = activeRows?.[activeIndex];
  if (!movedRow) {
    return;
  }

  const previous = columns;
  const nextActive = [...activeRows];
  nextActive.splice(activeIndex, 1);
  const overRows = columns[overContainer as PipelineStage];
  const nextOver = [...overRows];
  nextOver.splice(overIndex, 0, movedRow);

  setColumns({ ...columns, [activeContainer]: nextActive, [overContainer]: nextOver });

  try {
    await advanceRelationshipStageAction({
      relationshipId: movedRow.relationshipId,
      toStage: overContainer,
    });
    refresh();
  } catch {
    setColumns(previous);
    toast.error(t('pipeline.toast.error', lang));
  }
}

export function PipelineBoard({ initial, lang }: PipelineBoardProps) {
  const router = useRouter();
  const [columns, setColumns] = useState(initial);
  // A single boolean — there is only ever one `Perdu` column on the board.
  // Controlled (not `defaultOpen`) because the trigger's own label text
  // depends on the open state, and `CollapsibleTrigger`'s `children` is a
  // plain `ReactNode` (no render-prop form) per Base UI's own types.
  const [perduOpen, setPerduOpen] = useState(false);

  // Reseeds local state whenever `initial`'s identity changes — the escape
  // hatch that lets `router.refresh()` (called on a successful move) bring
  // the server-rendered prop and this board's local state back in sync.
  //
  // Rule 1 auto-fix: the plan's own text specifies "a useEffect that
  // reseeds from initial", but this codebase's `eslint --max-warnings=0`
  // gate enforces `react-hooks/set-state-in-effect`, which rejects a
  // setState call synchronously inside a useEffect body. React's own
  // documented alternative — comparing against the previous prop identity
  // DURING RENDER and calling setState conditionally there — achieves the
  // identical reseed-on-identity-change behavior without an effect at all.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setColumns(initial);
  }

  const onMove = (event: KanbanMoveEvent) =>
    handleKanbanMove({
      activeContainer: event.activeContainer,
      activeIndex: event.activeIndex,
      overContainer: event.overContainer,
      overIndex: event.overIndex,
      columns,
      setColumns,
      lang,
      refresh: () => router.refresh(),
    });

  /**
   * A-5 keyboard operability, deterministic path. dnd-kit's KeyboardSensor
   * (Space → arrows → Space) stays wired through KanbanItemHandle, but it
   * proved unreliable in real browsers at the 33-09 acceptance checkpoint,
   * so a focused card also moves directly with ArrowLeft / ArrowRight
   * between the partner-settable stages. The reserved lanes are simply not
   * in that list (D-04), and every move still flows through
   * `handleKanbanMove` — the single stage-write call site (D-09.2).
   *
   * The two paths are mutually exclusive by construction: `onItemKeyDown`
   * stands down while a dnd-kit drag is live (33-REVIEW WR-02), so a stage
   * change is written exactly once whichever path the partner uses.
   */
  const moveByKeyboard = (row: PipelineCardRow, stage: PipelineStage, direction: -1 | 1) => {
    const settable = PARTNER_SETTABLE_STAGES as readonly PipelineStage[];
    const target = settable[settable.indexOf(stage) + direction];
    if (!target) return;
    void handleKanbanMove({
      activeContainer: stage,
      activeIndex: columns[stage].findIndex((r) => r.relationshipId === row.relationshipId),
      overContainer: target,
      overIndex: columns[target].length,
      columns,
      setColumns,
      lang,
      refresh: () => router.refresh(),
    });
  };

  const onItemKeyDown = (row: PipelineCardRow, stage: PipelineStage) => (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return; // only when the card itself is focused
    // 33-REVIEW WR-02: dnd-kit's activator listeners (its own onKeyDown among
    // them) are merged onto THIS node by `render={<KanbanItemHandle cursor />}`.
    // Once a keyboard drag is active, an arrow would fire dnd-kit's drag-move
    // AND this direct path, and committing with Space would then write the
    // stage a second time from indices computed against a stale `columns`
    // closure — two audit rows and a stage the partner never chose. While a
    // drag is live, dnd-kit owns the arrow keys.
    if (event.currentTarget.dataset.dragging === 'true') return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      moveByKeyboard(row, stage, event.key === 'ArrowRight' ? 1 : -1);
    }
  };

  const renderCards = (stage: PipelineStage, rows: PipelineCardRow[]) => (
    <KanbanColumnContent value={stage} className="min-h-28 gap-2">
      {rows.length > 0 ? (
        rows.map((row) => (
          <KanbanItem
            key={row.relationshipId}
            value={row.relationshipId}
            render={<KanbanItemHandle cursor />}
            aria-keyshortcuts="ArrowLeft ArrowRight"
            onKeyDown={onItemKeyDown(row, stage)}
          >
            <PipelineCard row={row} lang={lang} />
          </KanbanItem>
        ))
      ) : (
        <div className={LANE_NOTICE_CLASS}>{t('pipeline.lane.empty', lang)}</div>
      )}
    </KanbanColumnContent>
  );

  return (
    <Kanban
      value={columns}
      onValueChange={setColumns}
      getItemValue={(row) => row.relationshipId}
      onMove={onMove}
      restoreOnCancel
      className="w-full"
    >
      <p id="pipeline-keyboard-hint" className="sr-only">
        {t('pipeline.board.keyboardHint', lang)}
      </p>
      <BoardScrollArea>
        <KanbanBoard className="grid min-w-max auto-cols-[17.5rem] grid-flow-col grid-cols-none gap-3 px-1 pb-2">
          {PIPELINE_STAGES.map((stage) => {
            const rows = columns[stage];
            const reserved = isReservedStage(stage);
            const isPerdu = stage === 'perdu';

            return (
              <KanbanColumn
                key={stage}
                value={stage}
                // 33-REVIEW WR-01: a reserved lane must stay a DROP TARGET
                // while refusing to be dragged. A bare `disabled` turned off
                // the droppable too, so a card released over Signé resolved
                // `over` to null, `onMove` never ran, and D-09.1's third layer
                // — the explanatory refusal toast — was unreachable: the card
                // just snapped back with no reason given, which D-09.1 itself
                // calls worse than a lane that reads as unreachable. The
                // refusal now happens where it belongs, in `handleKanbanMove`.
                disabled={reserved ? { draggable: true, droppable: false } : false}
                className={COLUMN_WIDTH}
              >
                <section
                  className={cn(
                    'flex min-h-[16rem] flex-col gap-2 rounded-container border p-2.5 transition-colors',
                    LANE_SURFACE[stage],
                  )}
                  aria-label={stageLabel(stage, lang)}
                >
                  <PipelineColumnHeader stage={stage} count={rows.length} lang={lang} />

                  {reserved ? (
                    // Layer 1 of D-09.1 — always-on visual muting, drag-independent.
                    // No KanbanColumnContent for a reserved lane: it never carries
                    // cards, so there is nothing to make sortable.
                    <div className={LANE_NOTICE_CLASS}>
                      {t('pipeline.lane.reserved.caption', lang)}
                    </div>
                  ) : isPerdu ? (
                    // Perdu is partner-settable (D-03), so it still gets a real
                    // KanbanColumnContent — only its default visibility is
                    // reduced, never its function. Closed by default.
                    <Collapsible open={perduOpen} onOpenChange={setPerduOpen}>
                      <CollapsibleTrigger className="px-0.5 text-left text-xs text-muted-foreground hover:text-foreground">
                        {perduOpen
                          ? t('pipeline.perdu.disclosure.hide', lang)
                          : t('pipeline.perdu.disclosure.show', lang).replace(
                              '{n}',
                              String(rows.length),
                            )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">{renderCards(stage, rows)}</CollapsibleContent>
                    </Collapsible>
                  ) : (
                    renderCards(stage, rows)
                  )}
                </section>
              </KanbanColumn>
            );
          })}
        </KanbanBoard>
      </BoardScrollArea>

      {/* The block's drag preview: without a KanbanOverlay dnd-kit shows no
          lifted card while dragging. Columns are never draggable here. */}
      <KanbanOverlay>
        {({ value, variant }) => {
          if (variant === 'column') return null;
          const row = Object.values(columns)
            .flat()
            .find((candidate) => candidate.relationshipId === value);
          return row ? (
            <div className="w-[17.5rem]">
              <PipelineCard row={row} lang={lang} isOverlay />
            </div>
          ) : null;
        }}
      </KanbanOverlay>
    </Kanban>
  );
}
