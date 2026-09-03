'use client';

/**
 * Phase 33 Plan 06 Task 2 — ProposalOutcomeControl (PIPE-03, PIPE-05, D-06).
 *
 * Rendered as `ProposalRow`'s `actionsSlot` (Phase 26's extension point).
 * Renders exactly one of four states, driven by the server-derived
 * `outcome` (`DisplayOutcome`, plan 33-03's `deriveProposalOutcome`):
 *
 *   'won'         -> a single badge, no buttons.
 *   'lost'        -> a single badge, no buttons.
 *   'unanswered'  -> the derived muted badge PLUS both trigger buttons —
 *                    D-06 is explicit that a derived value never removes
 *                    the ability to record an explicit one.
 *   null          -> both trigger buttons, no badge.
 *
 * There is deliberately no third "mark as unanswered" trigger anywhere in
 * this component — `unanswered` is derived, never stored (D-06), and
 * `proposals_outcome_check` (plan 33-01) would reject it as a stored value.
 *
 * The single root element below carries the resolved state as a stable
 * test hook. Wrapped in a `stopPropagation` handler, matching
 * `RowActionsClient`'s precedent for actionsSlot content on a clickable
 * `ProposalRow`.
 *
 * Trigger shape (33-09 acceptance correction): the UI-SPEC's two
 * `size="sm"` text buttons overflowed `ProposalRow`'s fixed-track grid at
 * laptop width once the sidebar is open. The triggers are now the 32px
 * icon buttons Phase 26 established for row actions, with the spec's
 * labels carried as `aria-label` + `title` so the accessible name — and
 * therefore every test and acceptance step that clicks "Marquer gagné" /
 * "Marquer perdu" — is unchanged.
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircleIcon, XIcon } from '@/components/ui/icons';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { DisplayOutcome } from '@/lib/db/queries';
import { MarkWonDialog } from './MarkWonDialog';
import { MarkLostDialog } from './MarkLostDialog';

export interface ProposalOutcomeControlProps {
  proposalId: string;
  outcome: DisplayOutcome;
  lang: Lang;
}

type OutcomeState = 'won' | 'lost' | 'unanswered' | 'none';

export function ProposalOutcomeControl({
  proposalId,
  outcome,
  lang,
}: ProposalOutcomeControlProps) {
  const [openDialog, setOpenDialog] = useState<'won' | 'lost' | null>(null);
  const state: OutcomeState = outcome ?? 'none';
  // 'unanswered' or null (no explicit decision yet) — both render both
  // triggers; 'won'/'lost' (an explicit partner decision) render neither.
  const showTriggers = outcome === 'unanswered' || outcome === null;

  return (
    <div
      data-outcome-state={state}
      className="flex items-center justify-end gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {outcome === 'won' && (
        <Badge className="bg-success/15 text-success-foreground">
          {t('pipeline.outcome.badge.won', lang)}
        </Badge>
      )}
      {outcome === 'lost' && (
        <Badge className="bg-destructive/15 text-destructive">
          {t('pipeline.outcome.badge.lost', lang)}
        </Badge>
      )}
      {outcome === 'unanswered' && (
        <Badge className="bg-muted/50 text-muted-foreground">
          {t('pipeline.outcome.badge.unanswered', lang)}
        </Badge>
      )}
      {showTriggers && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t('pipeline.outcome.trigger.won', lang)}
            title={t('pipeline.outcome.trigger.won', lang)}
            onClick={() => setOpenDialog('won')}
          >
            <CheckCircleIcon size={16} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t('pipeline.outcome.trigger.lost', lang)}
            title={t('pipeline.outcome.trigger.lost', lang)}
            onClick={() => setOpenDialog('lost')}
          >
            <XIcon size={16} aria-hidden="true" />
          </Button>

          <MarkWonDialog
            proposalId={proposalId}
            open={openDialog === 'won'}
            onOpenChange={(next) => setOpenDialog(next ? 'won' : null)}
            lang={lang}
          />
          <MarkLostDialog
            proposalId={proposalId}
            open={openDialog === 'lost'}
            onOpenChange={(next) => setOpenDialog(next ? 'lost' : null)}
            lang={lang}
          />
        </>
      )}
    </div>
  );
}
