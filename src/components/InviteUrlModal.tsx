'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n';
import type { RedeemKind } from '@/lib/auth/redeem';

export interface InviteUrlModalProps {
  /** The one-time invitation or reset URL to display (shown once, D-10). */
  url: string;
  /** Whether this is an invitation or a password-reset URL (controls title copy). */
  kind: RedeemKind;
  /** UI language — passed from the parent server component. */
  lang: Lang;
  /** Called when the modal should close (parent unmounts or hides the modal). */
  onClose: () => void;
  /**
   * Element to focus after the modal closes — typically the button that opened it.
   * Restoring focus here satisfies the accessibility floor (UI-SPEC §NON-NEGOTIABLE).
   */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * One-time URL display modal — used by Phase 9 admin partner-create / reset-trigger
 * flows to display an invitation or password-reset URL exactly once (D-10 /
 * 06-UI-SPEC.md §Admin URL Display Modal).
 *
 * The URL is shown plaintext inside the modal while it is open; it is never
 * persisted client-side beyond the component's local state, never transmitted,
 * and never displayed again after the modal is dismissed (T-06-07-06 accepted).
 *
 * Accessibility floor (UI-SPEC §NON-NEGOTIABLE):
 *  - role="dialog" aria-modal="true" aria-labelledby="invite-modal-title"
 *  - On mount: focus moves to the X close button (first focusable element)
 *  - On close: focus restores to triggerRef.current (when provided)
 *  - Escape key closes the modal
 *  - Tab key cycles focus inside the panel (focus trap)
 *  - Backdrop click closes
 *
 * Phase 6 ships this primitive. Phase 9 wires the trigger (admin partner-create form).
 */
export function InviteUrlModal({
  url,
  kind,
  lang,
  onClose,
  triggerRef,
}: InviteUrlModalProps) {
  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const titleKey =
    kind === 'invite' ? 'auth.modal.invite.title' : 'auth.modal.reset.title';

  const handleClose = useCallback(() => {
    onClose();
    // Restore focus to the trigger after React unmounts the modal.
    // setTimeout(0) defers until after the DOM update so the element is focusable.
    setTimeout(() => {
      triggerRef?.current?.focus();
    }, 0);
  }, [onClose, triggerRef]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('auth.toast.copy.success', lang));
      // Revert "copied" confirmation state after 2 seconds (UI-SPEC).
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // T-06-07-08 mitigation: clipboard.writeText can fail (browser policy / no access).
      // On failure show error toast; URL remains visible in the DOM for manual copy.
      console.error('[InviteUrlModal] clipboard write failed:', e);
      toast.error(t('auth.error.generic', lang));
    }
  };

  // Focus management + keyboard handling
  useEffect(() => {
    // On mount: move focus to the X close button (first focusable, per UI-SPEC).
    closeButtonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
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
          // Shift+Tab on first element → wrap to last
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          // Tab on last element → wrap to first
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleClose]);

  return (
    <>
      {/* Backdrop — clicking closes the modal (UI-SPEC: fixed inset-0, navy 50%, blur 4px) */}
      <div
        aria-hidden="true"
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(17,44,59,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
        }}
      />

      {/* Panel — centered dialog (UI-SPEC: max-width 520, --surface bg, border-radius 16, padding 28) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 520,
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
        {/* Header row: title + X close button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            id="invite-modal-title"
            style={{
              fontSize: '16.5px',
              fontWeight: 600,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            {t(titleKey, lang)}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            aria-label={t('auth.modal.button.close', lang)}
            onMouseEnter={(e) => {
              const btn = e.currentTarget;
              btn.style.background = 'var(--hover-overlay)';
              btn.style.color = 'var(--ink)';
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget;
              btn.style.background = 'transparent';
              btn.style.color = 'var(--muted)';
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>

        {/* Warning banner — gold tint bg + AlertTriangle icon + warning copy (UI-SPEC) */}
        <div
          style={{
            background: 'rgba(224,133,48,0.08)',
            borderLeft: '1px solid var(--gold)',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <AlertTriangle
            size={17}
            strokeWidth={1.6}
            aria-hidden="true"
            style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 2 }}
          />
          <span
            style={{
              fontSize: '14.5px',
              fontWeight: 500,
              color: 'var(--ink)',
              lineHeight: 1.45,
            }}
          >
            {t('auth.modal.warning', lang)}
          </span>
        </div>

        {/* URL display block — monospace, user-select:all so admin can Ctrl+A and copy */}
        <div
          tabIndex={0}
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '12px 16px',
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, monospace',
            fontSize: '12.5px',
            color: 'var(--ink)',
            wordBreak: 'break-all',
            userSelect: 'all',
            lineHeight: 1.6,
          }}
        >
          {url}
        </div>

        {/* Action row: Copy button + Close button (UI-SPEC: flex-end gap 12) */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleCopy}
            className="btn-green"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {copied ? (
              <>
                <Check size={17} strokeWidth={1.6} />
                {t('auth.modal.button.copied', lang)}
              </>
            ) : (
              <>
                <Copy size={17} strokeWidth={1.6} />
                {t('auth.modal.button.copy', lang)}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="btn-ghost"
          >
            {t('auth.modal.button.close', lang)}
          </button>
        </div>

        {/* Footer note — 24h validity, single-use (UI-SPEC: 10.5px --muted) */}
        <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
          {t('auth.modal.footer.note', lang)}
        </div>
      </div>
    </>
  );
}
