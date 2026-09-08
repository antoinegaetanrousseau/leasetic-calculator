'use client';

/**
 * Phase 42 Plan 07 — AdvisorForm client component for /{adminSegment}/advisor
 * (PROF-03 / D-06 / D-07 / D-08 / D-09, UI-SPEC §New field labels item 4).
 *
 * Layout — mirrors `CreatePartnerForm.tsx`'s / `ParametresForm.tsx`'s form +
 * sibling action-footer card convention exactly:
 *   <form>
 *     <div className="card">          ← one SectionTitle + 4 required fields
 *       Nom / Fonction / Téléphone / Email
 *     </div>
 *     <div className="card" style={{marginTop:16, ...flex space-between}}>
 *       Annuler (btn-out)   Enregistrer le profil (btn-green)
 *     </div>
 *   </form>
 *
 * Behavior:
 *   - RHF + zodResolver(advisorFormSchema), mode: 'onBlur' (project convention).
 *   - All four fields required (red asterisk) — D-09 reads this row live on
 *     every generated PDF, so a partial identity has no acceptable state.
 *   - Submit calls `adminUpdateAdvisor(values)` directly (this is a singleton
 *     settings page, not a create flow — no action prop indirection is
 *     needed the way `CreatePartnerForm` decouples its action for reuse).
 *     `{ ok: true }` → `admin.advisor.toast.saved` toast + `form.reset(values)`
 *     so the newly-saved values become the next Annuler baseline.
 *     `{ ok: false }` → `admin.advisor.toast.error` toast — the action's own
 *     returned error string is never echoed into the UI (bounded key only).
 *   - Annuler calls `form.reset()` (no args) to restore the `initial` values
 *     in place — mirrors `ParametresForm.tsx`'s `handleCancel`. It does NOT
 *     navigate; this singleton upsert page has nothing to navigate back to.
 *
 * `.btn-green` / `.btn-out` (not shadcn `Button`) per UI-SPEC Component
 * Inventory — keeps this page visually identical to the two sibling
 * admin/partner forms it sits beside.
 *
 * ADMIN-09: the four fields are name/fonction/telephone/email — zero
 * commission, rate or derived value crosses this surface.
 */

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { SectionTitle } from '@/components/ui/SectionTitle';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/proposal/PhoneInput';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import type { LeaseticAdvisorRow } from '@/db/schema';

// Import the schema + action directly from their own modules — not the
// `@/lib/admin` barrel — mirroring `CreatePartnerForm.tsx`'s discipline of
// keeping a client component's imports narrow (see that file's own header
// comment on avoiding barrels that re-export server-only code).
import { advisorFormSchema, type AdvisorFormValues } from '@/lib/admin/advisor-schemas';
import { adminUpdateAdvisor } from '@/lib/admin/advisor-actions';

export interface AdvisorFormProps {
  lang: Lang;
  initial: LeaseticAdvisorRow | null;
}

export function AdvisorForm({ lang, initial }: AdvisorFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdvisorFormValues>({
    resolver: zodResolver(advisorFormSchema),
    mode: 'onBlur',
    defaultValues: {
      name: initial?.name ?? '',
      fonction: initial?.fonction ?? '',
      telephone: initial?.telephone ?? '',
      email: initial?.email ?? '',
    },
  });

  const onSubmit = async (values: AdvisorFormValues) => {
    const result = await adminUpdateAdvisor(values);
    if (result.ok) {
      toast.success(t('admin.advisor.toast.saved', lang));
      // The new values become the Annuler baseline going forward.
      reset(values);
    } else {
      // PITFALLS §9.4 — never echo the action's returned error string;
      // render only the bounded fallback key.
      toast.error(t('admin.advisor.toast.error', lang));
    }
  };

  /**
   * Singleton upsert page — Annuler resets to last-saved values in place
   * (mirrors `ParametresForm.tsx`'s `handleCancel`). It never navigates:
   * this page has nothing to navigate back to.
   */
  const handleCancel = () => {
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting || undefined}>
      {/* ── Form card — one section, 4 required fields ─────────────────── */}
      <div className="card">
        <SectionTitle accent="gd">{t('admin.advisor.section.identity', lang)}</SectionTitle>

        <Field>
          <FieldLabel htmlFor="advf-name">
            {t('admin.advisor.field.name', lang)}
            <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
          </FieldLabel>
          <Input
            id="advf-name"
            type="text"
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'advf-name-error' : undefined}
            disabled={isSubmitting}
            {...register('name')}
          />
          {errors.name?.message && (
            <FieldError id="advf-name-error" role="alert">
              {t(errors.name.message as DictKey, lang)}
            </FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="advf-fonction">
            {t('admin.advisor.field.fonction', lang)}
            <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
          </FieldLabel>
          <Input
            id="advf-fonction"
            type="text"
            placeholder={t('admin.advisor.field.fonction.placeholder', lang)}
            aria-invalid={errors.fonction ? true : undefined}
            aria-describedby={errors.fonction ? 'advf-fonction-error' : undefined}
            disabled={isSubmitting}
            {...register('fonction')}
          />
          {errors.fonction?.message && (
            <FieldError id="advf-fonction-error" role="alert">
              {t(errors.fonction.message as DictKey, lang)}
            </FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="advf-telephone">
            {t('admin.advisor.field.telephone', lang)}
            <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
          </FieldLabel>
          <Controller
            control={control}
            name="telephone"
            render={({ field }) => (
              <PhoneInput
                inputId="advf-telephone"
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ariaInvalid={errors.telephone ? true : undefined}
                ariaDescribedBy={errors.telephone ? 'advf-telephone-error' : undefined}
                disabled={isSubmitting}
              />
            )}
          />
          {errors.telephone?.message && (
            <FieldError id="advf-telephone-error" role="alert">
              {t(errors.telephone.message as DictKey, lang)}
            </FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="advf-email">
            {t('admin.advisor.field.email', lang)}
            <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
          </FieldLabel>
          <Input
            id="advf-email"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'advf-email-error' : undefined}
            disabled={isSubmitting}
            {...register('email')}
          />
          {errors.email?.message && (
            <FieldError id="advf-email-error" role="alert">
              {t(errors.email.message as DictKey, lang)}
            </FieldError>
          )}
        </Field>
      </div>

      {/* ── Action-footer card — sibling to the form card ───────────────── */}
      <div
        className="card"
        style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          type="button"
          className="btn-out"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          {t('admin.advisor.action.cancel', lang)}
        </button>

        <button
          type="submit"
          className="btn-green"
          disabled={isSubmitting}
          aria-disabled={isSubmitting || undefined}
          aria-busy={isSubmitting || undefined}
        >
          {isSubmitting
            ? t('admin.advisor.action.save.spinner', lang)
            : t('admin.advisor.action.save', lang)}
        </button>
      </div>
    </form>
  );
}
