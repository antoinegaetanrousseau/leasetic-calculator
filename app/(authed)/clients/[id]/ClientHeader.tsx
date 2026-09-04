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
import { DeleteClientDialog } from './DeleteClientDialog';
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
type OpenDialog = 'company' | 'nextAction' | 'delete' | null;

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

/**
 * A partner-entered website as a SAFE http(s) href, or null.
 *
 * `updateCompanyDisplaySchema` validates `website` as "no whitespace, at
 * least one dot" — deliberately loose, because partners type `example.com`.
 * That check passes `javascript:alert(1).x`, so the stored value must never
 * reach an `href` unexamined: this is partner-supplied text being turned into
 * a navigable target, which is exactly the shape that becomes a stored XSS
 * when it is trusted. Anything that is not http or https renders as plain
 * text instead, so a bad value is inert rather than rejected.
 *
 * A value carrying no scheme at all gets `https://`, which is what a partner
 * typing a bare domain means.
 */
export function toSafeHttpUrl(raw: string | null): string | null {
  if (raw === null) return null;
  const value = raw.trim();
  if (value.length === 0) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  let parsed: URL;
  try {
    parsed = new URL(hasScheme ? value : `https://${value}`);
  } catch {
    return null;
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
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
  // Shared display tier (D-01): partner-owned, unlike everything on the
  // identity panel. Both were editable from this header since 34-12 and
  // rendered nowhere, so a partner could save a phone number and never see it
  // again.
  const websiteHref = toSafeHttpUrl(company.website);

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
        {/* Destructive, so a quiet ghost beside the primary edit rather than a
            second outlined button competing with it. The confirmation carries
            the weight, not the trigger. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="client-header-delete"
          onClick={() => setOpenDialog('delete')}
        >
          {t('clients.detail.delete.trigger', lang)}
        </Button>
      </div>

      {(company.phone !== null || company.website !== null) && (
        <div
          data-testid="client-header-contact"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground"
        >
          {company.phone !== null && (
            <span data-testid="client-header-phone">{company.phone}</span>
          )}
          {company.website !== null &&
            (websiteHref !== null ? (
              <a
                data-testid="client-header-website"
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {company.website}
              </a>
            ) : (
              /* Not an http(s) URL — shown, but never made navigable. */
              <span data-testid="client-header-website">{company.website}</span>
            ))}
        </div>
      )}

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
      <DeleteClientDialog
        open={openDialog === 'delete'}
        onOpenChange={(open) => setOpenDialog(open ? 'delete' : null)}
        relationshipId={relationshipId}
        companyName={companyName}
        lang={lang}
      />
    </div>
  );
}
