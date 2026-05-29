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
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
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

  // ── Styles ────────────────────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11.2px',
    fontWeight: 500,
    color: 'var(--ink)',
    marginBottom: 6,
  };
  const inputBaseStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    boxSizing: 'border-box',
  };
  const inputPasswordPadding: React.CSSProperties = {
    paddingRight: 40,
  };
  const errorStyle: React.CSSProperties = {
    fontSize: '11.2px',
    fontWeight: 500,
    color: 'var(--danger)',
    marginTop: 4,
  };
  const fieldGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  };

  const identityErrors = identityForm.formState.errors;
  const passwordErrors = passwordForm.formState.errors;

  return (
    <>
      {/* ── Form card ─────────────────────────────────────────────────────── */}
      <form
        id={FORM_ID}
        onSubmit={handleSave}
        noValidate
        style={{
          width: '100%',
          padding: 28,
          background: 'var(--surface)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-card)',
          marginTop: 32,
          boxSizing: 'border-box',
        }}
      >
        {/* Eyebrow section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--teal)',
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            {t('parametres.card.eyebrow.identity', lang)}
          </span>
        </div>

        {/* Identity row 1 — Prénom + Nom (2-column) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div style={fieldGroupStyle}>
            <label htmlFor="pf-firstName" style={labelStyle}>
              {t('parametres.identity.firstName.label', lang)}
            </label>
            <input
              id="pf-firstName"
              type="text"
              autoComplete="given-name"
              placeholder={t(
                'parametres.identity.firstName.placeholder',
                lang,
              )}
              aria-invalid={!!identityErrors.firstName}
              {...identityForm.register('firstName')}
              style={{
                ...inputBaseStyle,
                ...(identityErrors.firstName
                  ? { borderColor: 'var(--danger)' }
                  : {}),
              }}
            />
            {identityErrors.firstName && (
              <p role="alert" style={errorStyle}>
                {t('parametres.error.required', lang)}
              </p>
            )}
          </div>

          <div style={fieldGroupStyle}>
            <label htmlFor="pf-lastName" style={labelStyle}>
              {t('parametres.identity.lastName.label', lang)}
            </label>
            <input
              id="pf-lastName"
              type="text"
              autoComplete="family-name"
              placeholder={t(
                'parametres.identity.lastName.placeholder',
                lang,
              )}
              aria-invalid={!!identityErrors.lastName}
              {...identityForm.register('lastName')}
              style={{
                ...inputBaseStyle,
                ...(identityErrors.lastName
                  ? { borderColor: 'var(--danger)' }
                  : {}),
              }}
            />
            {identityErrors.lastName && (
              <p role="alert" style={errorStyle}>
                {t('parametres.error.required', lang)}
              </p>
            )}
          </div>
        </div>

        {/* Identity row 2 — Email (full-width). READ-ONLY per D-06d. */}
        <div style={{ ...fieldGroupStyle, marginBottom: 16 }}>
          <label style={labelStyle}>
            {t('parametres.identity.email.label', lang)}
          </label>
          {emailEditable ? (
            // Reserved for the "email editable" branch — not used in the
            // current shipped build (D-06d resolved to read-only). When the
            // resolution flips, wire identityForm.register('email') here.
            <input
              type="email"
              autoComplete="email"
              defaultValue={initialEmail}
              placeholder={t(
                'parametres.identity.email.placeholder',
                lang,
              )}
              style={inputBaseStyle}
            />
          ) : (
            <>
              <p
                style={{
                  margin: 0,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(110, 113, 145, 0.06)',
                  color: 'var(--ink)',
                  fontSize: 14.5,
                  border: '1px solid var(--border)',
                }}
              >
                {initialEmail}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  marginTop: 6,
                  marginBottom: 0,
                }}
              >
                {t('parametres.identity.email.readonly.notice', lang)}
              </p>
            </>
          )}
        </div>

        {/* Horizontal divider (no section header after — rev 2). */}
        <hr
          style={{
            border: 'none',
            borderTop: '1px solid var(--border)',
            margin: '24px 0',
          }}
        />

        {/* Password row — Ancien + Nouveau (2-column, NO confirm field). */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          {/* Ancien mot de passe */}
          <div style={fieldGroupStyle}>
            <label htmlFor="pf-currentPassword" style={labelStyle}>
              {t('parametres.password.current.label', lang)}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="pf-currentPassword"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={t(
                  'parametres.password.current.placeholder',
                  lang,
                )}
                aria-invalid={!!passwordErrors.currentPassword}
                {...passwordForm.register('currentPassword')}
                style={{
                  ...inputBaseStyle,
                  ...inputPasswordPadding,
                  ...(passwordErrors.currentPassword
                    ? { borderColor: 'var(--danger)' }
                    : {}),
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                aria-label={
                  showCurrent
                    ? t('auth.password.hide', lang)
                    : t('auth.password.show', lang)
                }
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showCurrent ? (
                  <EyeOff size={17} strokeWidth={1.6} />
                ) : (
                  <Eye size={17} strokeWidth={1.6} />
                )}
              </button>
            </div>
            {passwordErrors.currentPassword && (
              <p role="alert" style={errorStyle}>
                {localizePwError('currentPassword', passwordErrors.currentPassword)}
              </p>
            )}
          </div>

          {/* Nouveau mot de passe */}
          <div style={fieldGroupStyle}>
            <label htmlFor="pf-newPassword" style={labelStyle}>
              {t('parametres.password.new.label', lang)}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="pf-newPassword"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t(
                  'parametres.password.new.placeholder',
                  lang,
                )}
                aria-invalid={!!passwordErrors.newPassword}
                {...passwordForm.register('newPassword')}
                style={{
                  ...inputBaseStyle,
                  ...inputPasswordPadding,
                  ...(passwordErrors.newPassword
                    ? { borderColor: 'var(--danger)' }
                    : {}),
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                aria-label={
                  showNew
                    ? t('auth.password.hide', lang)
                    : t('auth.password.show', lang)
                }
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showNew ? (
                  <EyeOff size={17} strokeWidth={1.6} />
                ) : (
                  <Eye size={17} strokeWidth={1.6} />
                )}
              </button>
            </div>
            {passwordErrors.newPassword && (
              <p role="alert" style={errorStyle}>
                {localizePwError('newPassword', passwordErrors.newPassword)}
              </p>
            )}
            {/* Strength meter (Plr-3) — 4-segment bar. */}
            <div
              style={{ display: 'flex', gap: 4, marginTop: 8 }}
              aria-hidden="true"
            >
              {([0, 1, 2, 3] as const).map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 6,
                    background:
                      i < strength
                        ? STRENGTH_COLORS[strength]
                        : 'var(--border)',
                    transition: 'background 0.2s ease',
                  }}
                />
              ))}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: 'var(--muted)',
                marginTop: 4,
                minHeight: '1.4em',
              }}
            >
              {newPwd
                ? t(STRENGTH_KEYS[strength], lang)
                : t('parametres.password.new.hint', lang)}
            </div>
          </div>
        </div>

        {/* Session-invalidation notice (D-08 + Plr-7 rev 2) — below pw row. */}
        <p
          style={{
            color: 'var(--muted)',
            fontSize: 13,
            marginTop: 20,
            marginBottom: 0,
          }}
        >
          {t('parametres.password.session.notice', lang)}
        </p>
      </form>

      {/* ── Action footer — SEPARATE sibling card outside the form ─────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: 16,
          background: 'var(--surface)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-card)',
          marginTop: 24,
          boxSizing: 'border-box',
        }}
      >
        <button
          type="button"
          className="btn-out"
          onClick={handleCancel}
          disabled={isPending}
        >
          {t('parametres.action.cancel', lang)}
        </button>
        <button
          type="submit"
          form={FORM_ID}
          className="btn-green"
          disabled={saveDisabled}
          aria-disabled={saveDisabled || undefined}
          style={{
            opacity: saveDisabled ? 0.6 : 1,
            cursor: saveDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending
            ? t('parametres.action.saving', lang)
            : t('parametres.action.save', lang)}
        </button>
      </div>
    </>
  );
}
