/**
 * RecapSection — labeled section with a `●`-bullet header, an optional
 * right-aligned `← Modifier` link, and a list of label/value rows with
 * optional sub-lines.
 *
 * Used by:
 *   - Step 2 (1x) — the "PARAMÈTRES SAISIS" recap card AND the "DÉTAIL DU
 *     CALCUL" card (which uses `rowSublabels` for the D-12 commission
 *     `(non visible client)` parenthetical).
 *   - Step 3 (3x) — the `● CLIENT`, `● PROJET`, `● CALCUL` review sections
 *     in the left column, each with their own `← Modifier` link.
 *
 * D-12 reminder: rowSublabels is the SOLE consumer for the partner-facing
 * commission parenthetical on step 2. Commission is invisible in the
 * generated PDF, in audit_log, and in server logs — caller (plan 13-04
 * step 2) is responsible for never wiring commission into a row that
 * crosses into the PDF render path. Verified by plan 13-06's
 * golden-PDF-no-commission test.
 *
 * Consumes existing `.card` + `.ctitle` + `.dot` chrome from app/globals.css.
 * NO new global CSS introduced by this component.
 *
 * Locked in 13-UI-SPEC.md §5.4.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

export interface RecapSectionProps {
  /** Section title — text content of the `.ctitle` header row. */
  sectionTitle: string;
  /** Rows of label/value pairs, in display order. */
  rows: Array<{ label: string; value: string | ReactNode }>;
  /**
   * Optional `← Modifier` link spec. When omitted, no link is rendered
   * (e.g. on the step-2 DÉTAIL DU CALCUL card, which is the calculation
   * itself, not a recap of inputs).
   */
  modifierLink?: { href: string; label: string };
  /**
   * Optional sub-line(s) under a row's label. Keyed by row index.
   * D-12: the only known consumer is the step-2 commission row, which
   * passes `{ 1: '(non visible client)' }` (or similar index).
   */
  rowSublabels?: Record<number, string>;
}

export function RecapSection({
  sectionTitle,
  rows,
  modifierLink,
  rowSublabels,
}: RecapSectionProps) {
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        {/*
          Header reuses the .ctitle / .dot pattern lifted verbatim from
          src/components/proposal/ProposalForm.tsx:213-219. The .dot's
          `background: var(--gd)` is the canonical accent treatment.
        */}
        <div className="ctitle">
          <span
            className="dot"
            style={{ background: 'var(--gd)' }}
            aria-hidden="true"
          />
          <span>{sectionTitle}</span>
        </div>
        {modifierLink && (
          <Link
            href={modifierLink.href}
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: 'var(--teal)',
              textDecoration: 'none',
            }}
          >
            ← {modifierLink.label}
          </Link>
        )}
      </div>

      {rows.map((row, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginTop: idx === 0 ? 0 : 12,
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11.2,
                fontWeight: 500,
                color: 'var(--muted)',
                lineHeight: 1.4,
              }}
            >
              {row.label}
            </div>
            {/*
              D-12: rowSublabels exists ONLY to support the step-2 commission
              "(non visible client)" parenthetical. Caller passes
              `rowSublabels={{ <idx>: '(non visible client)' }}`.
            */}
            {rowSublabels?.[idx] && (
              <div
                style={{
                  fontSize: 11.2,
                  fontWeight: 400,
                  color: 'var(--muted)',
                  lineHeight: 1.4,
                  marginTop: 2,
                }}
              >
                {rowSublabels[idx]}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: 14.5,
              color: 'var(--ink)',
              textAlign: 'right',
              lineHeight: 1.55,
            }}
          >
            {row.value}
          </div>
        </div>
      ))}
    </section>
  );
}
