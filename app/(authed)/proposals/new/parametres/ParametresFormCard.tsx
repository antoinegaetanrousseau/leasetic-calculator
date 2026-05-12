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
 *   - D-08: validityDays is server-resolved from getLatestGlobalParams and is
 *     NOT a partner-facing input.
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
 * NOTE — ADMIN-09 step-1 surface: NO commission identifier appears anywhere in
 * this file. Commission visibility is relaxed only on steps 2 and 3 (D-12).
 */

import { useFormContext, Controller } from 'react-hook-form';
import type { z } from 'zod';
import { proposalInputSchema } from '@/lib/calc';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import { DurationSegmented } from '@/components/proposal/DurationSegmented';
import { NumberInputAmount } from '@/components/proposal/NumberInputAmount';
import { PhoneInput } from '@/components/proposal/PhoneInput';
import { SirenInput } from '@/components/proposal/SirenInput';
import { YesNoToggle } from '@/components/proposal/YesNoToggle';
import { PlusDeDetailsAccordion } from '../_components/PlusDeDetailsAccordion';

// Match the ProposalFormProvider's input-side generic (validityDays optional
// because the schema applies .default(30) — see ProposalForm.tsx:36 docstring).
type ProposalFormValues = z.input<typeof proposalInputSchema>;

const DURATION_OPTIONS = [
  { value: 36 as const, labelKey: 'form.duration.36' as const },
  { value: 48 as const, labelKey: 'form.duration.48' as const },
  { value: 60 as const, labelKey: 'form.duration.60' as const },
];

export interface ParametresFormCardProps {
  draftId: string;
  /** Initial open state for the "Plus de détails" accordion (D-06). */
  accordionDefaultOpen: boolean;
  /**
   * Fire-and-forget toggle handler — caller wires to persistAccordionOpenAction.
   * The accordion calls this with the next open state on every click.
   */
  onAccordionToggle: (open: boolean) => void;
  /** Active language for labels + placeholders. */
  lang: Lang;
}

export function ParametresFormCard({
  accordionDefaultOpen,
  onAccordionToggle,
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
      {/* D-05: ONE .card containing both sections separated by an hr divider */}
      <section className="card">
        {/* ── Section 1: INFORMATIONS CLIENT ─────────────────────────────── */}
        <div className="ctitle">
          <span
            className="dot"
            style={{ background: 'var(--gd)' }}
            aria-hidden="true"
          />
          <span>{t('wizard.section.informations.client', lang)}</span>
        </div>

        {/* clientCo — wizard-scoped label "Nom du client" per UI-SPEC §6.3 */}
        <div className="fld">
          <label htmlFor="client-co">
            {t('wizard.field.client.co.label', lang)}
            <span className="req" aria-hidden="true">
              *
            </span>
          </label>
          <input
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
            <p id="client-co-error" role="alert" className="error-msg">
              {t(errors.clientCo.message as DictKey, lang)}
            </p>
          )}
        </div>

        {/* clientName — wizard-scoped "Personne de contact" per UI-SPEC §6.3 */}
        <div className="fld">
          <label htmlFor="client-name">
            {t('wizard.field.client.name.label', lang)}
          </label>
          <input
            id="client-name"
            type="text"
            placeholder={t('form.client.name.placeholder', lang)}
            {...register('clientName')}
          />
        </div>

        {/* clientEmail — reuses v1.1 form.client.email key */}
        <div className="fld">
          <label htmlFor="client-email">{t('form.client.email', lang)}</label>
          <input
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
            <p id="client-email-error" role="alert" className="error-msg">
              {t('error.field.email.invalid', lang)}
            </p>
          )}
        </div>

        {/* clientTel — reuses v1.1 form.client.tel key */}
        <div className="fld">
          <label htmlFor="client-tel">{t('form.client.tel', lang)}</label>
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
            <p id="client-tel-error" role="alert" className="error-msg">
              {t('error.field.phone.invalid', lang)}
            </p>
          )}
        </div>

        {/* D-05: 24px divider between the two sections inside the single .card */}
        <hr
          style={{
            border: 'none',
            borderTop: '1px solid var(--border)',
            margin: '24px 0',
          }}
        />

        {/* ── Section 2: DÉTAILS DU PROJET ──────────────────────────────── */}
        <div className="ctitle">
          <span
            className="dot"
            style={{ background: 'var(--gd)' }}
            aria-hidden="true"
          />
          <span>{t('wizard.section.details.projet', lang)}</span>
        </div>

        {/* partnerRef — reuses v1.1 form.project.ref */}
        <div className="fld">
          <label htmlFor="partner-ref">{t('form.project.ref', lang)}</label>
          <input
            id="partner-ref"
            type="text"
            placeholder={t('form.project.ref.placeholder', lang)}
            {...register('partnerRef')}
          />
        </div>

        {/* amountHT — Controller-bound NumberInputAmount (v1.1 component) */}
        <div className="fld">
          <label htmlFor="amount">
            {t('form.project.amount', lang)}
            <span className="req" aria-hidden="true">
              *
            </span>
          </label>
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
            <p id="amount-error" role="alert" className="error-msg">
              {t(errors.amountHT.message as DictKey, lang)}
            </p>
          )}
        </div>

        {/* durationMonths — DurationSegmented with 36/48/60 (D-13 unchanged) */}
        <div className="fld">
          <label>
            {t('form.project.duration', lang)}
            <span className="req" aria-hidden="true">
              *
            </span>
          </label>
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
            <p role="alert" className="error-msg">
              {t('error.field.duration.required', lang)}
            </p>
          )}
        </div>
      </section>

      {/* D-06: PlusDeDetailsAccordion sits BELOW the .card with the 5 optional
          fields. defaultOpen hydrates from draft.inputs._uiAccordionOpen via the
          page server component. */}
      <div style={{ marginTop: 16 }}>
        <PlusDeDetailsAccordion
          defaultOpen={accordionDefaultOpen}
          onToggle={onAccordionToggle}
          lang={lang}
        >
          {/* clientRole */}
          <div className="fld">
            <label htmlFor="client-role">{t('form.client.role', lang)}</label>
            <input
              id="client-role"
              type="text"
              placeholder={t('form.client.role.placeholder', lang)}
              {...register('clientRole')}
            />
          </div>

          {/* clientSiren — Controller-bound SirenInput */}
          <div className="fld">
            <label htmlFor="client-siren">{t('form.client.siren', lang)}</label>
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
              <p id="client-siren-error" role="alert" className="error-msg">
                {t('error.field.siren.invalid', lang)}
              </p>
            )}
          </div>

          {/* projectDesc */}
          <div className="fld">
            <label htmlFor="project-desc">{t('form.project.desc', lang)}</label>
            <input
              id="project-desc"
              type="text"
              placeholder={t('form.project.desc.placeholder', lang)}
              {...register('projectDesc')}
            />
          </div>

          {/* slb — YesNoToggle */}
          <div className="fld">
            <label>{t('form.interests.slb', lang)}</label>
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
          </div>

          {/* evalParc — YesNoToggle */}
          <div className="fld">
            <label>{t('form.interests.eval', lang)}</label>
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
          </div>
        </PlusDeDetailsAccordion>
      </div>
    </>
  );
}
