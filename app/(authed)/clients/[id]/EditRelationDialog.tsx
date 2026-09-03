'use client';

/**
 * Phase 34 Plan 10 Task 1 — EditRelationDialog (FICHE-04, FICHE-05, D-18).
 *
 * D-01's PRIVATE tier, and nothing else: the lead source and the description
 * the OWNING partner recorded about this relationship. Both columns live on
 * `client_relationships`, are owner-scoped in the action's own WHERE, and are
 * invisible to every other partner holding the same company.
 *
 * D-02 IS VISIBLE HERE AS AN ABSENCE. There is no input in this file for a
 * registry-tier column — no legal name, no address, no NAF code, no
 * administrative state. That is structural, not stylistic: the SIRENE lookup
 * is the only writer of that tier, and an acceptance grep in 34-10-PLAN.md
 * counts zero occurrences of every registry column name across all four of
 * this plan's components. "Just an editable city field" fails the gate.
 *
 * Shape copied verbatim from `ContactFormDialog.tsx` — controlled by the
 * parent through `open`/`onOpenChange`, rendering no trigger element of its
 * own — the page owns the open state (D-18). `z.input<typeof schema>` for the
 * pre-transform form values, the established `ml-0.5 text-destructive`
 * asterisk markup, `FieldError role="alert"` wired with
 * `aria-invalid`/`aria-describedby`, `noValidate`, `aria-busy`, and every
 * control disabled while submitting.
 *
 * `updateRelationDetailsAction` returns `void` and throws one bounded key for
 * every failure class — it has no recoverable outcome, so this dialog has
 * nothing to branch on. The `catch` below is therefore bounded and blind: it
 * toasts the module's single key and never inspects the rejection it caught
 * (33-REVIEW CR-01, guarded by `tests/server-action-error-contracts.test.ts`).
 * On failure the dialog STAYS OPEN so the partner retries without re-typing.
 */
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
import { updateRelationDetailsSchema } from '@/lib/relationship/schemas';
import { updateRelationDetailsAction } from '@/lib/relationship/actions';
import { LEAD_SOURCES, LEAD_SOURCE_DICT_KEY, type LeadSource } from '@/lib/relationship/kinds';

export interface EditRelationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationshipId: string;
  defaultValues: {
    leadSource: LeadSource | null;
    description: string | null;
  };
  lang: Lang;
}

// `relationshipId` is a prop, never a form field — the partner cannot retarget
// the write. Pre-transform shape, matching this codebase's z.input<...> +
// zodResolver convention; z.infer would give the POST-transform type and
// silently break the resolver's typing.
const editRelationFormSchema = updateRelationDetailsSchema.omit({ relationshipId: true });
type EditRelationFormValues = z.input<typeof editRelationFormSchema>;

/**
 * `''` is the placeholder's value and the schema normalises it back to
 * `undefined`, which the action writes as SQL NULL. Without an option carrying
 * it, "no source recorded" would be unreachable the moment a partner picked a
 * source by mistake.
 */
const NO_SOURCE = '';

export function EditRelationDialog({
  open,
  onOpenChange,
  relationshipId,
  defaultValues,
  lang,
}: EditRelationDialogProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditRelationFormValues>({
    resolver: zodResolver(editRelationFormSchema),
    defaultValues: {
      leadSource: defaultValues.leadSource ?? NO_SOURCE,
      description: defaultValues.description ?? '',
    },
  });

  // Base UI's `Select.Value` only resolves a label from its rendered items once
  // the popup has been opened at least once; passing `items` up front lets the
  // trigger show the stored source on first paint instead of the raw enum value.
  const sourceItems: Record<string, string> = {
    [NO_SOURCE]: t('clients.relation.source.placeholder', lang),
    ...Object.fromEntries(LEAD_SOURCES.map((v) => [v, t(LEAD_SOURCE_DICT_KEY[v], lang)])),
  };

  const onSubmit = async (data: EditRelationFormValues) => {
    try {
      await updateRelationDetailsAction({
        relationshipId,
        leadSource: data.leadSource,
        description: data.description,
      });
      toast.success(t('clients.relation.toast.updated', lang));
      onOpenChange(false);
      router.refresh();
    } catch {
      // Bounded and blind. The rejection is never inspected: Next.js replaces a
      // Server Function's thrown text with a generic string plus a digest in a
      // production build, so any branch on it works in dev and degrades
      // silently once deployed (33-REVIEW CR-01).
      toast.error(t('relationship.toast.error', lang));
      // Dialog stays open so the partner can retry without re-entering data.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('clients.relation.dialog.title', lang)}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting || undefined}>
          <Field>
            <FieldLabel htmlFor="edit-relation-source">
              {t('clients.relation.field.leadSource', lang)}
            </FieldLabel>
            <Controller
              name="leadSource"
              control={control}
              render={({ field }) => (
                <Select
                  items={sourceItems}
                  value={field.value ?? NO_SOURCE}
                  onValueChange={(value) => field.onChange(String(value))}
                >
                  <SelectTrigger
                    id="edit-relation-source"
                    className="w-full"
                    disabled={isSubmitting}
                    aria-invalid={errors.leadSource ? true : undefined}
                    aria-describedby={errors.leadSource ? 'edit-relation-source-error' : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SOURCE}>
                      {t('clients.relation.source.placeholder', lang)}
                    </SelectItem>
                    {/* Generated from the shared tuple — the five strings are
                        never restated here, and no label is hardcoded. */}
                    {LEAD_SOURCES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(LEAD_SOURCE_DICT_KEY[value], lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.leadSource?.message && (
              <FieldError id="edit-relation-source-error" role="alert">
                {t(errors.leadSource?.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-relation-description">
              {t('clients.relation.field.description', lang)}
            </FieldLabel>
            <Textarea
              id="edit-relation-description"
              rows={5}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? 'edit-relation-description-error' : undefined}
              disabled={isSubmitting}
              {...register('description')}
            />
            {errors.description?.message && (
              <FieldError id="edit-relation-description-error" role="alert">
                {t(errors.description.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={isSubmitting} />}>
              {t('clients.modal.create.cancel', lang)}
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
              {t('clients.relation.dialog.submit', lang)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
