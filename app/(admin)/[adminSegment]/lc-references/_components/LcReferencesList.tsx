/**
 * Phase 19 Plan 02 Task 2 — LcReferencesList server component.
 *
 * Cross-partner LC reference table. Mirrors PartnersList chrome verbatim
 * (TH_BASE_STYLE / TD_BASE_STYLE copied from Phase 18 Plan 03).
 *
 * D-13: Rows are read-only — no <Link>, no onClick, no cursor:pointer.
 * ADMIN-09: zero commission projection. LcReferenceRow has no commission field;
 *   paramsSnapshot is consumed by deriveDisplayStatus upstream and never reaches
 *   this component.
 *
 * 6 columns: Référence / Partenaire / Client / Montant HT / Statut / Créée le
 */
import React from 'react';
import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate, formatCurrency } from '@/lib/i18n/format';
import { StatusChip } from '@/components/ui/StatusChip';
import type { LcReferenceRow } from '@/lib/db/queries/lc-references';

export interface LcReferencesListProps {
  rows: LcReferenceRow[];
  /** base64url-encoded cursor for the next page; null when no more pages. */
  nextCursor: string | null;
  lang: Lang;
  adminSegment: string;
  /** Active search query — used to determine empty-state variant. */
  currentQ?: string;
}

// ── Verbatim from PartnersList.tsx (Phase 18 Plan 03) ──────────────────────────
const TH_BASE_STYLE: React.CSSProperties = {
  fontSize: '11.2px',
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  textAlign: 'left',
  padding: '12px 20px',
  borderBottom: '1px solid var(--border)',
  background: 'transparent',
};

const TD_BASE_STYLE: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--border)',
  fontSize: 13,
  color: 'var(--muted)',
  verticalAlign: 'middle',
};
// ── End verbatim ───────────────────────────────────────────────────────────────

/** Map DisplayStatus → StatusChip variant. All 4 LC variants are supported. */
function chipVariant(
  status: LcReferenceRow['displayStatus'],
): 'active' | 'draft' | 'expired' | 'deleted' {
  return status; // DisplayStatus == StatusChip variant for LC surface
}

function chipLabel(status: LcReferenceRow['displayStatus'], lang: Lang): string {
  return t(`chip.${status}` as Parameters<typeof t>[0], lang);
}

function formatRowDate(date: Date, lang: Lang): string {
  return formatDate(date, lang, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function LcReferencesList({
  rows,
  nextCursor,
  lang,
  adminSegment,
  currentQ,
}: LcReferencesListProps) {
  const hasActiveSearch = Boolean(currentQ && currentQ.length > 0);

  // ── Empty states ──────────────────────────────────────────────────────────────
  if (rows.length === 0) {
    if (hasActiveSearch) {
      // Search-empty: "Aucune référence ne correspond à votre recherche." + clear link
      return (
        <section className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <p style={{ color: 'var(--muted)', fontSize: '14.5px', margin: 0 }}>
            {t('admin.lcReferences.empty.search', lang)}
          </p>
          <p style={{ marginTop: 16 }}>
            <Link
              href={`/${adminSegment}/lc-references`}
              style={{
                color: 'var(--teal)',
                fontSize: '12.5px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              {t('admin.lcReferences.empty.search.clear', lang)}
            </Link>
          </p>
        </section>
      );
    }

    // First-run: "Aucune référence LC pour le moment."
    return (
      <section className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '14.5px', margin: 0 }}>
          {t('admin.lcReferences.empty.firstRun', lang)}
        </p>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: '13px',
            marginTop: 12,
            marginBottom: 0,
            lineHeight: 1.55,
          }}
        >
          {t('admin.lcReferences.empty.firstRun.body', lang)}
        </p>
      </section>
    );
  }

  // ── Table ──────────────────────────────────────────────────────────────────────
  return (
    <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'auto',
        }}
      >
        <thead>
          <tr>
            {/* Col 1 — RÉFÉRENCE (monospace) */}
            <th scope="col" style={TH_BASE_STYLE}>
              {t('admin.lcReferences.col.reference', lang)}
            </th>
            {/* Col 2 — PARTENAIRE */}
            <th scope="col" style={TH_BASE_STYLE}>
              {t('admin.lcReferences.col.partner', lang)}
            </th>
            {/* Col 3 — CLIENT */}
            <th scope="col" style={TH_BASE_STYLE}>
              {t('admin.lcReferences.col.client', lang)}
            </th>
            {/* Col 4 — MONTANT HT */}
            <th scope="col" style={{ ...TH_BASE_STYLE, textAlign: 'right', width: 140 }}>
              {t('admin.lcReferences.col.amountHt', lang)}
            </th>
            {/* Col 5 — STATUT */}
            <th scope="col" style={{ ...TH_BASE_STYLE, width: 110, textAlign: 'center' }}>
              {t('admin.lcReferences.col.status', lang)}
            </th>
            {/* Col 6 — CRÉÉE LE */}
            <th scope="col" style={{ ...TH_BASE_STYLE, width: 140 }}>
              {t('admin.lcReferences.col.createdAt', lang)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const lastBorder = idx === rows.length - 1 ? 'none' : '1px solid var(--border)';
            return (
              <tr key={row.id}>
                {/* Col 1 — RÉFÉRENCE (monospace font, D-13 read-only: no link) */}
                <td style={{ ...TD_BASE_STYLE, borderBottom: lastBorder }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      color: 'var(--ink)',
                      fontWeight: 500,
                    }}
                  >
                    {row.lcRef}
                  </span>
                </td>
                {/* Col 2 — PARTENAIRE */}
                <td style={{ ...TD_BASE_STYLE, borderBottom: lastBorder }}>
                  {row.partnerName}
                </td>
                {/* Col 3 — CLIENT */}
                <td style={{ ...TD_BASE_STYLE, borderBottom: lastBorder }}>
                  {row.clientName || '—'}
                </td>
                {/* Col 4 — MONTANT HT (currency-formatted, right-aligned) */}
                <td
                  style={{
                    ...TD_BASE_STYLE,
                    borderBottom: lastBorder,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCurrency(row.amountHt, lang)}
                </td>
                {/* Col 5 — STATUT (StatusChip, centered) */}
                <td
                  style={{
                    ...TD_BASE_STYLE,
                    borderBottom: lastBorder,
                    textAlign: 'center',
                  }}
                >
                  <StatusChip
                    variant={chipVariant(row.displayStatus)}
                    label={chipLabel(row.displayStatus, lang)}
                  />
                </td>
                {/* Col 6 — CRÉÉE LE */}
                <td style={{ ...TD_BASE_STYLE, borderBottom: lastBorder }}>
                  {formatRowDate(row.createdAt, lang)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Cursor pagination — mirrors PartnersList footer chrome */}
      {nextCursor && (
        <div style={{ padding: '16px 20px', textAlign: 'center' }}>
          <Link
            href={`/${adminSegment}/lc-references?cursor=${encodeURIComponent(nextCursor)}${currentQ ? `&q=${encodeURIComponent(currentQ)}` : ''}`}
            className="btn-out"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              fontSize: 13,
            }}
          >
            {t('proposal.list.load.more', lang)}
          </Link>
        </div>
      )}
    </section>
  );
}
