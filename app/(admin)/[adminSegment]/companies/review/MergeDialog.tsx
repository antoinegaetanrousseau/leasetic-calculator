'use client';

/**
 * Phase 31 Plan 06 Task 3 — MergeDialog (D-12, IMPORT-05, 31-UI-SPEC.md §2).
 *
 * shadcn `Dialog` — not `AlertDialog` — because merging needs a decision
 * input (which company survives) that `AlertDialog` has no room for. First
 * real-app adoption of `RadioGroup`/`RadioGroupItem` outside primitive-
 * internal usage (31-UI-SPEC.md Component Inventory).
 *
 * `DialogContent` carries the Container Radius contract's `rounded-[24px]`
 * override — the first application of that literal to dialog chrome in this
 * app (LOCKED — do not converge this to the token-derived `rounded-4xl`
 * default here; that convergence is Phase 31.1's job, not this plan's).
 *
 * Destructive colouring is earned: the merge deletes the loser company
 * (D-12), so only the submit action carries the destructive-red button
 * variant — the row triggers on `PairReviewCard` stay neutral.
 */
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangleIcon } from '@/components/ui/icons';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { mergeCompanyPairAction } from '@/lib/reconcile/actions';
import type { AdminPairSide, AdminPendingPairRow } from '@/lib/db/queries';
import { pairSideCountsLine } from './PairReviewCard';

export interface MergeDialogProps {
  /** The pair pending a merge decision, or null when no merge is in flight. */
  pair: AdminPendingPairRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
}

/**
 * UI-SPEC Assumption A-3 (Claude's discretion, not a locked decision): the
 * side with more linked proposals is the strongest "this is the real
 * record" signal; tie-break on relationship count, then side A. This
 * heuristic is independent of the extraction engine's own OQ-2
 * canonical-name rule (31-CONTEXT.md) — it covers only the human-review
 * path this dialog renders.
 */
export function defaultSurvivorId(pair: AdminPendingPairRow): string {
  const { sideA, sideB } = pair;
  if (sideA.proposalsCount !== sideB.proposalsCount) {
    return sideA.proposalsCount > sideB.proposalsCount ? sideA.companyId : sideB.companyId;
  }
  if (sideA.relationsCount !== sideB.relationsCount) {
    return sideA.relationsCount > sideB.relationsCount ? sideA.companyId : sideB.companyId;
  }
  return sideA.companyId;
}

function SurvivorOption({ side, lang }: { side: AdminPairSide; lang: Lang }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
      <RadioGroupItem value={side.companyId} className="mt-0.5" />
      <span className="flex flex-col gap-1">
        <span className="text-[14.5px] font-semibold text-foreground">{side.name}</span>
        <span className="text-[13px] text-muted-foreground">{side.siren ?? '—'}</span>
        <span className="text-[13px] text-muted-foreground">{pairSideCountsLine(side, lang)}</span>
      </span>
    </label>
  );
}

export function MergeDialog({ pair, open, onOpenChange, lang }: MergeDialogProps) {
  const router = useRouter();
  const [survivorId, setSurvivorId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // "Adjusting state when a prop changes" (React docs) — setState called
  // during render, not inside an effect, so the default survivor is seeded
  // synchronously the instant a new pair opens in this dialog, with no
  // cascading-render effect warning and no stale-default flash.
  const [seenPairId, setSeenPairId] = useState<string | null>(null);
  if (pair && pair.pairId !== seenPairId) {
    setSeenPairId(pair.pairId);
    setSurvivorId(defaultSurvivorId(pair));
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pair || !survivorId) return;
    setIsSubmitting(true);
    try {
      await mergeCompanyPairAction(pair.pairId, survivorId);
      toast.success(t('admin.reconciliation.merge.toast.success', lang));
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t('admin.reconciliation.toast.error', lang));
      // Dialog stays open so the admin can retry without re-choosing.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[24px]">
        <DialogHeader>
          <DialogTitle>{t('admin.reconciliation.merge.title', lang)}</DialogTitle>
        </DialogHeader>

        {pair && (
          <form onSubmit={onSubmit} noValidate aria-busy={isSubmitting || undefined}>
            <DialogDescription className="text-sm text-muted-foreground">
              {t('admin.reconciliation.merge.description', lang)
                .replace('{companyA}', pair.sideA.name)
                .replace('{companyB}', pair.sideB.name)}
            </DialogDescription>

            {pair.compoundMergeWarning && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-3 text-[13px] text-destructive">
                <AlertTriangleIcon size={16} className="mt-0.5 shrink-0" />
                <span>
                  {t('admin.reconciliation.compound.warning', lang).replace(
                    '{owner}',
                    pair.compoundMergeWarning.ownerName,
                  )}
                </span>
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <span className="text-[13px] font-medium text-foreground">
                {t('admin.reconciliation.merge.survivorLabel', lang)}
              </span>
              <RadioGroup value={survivorId ?? undefined} onValueChange={(value) => setSurvivorId(value as string)}>
                <SurvivorOption side={pair.sideA} lang={lang} />
                <SurvivorOption side={pair.sideB} lang={lang} />
              </RadioGroup>
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" disabled={isSubmitting} />}>
                {t('admin.reconciliation.merge.cancel', lang)}
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting || !survivorId}
                aria-busy={isSubmitting || undefined}
              >
                {t('admin.reconciliation.merge.confirm', lang)}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
