'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { loginSchema, type LoginInput } from '@/lib/auth/schemas';
// Import t + Lang from dictionaries (not index.ts) — index.ts imports next/headers
// which is Server-Component-only and cannot be bundled into a Client Component.
import { t, type Lang } from '@/lib/i18n/dictionaries';

interface LoginFormProps {
  lang: Lang;
}

export function LoginForm({ lang }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), mode: 'onBlur' });

  /**
   * Mount-time success toasts for query-param-driven feedback (D-09):
   *  ?invited=1 → invitation redemption success
   *  ?reset=1   → password reset success
   *  ?logged_out=1 → logout feedback (D-24)
   *
   * After firing, replace the URL to strip the param so a page refresh doesn't re-toast.
   */
  useEffect(() => {
    const invited = searchParams.get('invited');
    const reset = searchParams.get('reset');
    const loggedOut = searchParams.get('logged_out');
    if (invited === '1') toast.success(t('auth.toast.invite.success', lang));
    else if (reset === '1') toast.success(t('auth.toast.reset.success', lang));
    else if (loggedOut === '1') toast.success(t('auth.toast.logout.success', lang));
    if (invited || reset || loggedOut) router.replace('/login');
    // Only run on mount — searchParams reference is stable after initial render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);

    /**
     * T-06-05-08: Validate `?next=` before using as callbackURL.
     * Only relative paths starting with '/' are allowed.
     * Rejects: 'https://evil.com', '//evil.com', 'javascript:...', etc.
     */
    const next = searchParams.get('next');
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';

    const { error } = await authClient.signIn.email({
      email: data.email.toLowerCase(),
      password: data.password,
      callbackURL: safeNext,
    });

    if (error) {
      /**
       * AUTH-04 / D-22: ALWAYS show the same generic message regardless of
       * whether the email exists, the password is wrong, or the account is
       * disabled. Never distinguish failure modes to the user (anti-enumeration).
       */
      setServerError(t('auth.error.invalid.credentials', lang));
    }
    // On success Better Auth navigates via callbackURL; nothing else needed here.
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      style={{
        width: '100%',
        maxWidth: 420,
        padding: 28,
        background: 'var(--surface)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Card title — .ctitle style per Phase 5 UI-SPEC */}
      <div
        style={{
          textTransform: 'uppercase',
          fontSize: '11.8px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: 'var(--muted)',
          marginBottom: 16,
        }}
      >
        {t('auth.signin.title', lang)}
      </div>

      {/* Email field */}
      <label
        htmlFor="login-email"
        style={{
          display: 'block',
          fontSize: '11.2px',
          fontWeight: 500,
          color: 'var(--ink)',
          marginBottom: 6,
        }}
      >
        {t('auth.field.email', lang)}
      </label>
      <input
        id="login-email"
        type="email"
        autoComplete="email"
        placeholder={t('auth.field.email.placeholder', lang)}
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? 'login-email-error' : undefined}
        className={errors.email ? 'invalid' : ''}
        {...register('email')}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 12,
          border: errors.email ? '1px solid var(--danger)' : '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--ink)',
          marginBottom: errors.email ? 4 : 16,
          boxSizing: 'border-box',
        }}
      />
      {errors.email && (
        <div
          id="login-email-error"
          role="alert"
          style={{
            fontSize: '11.2px',
            fontWeight: 500,
            color: 'var(--danger)',
            marginBottom: 16,
          }}
        >
          {t('auth.error.email.invalid', lang)}
        </div>
      )}

      {/* Password field */}
      <label
        htmlFor="login-password"
        style={{
          display: 'block',
          fontSize: '11.2px',
          fontWeight: 500,
          color: 'var(--ink)',
          marginBottom: 6,
        }}
      >
        {t('auth.field.password', lang)}
      </label>
      <input
        id="login-password"
        type="password"
        autoComplete="current-password"
        placeholder={t('auth.field.password.placeholder', lang)}
        aria-invalid={!!errors.password}
        {...register('password')}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--ink)',
          marginBottom: 16,
          boxSizing: 'border-box',
        }}
      />

      {/* Inline server error banner (AUTH-04 / D-22: always-generic; role=alert announces it) */}
      {serverError && (
        <div
          role="alert"
          style={{
            background: 'rgba(220,38,38,0.06)',
            borderLeft: '1px solid var(--danger)',
            borderRadius: 12,
            padding: '12px 16px',
            color: 'var(--danger)',
            fontWeight: 500,
            fontSize: '14.5px',
            marginBottom: 16,
          }}
        >
          {serverError}
        </div>
      )}

      {/* Submit button — .btn-green pill, full width, spinner replaces label on submit */}
      <button
        type="submit"
        disabled={isSubmitting}
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
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.7 : 1,
          marginBottom: 12,
        }}
      >
        {isSubmitting ? t('auth.button.signin.loading', lang) : t('auth.button.signin', lang)}
      </button>

      {/* Forgot-password hint — 10.5px, muted, 2 lines */}
      <div style={{ fontSize: '10.5px', color: 'var(--muted)', lineHeight: 1.5, marginTop: 8 }}>
        {t('auth.hint.forgot.password', lang)}
      </div>

      {/* Privacy-policy link — D-10-17 / CUT-05. NEXT_PUBLIC_* inlined at build
          time. Fallback URLs are the canonical Leasétic privacy pages — keep
          a working link even if env var unset (defense in depth: a missing
          env var must not produce a broken link). */}
      <div style={{ fontSize: '10.5px', color: 'var(--muted)', lineHeight: 1.5, marginTop: 4 }}>
        <a
          href={
            lang === 'en'
              ? (process.env.NEXT_PUBLIC_PRIVACY_URL_EN ?? 'https://leasetic.fr/privacy-policy')
              : (process.env.NEXT_PUBLIC_PRIVACY_URL_FR ?? 'https://leasetic.fr/mentions-legales')
          }
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--muted)', textDecoration: 'underline' }}
        >
          {t('login.privacy.label', lang)}
        </a>
      </div>
    </form>
  );
}
