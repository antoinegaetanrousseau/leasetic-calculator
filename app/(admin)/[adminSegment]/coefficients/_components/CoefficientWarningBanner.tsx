'use client';

/**
 * Plan 18-05 Task 1 — CoefficientWarningBanner.
 *
 * Per CONTEXT.md D-19 (placement + locked copy) and D-20 (sessionStorage
 * dismissal), and UI-SPEC §Coefficients lines 473-500:
 *
 *   - Rendered between the PageHero subtitle and the 2-column editor/history
 *     layout. Full width within the main content column.
 *   - Visual chrome: --gold left accent border, faint --gold background tint
 *     over --surface, --ink body copy. Palette stability invariant honored
 *     (D-30) — only existing tokens reused.
 *   - Dismissable per-session via × button. Dismissal persists in
 *     sessionStorage under key 'gsd.coefficients.warning.dismissed' so the
 *     warning returns on the next tab visit but doesn't nag the admin during
 *     a single editing session.
 *
 * SSR safety: initial render is always "banner visible" (hidden=false). The
 * sessionStorage read happens in a useEffect, so server-side rendering never
 * touches window.sessionStorage. A user who already dismissed within the
 * session sees one frame of banner before the effect hides it — accepted per
 * UI-SPEC line 498-500 baseline.
 *
 * Threat model (Plan 18-05):
 *   - T-18-05-01 sessionStorage tampering: accepted (informational UI only).
 *   - T-18-05-02 commission via warning copy: mitigated — copy is generic.
 *   - T-18-05-03 XSS via i18n: mitigated — React auto-escapes text children.
 *   - T-18-05-05 SSR crash: mitigated — useEffect + typeof window guard.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export const COEFFICIENT_WARNING_DISMISS_KEY =
  'gsd.coefficients.warning.dismissed';

export interface CoefficientWarningBannerProps {
  /** Current UI language for body + aria-label copy. */
  lang: Lang;
}

export function CoefficientWarningBanner({
  lang,
}: CoefficientWarningBannerProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // T-18-05-05 — guard against any SSR/edge runtime that lacks window.
    if (typeof window === 'undefined') return;
    try {
      if (
        window.sessionStorage.getItem(COEFFICIENT_WARNING_DISMISS_KEY) === '1'
      ) {
        setHidden(true);
      }
    } catch {
      // sessionStorage may throw in private-browsing or storage-disabled
      // contexts — fall through and keep the banner visible (safer default
      // than crashing the editor surface).
    }
  }, []);

  if (hidden) return null;

  const handleDismiss = () => {
    try {
      window.sessionStorage.setItem(COEFFICIENT_WARNING_DISMISS_KEY, '1');
    } catch {
      // Same defensive fallback as the read path — if storage is unavailable
      // we still hide the banner for the current view but it will return on
      // the next mount.
    }
    setHidden(true);
  };

  return (
    <div
      style={{
        background: 'rgba(224, 133, 48, 0.10)',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--gold)',
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <AlertTriangle
        size={18}
        style={{
          color: 'var(--gold-text)',
          flexShrink: 0,
          marginTop: 2,
        }}
        aria-hidden="true"
      />
      <div
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: 400,
          color: 'var(--ink)',
          lineHeight: 1.5,
        }}
      >
        {t('admin.coefficients.warning.body', lang)}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('admin.coefficients.warning.dismiss.aria', lang)}
        style={{
          width: 24,
          height: 24,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          border: 'none',
          background: 'transparent',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
