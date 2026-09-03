'use client';

/**
 * Phase 34 Plan 10 Task 2 — EditCompanyDialog (FICHE-03, FICHE-05, D-01 tier
 * two, D-02, D-03, D-18).
 *
 * THE SHARED TIER. `companies` is one row per company, not one per partner
 * (CRM-01): two partners quoting the same SIREN attach to the SAME row. So a
 * write from this dialog changes what another partner sees on their own client
 * page. That single fact explains everything below — the hint, the audit row
 * the action writes, and why the field set is closed.
 *
 * FOUR FIELDS, AND THE FOURTH IS THE SIREN. Display name, website, phone, and
 * the SIREN correction. There is no fifth, and no input in this file reaches
 * D-01's first tier: the identity the SIRENE lookup owns is read-only by
 * construction, written by `registry-sync.ts` and by nothing else (D-02). The
 * rule has two independent guards — an acceptance grep counting those column
 * names across this plan's four components, and a test asserting this form
 * renders exactly four inputs. "Just an editable city field" fails both.
 *
 * THE SHARING HINT IS INFORMED CONSENT, NOT A WARNING. It sits directly under
 * the title, in the muted informational treatment rather than an accent or a
 * danger fill (UIC-03's accent reserve): sharing is a FACT about this form, not
 * a hazard. It is wired to the form with `aria-describedby` so a screen-reader
 * user is told before submitting rather than after — which is exactly what D-03
 * says the audit row exists to make accountable.
 *
 * A SIREN CORRECTION RE-RUNS THE REGISTRY LOOKUP, server-side, after the write.
 * The helper text under the field says so, because a partner correcting a typo
 * should know the identity panel is about to change too.
 *
 * NO "SYNC NOW" CONTROL HERE. The refresh belongs to the read-only panel
 * (`RegistryRefreshButton`), not to this form: it takes no input and edits
 * nothing a partner typed.
 *
 * `updateCompanyDisplayAction` returns `void` and throws ONE bounded key for
 * every failure class — including a `companies.siren` UNIQUE violation when the
 * corrected value is already held by another company. That collapse is
 * deliberate: naming the collision would disclose another partner's data. So
 * this dialog has nothing to branch on, its `catch` never inspects the
 * rejection it caught (33-REVIEW CR-01), and recovery is the ordinary retry —
 * the dialog STAYS OPEN with every typed value intact, the way `MarkWonDialog`
 * keeps its fields mounted.
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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SirenInput, formatSiren } from '@/components/proposal/SirenInput';
import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
import { updateCompanyDisplaySchema } from '@/lib/crm/schemas';
import { updateCompanyDisplayAction } from '@/lib/crm/actions';

export interface EditCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationshipId: string;
  defaultValues: {
    name: string;
    website: string | null;
    phone: string | null;
    siren: string | null;
  };
  lang: Lang;
}

// `relationshipId` is a prop, never a form field — the partner cannot retarget
// the write, and the action re-proves ownership through it. Pre-transform
// shape: z.infer would give the post-transform type and break the resolver.
const editCompanyFormSchema = updateCompanyDisplaySchema.omit({ relationshipId: true });
type EditCompanyFormValues = z.input<typeof editCompanyFormSchema>;

/** The hint's id, referenced by the form's `aria-describedby`. */
const HINT_ID = 'edit-company-hint';

export function EditCompanyDialog({
  open,
  onOpenChange,
  relationshipId,
  defaultValues,
  lang,
}: EditCompanyDialogProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditCompanyFormValues>({
    resolver: zodResolver(editCompanyFormSchema),
    defaultValues: {
      name: defaultValues.name,
      website: defaultValues.website ?? '',
      phone: defaultValues.phone ?? '',
      // Displayed as "XXX XXX XXX" by the same formatter the create dialog
      // uses; the schema strips the spaces again before the column sees it.
      siren: formatSiren(defaultValues.siren ?? ''),
    },
  });

  const onSubmit = async (data: EditCompanyFormValues) => {
    try {
      await updateCompanyDisplayAction({
        relationshipId,
        name: data.name,
        website: data.website,
        phone: data.phone,
        siren: data.siren,
      });
      toast.success(t('clients.company.toast.updated', lang));
      onOpenChange(false);
      router.refresh();
    } catch {
      // Bounded and blind — the crm module's single key, matching the action
      // that throws it. A SIREN already held by another company arrives here
      // too, indistinguishable on purpose.
      toast.error(t('clients.toast.error', lang));
      // Dialog stays open so the partner can retry without re-entering data.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('clients.company.dialog.title', lang)}</DialogTitle>
        </DialogHeader>

        {/* Informational, not destructive: this is a fact about who else sees
            the result, and UIC-03 reserves the accent for something else. */}
        <p id={HINT_ID} className="text-[13px] text-muted-foreground">
          {t('clients.company.dialog.hint', lang)}
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-busy={isSubmitting || undefined}
          aria-describedby={HINT_ID}
        >
          <Field>
            <FieldLabel htmlFor="edit-company-name">
              {t('clients.company.field.name', lang)}
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Input
              id="edit-company-name"
              type="text"
              autoComplete="off"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'edit-company-name-error' : undefined}
              disabled={isSubmitting}
              {...register('name')}
            />
            {errors.name?.message && (
              <FieldError id="edit-company-name-error" role="alert">
                {t(errors.name?.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-company-website">
              {t('clients.company.field.website', lang)}
            </FieldLabel>
            <Input
              id="edit-company-website"
              type="text"
              autoComplete="off"
              aria-invalid={errors.website ? true : undefined}
              aria-describedby={errors.website ? 'edit-company-website-error' : undefined}
              disabled={isSubmitting}
              {...register('website')}
            />
            {errors.website?.message && (
              <FieldError id="edit-company-website-error" role="alert">
                {t(errors.website?.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-company-phone">
              {t('clients.company.field.phone', lang)}
            </FieldLabel>
            <Input
              id="edit-company-phone"
              type="tel"
              autoComplete="off"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? 'edit-company-phone-error' : undefined}
              disabled={isSubmitting}
              {...register('phone')}
            />
            {errors.phone?.message && (
              <FieldError id="edit-company-phone-error" role="alert">
                {t(errors.phone?.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-company-siren">
              {t('clients.company.field.siren', lang)}
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Controller
              name="siren"
              control={control}
              render={({ field }) => (
                <SirenInput
                  inputId="edit-company-siren"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!errors.siren}
                  ariaDescribedBy={
                    errors.siren ? 'edit-company-siren-error' : 'edit-company-siren-helper'
                  }
                  disabled={isSubmitting}
                />
              )}
            />
            {errors.siren?.message ? (
              <FieldError id="edit-company-siren-error" role="alert">
                {t(errors.siren?.message as DictKey, lang)}
              </FieldError>
            ) : (
              <FieldDescription id="edit-company-siren-helper">
                {t('clients.company.field.sirenHelper', lang)}
              </FieldDescription>
            )}
          </Field>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={isSubmitting} />}>
              {t('clients.modal.create.cancel', lang)}
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
              {t('clients.company.dialog.submit', lang)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
