'use client';

/**
 * ParametresFormCard — step-1 form sub-component (Phase 13, plan 13-03).
 *
 * Renders 7 default fields in 2 bullet-headed sections inside ONE .card (per
 * D-05), with an <hr> divider at 24px between, plus a `<PlusDeDetailsAccordion>`
 * BELOW the card carrying the 5 optional fields (per D-06).
 *
 * Decisions referenced:
 *   - D-05: 7 default fields split into INFORMATIONS CLIENT (clientCo, clientName,
 *     clientEmail, clientTel) + DÉTAILS DU PROJET (partnerRef, amountHT,
 *     durationMonths) inside ONE .card.
 *   - D-06: 5 optional fields (clientRole, clientSiren, projectDesc, slb,
 *     evalParc — in this order per UI-SPEC §5.2) live inside the accordion.
 *   - D-07: partnerCo + partnerName are session-hydrated server-side and
 *     NEVER rendered as visible inputs here.
 *   - D-08: the proposal-validity duration is server-resolved from the
 *     latest global_params row and is NOT a partner-facing input here.
 *   - D-09: NO <LiveLoyerPreview> is mounted (the 2-column form layout is retired).
 *   - D-10: real-time blur validation via RHF mode='onBlur' inherited from the
 *     outer <ProposalFormProvider>.
 *   - D-13: durationMonths whitelist 36/48/60 unchanged.
 *   - UI-SPEC §6.3: clientCo + clientName use the wizard-scoped label overrides
 *     (`wizard.field.client.co.label` / `wizard.field.client.name.label`).
 *
 * Consumes the outer <ProposalFormProvider>'s RHF context via useFormContext —
 * the parent (parametres/page.tsx) hoists the form one level up so the same
 * register/control surface drives every input here.
 *
 * NOTE — ADMIN-09 step-1 surface: NO partner-only-visible parameter identifier
 * appears anywhere in this file. Visibility is relaxed only on steps 2 and 3
 * (D-12 — see plan 13-04 for the surfaced row label).
 */

import { SectionTitle } from '@/components/ui/SectionTitle';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useFormContext, Controller } from 'react-hook-form';
import type { z } from 'zod';
import { proposalInputSchema } from '@/lib/calc';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import { DurationSegmented } from '@/components/proposal/DurationSegmented';
import { NumberInputAmount } from '@/components/proposal/NumberInputAmount';
import { PhoneInput } from '@/components/proposal/PhoneInput';
import { SirenInput } from '@/components/proposal/SirenInput';
import { YesNoToggle } from '@/components/proposal/YesNoToggle';

// Match the ProposalFormProvider's input-side generic (the validity field is
// optional because the schema applies .default(30) — see ProposalForm.tsx:36).
type ProposalFormValues = z.input<typeof proposalInputSchema>;

const DURATION_OPTIONS = [
  { value: 36 as const, labelKey: 'form.duration.36' as const },
  { value: 48 as const, labelKey: 'form.duration.48' as const },
  { value: 60 as const, labelKey: 'form.duration.60' as const },
];

export interface ParametresFormCardProps {
  draftId: string;
  /** Active language for labels + placeholders. */
  lang: Lang;
}

export function ParametresFormCard({
  lang,
}: ParametresFormCardProps) {
  const form = useFormContext<ProposalFormValues>();
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form;

  return (
    <>
      {/* D-05: ONE panel containing both sections separated by an hr divider.
          A flat `.wizard-panel` (not `.card`) since Phase 33: the surrounding
          WizardCard owns the card chrome, per ReUI's wizard-1 block. */}
      <section data-slot="wizard-panel" className="wizard-panel">
        {/* ── Section 1: INFORMATIONS CLIENT ─────────────────────────────── */}
        <SectionTitle>{t('wizard.section.informations.client', lang)}</SectionTitle>

        {/* clientCo — wizard-scoped label "Nom du client" per UI-SPEC §6.3 */}
        <Field>
          <FieldLabel htmlFor="client-co">
            {t('wizard.field.client.co.label', lang)}
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </FieldLabel>
          <Input
            id="client-co"
            type="text"
            placeholder={t('form.client.co.placeholder', lang)}
            aria-invalid={!!errors.clientCo || undefined}
            aria-describedby={errors.clientCo ? 'client-co-error' : undefined}
            aria-required="true"
            className={errors.clientCo ? 'invalid' : ''}
            {...register('clientCo')}
          />
          {errors.clientCo && (
            <FieldError id="client-co-error" role="alert">
              {t(errors.clientCo.message as DictKey, lang)}
            </FieldError>
          )}
        </Field>

        {/* clientName — wizard-scoped "Personne de contact" per UI-SPEC §6.3 */}
        <Field>
          <FieldLabel htmlFor="client-name">
            {t('wizard.field.client.name.label', lang)}
          </FieldLabel>
          <Input
            id="client-name"
            type="text"
            placeholder={t('form.client.name.placeholder', lang)}
            {...register('clientName')}
          />
        </Field>

        {/* clientEmail — reuses v1.1 form.client.email key */}
        <Field>
          <FieldLabel htmlFor="client-email">{t('form.client.email', lang)}</FieldLabel>
          <Input
            id="client-email"
            type="email"
            placeholder={t('form.client.email.placeholder', lang)}
            aria-invalid={!!errors.clientEmail || undefined}
            aria-describedby={
              errors.clientEmail ? 'client-email-error' : undefined
            }
            className={errors.clientEmail ? 'invalid' : ''}
            {...register('clientEmail')}
          />
          {errors.clientEmail && (
            <FieldError id="client-email-error" role="alert">
              {t('error.field.email.invalid', lang)}
            </FieldError>
          )}
        </Field>

        {/* clientTel — reuses v1.1 form.client.tel key */}
        <Field>
          <FieldLabel htmlFor="client-tel">{t('form.client.tel', lang)}</FieldLabel>
          <Controller
            name="clientTel"
            control={control}
            render={({ field }) => (
              <PhoneInput
                inputId="client-tel"
                placeholder={t('form.client.tel.placeholder', lang)}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.clientTel}
                ariaDescribedBy={
                  errors.clientTel ? 'client-tel-error' : undefined
                }
              />
            )}
          />
          {errors.clientTel && (
            <FieldError id="client-tel-error" role="alert">
              {t('error.field.phone.invalid', lang)}
            </FieldError>
          )}
        </Field>

        {/* D-05: 24px divider between the two sections inside the single .card */}
        <hr
          style={{
            border: 'none',
            borderTop: '1px solid var(--border)',
            margin: '24px 0',
          }}
        />

        {/* ── Section 2: DÉTAILS DU PROJET ──────────────────────────────── */}
        <SectionTitle>{t('wizard.section.details.projet', lang)}</SectionTitle>

        {/* partnerRef — reuses v1.1 form.project.ref */}
        <Field>
          <FieldLabel htmlFor="partner-ref">{t('form.project.ref', lang)}</FieldLabel>
          <Input
            id="partner-ref"
            type="text"
            placeholder={t('form.project.ref.placeholder', lang)}
            {...register('partnerRef')}
          />
        </Field>

        {/* amountHT — Controller-bound NumberInputAmount (v1.1 component) */}
        <Field>
          <FieldLabel htmlFor="amount">
            {t('form.project.amount', lang)}
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </FieldLabel>
          <Controller
            name="amountHT"
            control={control}
            render={({ field }) => (
              <NumberInputAmount
                inputId="amount"
                placeholder={t('form.project.amount.placeholder', lang)}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.amountHT}
                ariaInvalid={!!errors.amountHT}
                ariaDescribedBy={errors.amountHT ? 'amount-error' : undefined}
                lang={lang}
              />
            )}
          />
          {errors.amountHT && (
            <FieldError id="amount-error" role="alert">
              {t(errors.amountHT.message as DictKey, lang)}
            </FieldError>
          )}
        </Field>

        {/* durationMonths — DurationSegmented with 36/48/60 (D-13 unchanged) */}
        <Field>
          <FieldLabel>
            {t('form.project.duration', lang)}
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </FieldLabel>
          <Controller
            name="durationMonths"
            control={control}
            render={({ field }) => (
              <DurationSegmented<36 | 48 | 60>
                ariaLabel={t('form.project.duration', lang)}
                options={DURATION_OPTIONS.map((o) => ({
                  value: o.value,
                  label: t(o.labelKey, lang),
                }))}
                value={field.value ?? null}
                onChange={(v) =>
                  setValue('durationMonths', v, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                invalid={!!errors.durationMonths}
              />
            )}
          />
          {errors.durationMonths && (
            <FieldError role="alert">
              {t('error.field.duration.required', lang)}
            </FieldError>
          )}
        </Field>
        <hr
          style={{
            border: 'none',
            borderTop: '1px solid var(--border)',
            margin: '24px 0',
          }}
        />

        {/* ── Section 3: INFORMATIONS COMPLÉMENTAIRES ───────────────────── */}
        <SectionTitle>{t('wizard.section.details.complementaires', lang)}</SectionTitle>

        {/* clientRole */}
        <Field>
          <FieldLabel htmlFor="client-role">{t('form.client.role', lang)}</FieldLabel>
          <Input
            id="client-role"
            type="text"
            placeholder={t('form.client.role.placeholder', lang)}
            {...register('clientRole')}
          />
        </Field>

        {/* clientSiren — Controller-bound SirenInput */}
        <Field>
          <FieldLabel htmlFor="client-siren">{t('form.client.siren', lang)}</FieldLabel>
          <Controller
            name="clientSiren"
            control={control}
            render={({ field }) => (
              <SirenInput
                inputId="client-siren"
                placeholder={t('form.client.siren.placeholder', lang)}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.clientSiren}
                ariaDescribedBy={
                  errors.clientSiren ? 'client-siren-error' : undefined
                }
              />
            )}
          />
          {errors.clientSiren && (
            <FieldError id="client-siren-error" role="alert">
              {t('error.field.siren.invalid', lang)}
            </FieldError>
          )}
        </Field>

        {/* projectDesc */}
        <Field>
          <FieldLabel htmlFor="project-desc">{t('form.project.desc', lang)}</FieldLabel>
          <Input
            id="project-desc"
            type="text"
            placeholder={t('form.project.desc.placeholder', lang)}
            {...register('projectDesc')}
          />
        </Field>

        {/* slb — YesNoToggle */}
        <Field>
          <FieldLabel>{t('form.interests.slb', lang)}</FieldLabel>
          <Controller
            name="slb"
            control={control}
            render={({ field }) => (
              <YesNoToggle
                ariaLabel={t('form.interests.slb', lang)}
                yesLabel={t('common.yes', lang)}
                noLabel={t('common.no', lang)}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>

        {/* evalParc — YesNoToggle */}
        <Field>
          <FieldLabel>{t('form.interests.eval', lang)}</FieldLabel>
          <Controller
            name="evalParc"
            control={control}
            render={({ field }) => (
              <YesNoToggle
                ariaLabel={t('form.interests.eval', lang)}
                yesLabel={t('common.yes', lang)}
                noLabel={t('common.no', lang)}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
      </section>
    </>
  );
}
