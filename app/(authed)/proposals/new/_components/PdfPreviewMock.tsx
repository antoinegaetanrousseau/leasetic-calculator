/**
 * PdfPreviewMock — CSS-only mock of the eventual PDF displayed on step 3's
 * right column. Pure presentational: no state, no event handlers, no real
 * @react-pdf/renderer call.
 *
 * D-15: the partner-facing mock reference placeholder is sourced from the
 * i18n key `wizard.step3.pdf.ref.line` (FR + EN entries hold the literal
 * placeholder substring) and is NEVER hardcoded in JSX here — the
 * plan-level verification grep over this file returns 0 matches by design.
 *
 * NOT in this mock (per D-15 — guarded by plan 13-06's golden-PDF test):
 *   - No real lc_ref (the dictionary string is the only placeholder source)
 *   - No real PDF blob (no @react-pdf/renderer call)
 *   - No params_snapshot capture
 *   - No audit_log write
 *   - No idempotency_key allocation
 *
 * Locked in 13-UI-SPEC.md §5.3.
 */

import { BrandLogo } from '@/components/ui/BrandLogo';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface PdfPreviewMockProps {
  /** Computed loyer string, pre-formatted with currency (e.g. "2 770 €"). */
  loyerDisplay: string;
  /**
   * Validity days from getLatestGlobalParams(). Constrained to the
   * partner-facing options 15 / 30 / 60.
   */
  validityDays: 15 | 30 | 60;
  /** Language for static strings. */
  lang: Lang;
}

export function PdfPreviewMock({
  loyerDisplay,
  validityDays,
  lang,
}: PdfPreviewMockProps) {
  // D-15: the mock reference placeholder is baked into the i18n key
  // `wizard.step3.pdf.ref.line` (FR + EN). We only interpolate {0} =
  // validityDays here. Do NOT hardcode the ref placeholder in JSX —
  // keeps the placeholder under copy-review and prevents accidental drift
  // from the locked D-15 contract.
  const refLine = t('wizard.step3.pdf.ref.line', lang).replace(
    '{0}',
    String(validityDays),
  );

  return (
    <div
      role="img"
      aria-label={t('wizard.step3.pdf.preview.aria', lang)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 360,
      }}
    >
      {/* Logo block — 140px width (Phase 11 BrandLogo) */}
      <div style={{ marginBottom: 20 }}>
        <BrandLogo width={140} />
      </div>

      {/* Title — heading/sub, navy */}
      <h3
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--navy)',
          lineHeight: 1.4,
          margin: 0,
          marginBottom: 4,
        }}
      >
        {t('wizard.step3.pdf.title', lang)}
      </h3>

      {/* Ref line — body/small, muted (placeholder string sourced from i18n per D-15) */}
      <p
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: 'var(--muted)',
          lineHeight: 1.4,
          margin: 0,
          marginBottom: 24,
        }}
      >
        {refLine}
      </p>

      {/* Placeholder body block — 3 decorative gray bars at 100%/92%/78% */}
      <div aria-hidden="true" style={{ marginBottom: 28 }}>
        <div
          style={{
            height: 8,
            background: 'var(--border)',
            borderRadius: 4,
            width: '100%',
          }}
        />
        <div
          style={{
            height: 8,
            background: 'var(--border)',
            borderRadius: 4,
            width: '92%',
            marginTop: 8,
          }}
        />
        <div
          style={{
            height: 8,
            background: 'var(--border)',
            borderRadius: 4,
            width: '78%',
            marginTop: 8,
          }}
        />
      </div>

      {/* LOYER MENSUEL block — label + value (var(--gd)) */}
      <div>
        <div
          style={{
            fontSize: 11.8,
            fontWeight: 700,
            color: 'var(--muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            lineHeight: 1.4,
            marginBottom: 4,
          }}
        >
          {t('wizard.step3.pdf.loyer.label', lang)}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--gd)',
            lineHeight: 1.3,
          }}
        >
          {loyerDisplay}
        </div>
      </div>

      {/* Trailing decorative bars at 85% / 70% (UI-SPEC §5.3 layout step 5) */}
      <div aria-hidden="true" style={{ marginTop: 16 }}>
        <div
          style={{
            height: 8,
            background: 'var(--border)',
            borderRadius: 4,
            width: '85%',
          }}
        />
        <div
          style={{
            height: 8,
            background: 'var(--border)',
            borderRadius: 4,
            width: '70%',
            marginTop: 8,
          }}
        />
      </div>
    </div>
  );
}
