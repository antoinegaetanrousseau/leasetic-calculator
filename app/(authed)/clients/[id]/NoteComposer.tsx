'use client';

/**
 * Phase 34 Plan 11 Task 2 — the in-place note composer (ACTV-03).
 *
 * An inline form, not a dialog: adding a note is the timeline's own primary
 * verb, so it sits above the stream rather than behind a modal. It renders no
 * heading — the Activité heading belongs to `ActivityTimeline`, and two of them
 * on one surface would read as two sections.
 *
 * THE NOTE IS THE EVENT. There is no note column: a successful submit appends
 * one row to the relationship's timeline and the page refreshes to show it, so
 * the partner never leaves the client to record what just happened.
 *
 * NOTHING TYPED IS EVER LOST. The success path resets the form; the failure
 * path deliberately does NOT. Sharing one reset between the two would clear a
 * partner's paragraph on a network blip — the inline equivalent of the
 * "dialog stays open" rule the contact form follows — so the catch block only
 * toasts.
 *
 * ONE BOUNDED KEY, NEVER A MESSAGE COMPARISON (D-24 / 33-REVIEW CR-01). The
 * note action either resolves or throws a single bounded dictionary key; there
 * is no recoverable outcome to branch on, so the catch block inspects nothing
 * about what it caught. Next.js substitutes a generic message plus a digest for
 * a Server Function's throw in production builds, which is exactly why
 * `tests/server-action-error-contracts.test.ts` fails the build on any client
 * component that starts reading one.
 *
 * THE DATE IS OPTIONAL AND ABSENT WHEN BLANK. An empty date input posts an
 * empty string, which would coerce to an invalid date and fail the parse. It is
 * normalised to `undefined` at registration so the key is simply not sent, and
 * "now" is resolved in SQL where the insert happens — the difference between
 * omitted, null and empty matters to the parser even though all three look
 * identical on screen.
 */
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
import { addNoteSchema } from '@/lib/relationship/schemas';
import { addRelationshipNoteAction } from '@/lib/relationship/actions';

export interface NoteComposerProps {
  relationshipId: string;
  lang: Lang;
}

// The pre-transform shape (relationshipId excluded — it is a prop, never a form
// field), matching MarkWonDialog's `z.input<...>` + zodResolver convention.
const noteFormSchema = addNoteSchema.omit({ relationshipId: true });
type NoteFormValues = z.input<typeof noteFormSchema>;

export function NoteComposer({ relationshipId, lang }: NoteComposerProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: { body: '' },
  });

  const onSubmit = async (data: NoteFormValues) => {
    // zodResolver hands over the PARSED values, so `occurredAt` is already a
    // Date here when the partner picked one — and absent when they did not.
    const parsed = data as z.output<typeof noteFormSchema>;

    try {
      await addRelationshipNoteAction({
        relationshipId,
        body: parsed.body,
        ...(parsed.occurredAt ? { occurredAt: parsed.occurredAt } : {}),
      });
      toast.success(t('clients.timeline.note.toast.added', lang));
      reset();
      router.refresh();
    } catch {
      toast.error(t('relationship.toast.error', lang));
      // No reset: the typed body stays in the field so the partner can retry.
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-busy={isSubmitting || undefined}
      className="mb-6"
    >
      <Field>
        <FieldLabel htmlFor="note-composer-body">
          {t('clients.timeline.note.label', lang)}
        </FieldLabel>
        <Textarea
          id="note-composer-body"
          rows={3}
          placeholder={t('clients.timeline.note.placeholder', lang)}
          aria-invalid={errors.body ? true : undefined}
          aria-describedby={errors.body ? 'note-composer-body-error' : undefined}
          disabled={isSubmitting}
          {...register('body')}
        />
        {errors.body?.message && (
          <FieldError id="note-composer-body-error" role="alert">
            {t(errors.body.message as DictKey, lang)}
          </FieldError>
        )}
      </Field>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field className="w-auto">
          <FieldLabel htmlFor="note-composer-date">
            {t('clients.timeline.note.dateLabel', lang)}
          </FieldLabel>
          <Input
            id="note-composer-date"
            type="date"
            className="w-auto"
            disabled={isSubmitting}
            // A blank date must reach the parser as ABSENT, not as ''.
            {...register('occurredAt', {
              setValueAs: (value: string) => (value === '' ? undefined : value),
            })}
          />
        </Field>

        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
          {t('clients.timeline.note.submit', lang)}
        </Button>
      </div>
    </form>
  );
}
