'use client';

/**
 * Phase 30 Plan 07 Task 3 — ContactFormDialog (CRM-04, 30-UI-SPEC.md §3).
 *
 * One component, a `mode: 'create' | 'edit'` prop — shadcn `Dialog` (same
 * chrome as `CreateClientDialog`, plan 30-06) + RHF/zod, four fields: Nom
 * (required), Fonction (optional), Téléphone (optional), Email (optional,
 * email-format validated when present via the existing
 * `error.field.email.invalid` key). Submit label switches on `mode`.
 *
 * Controlled by the parent (`open`/`onOpenChange`) — this component renders
 * no `DialogTrigger` of its own; `ContactList` owns the "+ Ajouter un
 * contact" trigger and the per-row edit/delete buttons that open this
 * dialog.
 *
 * ACCESSIBILITY (correction from 30-06's regression, reverted in 5b223b2):
 * the required-field asterisk uses this codebase's established convention —
 * an `ml-0.5 text-destructive` span carrying `aria-hidden="true"` (see
 * `CoefficientsEditor.tsx`, `CreatePartnerForm.tsx`, `CreateClientDialog.tsx`)
 * — never a bare destructive-colored span with no `aria-hidden`/`ml-0.5`,
 * even if a plan's literal grep acceptance gate would only match that
 * narrower, less accessible markup.
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
import { contactSchema } from '@/lib/crm/schemas';
import { createContactAction, updateContactAction } from '@/lib/crm/actions';
import type { ContactListRow } from '@/lib/db/queries';

export interface ContactFormDialogProps {
  mode: 'create' | 'edit';
  relationshipId: string;
  /** Required (and pre-fills `defaultValues`) when `mode === 'edit'`. */
  contact?: ContactListRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
}

// Pre-transform shape (optional fields), matching the z.input<...> +
// zodResolver convention CreateClientDialog.tsx already established.
type ContactFormValues = z.input<typeof contactSchema>;

export function ContactFormDialog({
  mode,
  relationshipId,
  contact,
  open,
  onOpenChange,
  lang,
}: ContactFormDialogProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name ?? '',
      role: contact?.role ?? undefined,
      phone: contact?.phone ?? undefined,
      email: contact?.email ?? undefined,
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    try {
      if (mode === 'edit' && contact) {
        await updateContactAction(contact.id, data);
        toast.success(t('clients.contact.toast.updated', lang));
      } else {
        await createContactAction(relationshipId, data);
        toast.success(t('clients.contact.toast.created', lang));
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t('clients.toast.error', lang));
      // Dialog stays open so the caller can retry without re-entering data.
    }
  };

  const titleKey: DictKey = mode === 'edit' ? 'clients.contact.cta.edit' : 'clients.contact.cta.add';
  const submitKey: DictKey =
    mode === 'edit' ? 'clients.contact.submit.edit' : 'clients.contact.submit.create';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(titleKey, lang)}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting || undefined}>
          <Field>
            <FieldLabel htmlFor="contact-form-name">
              {t('clients.contact.field.name', lang)}
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Input
              id="contact-form-name"
              type="text"
              autoComplete="off"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'contact-form-name-error' : undefined}
              disabled={isSubmitting}
              {...register('name')}
            />
            {errors.name?.message && (
              <FieldError id="contact-form-name-error" role="alert">
                {t(errors.name.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="contact-form-role">{t('clients.contact.field.role', lang)}</FieldLabel>
            <Input
              id="contact-form-role"
              type="text"
              autoComplete="off"
              placeholder={t('clients.contact.field.role.placeholder', lang)}
              disabled={isSubmitting}
              {...register('role')}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="contact-form-phone">{t('clients.contact.field.phone', lang)}</FieldLabel>
            <Input
              id="contact-form-phone"
              type="tel"
              autoComplete="off"
              disabled={isSubmitting}
              {...register('phone')}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="contact-form-email">{t('clients.contact.field.email', lang)}</FieldLabel>
            <Input
              id="contact-form-email"
              type="email"
              autoComplete="off"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'contact-form-email-error' : undefined}
              disabled={isSubmitting}
              {...register('email')}
            />
            {errors.email?.message && (
              <FieldError id="contact-form-email-error" role="alert">
                {t(errors.email.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={isSubmitting} />}>
              {t('clients.modal.create.cancel', lang)}
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
              {t(submitKey, lang)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
