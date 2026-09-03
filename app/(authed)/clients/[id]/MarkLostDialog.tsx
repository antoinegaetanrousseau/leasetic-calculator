'use client';

/**
 * Phase 33 Plan 06 Task 2 — MarkLostDialog (PIPE-03).
 *
 * MarkWonDialog's single-phase sibling: same chrome, same field
 * composition, same retry-without-re-entering-data discipline. No inline
 * gate reveal at all — D-07's paperwork gate applies only at `won`. This
 * module must never import the won-only gate sentinel.
 */
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
import { markLostSchema } from '@/lib/pipeline/schemas';
import { markProposalLostAction } from '@/lib/pipeline/actions';

export interface MarkLostDialogProps {
  proposalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
}

// proposalId excluded — it is a prop, never a form field.
const markLostFormSchema = markLostSchema.omit({ proposalId: true });
type MarkLostFormValues = z.input<typeof markLostFormSchema>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MarkLostDialog({ proposalId, open, onOpenChange, lang }: MarkLostDialogProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MarkLostFormValues>({
    resolver: zodResolver(markLostFormSchema),
    defaultValues: { date: todayIso(), reason: undefined },
  });

  const onSubmit = async (data: MarkLostFormValues) => {
    try {
      await markProposalLostAction({ proposalId, date: data.date, reason: data.reason });
      toast.success(t('pipeline.outcome.lost.toast.success', lang));
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t('pipeline.toast.error', lang));
      // Dialog stays open so the partner can retry without re-entering data.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pipeline.outcome.lost.title', lang)}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting || undefined}>
          <Field>
            <FieldLabel htmlFor="mark-lost-date">
              {t('pipeline.outcome.lost.dateLabel', lang)}
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Input
              id="mark-lost-date"
              type="date"
              aria-invalid={errors.date ? true : undefined}
              aria-describedby={errors.date ? 'mark-lost-date-error' : undefined}
              disabled={isSubmitting}
              {...register('date')}
            />
            {errors.date?.message && (
              <FieldError id="mark-lost-date-error" role="alert">
                {t(errors.date.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="mark-lost-reason">
              {t('pipeline.outcome.won.reasonLabel', lang)}
            </FieldLabel>
            <Input
              id="mark-lost-reason"
              type="text"
              autoComplete="off"
              disabled={isSubmitting}
              {...register('reason')}
            />
          </Field>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={isSubmitting} />}>
              {t('pipeline.outcome.cancel', lang)}
            </DialogClose>
            {/*
              Deliberately variant="outline" — NOT "default" (this dialog
              deletes nothing, so it isn't the positive/accent-filled Won
              confirm) and NOT "destructive" (marking lost deletes no data,
              unlike Phase 31's Merge, so the destructive token doesn't
              apply either). This is an intentional asymmetry with
              MarkWonDialog's confirm button — see 33-UI-SPEC.md § "Lost
              dialog" — not an inconsistency for a future checker to flag.
            */}
            <Button
              type="submit"
              variant="outline"
              disabled={isSubmitting}
              aria-busy={isSubmitting || undefined}
            >
              {t('pipeline.outcome.lost.submit', lang)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
