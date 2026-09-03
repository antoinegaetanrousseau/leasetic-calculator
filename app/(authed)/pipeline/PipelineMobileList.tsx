'use client';

/**
 * Phase 33 Plan 07 Task 2 — PipelineMobileList (PIPE-01, PIPE-02, PIPE-04).
 * Below `md` there is no drag at all (33-UI-SPEC § "Mobile — no drag-and-
 * drop"): a stack of disclosure sections, one per stage in fixed D-01 order,
 * each card followed by an explicit stage `Select` that calls the SAME
 * server action `PipelineBoard`'s `onMove` calls — one write path, two
 * entry points (D-09.2).
 *
 * Deliberately imports nothing from the drag-and-drop library or the
 * vendored kanban primitive (T-33-07-07) — this file ships to every phone
 * regardless of whether the partner ever opens the desktop board.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PipelineCard } from './PipelineCard';
import { PipelineColumnHeader } from './PipelineColumnHeader';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { advanceRelationshipStageAction } from '@/lib/pipeline/actions';
import { PIPELINE_STAGES, isReservedStage, type PipelineStage } from '@/lib/pipeline/stages';
import { stageLabel } from '@/lib/pipeline/format';
import type { PipelineCardRow } from '@/lib/db/queries/pipeline';

export interface PipelineMobileListProps {
  initial: Record<PipelineStage, PipelineCardRow[]>;
  lang: Lang;
}

/** `perdu` starts collapsed, matching the board's own default; the other four start open. */
const DEFAULT_OPEN_STAGES: Record<PipelineStage, boolean> = {
  prospect: true,
  qualifie: true,
  proposition_envoyee: true,
  negociation: true,
  perdu: false,
  signe: false,
  debloque: false,
};

export interface HandleMobileStageChangeArgs {
  row: PipelineCardRow;
  toStage: string;
  columns: Record<PipelineStage, PipelineCardRow[]>;
  setColumns: (columns: Record<PipelineStage, PipelineCardRow[]>) => void;
  lang: Lang;
  refresh: () => void;
}

/**
 * D-09.2 — the SAME single deliberate mutation `PipelineBoard`'s
 * `handleKanbanMove` calls, reached through a `Select` instead of a drag.
 * Selecting the card's own current stage is a no-op: no state change, no
 * action call.
 */
export async function handleMobileStageChange({
  row,
  toStage,
  columns,
  setColumns,
  lang,
  refresh,
}: HandleMobileStageChangeArgs): Promise<void> {
  if (toStage === row.stage) {
    return;
  }

  const fromStage = row.stage;
  const previous = columns;
  const nextFrom = columns[fromStage].filter((r) => r.relationshipId !== row.relationshipId);
  const movedRow: PipelineCardRow = { ...row, stage: toStage as PipelineStage };
  const nextTo = [...columns[toStage as PipelineStage], movedRow];

  setColumns({ ...columns, [fromStage]: nextFrom, [toStage]: nextTo });

  try {
    await advanceRelationshipStageAction({ relationshipId: row.relationshipId, toStage });
    refresh();
  } catch {
    setColumns(previous);
    toast.error(t('pipeline.toast.error', lang));
  }
}

/**
 * `Select.Value` only resolves a label from its rendered `Select.Item`s once
 * the popup has been opened at least once — passing `items` up front lets
 * the trigger show the resolved stage label (not the raw enum value) on
 * first paint, before the partner has ever opened the picker.
 */
function buildStageItems(lang: Lang): Record<PipelineStage, string> {
  const reservedSuffix = t('pipeline.mobile.stagePicker.reservedSuffix', lang);
  return Object.fromEntries(
    PIPELINE_STAGES.map((s) => [
      s,
      isReservedStage(s) ? `${stageLabel(s, lang)} ${reservedSuffix}` : stageLabel(s, lang),
    ]),
  ) as Record<PipelineStage, string>;
}

export function PipelineMobileList({ initial, lang }: PipelineMobileListProps) {
  const router = useRouter();
  const [columns, setColumns] = useState(initial);
  const stageItems = buildStageItems(lang);

  // Same render-time reseed as PipelineBoard (see its own comment) — avoids
  // `react-hooks/set-state-in-effect`, which this repo's `eslint
  // --max-warnings=0` gate enforces.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setColumns(initial);
  }

  const [openStages, setOpenStages] =
    useState<Record<PipelineStage, boolean>>(DEFAULT_OPEN_STAGES);

  return (
    <div className="flex flex-col gap-2">
      {PIPELINE_STAGES.map((stage) => {
        const rows = columns[stage];

        if (isReservedStage(stage)) {
          // Reserved stages render the same header treatment (Réservé badge
          // + BanIcon) with no disclosure caret — there is nothing to
          // expand into.
          return (
            <div key={stage} className="rounded-lg border border-border p-3">
              <PipelineColumnHeader stage={stage} count={0} lang={lang} />
            </div>
          );
        }

        const open = openStages[stage];

        return (
          <Collapsible
            key={stage}
            open={open}
            onOpenChange={(next) => setOpenStages((prev) => ({ ...prev, [stage]: next }))}
            className="rounded-lg border border-border p-3"
          >
            <CollapsibleTrigger className="w-full text-left">
              <PipelineColumnHeader stage={stage} count={rows.length} lang={lang} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 flex flex-col gap-3">
              {rows.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  {t('pipeline.mobile.accordion.empty', lang)}
                </p>
              ) : (
                rows.map((row) => (
                  <div key={row.relationshipId} className="flex flex-col gap-2">
                    <PipelineCard row={row} lang={lang} />
                    <Select
                      items={stageItems}
                      value={row.stage}
                      onValueChange={(value) =>
                        handleMobileStageChange({
                          row,
                          toStage: String(value),
                          columns,
                          setColumns,
                          lang,
                          refresh: () => router.refresh(),
                        })
                      }
                    >
                      <SelectTrigger
                        aria-label={t('pipeline.mobile.stagePicker.label', lang)}
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PIPELINE_STAGES.map((s) => (
                          <SelectItem key={s} value={s} disabled={isReservedStage(s)}>
                            {isReservedStage(s)
                              ? `${stageLabel(s, lang)} ${t('pipeline.mobile.stagePicker.reservedSuffix', lang)}`
                              : stageLabel(s, lang)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
