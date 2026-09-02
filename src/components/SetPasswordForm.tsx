'use client';

import { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';
import { setPasswordSchema, type SetPasswordInput } from '@/lib/auth/schemas';
import { redeemToken, type RedeemKind } from '@/lib/auth/redeem';
import {
  strengthScore,
  STRENGTH_KEYS,
  STRENGTH_COLORS,
} from '@/lib/auth/strength';
// Import t + Lang from dictionaries (not index.ts) — index.ts imports
// next/headers which is Server-Component-only and cannot be bundled for client.
import { t, type Lang } from '@/lib/i18n/dictionaries';

interface SetPasswordFormProps {
  token: string;
  kind: RedeemKind;
  lang: Lang;
}

// strengthScore / STRENGTH_KEYS / STRENGTH_COLORS moved to
// src/lib/auth/strength.ts (Phase 21 / Plan 21-01 Task 3) so /parametres
// ParametresForm can reuse them. Kept the import surface unchanged.

export function SetPasswordForm({ token, kind, lang }: SetPasswordFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordInput>({ resolver: zodResolver(setPasswordSchema), mode: 'onBlur' });

  // useWatch is the React Compiler-compatible alternative to watch() for field observation
  const pwd = useWatch({ control, name: 'password' }) ?? '';
  const score = strengthScore(pwd);
  const strengthKey = STRENGTH_KEYS[score];
  const segmentColor = STRENGTH_COLORS[score];

  const onSubmit = async (data: SetPasswordInput) => {
    startTransition(async () => {
      const result = await redeemToken(token, kind, data.password, data.confirmPassword);
      if (result.ok) {
        // Redirect to /login with the appropriate success param so LoginForm shows a toast
        const target = kind === 'invite' ? '/login?invited=1' : '/login?reset=1';
        router.push(target);
      } else if (result.reason === 'invalid') {
        // Token went stale between page-load and submit (race condition / replay attempt).
        // Navigate back to /login with a toast so the user knows to request a new link.
        toast.error(t('auth.token.invalid.title', lang));
        router.push('/login');
      } else {
        toast.error(t('auth.error.generic', lang));
      }
    });
  };

  const submitting = isSubmitting || isPending;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      style={{
        width: '100%',
        maxWidth: 480,
        padding: 28,
        background: 'var(--surface)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* New password field with eye-toggle */}
      <label
        htmlFor="setp-password"
        style={{
          display: 'block',
          fontSize: '11.2px',
          fontWeight: 500,
          color: 'var(--ink)',
          marginBottom: 6,
        }}
      >
        {t('auth.field.password.new', lang)}
      </label>
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <input
          id="setp-password"
          type={showNew ? 'text' : 'password'}
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'setp-password-error' : undefined}
          className={errors.password ? 'invalid' : ''}
          {...register('password')}
          style={{
            width: '100%',
            padding: '10px 40px 10px 12px',
            borderRadius: 12,
            border: errors.password ? '1px solid var(--danger)' : '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={() => setShowNew((s) => !s)}
          aria-label={showNew ? t('auth.password.hide', lang) : t('auth.password.show', lang)}
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
            <EyeOffIcon size={17} />
          ) : (
            <EyeIcon size={17} />
          )}
        </button>
      </div>

      {errors.password && (
        <div
          id="setp-password-error"
          role="alert"
          style={{
            fontSize: '11.2px',
            fontWeight: 500,
            color: 'var(--danger)',
            marginBottom: 4,
          }}
        >
          {t('auth.error.password.too.short', lang)}
        </div>
      )}

      {/* 4-segment strength meter (aria-hidden: decorative, not essential info) */}
      <div
        style={{ display: 'flex', gap: 4, marginBottom: 4 }}
        aria-hidden="true"
      >
        {([0, 1, 2, 3] as const).map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 6,
              background: i < score ? segmentColor : 'var(--border)',
              transition: 'background 0.2s ease',
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontSize: '10.5px',
          color: 'var(--muted)',
          marginBottom: 16,
          minHeight: '1.5em',
        }}
      >
        {pwd ? t(strengthKey, lang) : ''}
      </div>

      {/* Confirm password field */}
      <label
        htmlFor="setp-confirm"
        style={{
          display: 'block',
          fontSize: '11.2px',
          fontWeight: 500,
          color: 'var(--ink)',
          marginBottom: 6,
        }}
      >
        {t('auth.field.password.confirm', lang)}
      </label>
      <div
        style={{
          position: 'relative',
          marginBottom: errors.confirmPassword ? 4 : 16,
        }}
      >
        <input
          id="setp-confirm"
          type={showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? 'setp-confirm-error' : undefined}
          className={errors.confirmPassword ? 'invalid' : ''}
          {...register('confirmPassword')}
          style={{
            width: '100%',
            padding: '10px 40px 10px 12px',
            borderRadius: 12,
            border: errors.confirmPassword
              ? '1px solid var(--danger)'
              : '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={() => setShowConfirm((s) => !s)}
          aria-label={showConfirm ? t('auth.password.hide', lang) : t('auth.password.show', lang)}
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
          {showConfirm ? (
            <EyeOffIcon size={17} />
          ) : (
            <EyeIcon size={17} />
          )}
        </button>
      </div>
      {errors.confirmPassword && (
        <div
          id="setp-confirm-error"
          role="alert"
          style={{
            fontSize: '11.2px',
            fontWeight: 500,
            color: 'var(--danger)',
            marginBottom: 16,
          }}
        >
          {t('auth.error.passwords.mismatch', lang)}
        </div>
      )}

      {/* Submit button — .btn-green pill, full width */}
      <button
        type="submit"
        disabled={submitting}
        className="btn-green"
        style={{
          width: '100%',
          borderRadius: 9999,
          padding: '0.6rem 1.5rem',
          fontWeight: 600,
          fontSize: 14,
          color: '#fff',
          background: 'var(--gd)',
          border: 'none',
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting
          ? t('auth.button.set.password.loading', lang)
          : t('auth.button.set.password', lang)}
      </button>
    </form>
  );
}
