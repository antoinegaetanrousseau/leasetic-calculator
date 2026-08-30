'use client';

import { SectionTitle } from '@/components/ui/SectionTitle';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useState, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRightIcon, RotateCcwIcon } from '@/components/ui/icons';
import type { z } from 'zod';
import { proposalInputSchema, type ProposalInput } from '@/lib/calc';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import { DurationSegmented } from './DurationSegmented';
import { YesNoToggle } from './YesNoToggle';
import { NumberInputAmount } from './NumberInputAmount';
import { PhoneInput } from './PhoneInput';
import { SirenInput } from './SirenInput';

/**
 * RHF input type — the schema's INPUT side (validityDays optional because
 * the Zod schema applies a `.default(30)` transformation on parse). This
 * differs from `ProposalInput` (= z.infer = output side, where validityDays
 * is required). useForm gets <TFieldValues=Input, TContext, TTransformed=Output>
 * so handleSubmit's data is typed to ProposalInput while defaultValues stays
 * lenient about validityDays.
 *
 * Pattern locked in Plan 07-04 (STATE.md Decisions Log) — sibling components
 * that consume the context (LiveLoyerPreview) use useFormContext<ProposalInput>
 * (the OUTPUT side, since validityDays.default(30) means the parsed/runtime
 * value is always defined).
 */
type ProposalFormValues = z.input<typeof proposalInputSchema>;

export interface ProposalFormProviderProps {
  /** Pre-fill values from session (D-7-13). */
  prefill?: Partial<ProposalInput>;
  children: ReactNode;
}

/**
 * Hoists the RHF setup one level up so <ProposalForm> + <LiveLoyerPreview>
 * are siblings sharing a single FormProvider context (Plan 07-05 Path A).
 * The page Server Component wraps both children in this provider; each
 * child consumes the context via useFormContext().
 */
export function ProposalFormProvider({
  prefill,
  children,
}: ProposalFormProviderProps) {
  const form = useForm<ProposalFormValues, unknown, ProposalInput>({
    resolver: zodResolver(proposalInputSchema),
    mode: 'onBlur', // PROP-08: blur validation
    shouldFocusError: true,
    defaultValues: {
      partnerCo: prefill?.partnerCo ?? '',
      partnerName: prefill?.partnerName ?? '',
      clientCo: prefill?.clientCo ?? '',
      clientName: prefill?.clientName ?? '',
      clientRole: prefill?.clientRole ?? '',
      clientTel: prefill?.clientTel ?? '',
      clientEmail: prefill?.clientEmail ?? '',
      clientSiren: prefill?.clientSiren ?? '',
      slb: prefill?.slb ?? undefined,
      evalParc: prefill?.evalParc ?? undefined,
      amountHT: prefill?.amountHT ?? '',
      // 36/48/60 — left undefined so the segmented control starts in
      // "no selection" state; Zod will reject submit until the user picks one.
      // PROP-21: if duplicating, pre-select the source's duration.
      durationMonths: prefill?.durationMonths ?? (undefined as unknown as 36 | 48 | 60),
      projectDesc: prefill?.projectDesc ?? '',
      partnerRef: prefill?.partnerRef ?? '',
      validityDays: prefill?.validityDays ?? 30, // D-7-05 default
    },
  });
  return <FormProvider {...form}>{children}</FormProvider>;
}

export interface ProposalFormProps {
  lang: Lang;
}

const DURATION_OPTIONS = [
  { value: 36 as const, labelKey: 'form.duration.36' as const },
  { value: 48 as const, labelKey: 'form.duration.48' as const },
  { value: 60 as const, labelKey: 'form.duration.60' as const },
];

/**
 * Phase 7 proposal entry form (PROP-06 + PROP-08).
 *
 * Renders ONLY the form column (left side of the 2-column grid established
 * by app/(authed)/proposals/new/page.tsx). The parent (page Server Component)
 * wraps both <ProposalForm> and <LiveLoyerPreview> in a <ProposalFormProvider>
 * so they share a single FormProvider context (Plan 07-05 Path A). This
 * component consumes the context via useFormContext().
 *
 * Validation: blur-time .invalid red-ring (PROP-08) via mode: 'onBlur' +
 * shouldFocusError (configured by ProposalFormProvider). Submit is a no-op +
 * info toast (D-7-07: Phase 8 wires persistence). Reset uses native
 * window.confirm() (D-7-08, v10 line 2146).
 */
export function ProposalForm({ lang }: ProposalFormProps) {
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  // D-B2: client-generated UUIDv4 idempotency key. Persists across
  // re-renders + back-button-then-resubmit within this form session.
  // Regenerated only on form unmount (which clears the proposal session).
  const [idempotencyKey] = useState<string>(() => crypto.randomUUID());

  // PROP-21: capture ?duplicate=<id> at mount-time via window.location.search.
  // Using lazy useState init (not useSearchParams) so the value persists even
  // after DuplicatePrefillToast strips the URL flag on first render.
  const [duplicatedFromId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('duplicate');
  });

  // Consume the parent <ProposalFormProvider>'s RHF context. Three-generic
  // form mirrors useForm's input/output split; useFormContext is parametrized
  // by the OUTPUT type (the parsed shape Phase 8's server route will see).
  const form = useFormContext<ProposalFormValues>();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  /**
   * D-B1 + D-B2: server validates again, computes again, snapshots params,
   * INSERTs row, renders PDF, uploads blob, returns { id, pdfUrl }. Idempotency
   * key persists across re-renders so double-click / browser-back-then-resubmit
   * collapse to the same proposal id.
   */
  const onSubmit = (data: ProposalFormValues): void => {
    // D-B3: sonner.promise pattern (loading → success / error).
    const promise = (async () => {
      const requestBody = {
        ...data,
        // PROP-21: include source id for audit trail (server plumbs to duplicated_from_id).
        ...(duplicatedFromId ? { duplicatedFromId } : {}),
      };
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Bounded error code from Plan 08-07's SubmitErrorCode union.
        let code = 'unknown_error';
        try {
          const json = (await response.json()) as { error?: unknown };
          if (typeof json?.error === 'string') code = json.error;
        } catch {
          // ignore — fall back to unknown_error
        }
        throw new Error(code);
      }

      const json = (await response.json()) as { id: string; pdfUrl: string };
      return json;
    })();

    toast.promise(promise, {
      loading: t('proposal.toast.submit.loading', lang),
      success: (result) => {
        // PROP-10: post-redirect-get. Trigger redirect during the promise
        // resolution; the success toast briefly displays during the route
        // change.
        router.push(`/proposals/${result.id}`);
        return t('proposal.toast.submit.success', lang);
      },
      error: () => t('proposal.toast.submit.error', lang),
    });
  };

  const onInvalid = () => {
    /**
     * RHF fires this when validation fails; shouldFocusError already focuses
     * the first invalid field. We add a single sonner error toast for
     * affordance. UI-SPEC §3.2.10 + §6.3.
     */
    toast.error(t('proposal.toast.validation.errors', lang));
  };

  const onReset = () => {
    /** D-7-08: Native confirm() dialog (v10 line 2146 parity). */
    if (typeof window === 'undefined') return;
    if (!window.confirm(t('proposal.confirm.reset', lang))) return;
    reset();
    setTimeout(() => firstFieldRef.current?.focus(), 0);
  };

  // RHF register() returns a ref-handler; we splice firstFieldRef into the same
  // ref slot so onReset can restore focus to the first input after reset.
  const partnerCoReg = register('partnerCo');

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
        {/* ── Card 1: Partenaire ─────────────────────────────────────────── */}
        <section className="card" style={{ marginBottom: 16 }}>
          <SectionTitle>{t('form.partner.section', lang)}</SectionTitle>

          <Field>
            <FieldLabel htmlFor="partner-co">
              {t('form.partner.co', lang)}
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Input
              id="partner-co"
              type="text"
              placeholder={t('form.partner.co.placeholder', lang)}
              aria-invalid={!!errors.partnerCo || undefined}
              aria-describedby={errors.partnerCo ? 'partner-co-error' : undefined}
              aria-required="true"
              className={errors.partnerCo ? 'invalid' : ''}
              {...partnerCoReg}
              ref={(el) => {
                partnerCoReg.ref(el);
                firstFieldRef.current = el;
              }}
            />
            {errors.partnerCo && (
              <FieldError id="partner-co-error" role="alert">
                {t(errors.partnerCo.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="partner-name">
              {t('form.partner.name', lang)}
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Input
              id="partner-name"
              type="text"
              placeholder={t('form.partner.name.placeholder', lang)}
              aria-invalid={!!errors.partnerName || undefined}
              aria-describedby={
                errors.partnerName ? 'partner-name-error' : undefined
              }
              aria-required="true"
              className={errors.partnerName ? 'invalid' : ''}
              {...register('partnerName')}
            />
            {errors.partnerName && (
              <FieldError id="partner-name-error" role="alert">
                {t(errors.partnerName.message as DictKey, lang)}
              </FieldError>
            )}
          </Field>
        </section>

        {/* ── Card 2: Client destinataire ─────────────────────────────────── */}
        <section className="card" style={{ marginBottom: 16 }}>
          <SectionTitle accent="teal">{t('form.client.section', lang)}</SectionTitle>

          <Field>
            <FieldLabel htmlFor="client-co">
              {t('form.client.co', lang)}
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

          <Field>
            <FieldLabel htmlFor="client-name">{t('form.client.name', lang)}</FieldLabel>
            <Input
              id="client-name"
              type="text"
              placeholder={t('form.client.name.placeholder', lang)}
              {...register('clientName')}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="client-role">{t('form.client.role', lang)}</FieldLabel>
            <Input
              id="client-role"
              type="text"
              placeholder={t('form.client.role.placeholder', lang)}
              {...register('clientRole')}
            />
          </Field>

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
        </section>

        {/* ── Card 3: Intérêts exprimés ───────────────────────────────────── */}
        <section className="card" style={{ marginBottom: 16 }}>
          <SectionTitle accent="teal">{t('form.interests.section', lang)}</SectionTitle>
          <p
            style={{
              fontSize: '11.2px',
              fontStyle: 'italic',
              color: 'var(--muted)',
              marginBottom: 12,
            }}
          >
            {t('form.interests.intro', lang)}
          </p>

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

        {/* ── Card 4: Paramètres du projet ────────────────────────────────── */}
        <section className="card" style={{ marginBottom: 16 }}>
          <SectionTitle accent="teal">{t('form.project.section', lang)}</SectionTitle>

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

          <Field>
            <FieldLabel htmlFor="project-desc">{t('form.project.desc', lang)}</FieldLabel>
            <Input
              id="project-desc"
              type="text"
              placeholder={t('form.project.desc.placeholder', lang)}
              {...register('projectDesc')}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="partner-ref">{t('form.project.ref', lang)}</FieldLabel>
            <Input
              id="partner-ref"
              type="text"
              placeholder={t('form.project.ref.placeholder', lang)}
              {...register('partnerRef')}
            />
          </Field>
        </section>

        {/* ── Action row ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            type="button"
            className="btn-out"
            onClick={onReset}
            disabled={isSubmitting}
            style={{ flex: 1 }}
          >
            <HugeiconsIcon icon={RotateCcwIcon} size={17} strokeWidth={1.6} aria-hidden="true" />
            <span>{t('button.reset', lang)}</span>
          </button>
          <button
            type="submit"
            className="btn-navy"
            disabled={isSubmitting}
            style={{ flex: 1 }}
          >
            <span>{t('button.generate', lang)}</span>
            <HugeiconsIcon icon={ArrowRightIcon} size={17} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>
    </form>
  );
}
