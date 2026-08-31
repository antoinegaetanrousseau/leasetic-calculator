'use client';

/**
 * ParametresForm — /parametres client island.
 *
 * Phase 21 / Plan 21-01 (D-06, D-06b, D-06c, D-06d, D-07 rev 2, D-08, D-10).
 *
 * Layout (rev 2 Figma 132:867):
 *   1. Form card (id="parametres-form") containing:
 *      - "INFORMATIONS PERSONNELLES" eyebrow header with filled-circle bullet
 *      - 2-column row: Prénom + Nom
 *      - Full-width row: Email professionnel (rendered as STATIC TEXT — D-06d
 *        resolved to "email read-only"; admin-contact notice below)
 *      - Horizontal divider
 *      - 2-column row: Ancien mot de passe + Nouveau mot de passe
 *        (Eye/EyeOff toggles on BOTH inputs; strength meter beneath new pw)
 *      - Below the password row: muted helper notice spanning the card width
 *        ("Modifier votre mot de passe vous déconnectera de vos autres
 *        appareils." — D-08)
 *   2. SEPARATE action footer card (outside the form) with Annuler (left) +
 *      Enregistrer les modifications (right). Submit button uses
 *      `form="parametres-form"` to link to the card-wrapped form.
 *
 * Combined Save semantics (D-06c partial-success matrix):
 *   - Neither section dirty → Save disabled.
 *   - Identity-only dirty → authClient.updateUser({ name }) → identity toast.
 *   - Password-only dirty (both fields filled) → authClient.changePassword({
 *     currentPassword, newPassword, revokeOtherSessions: true }) → pw toast.
 *   - Both dirty → identity first, then password; partial-success toasts per
 *     the matrix.
 *   - Only ONE of the two password fields filled → INLINE
 *     "parametres.error.password.required.pair" on the empty field; do NOT
 *     treat the section as "untouched" (D-06c rev 2 edge case).
 *   - Better Auth INVALID_PASSWORD → INLINE error under "Ancien mot de passe"
 *     using "parametres.error.password.current.wrong" (Plr-9).
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';
import { toast } from 'sonner';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { authClient } from '@/lib/auth/client';
import {
  changePasswordSchema,
  identitySchema,
  type ChangePasswordInput,
  type IdentityInput,
} from '@/lib/auth/schemas';
import {
  strengthScore,
  STRENGTH_KEYS,
  STRENGTH_COLORS,
} from '@/lib/auth/strength';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface ParametresFormProps {
  lang: Lang;
  initialFirstName: string;
  initialLastName: string;
  initialEmail: string;
  /**
   * Compile-time D-06d resolution. `false` for the current shipped build
   * (live DB probe 2026-05-29 — both admins have email_verified=1, so Better
   * Auth would reject /change-email without SMTP). When `false`, the email
   * is rendered as static text + the `parametres.identity.email.readonly.notice`
   * helper; when `true`, an editable input bound to `authClient.changeEmail`.
   */
  emailEditable: boolean;
}

const FORM_ID = 'parametres-form';

export function ParametresForm({
  lang,
  initialFirstName,
  initialLastName,
  initialEmail,
  emailEditable,
}: ParametresFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Two independent useForm instances so each section has its OWN dirty state.
  // This is required by D-06c: the combined Save handler reads per-section
  // dirty flags to decide whether to call updateUser, changePassword, or both.
  const identityForm = useForm<IdentityInput>({
    resolver: zodResolver(identitySchema),
    mode: 'onBlur',
    defaultValues: {
      firstName: initialFirstName,
      lastName: initialLastName,
    },
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onBlur',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  });

  // Watch for live strength meter under "Nouveau mot de passe" (Plr-3 — reuses
  // auth.password.strength.* dict keys + strengthScore helper).
  const newPwd =
    useWatch({ control: passwordForm.control, name: 'newPassword' }) ?? '';
  const strength = strengthScore(newPwd);

  // Snapshot password-field values so we can compute the "one-of-two filled"
  // edge case (D-06c rev 2) without relying on isDirty alone — dirty fires on
  // ANY edit, even typing-then-clearing, so we cross-check actual values too.
  const currentPwdValue =
    useWatch({ control: passwordForm.control, name: 'currentPassword' }) ?? '';
  const passwordEitherFilled =
    currentPwdValue.length > 0 || newPwd.length > 0;

  // ── Combined Save handler (D-06c) ──────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const identityDirty = identityForm.formState.isDirty;
    // Treat the password section as "intended" if EITHER input has any value
    // (D-06c rev 2 edge case — one-of-two-pw-fields filled is NOT "untouched").
    const passwordIntent = passwordEitherFilled;
    if (!identityDirty && !passwordIntent) return;

    // 1) Validate each section that has work to do.
    let identityValues: IdentityInput | null = null;
    let passwordValues: ChangePasswordInput | null = null;

    if (identityDirty) {
      const ok = await identityForm.trigger();
      if (!ok) return;
      identityValues = identityForm.getValues();
    }

    if (passwordIntent) {
      // D-06c rev 2 edge case: one-of-two pw fields filled, the other empty
      // → INLINE required.pair error on the empty field; never silently treat
      // as "untouched".
      let edgeError = false;
      if (currentPwdValue.length === 0) {
        passwordForm.setError('currentPassword', {
          message: t('parametres.error.password.required.pair', lang),
        });
        edgeError = true;
      }
      if (newPwd.length === 0) {
        passwordForm.setError('newPassword', {
          message: t('parametres.error.password.required.pair', lang),
        });
        edgeError = true;
      }
      if (edgeError) return;

      const ok = await passwordForm.trigger();
      if (!ok) return;
      passwordValues = passwordForm.getValues();
    }

    startTransition(async () => {
      // Defaulting OK to true when nothing was attempted lets the matrix
      // below treat "section not dirty" as a no-op success.
      let identityOk = !identityDirty;
      let passwordOk = !passwordIntent;
      let passwordErrorCode: string | null = null;

      // ── (a) Identity first (D-06c order) ──
      if (identityDirty && identityValues) {
        const fullName =
          `${identityValues.firstName} ${identityValues.lastName}`.trim();
        try {
          const { error } = await authClient.updateUser({ name: fullName });
          if (error) {
            identityOk = false;
          } else {
            identityOk = true;
          }
        } catch {
          identityOk = false;
        }
        // emailEditable === false in this build → no authClient.changeEmail
        // call. When emailEditable flips to true in a future build, wire
        // `authClient.changeEmail({ newEmail: identityValues.email })` here.
      }

      // ── (b) Password second ──
      if (passwordIntent && passwordValues) {
        try {
          const { error } = await authClient.changePassword({
            currentPassword: passwordValues.currentPassword,
            newPassword: passwordValues.newPassword,
            revokeOtherSessions: true, // D-08 — ALWAYS true, hardcoded.
          });
          if (error) {
            passwordOk = false;
            // Better Auth error.code is the upstream BASE_ERROR_CODES enum
            // (RESEARCH §1c). We map a small subset to inline errors; the
            // rest fall to a generic toast.
            passwordErrorCode =
              ((error as { code?: string }).code as string) ?? 'unknown';
          } else {
            passwordOk = true;
          }
        } catch {
          passwordOk = false;
          passwordErrorCode = 'unknown';
        }
      }

      // ── Surface results per D-06c matrix ──
      if (identityOk && passwordOk) {
        if (identityDirty && passwordIntent) {
          toast.success(t('parametres.toast.both.saved', lang));
        } else if (identityDirty) {
          toast.success(t('parametres.toast.identity.saved', lang));
        } else {
          toast.success(t('parametres.toast.password.saved', lang));
        }
        // Reset identity dirty state but KEEP the saved values; reset the
        // password section entirely so the next change requires re-typing
        // the current pw (defense in depth — never persist plaintext in
        // React state across renders).
        identityForm.reset(identityForm.getValues());
        passwordForm.reset();
        // Refresh the (authed) layout so the topbar UserMenu displays the
        // new displayName immediately.
        router.refresh();
        return;
      }

      // Map known password error codes to inline field-level errors (Plr-9).
      const surfacePasswordInlineError = () => {
        if (passwordErrorCode === 'INVALID_PASSWORD') {
          passwordForm.setError('currentPassword', {
            message: t('parametres.error.password.current.wrong', lang),
          });
          return true;
        }
        if (passwordErrorCode === 'PASSWORD_TOO_SHORT') {
          passwordForm.setError('newPassword', {
            message: t('parametres.error.password.tooShort', lang),
          });
          return true;
        }
        if (passwordErrorCode === 'PASSWORD_TOO_LONG') {
          passwordForm.setError('newPassword', {
            message: t('parametres.error.password.tooLong', lang),
          });
          return true;
        }
        return false;
      };

      // Partial success requires BOTH sections to have been ACTUALLY attempted —
      // identityOk/passwordOk default to true when their section wasn't dirty,
      // which previously caused misleading "Informations enregistrées" /
      // "Mot de passe modifié" toasts to fire when only the OTHER section was
      // attempted and failed. The `identityDirty && passwordIntent` gates below
      // restrict partial-success messaging to genuine two-section attempts.

      if (identityDirty && passwordIntent && identityOk && !passwordOk) {
        const inlineHandled = surfacePasswordInlineError();
        if (!inlineHandled) {
          toast.error(t('parametres.error.unknown', lang));
        }
        toast.success(
          t('parametres.toast.partialSuccess.identityOk.passwordErr', lang),
        );
        identityForm.reset(identityForm.getValues());
        router.refresh();
        return;
      }

      if (identityDirty && passwordIntent && !identityOk && passwordOk) {
        toast.success(
          t('parametres.toast.partialSuccess.passwordOk.identityErr', lang),
        );
        toast.error(t('parametres.error.unknown', lang));
        passwordForm.reset();
        router.refresh();
        return;
      }

      // Single-section failure (or both-failure): surface inline pw error if
      // applicable; fire a generic toast only when no inline error was set
      // (i.e. unknown code OR identity-only failure with no inline mapping).
      const inlineHandled =
        passwordIntent && !passwordOk ? surfacePasswordInlineError() : false;
      if (!inlineHandled) {
        toast.error(t('parametres.error.unknown', lang));
      }
    });
  };

  const handleCancel = () => {
    identityForm.reset();
    passwordForm.reset();
  };

  // Map Zod issue codes (preserved by @hookform/resolvers/zod on
  // `error.type`) to localized dict messages. Manual setError calls
  // already pass translated strings through t() so we let those flow
  // through unchanged — only Zod's default English messages
  // ("Too small: expected string to have >=8 characters", etc.) need
  // converting at render time so the FR/EN inline error matches the
  // surrounding UI locale.
  const localizePwError = (
    field: 'currentPassword' | 'newPassword',
    error: { type?: string; message?: string } | undefined,
  ): string | null => {
    if (!error) return null;
    if (error.type === 'too_small' && field === 'newPassword') {
      return t('parametres.error.password.tooShort', lang);
    }
    if (error.type === 'too_big' && field === 'newPassword') {
      return t('parametres.error.password.tooLong', lang);
    }
    return error.message ?? null;
  };

  const saveDisabled =
    isPending ||
    (!identityForm.formState.isDirty && !passwordEitherFilled);

  const identityErrors = identityForm.formState.errors;
  const passwordErrors = passwordForm.formState.errors;

  return (
    <>
      {/* ── Form card ─────────────────────────────────────────────────────── */}
      <form
        id={FORM_ID}
        onSubmit={handleSave}
        noValidate
        // `.card` supplies surface + radius 16 + shadow + 28px padding, which
        // is what this form already had, so no padding utility is needed.
        // (`.card` now lives in `@layer components`, so one WOULD apply.)
        className="card mt-8 w-full"
      >
        {/* Eyebrow section header */}
        <div className="mb-5 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block size-2 rounded-full bg-[var(--teal)]"
          />
          <span className="text-[12px] font-semibold tracking-[1.5px] text-muted-foreground uppercase">
            {t('parametres.card.eyebrow.identity', lang)}
          </span>
        </div>

        {/* Identity row 1 — Prénom + Nom (2-column) */}
        <FieldGroup className="mb-4 grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="pf-firstName">
              {t('parametres.identity.firstName.label', lang)}
            </FieldLabel>
            <Input
              id="pf-firstName"
              type="text"
              autoComplete="given-name"
              placeholder={t(
                'parametres.identity.firstName.placeholder',
                lang,
              )}
              aria-invalid={!!identityErrors.firstName}
              {...identityForm.register('firstName')}
            />
            {identityErrors.firstName && (
              <FieldError role="alert">
                {t('parametres.error.required', lang)}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="pf-lastName">
              {t('parametres.identity.lastName.label', lang)}
            </FieldLabel>
            <Input
              id="pf-lastName"
              type="text"
              autoComplete="family-name"
              placeholder={t(
                'parametres.identity.lastName.placeholder',
                lang,
              )}
              aria-invalid={!!identityErrors.lastName}
              {...identityForm.register('lastName')}
            />
            {identityErrors.lastName && (
              <FieldError role="alert">
                {t('parametres.error.required', lang)}
              </FieldError>
            )}
          </Field>
        </FieldGroup>

        {/* Identity row 2 — Email (full-width). READ-ONLY per D-06d. */}
        <Field className="mb-4">
          <FieldLabel htmlFor="pf-email">
            {t('parametres.identity.email.label', lang)}
          </FieldLabel>
          {emailEditable ? (
            // Reserved for the "email editable" branch — not used in the
            // current shipped build (D-06d resolved to read-only). When the
            // resolution flips, wire identityForm.register('email') here.
            <Input
              id="pf-email"
              type="email"
              autoComplete="email"
              defaultValue={initialEmail}
              placeholder={t(
                'parametres.identity.email.placeholder',
                lang,
              )}
            />
          ) : (
            <>
              {/* Not a disabled <Input>: the value is not editable in this
                  build at all, so it is static text rather than a control a
                  keyboard user can land on and find inert. */}
              <p
                id="pf-email"
                className="m-0 rounded-xl border border-border bg-[var(--hover-overlay)] px-3 py-2.5 text-[14.5px] text-ink"
              >
                {initialEmail}
              </p>
              <p className="mt-1.5 mb-0 text-[12px] text-muted-foreground">
                {t('parametres.identity.email.readonly.notice', lang)}
              </p>
            </>
          )}
        </Field>

        {/* Horizontal divider (no section header after — rev 2). */}
        <FieldSeparator className="my-6" />

        {/* Password row — Ancien + Nouveau (2-column, NO confirm field). */}
        <FieldGroup className="grid grid-cols-2 gap-4">
          {/* Ancien mot de passe */}
          <Field>
            <FieldLabel htmlFor="pf-currentPassword">
              {t('parametres.password.current.label', lang)}
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="pf-currentPassword"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={t(
                  'parametres.password.current.placeholder',
                  lang,
                )}
                aria-invalid={!!passwordErrors.currentPassword}
                {...passwordForm.register('currentPassword')}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  onClick={() => setShowCurrent((s) => !s)}
                  aria-label={
                    showCurrent
                      ? t('auth.password.hide', lang)
                      : t('auth.password.show', lang)
                  }
                >
                  {showCurrent ? (
                    <EyeOffIcon size={17} />
                  ) : (
                    <EyeIcon size={17} />
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {passwordErrors.currentPassword && (
              <FieldError role="alert">
                {localizePwError('currentPassword', passwordErrors.currentPassword)}
              </FieldError>
            )}
          </Field>

          {/* Nouveau mot de passe */}
          <Field>
            <FieldLabel htmlFor="pf-newPassword">
              {t('parametres.password.new.label', lang)}
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="pf-newPassword"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t(
                  'parametres.password.new.placeholder',
                  lang,
                )}
                aria-invalid={!!passwordErrors.newPassword}
                {...passwordForm.register('newPassword')}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  aria-label={
                    showNew
                      ? t('auth.password.hide', lang)
                      : t('auth.password.show', lang)
                  }
                >
                  {showNew ? (
                    <EyeOffIcon size={17} />
                  ) : (
                    <EyeIcon size={17} />
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {passwordErrors.newPassword && (
              <FieldError role="alert">
                {localizePwError('newPassword', passwordErrors.newPassword)}
              </FieldError>
            )}
            {/* Strength meter (Plr-3) — 4-segment bar. The filled colour is
                indexed off the score at runtime, so it stays an inline style;
                a utility class cannot express a value that is not known until
                render. */}
            <div className="mt-2 flex gap-1" aria-hidden="true">
              {([0, 1, 2, 3] as const).map((i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-md transition-colors duration-200"
                  style={{
                    background:
                      i < strength
                        ? STRENGTH_COLORS[strength]
                        : 'var(--border)',
                  }}
                />
              ))}
            </div>
            <div className="mt-1 min-h-[1.4em] text-[10.5px] text-muted-foreground">
              {newPwd
                ? t(STRENGTH_KEYS[strength], lang)
                : t('parametres.password.new.hint', lang)}
            </div>
          </Field>
        </FieldGroup>

        {/* Session-invalidation notice (D-08 + Plr-7 rev 2) — below pw row. */}
        <p className="mt-5 mb-0 text-[13px] text-muted-foreground">
          {t('parametres.password.session.notice', lang)}
        </p>
      </form>

      {/* ── Action footer — SEPARATE sibling card outside the form ─────────── */}
      {/* A tighter card: surface/border/shadow from `.card`, then radius 12 and
          16px padding from utilities. That override only became possible once
          `.card` moved into `@layer components` — while it sat unlayered these
          two utilities were silently inert. */}
      <div className="card mt-6 flex w-full items-center justify-between rounded-xl p-4">
        <button
          type="button"
          className="btn-out"
          onClick={handleCancel}
          disabled={isPending}
        >
          {t('parametres.action.cancel', lang)}
        </button>
        {/* No inline opacity/cursor: globals.css already gives .btn-green
            :disabled `pointer-events: none; opacity: .6`, so the inline pair
            was restating a rule that was already there. */}
        <button
          type="submit"
          form={FORM_ID}
          className="btn-green"
          disabled={saveDisabled}
          aria-disabled={saveDisabled || undefined}
        >
          {isPending
            ? t('parametres.action.saving', lang)
            : t('parametres.action.save', lang)}
        </button>
      </div>
    </>
  );
}
