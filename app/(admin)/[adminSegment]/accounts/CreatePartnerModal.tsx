'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  adminCreateInvitation,
  createPartnerSchema,
  type CreatePartnerValues,
} from '@/lib/admin';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';

// z.enum(['fr', 'en']).default('fr') produces `language?: 'fr' | 'en' | undefined` as input type.
// We use z.input<> as TFieldValues and z.infer<> as TTransformed (same pattern as CoefficientsEditor).
type CreatePartnerInput = z.input<typeof createPartnerSchema>;

export interface CreatePartnerModalProps {
  lang: Lang;
  onClose: () => void;
  /** Called with the one-time invitation URL after successful creation. Parent should open InviteUrlModal. */
  onCreated: (url: string) => void;
}

export function CreatePartnerModal({ lang, onClose, onCreated }: CreatePartnerModalProps) {
  const [submitError, setSubmitError] = useState<DictKey | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    control,
  } = useForm<CreatePartnerInput, unknown, CreatePartnerValues>({
    resolver: zodResolver(createPartnerSchema),
    mode: 'onBlur',
    shouldFocusError: true,
    defaultValues: { email: '', displayName: '', language: 'fr' },
  });

  // useWatch is the React Compiler-compatible alternative to watch() for field observation.
  const language = useWatch({ control, name: 'language' }) ?? 'fr';

  // Focus trap + Escape key — copied verbatim from InviteUrlModal.tsx lines 83-116.
  useEffect(() => {
    closeButtonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap: keep Tab inside the panel
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onSubmit = async (data: CreatePartnerValues) => {
    setSubmitError(null);
    try {
      const result = await adminCreateInvitation({
        email: data.email,
        displayName: data.displayName,
        language: data.language,
      });
      toast.success(t('admin.accounts.toast.create.success', lang));
      onCreated(result.url);
    } catch (e) {
      // adminCreateInvitation throws Error with stable i18n keys (Plan 01).
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'admin.accounts.modal.error.email.exists') {
        // Inline error below email field (UI-SPEC §4.2)
        setSubmitError('admin.accounts.modal.error.email.exists');
      } else {
        toast.error(t('admin.accounts.toast.create.error', lang));
      }
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(17,44,59,0.45)',
          zIndex: 200,
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-partner-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 480,
          maxHeight: '80vh',
          background: 'var(--surface)',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 20px 60px rgba(17,44,59,0.25)',
          overflowY: 'auto',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserPlus
            size={20}
            strokeWidth={1.6}
            color="var(--teal)"
            aria-hidden="true"
          />
          <h2
            id="create-partner-title"
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            {t('admin.accounts.modal.create.title', lang)}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Email field */}
          <div className="fld">
            <label htmlFor="cpm-email">
              {t('admin.accounts.modal.email.label', lang)}
              <span className="req" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="cpm-email"
              type="email"
              placeholder={t('admin.accounts.modal.email.placeholder', lang)}
              aria-invalid={
                errors.email ||
                submitError === 'admin.accounts.modal.error.email.exists'
                  ? true
                  : undefined
              }
              aria-describedby={
                errors.email
                  ? 'cpm-email-error'
                  : submitError === 'admin.accounts.modal.error.email.exists'
                    ? 'cpm-email-server-error'
                    : undefined
              }
              className={
                errors.email ||
                submitError === 'admin.accounts.modal.error.email.exists'
                  ? 'invalid'
                  : ''
              }
              {...register('email')}
            />
            {errors.email?.message && (
              <p id="cpm-email-error" role="alert" className="error-msg">
                {t(errors.email.message as DictKey, lang)}
              </p>
            )}
            {!errors.email && submitError === 'admin.accounts.modal.error.email.exists' && (
              <p id="cpm-email-server-error" role="alert" className="error-msg">
                {t('admin.accounts.modal.error.email.exists', lang)}
              </p>
            )}
          </div>

          {/* Display name field */}
          <div className="fld">
            <label htmlFor="cpm-name">
              {t('admin.accounts.modal.name.label', lang)}
              <span className="req" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="cpm-name"
              type="text"
              placeholder={t('admin.accounts.modal.name.placeholder', lang)}
              aria-invalid={errors.displayName ? true : undefined}
              aria-describedby={errors.displayName ? 'cpm-name-error' : undefined}
              className={errors.displayName ? 'invalid' : ''}
              {...register('displayName')}
            />
            {errors.displayName?.message && (
              <p id="cpm-name-error" role="alert" className="error-msg">
                {t(errors.displayName.message as DictKey, lang)}
              </p>
            )}
          </div>

          {/* Language segmented control */}
          <div className="fld">
            <label>{t('admin.accounts.modal.lang.label', lang)}</label>
            <div className="dg" role="group" aria-label={t('admin.accounts.modal.lang.label', lang)}>
              {(['fr', 'en'] as const).map((lng) => (
                <button
                  key={lng}
                  type="button"
                  className={`db${language === lng ? ' on' : ''}`}
                  onClick={() =>
                    setValue('language', lng, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  aria-pressed={language === lng}
                >
                  {lng === 'fr' ? 'Français' : 'English'}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
              marginTop: 16,
            }}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="btn-out"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('admin.accounts.modal.cancel', lang)}
            </button>
            <button
              type="submit"
              className="btn-green"
              disabled={isSubmitting}
              aria-disabled={isSubmitting || undefined}
              aria-busy={isSubmitting || undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting && (
                <Loader2
                  size={16}
                  strokeWidth={1.6}
                  style={{ animation: 'spin 1s linear infinite' }}
                  aria-hidden="true"
                />
              )}
              {t('admin.accounts.modal.create.submit', lang)}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
