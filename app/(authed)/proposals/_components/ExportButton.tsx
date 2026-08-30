'use client';
/**
 * Phase 19 Plan 01 — ExportButton client component.
 *
 * Three-state machine:
 *   idle     → button shows label (t('proposals.export.cta')), enabled when resultCount > 0.
 *   loading  → label swaps to t('proposals.export.loading') + Loader2 spinner, button disabled.
 *   error    → returns to idle (sonner error toast already shown), button re-enabled.
 *
 * Design decisions (D-07, D-10):
 *   - D-07: loading state: label → 'Génération…' + Loader2 in var(--teal) animate-spin.
 *   - D-10: disabled when resultCount === 0 (empty-state); tooltip via aria-label.
 *   - CSS: .btn-out (secondary outline variant) — NOT .btn-green (primary).
 *   - sonner toast: success 'Export prêt' / failure 'Échec de l'export, réessayez'.
 *   - Browser download: client POSTs to /api/proposals/export, reads the Response
 *     as a Blob, creates an <a download> and clicks it — standard no-new-tab
 *     download pattern. Endpoint is a Route Handler (not a Server Action) because
 *     Server Actions cannot return binary Response bodies — see
 *     app/api/proposals/export/route.ts header for the rationale.
 *   - q + archived: passed as props from the server page (SSR-derived URL state).
 */

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { LoaderIcon } from '@/components/ui/icons';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface ExportButtonProps {
  lang: Lang;
  /** SSR-derived count of rows matching the current filter/search. */
  resultCount: number;
  /** SSR-derived value of ?q= search param. */
  q?: string;
  /** SSR-derived value of ?archived= filter. */
  archived?: boolean;
}

type ExportState = 'idle' | 'loading';

export function ExportButton({ lang, resultCount, q, archived }: ExportButtonProps) {
  const [state, setState] = useState<ExportState>('idle');

  const isDisabled = state === 'loading' || resultCount === 0;

  async function handleClick() {
    if (isDisabled) return;
    setState('loading');

    try {
      const res = await fetch('/api/proposals/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, archived }),
      });

      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`);
      }

      // Trigger browser download without navigating away.
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Extract filename from Content-Disposition, fallback to generic name.
      const cd = res.headers.get('Content-Disposition') ?? '';
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? 'propositions.xlsx';

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success(t('proposals.export.toast.success', lang));
    } catch {
      toast.error(t('proposals.export.toast.error', lang));
    } finally {
      setState('idle');
    }
  }

  const label = state === 'loading'
    ? t('proposals.export.loading', lang)
    : t('proposals.export.cta', lang);

  return (
    <button
      type="button"
      className="btn-out"
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={
        resultCount === 0
          ? t('proposals.export.disabled.tooltip', lang)
          : label
      }
      aria-busy={state === 'loading'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
    >
      {state === 'loading' && (
        <HugeiconsIcon icon={LoaderIcon}
          size={15}
          aria-hidden="true"
          style={{ color: 'var(--teal)', animation: 'spin 1s linear infinite' }}
        />
      )}
      <span>{label}</span>
    </button>
  );
}
