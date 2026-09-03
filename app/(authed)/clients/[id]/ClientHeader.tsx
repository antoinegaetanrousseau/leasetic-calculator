'use client';

/**
 * Phase 34 Plan 12 Task 2 — the client page header (FICHE-03, FICHE-05,
 * ACTV-04, PIPE-02, D-18).
 *
 * The header renders from the detail row alone, so it is available on every
 * tab at no extra query cost. It carries the two things a partner changes
 * most often — the pipeline stage and the next action — plus the shared-tier
 * edit, all in place, per D-18: there is no separate edit screen and no
 * page-wide edit mode.
 *
 * THE STAGE PICKER IS A SECOND ENTRY POINT, NOT A SECOND WRITE PATH. It calls
 * `advanceRelationshipStageAction`, the same action the board's drag and the
 * mobile list's picker call (Phase 33 D-09.2), and carries the same PIPE-02
 * rule: the two reserved stages are listed, visibly suffixed and disabled.
 * They exist in the vocabulary and are written only by the future
 * contract-tool integration, so offering them here would produce a write the
 * action refuses. Unlike the board there is no optimistic move to roll back —
 * the value is server state, so a failure simply toasts and the refresh never
 * happens, leaving the picker showing the truth.
 *
 * The picker reuses the mobile list's `aria-label` key: it is the same
 * control doing the same job, and one accessible name across both entry
 * points is what a partner expects. (Plan 34-01 owns the dictionary; this
 * plan adds no key to it.)
 *
 * ONE OPEN DIALOG AT A TIME. The state is a single nullable discriminant
 * rather than two booleans, so "both open" is not an expressible state rather
 * than a state that is merely avoided.
 *
 * The `catch` around the action is bounded and blind — it never inspects the
 * rejection it caught. A server action's thrown message is redacted in
 * production builds, so branching on one is a bug that only appears after
 * deploy (33-REVIEW CR-01).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import { advanceRelationshipStageAction } from '@/lib/pipeline/actions';
import { stageLabel } from '@/lib/pipeline/format';
import { PIPELINE_STAGES, isReservedStage, type PipelineStage } from '@/lib/pipeline/stages';
import { EditCompanyDialog } from './EditCompanyDialog';
import { NextActionDialog } from './NextActionDialog';

export interface ClientHeaderProps {
  relationshipId: string;
  companyName: string;
  siren: string | null;
  stage: PipelineStage;
  nextActionAt: Date | null;
  nextActionNote: string | null;
  /** The four shared-tier values EditCompanyDialog pre-fills with — and only those four. */
  company: {
    name: string;
    website: string | null;
    phone: string | null;
    siren: string | null;
  };
  lang: Lang;
}

/** Which dialog is open. `null` is closed; there is no "both" (see header). */
type OpenDialog = 'company' | 'nextAction' | null;

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

/**
 * `Select.Value` only resolves a label from its rendered items once the popup
 * has been opened at least once, so the map is passed up front — otherwise
 * the trigger shows the raw enum value on first paint.
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

export function ClientHeader({
  relationshipId,
  companyName,
  siren,
  stage,
  nextActionAt,
  nextActionNote,
  company,
  lang,
}: ClientHeaderProps) {
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const stageItems = buildStageItems(lang);

  const nextActionLabel = nextActionAt
    ? t('clients.detail.header.nextAction', lang).replace(
        '{0}',
        formatDate(nextActionAt, lang, DATE_OPTS),
      )
    : t('clients.detail.header.noNextAction', lang);

  const onStageChange = async (value: string) => {
    if (value === stage) {
      return;
    }

    try {
      await advanceRelationshipStageAction({ relationshipId, toStage: value });
      router.refresh();
    } catch {
      // Bounded and blind — the rejection itself is never inspected.
      toast.error(t('pipeline.toast.error', lang));
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[22px] font-bold">{companyName}</h1>
        {/* SIREN omitted entirely when null — never a dash in a header. */}
        {siren && <span className="text-[13px] text-muted-foreground">{siren}</span>}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ms-auto"
          onClick={() => setOpenDialog('company')}
        >
          {t('clients.detail.header.modify', lang)}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select items={stageItems} value={stage} onValueChange={(value) => onStageChange(String(value))}>
          <SelectTrigger
            aria-label={t('pipeline.mobile.stagePicker.label', lang)}
            className="w-auto min-w-52"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s} disabled={isReservedStage(s)}>
                {stageItems[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="client-header-next-action"
          onClick={() => setOpenDialog('nextAction')}
        >
          {nextActionLabel}
        </Button>
        {nextActionNote && (
          <span className="text-[13px] text-muted-foreground">{nextActionNote}</span>
        )}
      </div>

      <EditCompanyDialog
        open={openDialog === 'company'}
        onOpenChange={(open) => setOpenDialog(open ? 'company' : null)}
        relationshipId={relationshipId}
        defaultValues={company}
        lang={lang}
      />
      <NextActionDialog
        open={openDialog === 'nextAction'}
        onOpenChange={(open) => setOpenDialog(open ? 'nextAction' : null)}
        relationshipId={relationshipId}
        defaultValues={{
          // The shape an `<input type="date">` reads and writes.
          nextActionAt: nextActionAt ? nextActionAt.toISOString().slice(0, 10) : null,
          nextActionNote,
        }}
        lang={lang}
      />
    </div>
  );
}
