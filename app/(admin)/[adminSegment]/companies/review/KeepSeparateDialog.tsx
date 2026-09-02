'use client';

/**
 * Phase 31 Plan 06 Task 3 — KeepSeparateDialog (D-09, IMPORT-05,
 * 31-UI-SPEC.md §3).
 *
 * shadcn `AlertDialog` — pure confirm, no input, modelled on
 * `DeleteContactDialog`'s existing pattern, with one deliberate difference:
 * the confirm action is NOT destructive-colored. Nothing is deleted here —
 * the permanence is temporal ("never re-flagged"), not data loss.
 *
 * DEVIATION (Rule 1 — internal inconsistency inside 31-UI-SPEC.md itself,
 * not a plan-vs-spec conflict): §3 states the confirm button should be left
 * at "the primitive's own default, which is variant='outline'" — but
 * `AlertDialogAction` in `src/components/ui/alert-dialog.tsx` sets no
 * default variant of its own; it forwards straight to `Button`, whose own
 * default is `variant="default"` (bg-primary). Leaving the prop unset would
 * render this confirm button on `--primary`, directly violating the SAME
 * document's Color section, which reserves --primary for exactly one use on
 * this surface (the company-name link hover) and requires every button to be
 * `variant="outline"` or the destructive-red merge-confirm variant.
 * `variant="outline"` is set explicitly below to satisfy that reserved-accent
 * contract, which is the unambiguous, load-bearing instruction here — see
 * 31-06-SUMMARY.md.
 *
 * `AlertDialogContent` carries the Container Radius contract's
 * `rounded-[24px]` override, same literal as `MergeDialog`.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { keepPairSeparateAction } from '@/lib/reconcile/actions';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { AdminPendingPairRow } from '@/lib/db/queries';

export interface KeepSeparateDialogProps {
  /** The pair pending a keep-separate decision, or null when none is in flight. */
  pair: AdminPendingPairRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
}

export function KeepSeparateDialog({ pair, open, onOpenChange, lang }: KeepSeparateDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onConfirm = async () => {
    if (!pair) return;
    setIsSubmitting(true);
    try {
      await keepPairSeparateAction(pair.pairId);
      toast.success(t('admin.reconciliation.keepSeparate.toast.success', lang));
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t('admin.reconciliation.toast.error', lang));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[24px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('admin.reconciliation.keepSeparate.title', lang)}</AlertDialogTitle>
          <AlertDialogDescription>
            {pair
              ? t('admin.reconciliation.keepSeparate.description', lang)
                  .replace('{companyA}', pair.sideA.name)
                  .replace('{companyB}', pair.sideB.name)
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            {t('admin.reconciliation.keepSeparate.cancel', lang)}
          </AlertDialogCancel>
          <AlertDialogAction variant="outline" disabled={isSubmitting} onClick={onConfirm}>
            {t('admin.reconciliation.keepSeparate.confirm', lang)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
