'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminUpdateGlobalParams } from '@/lib/admin';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { GlobalParamsRow } from '@/db/schema';
import type { CoeffEditorValues } from '@/lib/admin';
import { HistoryDiff, computeDiffPairs } from './HistoryDiff';

export interface SaveConfirmModalProps {
  lang: Lang;
  latestParams: GlobalParamsRow;
  pending: CoeffEditorValues;
  onClose: () => void;
  onConfirmed: () => void;
  /** Called with the saved values so CoefficientsEditor can reset RHF baseline (WR-02). */
  onResetForm?: (saved: CoeffEditorValues) => void;
}

export function SaveConfirmModal({
  lang,
  latestParams,
  pending,
  onClose,
  onConfirmed,
  onResetForm,
}: SaveConfirmModalProps) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // CR-01: guard against double-submit while promise is in flight.
  const [isSaving, setIsSaving] = useState(false);

  // Compute diff at modal-open time (D-09-01) — pure client comparison, no DB read.
  const pairs = computeDiffPairs(latestParams, {
    commissionPct: pending.commissionPct,
    maxAmount: pending.maxAmount,
    validityDays: pending.validityDays,
    coefficients: pending.coefficients,
    note: pending.note ?? null,
  });
  const includesCommission = pairs.some((p) => p.field === 'commissionPct');

  // Focus management — mirrors InviteUrlModal.tsx pattern (Phase 6 06-07).
  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
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

  const onConfirm = () => {
    // CR-01: prevent double-submit — guard is checked before and cleared only on error.
    if (isSaving) return;
    setIsSaving(true);
    const promise = adminUpdateGlobalParams({
      commissionPct: pending.commissionPct,
      maxAmount: pending.maxAmount,
      validityDays: pending.validityDays,
      coefficients: pending.coefficients,
      note: pending.note ?? null,
      before: latestParams,
    });
    toast.promise(promise, {
      loading: t('admin.coefficients.save.loading', lang),
      success: () => {
        // WR-02: reset RHF baseline to the just-saved values so isDirty resets correctly.
        onResetForm?.(pending);
        onConfirmed();
        router.refresh(); // re-runs the page server component → fresh latestParams + history
        return t('admin.coefficients.toast.save.success', lang);
      },
      error: () => {
        // CR-01: re-enable on error so admin can retry without reopening modal.
        setIsSaving(false);
        return t('admin.coefficients.toast.save.error', lang);
      },
    });
  };

  return (
    <>
      {/* Backdrop — UI-SPEC §4.1: do NOT dismiss on overlay click (force explicit Annuler) */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(17,44,59,0.45)',
          zIndex: 200,
        }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-confirm-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 540,
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
        <h2
          id="save-confirm-title"
          style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: 0 }}
        >
          {t('admin.coefficients.modal.title', lang)}
        </h2>

        {/* ADMIN-03 warning — shown unconditionally before any DB write */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            background: 'rgba(224,133,48,0.08)',
            borderLeft: '1px solid var(--gold)',
            borderRadius: 8,
            padding: '12px 16px',
          }}
        >
          <AlertTriangle
            size={18}
            strokeWidth={1.6}
            color="var(--gold)"
            aria-hidden="true"
          />
          <p
            style={{
              fontSize: 13.5,
              color: 'var(--ink)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {t('admin.coefficients.modal.warning', lang)}
          </p>
        </div>

        <div className="ctitle" style={{ marginTop: 8 }}>
          <span className="dot" style={{ background: 'var(--gd)' }} aria-hidden="true" />
          <span>{t('admin.coefficients.modal.changes', lang)}</span>
        </div>

        {pairs.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            {t('admin.coefficients.modal.no_changes', lang)}
          </p>
        ) : (
          <div>
            {/* In the modal we show ALL diffs (no collapse) — UI-SPEC §4.1 */}
            <HistoryDiff pairs={pairs} collapseAfter={null} />
          </div>
        )}

        {includesCommission && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'flex-start',
              fontSize: 12,
              color: 'var(--muted)',
              marginTop: 4,
            }}
          >
            <Info size={14} strokeWidth={1.6} color="var(--muted)" aria-hidden="true" />
            <span>{t('admin.coefficients.modal.commission_note', lang)}</span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
            marginTop: 8,
          }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            className="btn-out"
            onClick={onClose}
          >
            {t('admin.coefficients.modal.cancel', lang)}
          </button>
          <button
            type="button"
            className="btn-green"
            onClick={onConfirm}
            disabled={pairs.length === 0 || isSaving}
            aria-disabled={pairs.length === 0 || isSaving || undefined}
            aria-busy={isSaving || undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              opacity: isSaving ? 0.7 : undefined,
            }}
          >
            {isSaving && (
              <Loader2
                size={16}
                style={{ animation: 'spin 1s linear infinite' }}
                aria-hidden="true"
              />
            )}
            {t('admin.coefficients.modal.confirm', lang)}
          </button>
        </div>
      </div>
    </>
  );
}
