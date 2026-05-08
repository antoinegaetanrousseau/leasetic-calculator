'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface CopyRefButtonProps {
  /** The LC reference string to copy, e.g. "LC-12345". */
  lcRef: string;
  lang: Lang;
}

/**
 * "Copier la référence" LC clipboard button (PROP-24, UI-SPEC §5.6).
 *
 * Click → navigator.clipboard.writeText(lcRef).
 *   On success: button label switches to "Référence copiée" + Check icon for
 *               2 seconds, then reverts. Sonner success toast fires.
 *   On failure (insecure context, browser denies clipboard, etc.): Sonner
 *               error toast + Range/Selection fallback so the user can Cmd+C
 *               the LC ref text manually. The fallback selects the LC-ref
 *               text node that lives as the previousElementSibling of the
 *               button (the LiveLoyerPreview wraps both inside the same
 *               container so this lookup is stable for v1.1).
 *
 * Phase-6 InviteUrlModal uses the same try/catch shape. The 2s auto-revert
 * is a useEffect with setTimeout cleanup (no leaked timers across renders).
 */
export function CopyRefButton({ lcRef, lang }: CopyRefButtonProps) {
  const [copied, setCopied] = useState(false);
  const labelRef = useRef<HTMLSpanElement | null>(null);

  // Auto-revert label after 2s.
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(lcRef);
      setCopied(true);
      toast.success(t('proposal.toast.copy.success', lang));
    } catch {
      toast.error(t('proposal.toast.copy.error', lang));
      // Selection-API fallback so user can Cmd+C the LC ref text.
      const span = labelRef.current?.parentElement?.previousElementSibling;
      if (span && span instanceof HTMLElement && window.getSelection) {
        const range = document.createRange();
        range.selectNodeContents(span);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  return (
    <button
      type="button"
      className="btn-out"
      onClick={onClick}
      aria-label={t('button.copy.ref', lang) + ' ' + lcRef}
      style={{
        padding: '0.4rem 0.85rem',
        fontSize: '11.2px',
        fontWeight: 500,
      }}
    >
      {copied ? (
        <Check size={14} strokeWidth={1.6} aria-hidden="true" />
      ) : (
        <Copy size={14} strokeWidth={1.6} aria-hidden="true" />
      )}
      <span ref={labelRef}>
        {copied ? t('button.copy.ref.copied', lang) : t('button.copy.ref', lang)}
      </span>
    </button>
  );
}
