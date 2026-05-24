/**
 * PdfPreviewMock — CSS-only mock of the eventual PDF displayed on step 3's
 * right column. Pure presentational: no state, no event handlers, no real
 * @react-pdf/renderer call.
 *
 * Phase 17 D-17 / D-03 (inverts Phase 13 D-15): the reference line now
 * displays the REAL `lcRef` allocated at draft creation (Plan 17-01 moved
 * allocation from finalizeDraft to createDraft). The ref line is built
 * inline (the retired step-3 PDF ref-line i18n key stays in the dictionary
 * for now — removal is a downstream cleanup decision).
 *
 * NOT in this mock (carried over from Phase 13 — guarded by plan 13-06's
 * golden-PDF test and ADMIN-09 9-gate grep-contract suite):
 *   - No real PDF blob (no @react-pdf/renderer call)
 *   - No params_snapshot capture
 *   - No audit_log write
 *   - No idempotency_key allocation
 *   - No commission prop / commission value (ADMIN-09 invariant)
 *
 * Originally locked in 13-UI-SPEC.md §5.3; ref-line behavior updated by
 * 17-UI-SPEC.md §<PdfPreviewMock> + 17-CONTEXT.md D-17.
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
  /**
   * Phase 17 D-17 / D-03 — real `lc_ref` allocated at draft creation
   * (format `LC-2026-NNN` per user). Required prop: every caller must
   * thread the value from `draft.lcRef` (non-null on post-Phase-17 drafts;
   * Plan 17-01 enforces allocation in `createDraft`).
   */
  lcRef: string;
  /** Language for static strings. */
  lang: Lang;
}

export function PdfPreviewMock({
  loyerDisplay,
  validityDays,
  lcRef,
  lang,
}: PdfPreviewMockProps) {
  // Phase 17 D-17 — inline construction (the retired step-3 PDF ref-line
  // dictionary key held a literal placeholder per Phase 13 D-15; that key
  // is no longer read here). The inline strings match the UI-SPEC
  // Copywriting Contract verbatim. ADMIN-09 trivial pass: lcRef format
  // `LC-2026-NNN` contains no commission substring.
  const refLine =
    lang === 'fr'
      ? `Réf. ${lcRef} · ${validityDays} jours de validité`
      : `Ref. ${lcRef} · ${validityDays} days validity`;

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
