/**
 * Phase 33 Plan 05 — the three-state lane header (D-09 "the three lane
 * states, and why they must look different").
 *
 * `data-lane-state` (`reserved` / `terminal` / `active`) is a stable test
 * hook, the same discipline `MetricTile`'s `data-variant` established — the
 * tests assert semantics rather than colour classes.
 *
 * T-33-05-03: the reserved branch replaces the numeric count with a
 * "Réservé" badge and never renders a real "0" — a real zero would read as
 * "empty and waiting to be filled", and D-04 requires these lanes read as
 * not-yet-reachable instead.
 */
import { Badge } from '@/components/ui/badge';
import { BanIcon } from '@/components/ui/icons';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { stageLabel } from '@/lib/pipeline/format';
import { isReservedStage, type PipelineStage } from '@/lib/pipeline/stages';

export interface PipelineColumnHeaderProps {
  stage: PipelineStage;
  count: number;
  lang: Lang;
}

export function PipelineColumnHeader({ stage, count, lang }: PipelineColumnHeaderProps) {
  const label = stageLabel(stage, lang);

  if (isReservedStage(stage)) {
    return (
      <div data-lane-state="reserved" className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[14px] font-semibold text-muted-foreground">
          <BanIcon size={16} aria-hidden="true" />
          {label}
        </span>
        <Badge variant="secondary">{t('pipeline.lane.reserved.badge', lang)}</Badge>
      </div>
    );
  }

  // `Perdu` is a terminal but fully partner-settable stage (D-03) — its
  // header gets the same real count badge every active lane gets, never any
  // part of the reserved treatment. Only the label colour is muted.
  const isTerminal = stage === 'perdu';

  return (
    <div
      data-lane-state={isTerminal ? 'terminal' : 'active'}
      className="flex items-center justify-between gap-2"
    >
      <span
        className={`text-[14px] font-semibold ${isTerminal ? 'text-muted-foreground' : 'text-foreground'}`}
      >
        {label}
      </span>
      <Badge variant="outline" className="bg-background">
        {count}
      </Badge>
    </div>
  );
}
