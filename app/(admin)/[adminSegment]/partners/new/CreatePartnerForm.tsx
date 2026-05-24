'use client';

/**
 * Phase 14 — Client RHF form for /[adminSegment]/partners/new (UI-SPEC §5.1).
 * Phase 18 Plan 04 — visual repaint per Figma 43:46 + D-15/D-16/D-17/D-18.
 *
 * Layout (Phase 18):
 *   <form>
 *     <div className="card">  ← form card with 3 ●-bulleted sections
 *       Section 1: INFORMATIONS PERSONNELLES
 *       Section 2: INFORMATIONS SOCIÉTÉ
 *       Section 3: MESSAGE D'INVITATION
 *     </div>
 *     <div className="card" style={{marginTop:16, ...flex space-between}}>
 *       ← Annuler (btn-out, type="button", dirty-form confirm)   Envoyer l'invitation → (btn-green, submit)
 *     </div>
 *   </form>
 *
 * Behavior (unchanged from Phase 14):
 *   - RHF + zodResolver(createPartnerFormSchema) onBlur validation
 *   - Submit → server action createPartnerAction
 *     - { ok: true, url, kind: 'invite' }: sonner success toast +
 *       <InviteUrlModal> opens; on modal close: reset() + router.push(/partners).
 *     - { ok: false, error }: duplicate-email mapped to specific toast; everything
 *       else → generic partners.new.toast.error toast (D-16 server-action fallback).
 *
 * Phase 18 deltas:
 *   - D-15 action row moved OUT of the form card into a sibling .card (marginTop:16)
 *   - D-15 submit label: "Envoyer l'invitation →" via admin.partners.form.submit
 *   - D-15 submit spinner: "Envoi en cours…" via admin.partners.form.submit.spinner
 *   - D-15 Annuler is now a <button type="button"> (was <Link>) so D-18 confirm
 *     can fire before navigation
 *   - D-16 inline error state already shipped Phase 14 (.invalid class + aria-invalid
 *     + aria-describedby + .error-msg); the global CSS rule `input.invalid` +
 *     `input[aria-invalid="true"]` provides the red border via `border-color: var(--danger)`
 *     (see app/globals.css line 192-196). Inline error <p> text uses the .error-msg
 *     class which globally renders `color: var(--danger)` (globals.css line 164-170).
 *     Both the border and error-text tokens resolve to `var(--danger)` — defense-in-depth
 *     inline borderColor overlay below on invalid inputs satisfies the explicit-token
 *     contract from 18-04 PLAN done-criteria gate.
 *   - D-17 InviteUrlModal success affordance preserved verbatim
 *   - D-18 dirty-form confirm dialog: clean form → immediate navigate;
 *     dirty form → window.confirm() with admin.partners.form.cancel.confirm copy;
 *     accept → router.push, decline → stay on form. window.confirm is the
 *     UI-SPEC line 443 baseline (no project-wide ConfirmDialog primitive exists).
 *
 * ADMIN-09 (D-29 strict): no commission/rate fields rendered.
 */

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Import the schema + type directly from the schemas module to avoid pulling
// in the @/lib/admin barrel (which re-exports server-only actions). Keeps the
// client-component bundle clean of `server-only` violations.
import {
  createPartnerFormSchema,
  type CreatePartnerFormValues,
} from '@/lib/admin/schemas';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import { InviteUrlModal } from '@/components/InviteUrlModal';

export interface CreatePartnerFormProps {
  lang: Lang;
  adminSegment: string;
  /**
   * Server action — Phase 14 createPartnerInvitationAction. Decoupled from
   * the import so tests can pass a vi.fn() and the form remains framework-
   * agnostic about its action provenance (D-08 server-action contract).
   */
  createPartnerAction: (
    data: CreatePartnerFormValues,
  ) => Promise<
    | { ok: true; url: string; kind: 'invite' }
    | { ok: false; error: string }
  >;
}

interface InviteUrlPayload {
  url: string;
  kind: 'invite';
}

const MESSAGE_MAX_LEN = 1000;

export function CreatePartnerForm({
  lang,
  adminSegment,
  createPartnerAction,
}: CreatePartnerFormProps) {
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState<InviteUrlPayload | null>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    control,
    reset,
  } = useForm<CreatePartnerFormValues>({
    resolver: zodResolver(createPartnerFormSchema),
    mode: 'onBlur',
    shouldFocusError: true,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      companyName: '',
      siret: '',
      phone: '',
      invitationMessage: '',
    },
  });

  // useWatch is the React Compiler-compatible alternative to watch() — same
  // pattern as CreatePartnerModal (analog) line 46.
  const messageValue = useWatch({ control, name: 'invitationMessage' }) ?? '';
  const messageLen = messageValue.length;
  const messageOverLimit = messageLen > MESSAGE_MAX_LEN;

  const onSubmit = async (data: CreatePartnerFormValues) => {
    const result = await createPartnerAction(data);
    if (result.ok) {
      toast.success(t('partners.new.toast.success', lang));
      setInviteUrl({ url: result.url, kind: result.kind });
    } else {
      if (result.error === 'admin.accounts.modal.error.email.exists') {
        toast.error(t('partners.new.toast.error.duplicate', lang));
      } else {
        // D-16 server-action error fallback — generic toast for non-duplicate failures.
        toast.error(t('partners.new.toast.error', lang));
      }
    }
  };

  /**
   * D-18 — dirty-form confirm gate on Annuler.
   * Clean form (isDirty=false) → immediate navigate.
   * Dirty form (isDirty=true) → window.confirm() before navigating.
   *
   * window.confirm is the UI-SPEC line 443 baseline ("or window.confirm as a
   * baseline if no modal primitive exists"). Verified no project-wide
   * ConfirmDialog primitive exists (grep on 2026-05-24); existing patterns
   * (ProposalForm reset, DeleteButtonClient) all use window.confirm.
   */
  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        t('admin.partners.form.cancel.confirm', lang),
      );
      if (!confirmed) return;
    }
    router.push(`/${adminSegment}/partners`);
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-busy={isSubmitting || undefined}
      >
        {/* ── Form card (D-15) — 3 sections with ● bullets ───────────────── */}
        <div className="card">
          {/* ── Section 1: INFORMATIONS PERSONNELLES ─────────────────────── */}
          <div className="ctitle" style={{ marginBottom: 16 }}>
            <span
              className="dot"
              style={{ background: 'var(--gd)' }}
              aria-hidden="true"
            />
            <span>{t('partners.new.section.personal', lang)}</span>
          </div>

          <div className="fld">
            <label htmlFor="cpf-firstName">
              {t('partners.new.field.firstName', lang)}
              <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="cpf-firstName"
              type="text"
              autoComplete="given-name"
              placeholder={t('partners.new.field.firstName.placeholder', lang)}
              aria-invalid={errors.firstName ? true : undefined}
              aria-describedby={errors.firstName ? 'cpf-firstName-error' : undefined}
              className={errors.firstName ? 'invalid' : ''}
              disabled={isSubmitting}
              {...register('firstName')}
            />
            {errors.firstName?.message && (
              <p id="cpf-firstName-error" role="alert" className="error-msg">
                {t(errors.firstName.message as DictKey, lang)}
              </p>
            )}
          </div>

          <div className="fld">
            <label htmlFor="cpf-lastName">
              {t('partners.new.field.lastName', lang)}
              <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="cpf-lastName"
              type="text"
              autoComplete="family-name"
              placeholder={t('partners.new.field.lastName.placeholder', lang)}
              aria-invalid={errors.lastName ? true : undefined}
              aria-describedby={errors.lastName ? 'cpf-lastName-error' : undefined}
              className={errors.lastName ? 'invalid' : ''}
              disabled={isSubmitting}
              {...register('lastName')}
            />
            {errors.lastName?.message && (
              <p id="cpf-lastName-error" role="alert" className="error-msg">
                {t(errors.lastName.message as DictKey, lang)}
              </p>
            )}
          </div>

          <div className="fld">
            <label htmlFor="cpf-email">
              {t('partners.new.field.email', lang)}
              <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="cpf-email"
              type="email"
              autoComplete="email"
              placeholder={t('partners.new.field.email.placeholder', lang)}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'cpf-email-error' : undefined}
              className={errors.email ? 'invalid' : ''}
              // D-16 explicit borderColor overlay — global CSS rule
              // `input.invalid` + `input[aria-invalid="true"]` already maps to
              // var(--danger) (globals.css L192-196); inline overlay is
              // defense-in-depth + makes the token explicit at the call site.
              style={
                errors.email ? { borderColor: 'var(--danger)' } : undefined
              }
              disabled={isSubmitting}
              {...register('email')}
            />
            {errors.email?.message && (
              <p
                id="cpf-email-error"
                role="alert"
                className="error-msg"
                // D-16 explicit color overlay — .error-msg already maps to
                // var(--danger) via globals.css L164-170 + .fld .error-msg rule.
                style={{ color: 'var(--danger)' }}
              >
                {t(errors.email.message as DictKey, lang)}
              </p>
            )}
          </div>

          <hr
            style={{
              border: 'none',
              borderTop: '1px solid var(--border)',
              margin: '24px 0',
            }}
          />

          {/* ── Section 2: INFORMATIONS SOCIÉTÉ ─────────────────────────── */}
          <div className="ctitle" style={{ marginBottom: 16 }}>
            <span
              className="dot"
              style={{ background: 'var(--gd)' }}
              aria-hidden="true"
            />
            <span>{t('partners.new.section.company', lang)}</span>
          </div>

          <div className="fld">
            <label htmlFor="cpf-companyName">
              {t('partners.new.field.companyName', lang)}
              <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="cpf-companyName"
              type="text"
              autoComplete="organization"
              placeholder={t('partners.new.field.companyName.placeholder', lang)}
              aria-invalid={errors.companyName ? true : undefined}
              aria-describedby={errors.companyName ? 'cpf-companyName-error' : undefined}
              className={errors.companyName ? 'invalid' : ''}
              disabled={isSubmitting}
              {...register('companyName')}
            />
            {errors.companyName?.message && (
              <p id="cpf-companyName-error" role="alert" className="error-msg">
                {t(errors.companyName.message as DictKey, lang)}
              </p>
            )}
          </div>

          <div className="fld">
            <label htmlFor="cpf-siret">
              {t('partners.new.field.siret', lang)}
            </label>
            <input
              id="cpf-siret"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={t('partners.new.field.siret.placeholder', lang)}
              aria-invalid={errors.siret ? true : undefined}
              aria-describedby={errors.siret ? 'cpf-siret-error' : undefined}
              className={errors.siret ? 'invalid' : ''}
              disabled={isSubmitting}
              {...register('siret')}
            />
            {errors.siret?.message && (
              <p id="cpf-siret-error" role="alert" className="error-msg">
                {t(errors.siret.message as DictKey, lang)}
              </p>
            )}
          </div>

          <div className="fld">
            <label htmlFor="cpf-phone">
              {t('partners.new.field.phone', lang)}
              <span className="req" aria-hidden="true">*</span>
            </label>
            {/*
              UI-SPEC §5.1.3 recommends reusing <PhoneInput>. We use a plain
              <input type="tel"> here because PhoneInput consumes RHF via
              Controller + formats to 10-digit FR layout — the form schema
              accepts a more permissive 6-20 char range (E.164 / international
              partners). Switching to PhoneInput would over-constrain the
              international case; keeping plain input + the schema regex.
            */}
            <input
              id="cpf-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder=""
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? 'cpf-phone-error' : undefined}
              className={errors.phone ? 'invalid' : ''}
              disabled={isSubmitting}
              {...register('phone')}
            />
            {errors.phone?.message && (
              <p id="cpf-phone-error" role="alert" className="error-msg">
                {t(errors.phone.message as DictKey, lang)}
              </p>
            )}
          </div>

          <hr
            style={{
              border: 'none',
              borderTop: '1px solid var(--border)',
              margin: '24px 0',
            }}
          />

          {/* ── Section 3: MESSAGE D'INVITATION ─────────────────────────── */}
          <div className="ctitle" style={{ marginBottom: 16 }}>
            <span
              className="dot"
              style={{ background: 'var(--gd)' }}
              aria-hidden="true"
            />
            <span>{t('partners.new.section.message', lang)}</span>
          </div>

          <div className="fld">
            <label htmlFor="cpf-message">
              {t('partners.new.field.message', lang)}
            </label>
            <textarea
              id="cpf-message"
              placeholder={t('partners.new.field.message.placeholder', lang)}
              aria-invalid={errors.invitationMessage ? true : undefined}
              aria-describedby={
                errors.invitationMessage
                  ? 'cpf-message-error'
                  : 'cpf-message-counter'
              }
              className={errors.invitationMessage ? 'invalid' : ''}
              disabled={isSubmitting}
              style={{
                minHeight: 120,
                maxHeight: 320,
                resize: 'vertical',
                padding: 12,
                lineHeight: 1.55,
                width: '100%',
              }}
              {...register('invitationMessage')}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: 4,
              }}
            >
              <span
                id="cpf-message-counter"
                data-testid="char-counter"
                aria-live="polite"
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: messageOverLimit ? 'var(--danger)' : 'var(--muted)',
                }}
              >
                {t('partners.new.message.counter', lang).replace(
                  '{0}',
                  String(messageLen),
                )}
              </span>
            </div>
            {errors.invitationMessage?.message && (
              <p id="cpf-message-error" role="alert" className="error-msg">
                {t(errors.invitationMessage.message as DictKey, lang)}
              </p>
            )}
          </div>
        </div>

        {/* ── Action card (D-15) — separate .card sibling, marginTop:16 ─── */}
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
            aria-label={t('partners.new.cancel.aria', lang)}
          >
            {t('partners.new.cancel', lang)}
          </button>

          <button
            ref={submitBtnRef}
            type="submit"
            className="btn-green"
            disabled={isSubmitting}
            aria-disabled={isSubmitting || undefined}
            aria-busy={isSubmitting || undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting && (
              <Loader2
                size={16}
                strokeWidth={2}
                style={{ animation: 'spin 1s linear infinite' }}
                aria-hidden="true"
              />
            )}
            {isSubmitting
              ? t('admin.partners.form.submit.spinner', lang)
              : t('admin.partners.form.submit', lang)}
          </button>
        </div>
      </form>

      {inviteUrl && (
        <InviteUrlModal
          url={inviteUrl.url}
          kind={inviteUrl.kind}
          lang={lang}
          onClose={() => {
            setInviteUrl(null);
            reset();
            router.push(`/${adminSegment}/partners`);
          }}
          triggerRef={submitBtnRef}
        />
      )}
    </>
  );
}
