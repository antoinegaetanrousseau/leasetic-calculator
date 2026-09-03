'use client';

/**
 * Phase 34 Plan 10 Task 1 — NextActionDialog (ACTV-04, FICHE-05, D-18).
 *
 * D-01's private tier again: `next_action_at` and `next_action_note` belong to
 * the owning partner alone, and drive the home page's "à relancer" card (D-20).
 * As in `EditRelationDialog`, no registry-tier field appears here — D-02 holds
 * across every dialog this plan ships, and an acceptance grep counts it.
 *
 * TWO WRITE PATHS, ONE ACTION. Submitting sends a date; the clear control sends
 * `nextActionAt: null` and NOTHING ELSE. `.nullable()` rather than `.optional()`
 * on the schema is what makes that distinction expressible: `null` is the
 * explicit "I no longer intend to do anything about this", and
 * `setNextActionAction` responds by nulling the note too and writing no timeline
 * event. Sending a note alongside the clear would just be a way to disagree with
 * a server-side rule, so the clear bypasses the form entirely rather than
 * submitting it.
 *
 * The clear control renders ONLY when a next action is actually set — there is
 * nothing to retract otherwise, and an always-present control would imply state
 * that does not exist.
 *
 * The date field is a plain `<Input type="date">` paired with the schema's
 * `z.coerce.date()`, the same pairing `MarkWonDialog` uses.
 *
 * `setNextActionAction` returns `void` and throws one bounded key for every
 * failure class — no recoverable outcome, so nothing to branch on. The `catch`
 * is bounded and blind and never inspects the rejection it caught (33-REVIEW
 * CR-01). On failure the dialog stays open with the typed values intact.
 */
import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
import { setNextActionSchema } from '@/lib/relationship/schemas';
import { setNextActionAction } from '@/lib/relationship/actions';

export interface NextActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationshipId: string;
  defaultValues: {
    /** `YYYY-MM-DD`, the shape an `<input type="date">` reads and writes. */
    nextActionAt: string | null;
    nextActionNote: string | null;
  };
  lang: Lang;
}

// `relationshipId` is a prop, never a form field. Pre-transform shape — z.infer
// would give the post-transform type and break the resolver's typing.
const nextActionFormSchema = setNextActionSchema.omit({ relationshipId: true });
type NextActionFormValues = z.input<typeof nextActionFormSchema>;

export function NextActionDialog({
  open,
  onOpenChange,
  relationshipId,
  defaultValues,
  lang,
}: NextActionDialogProps) {
  const router = useRouter();
  // The clear path bypasses the form, so it needs its own in-flight flag to
  // disable the controls and to keep a second click from firing a second write.
  const [clearing, setClearing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NextActionFormValues>({
    resolver: zodResolver(nextActionFormSchema),
    defaultValues: {
      nextActionAt: defaultValues.nextActionAt ?? '',
      nextActionNote: defaultValues.nextActionNote ?? '',
    },
  });

  const busy = isSubmitting || clearing;

  const onSubmit = async (data: NextActionFormValues) => {
    try {
      await setNextActionAction({
        relationshipId,
        nextActionAt: data.nextActionAt,
        nextActionNote: data.nextActionNote,
      });
      toast.success(t('clients.nextAction.dialog.toast.set', lang));
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t('relationship.toast.error', lang));
      // Dialog stays open so the partner can retry without re-entering data.
    }
  };

  const onClear = async () => {
    if (clearing) {
      return;
    }
    setClearing(true);
    try {
      // `nextActionAt: null` and no note key: the action nulls the note itself,
      // so a stale note cannot outlive the intention it described.
      await setNextActionAction({ relationshipId, nextActionAt: null });
      toast.success(t('clients.nextAction.dialog.toast.cleared', lang));
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t('relationship.toast.error', lang));
    } finally {
      setClearing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('clients.nextAction.dialog.title', lang)}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={busy || undefined}>
          <Field>
            <FieldLabel htmlFor="next-action-date">
              {t('clients.nextAction.dialog.dateLabel', lang)}
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Input
              id="next-action-date"
              type="date"
              aria-invalid={errors.nextActionAt ? true : undefined}
              aria-describedby={errors.nextActionAt ? 'next-action-date-error' : undefined}
              disabled={busy}
              {...register('nextActionAt')}
            />
            {errors.nextActionAt?.message && (
              <FieldError id="next-action-date-error" role="alert">
                {t(errors.nextActionAt.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="next-action-note">
              {t('clients.nextAction.dialog.noteLabel', lang)}
            </FieldLabel>
            <Textarea
              id="next-action-note"
              rows={3}
              aria-invalid={errors.nextActionNote ? true : undefined}
              aria-describedby={errors.nextActionNote ? 'next-action-note-error' : undefined}
              disabled={busy}
              {...register('nextActionNote')}
            />
            {errors.nextActionNote?.message && (
              <FieldError id="next-action-note-error" role="alert">
                {t(errors.nextActionNote?.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>

          <DialogFooter>
            {defaultValues.nextActionAt !== null && (
              <Button type="button" variant="outline" disabled={busy} onClick={onClear}>
                {t('clients.nextAction.dialog.clear', lang)}
              </Button>
            )}
            <DialogClose render={<Button type="button" variant="outline" disabled={busy} />}>
              {t('clients.modal.create.cancel', lang)}
            </DialogClose>
            <Button type="submit" disabled={busy} aria-busy={busy || undefined}>
              {t('clients.nextAction.dialog.submit', lang)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
