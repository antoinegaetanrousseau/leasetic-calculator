'use client';

/**
 * Login form.
 *
 * Composition adopted from the ReUI Pro block `auth-1`: centred heading over a
 * Field/FieldGroup form, shadcn Input, and an InputGroup password field with an
 * inline show/hide toggle. The block's own social-provider row, "Sign up" link
 * and "Email or username" field are deliberately NOT adopted — this app is
 * invite-only and authenticates on email plus password through Better Auth, so
 * shipping a Google/Apple row would advertise sign-in paths that do not exist.
 *
 * Everything below the presentation is unchanged and load-bearing:
 *   - AUTH-04 / D-22: the server error is ALWAYS the same generic message,
 *     never distinguishing unknown email from wrong password from disabled
 *     account (anti-enumeration).
 *   - T-06-05-08: `?next=` is validated to a relative path before being used as
 *     callbackURL, rejecting `https://evil.com`, `//evil.com`, `javascript:`.
 *   - D-09: mount-time toasts for ?invited=1 / ?reset=1 / ?logged_out=1, then
 *     the param is stripped so a refresh does not re-toast.
 *
 * `data-auth-surface` is read by AuthGridBackground, which keeps its animated
 * cells clear of this card.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { loginSchema, type LoginInput } from '@/lib/auth/schemas';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';
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
  const [showPassword, setShowPassword] = useState(false);

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
    <section
      data-auth-surface
      className="card mt-6 w-full max-w-[420px]"
    >
      <h1 className="mb-5 text-center text-[11.8px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
        {t('auth.signin.title', lang)}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="login-email">{t('auth.field.email', lang)}</FieldLabel>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder={t('auth.field.email.placeholder', lang)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <FieldError id="login-email-error" role="alert">
                {t('auth.error.email.invalid', lang)}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="login-password">{t('auth.field.password', lang)}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={t('auth.field.password.placeholder', lang)}
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  aria-label={
                    showPassword
                      ? t('auth.password.hide', lang)
                      : t('auth.password.show', lang)
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </FieldGroup>

        {/* Inline server error banner (AUTH-04 / D-22: always-generic; role=alert announces it) */}
        {serverError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border-l border-destructive bg-[color-mix(in_oklab,var(--destructive)_6%,transparent)] px-4 py-3 text-[14.5px] font-medium text-destructive"
          >
            {serverError}
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="btn-green mt-5 w-full">
          {isSubmitting ? t('auth.button.signin.loading', lang) : t('auth.button.signin', lang)}
        </Button>
      </form>

      {/* Forgot-password hint. Deliberately TEXT, not the block's "Forgot
          password?" link — this app has no self-serve reset; an admin issues a
          reset link, and the copy says so. */}
      <p className="mt-4 mb-0 text-[10.5px] leading-normal text-muted-foreground">
        {t('auth.hint.forgot.password', lang)}
      </p>

      {/* Privacy-policy link — D-10-17 / CUT-05. NEXT_PUBLIC_* inlined at build
          time. Fallback URLs are the canonical Leasétic privacy pages — keep
          a working link even if env var unset (defense in depth: a missing
          env var must not produce a broken link). */}
      <p className="mt-1 mb-0 text-[10.5px] leading-normal text-muted-foreground">
        <a
          href={
            lang === 'en'
              ? (process.env.NEXT_PUBLIC_PRIVACY_URL_EN ?? 'https://leasetic.fr/privacy-policy')
              : (process.env.NEXT_PUBLIC_PRIVACY_URL_FR ?? 'https://leasetic.fr/mentions-legales')
          }
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground underline"
        >
          {t('login.privacy.label', lang)}
        </a>
      </p>
    </section>
  );
}
