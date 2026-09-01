'use client';

/**
 * Phase 30 Plan 06 — CreateClientDialog (CRM-01, 30-UI-SPEC.md §2).
 *
 * shadcn Dialog (first real-app adoption, per 30-UI-SPEC.md Component
 * Inventory) + RHF/zod form, two fields only: company name (required) and
 * SIREN (optional). Submits to `createClientRelationshipAction`
 * (src/lib/crm/actions.ts, plan 30-05).
 *
 * SECURITY (CRM-02, A-5 — hard requirement, not a UX preference): no
 * autocomplete, no typeahead, no "existing company found" suggestion of any
 * kind while the partner types. The only network call this component makes
 * is the submit itself. Server-side SIREN dedup is silent — the success
 * toast/copy is identical whether the company row was just created or
 * already existed, so this component must never branch its own UI on that
 * distinction (it has no way to know it, by design).
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SirenInput } from '@/components/proposal/SirenInput';
import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
import { createClientSchema } from '@/lib/crm/schemas';
import { createClientRelationshipAction } from '@/lib/crm/actions';

export interface CreateClientDialogProps {
  lang: Lang;
}

// The pre-transform shape (siren optional/absent), matching the
// `z.input<...>` convention ParametresFormCard.tsx already uses for
// zodResolver-bound forms — RHF owns the raw field values, and the schema's
// `.transform()` runs only inside zodResolver's own validate/parse step.
type CreateClientFormValues = z.input<typeof createClientSchema>;

export function CreateClientDialog({ lang }: CreateClientDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientFormValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: { name: '', siren: undefined },
  });

  const onSubmit = async (data: CreateClientFormValues) => {
    try {
      const { relationshipId } = await createClientRelationshipAction(data);
      // Dedup-invariant: identical toast whether the company pre-existed or
      // not — the caller has no way to tell, and must not be able to.
      toast.success(t('clients.toast.created', lang));
      setOpen(false);
      reset();
      router.push(`/clients/${relationshipId}`);
    } catch {
      toast.error(t('clients.toast.error', lang));
      // Dialog stays open so the partner can retry without re-entering data.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button />}>{t('clients.cta.new', lang)}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('clients.modal.create.title', lang)}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting || undefined}>
          <Field>
            <FieldLabel htmlFor="create-client-name">
              {t('clients.modal.create.field.name', lang)}
              <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="create-client-name"
              type="text"
              autoComplete="off"
              placeholder={t('clients.modal.create.field.name.placeholder', lang)}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'create-client-name-error' : undefined}
              disabled={isSubmitting}
              {...register('name')}
            />
            {errors.name?.message && (
              <FieldError id="create-client-name-error" role="alert">
                {t(errors.name.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="create-client-siren">
              {t('clients.modal.create.field.siren', lang)}
            </FieldLabel>
            <Controller
              name="siren"
              control={control}
              render={({ field }) => (
                <SirenInput
                  inputId="create-client-siren"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!errors.siren}
                  ariaDescribedBy={
                    errors.siren ? 'create-client-siren-error' : 'create-client-siren-helper'
                  }
                  disabled={isSubmitting}
                />
              )}
            />
            {errors.siren?.message ? (
              <FieldError id="create-client-siren-error" role="alert">
                {t(errors.siren.message as DictKey, lang)}
              </FieldError>
            ) : (
              <FieldDescription id="create-client-siren-helper">
                {t('clients.modal.create.field.siren.helper', lang)}
              </FieldDescription>
            )}
          </Field>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={isSubmitting} />}>
              {t('clients.modal.create.cancel', lang)}
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
              {t('clients.modal.create.submit', lang)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
