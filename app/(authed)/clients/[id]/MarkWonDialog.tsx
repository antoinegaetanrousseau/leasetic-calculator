'use client';

/**
 * Phase 33 Plan 06 Task 1 — MarkWonDialog (PIPE-03, PIPE-05, D-08).
 *
 * Same controlled `open`/`onOpenChange`-from-parent shape as
 * `ContactFormDialog`, and the same RHF + `zodResolver` + `z.input<typeof
 * schema>` + retry-without-re-entering-data discipline as
 * `CreateClientDialog`. `proposalId` is a prop, never a form field — it is
 * never user-editable.
 *
 * D-08's inline SIREN gate: `markProposalWonAction` submits optimistically.
 * Only when it rejects with the `SIREN_REQUIRED` sentinel (imported, never
 * re-declared as a literal) does this component reveal a third field,
 * below the still-filled date/reason fields — the whole point of D-08 is
 * that the partner never loses their place or their typed values. The gate
 * is discovered server-side (this plan's own decision record): the dialog
 * never pre-computes whether the company has a SIREN, it only reacts to
 * the server's answer.
 *
 * Every other failure collapses to the single bounded toast
 * (`pipeline.toast.error`) — the raw error is never inspected or rendered.
 *
 * Rule 3 auto-fix (see `@/lib/pipeline/constants`): `SIREN_REQUIRED` is
 * imported from `@/lib/pipeline/constants`, NOT from
 * `@/lib/pipeline/actions` — `actions.ts` carries `'use server'`, and
 * Next.js's Server Actions build fails any `'use server'` file exporting a
 * non-function value, which broke `npm run build` the moment this
 * component tried to import the sentinel from there.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SirenInput } from '@/components/proposal/SirenInput';
import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
import { markWonSchema } from '@/lib/pipeline/schemas';
import { markProposalWonAction } from '@/lib/pipeline/actions';

export interface MarkWonDialogProps {
  proposalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
}

// The pre-transform shape (proposalId excluded — it is a prop, never a form
// field), matching CreateClientDialog.tsx's z.input<...> + zodResolver
// convention.
const markWonFormSchema = markWonSchema.omit({ proposalId: true });
type MarkWonFormValues = z.input<typeof markWonFormSchema>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MarkWonDialog({ proposalId, open, onOpenChange, lang }: MarkWonDialogProps) {
  const router = useRouter();
  // The gate is a local state flag, not a second dialog — the date/reason
  // fields stay mounted with their values intact when this flips true.
  const [sirenRequired, setSirenRequired] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MarkWonFormValues>({
    resolver: zodResolver(markWonFormSchema),
    defaultValues: { date: todayIso(), reason: undefined, siren: undefined },
  });

  const onSubmit = async (data: MarkWonFormValues) => {
    try {
      const result = await markProposalWonAction({
        proposalId,
        date: data.date,
        reason: data.reason,
        // Only sent once the gate has fired — the first submit never
        // carries a siren key at all.
        ...(sirenRequired ? { siren: data.siren } : {}),
      });

      if (!result.ok) {
        // D-08's gate arrives as a RETURNED value, not a thrown sentinel
        // (33-REVIEW CR-01): Next.js replaces a Server Function's thrown
        // error message with a generic string in production builds, so the
        // old `e.message === SIREN_REQUIRED` branch was dev-only and real
        // partners hit a dead-end toast. The in-dialog banner IS the
        // message — no toast on top of it, and the dialog stays open with
        // every field intact.
        setSirenRequired(true);
        return;
      }

      toast.success(t('pipeline.outcome.won.toast.success', lang));
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
        if (!next) {
          // Reopening starts from the base form.
          setSirenRequired(false);
          reset();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pipeline.outcome.won.title', lang)}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting || undefined}>
          <Field>
            <FieldLabel htmlFor="mark-won-date">
              {t('pipeline.outcome.won.dateLabel', lang)}
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Input
              id="mark-won-date"
              type="date"
              aria-invalid={errors.date ? true : undefined}
              aria-describedby={errors.date ? 'mark-won-date-error' : undefined}
              disabled={isSubmitting}
              {...register('date')}
            />
            {errors.date?.message && (
              <FieldError id="mark-won-date-error" role="alert">
                {t(errors.date.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="mark-won-reason">
              {t('pipeline.outcome.won.reasonLabel', lang)}
            </FieldLabel>
            <Input
              id="mark-won-reason"
              type="text"
              autoComplete="off"
              disabled={isSubmitting}
              {...register('reason')}
            />
          </Field>

          {sirenRequired && (
            <>
              <p className="text-[13px] text-muted-foreground">
                {t('pipeline.outcome.won.sirenBanner', lang)}
              </p>
              <Field>
                <FieldLabel htmlFor="mark-won-siren">
                  {t('pipeline.outcome.won.sirenLabel', lang)}
                </FieldLabel>
                <Controller
                  name="siren"
                  control={control}
                  render={({ field }) => (
                    <SirenInput
                      inputId="mark-won-siren"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      invalid={!!errors.siren}
                      ariaDescribedBy={
                        errors.siren ? 'mark-won-siren-error' : 'mark-won-siren-helper'
                      }
                      disabled={isSubmitting}
                    />
                  )}
                />
                {errors.siren?.message ? (
                  <FieldError id="mark-won-siren-error" role="alert">
                    {t(errors.siren.message as DictKey, lang)}
                  </FieldError>
                ) : (
                  <FieldDescription id="mark-won-siren-helper">
                    {t('pipeline.outcome.won.sirenHelper', lang)}
                  </FieldDescription>
                )}
              </Field>
            </>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={isSubmitting} />}>
              {t('pipeline.outcome.cancel', lang)}
            </DialogClose>
            {/* Default variant — per 33-UI-SPEC § Color the single
                accent-filled control on this whole phase's surface. */}
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
              {sirenRequired
                ? t('pipeline.outcome.won.submitWithSiren', lang)
                : t('pipeline.outcome.won.submit', lang)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
