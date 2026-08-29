/**
 * Phase 18 Plan 03 Task 1 — PartnersList (D-14 rename, Figma 42:46, D-08, D-13).
 *
 * REPLACES the Phase 14 partner-list component. Full D-14 scrub: file rename
 * + symbol rename + Figma-spec table chrome + 6-column layout per UI-SPEC
 * §Partners list. The prior file lived at the same directory under the prior
 * naming convention; this file is its successor.
 *
 * Server component — pure rendering. Search + filter + cursor state all live
 * in URL searchParams (read on the parent page.tsx) and pass through props.
 * The per-row overflow menu (D-10) is rendered in cell 6; Task 2 of this plan
 * creates the dedicated PartnerRowActions client component and threads the
 * proper props through. Until then a placeholder slot keeps the 6-cell row
 * shape intact.
 *
 * ADMIN-09: zero commission projection. The PartnerRow shape (id/email/name/
 * status/createdAt/lastActivityAt) has no commission field; downstream cells
 * project only those values. 9-gate grep contract trivially honored.
 */
import React from 'react';
import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import { StatusChip } from '@/components/ui/StatusChip';
import type { PartnerRow, PartnerStatus } from '@/lib/db/queries/partners';
import { PartnerRowActions } from './_components/PartnerRowActions';

export interface PartnersListProps {
  rows: PartnerRow[];
  /** base64url-encoded cursor for the next page; null when no more pages. */
  nextCursor: string | null;
  lang: Lang;
  /** Active admin URL segment — used to build action hrefs and CTA links. */
  adminSegment: string;
  /** Echoed back to the empty-state filter-clear link logic. */
  currentStatus?: PartnerStatus;
  /** Echoed back to the empty-state filter-clear link logic. */
  currentQ?: string;
}

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

const COL6_TH_STYLE: React.CSSProperties = {
  ...TH_BASE_STYLE,
  width: 48,
  textAlign: 'center',
};

/** Map PartnerStatus → StatusChip variant. `inactive` maps to the existing red-danger `.chip-disabled`. */
function chipVariant(status: PartnerStatus): 'active' | 'invited' | 'disabled' {
  if (status === 'active') return 'active';
  if (status === 'invited') return 'invited';
  return 'disabled';
}

function chipLabel(status: PartnerStatus, lang: Lang): string {
  if (status === 'active') return t('chip.active', lang);
  if (status === 'invited') return t('chip.invited', lang);
  return t('chip.disabled', lang);
}

/** Format DATE CRÉATION + DERNIÈRE ACTIVITÉ — e.g. "12 avr. 2026" (FR) / "12 Apr 2026" (EN). */
function formatRowDate(date: Date, lang: Lang): string {
  return formatDate(date, lang, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PartnersList({
  rows,
  nextCursor,
  lang,
  adminSegment,
  currentStatus,
  currentQ,
}: PartnersListProps) {
  // D-13 empty states. Filter-empty when ANY filter is currently active.
  const hasActiveFilter = Boolean(currentStatus) || Boolean(currentQ && currentQ.length > 0);

  if (rows.length === 0) {
    if (hasActiveFilter) {
      // D-13 — filter-empty: "Aucun partenaire ne correspond aux filtres." + "Effacer les filtres →"
      return (
        <section className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <p style={{ color: 'var(--muted)', fontSize: '14.5px', margin: 0 }}>
            {t('admin.partners.empty.filter', lang)}
          </p>
          <p style={{ marginTop: 16 }}>
            <Link
              href={`/${adminSegment}/partners`}
              style={{
                color: 'var(--teal)',
                fontSize: '12.5px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              {t('admin.partners.empty.clearFilters', lang)}
            </Link>
          </p>
        </section>
      );
    }
    // D-13 — zero-partners: "Aucun partenaire pour le moment." + Inviter CTA
    return (
      <section className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: '14.5px',
            marginTop: 0,
            marginBottom: 20,
          }}
        >
          {t('admin.partners.empty.zero', lang)}
        </p>
        <Link
          href={`/${adminSegment}/partners/new`}
          className="btn-green"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
          }}
        >
          {t('admin.partners.invite.cta', lang)}
        </Link>
      </section>
    );
  }

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
            <th scope="col" style={TH_BASE_STYLE}>
              {t('admin.partners.col.partner', lang)}
            </th>
            <th scope="col" style={TH_BASE_STYLE}>
              {t('admin.partners.col.email', lang)}
            </th>
            <th scope="col" style={{ ...TH_BASE_STYLE, width: 140 }}>
              {t('admin.partners.col.created', lang)}
            </th>
            <th scope="col" style={{ ...TH_BASE_STYLE, width: 160 }}>
              {t('admin.partners.col.lastActivity', lang)}
            </th>
            <th scope="col" style={{ ...TH_BASE_STYLE, width: 110, textAlign: 'center' }}>
              {t('admin.partners.col.status', lang)}
            </th>
            {/* D-07: at-a-glance partner type badge column. ADMIN-09: type enum, not a rate. */}
            <th scope="col" style={{ ...TH_BASE_STYLE, width: 120, textAlign: 'center' }}>
              {t('admin.partners.col.partnerType', lang)}
            </th>
            <th scope="col" style={COL6_TH_STYLE}>
              {/* Visual ⋯ glyph — accessible name carried by per-row PartnerRowActions trigger. */}
              <span aria-hidden="true">⋯</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const lastBorder = idx === rows.length - 1 ? 'none' : '1px solid var(--border)';
            return (
              <tr key={row.id}>
                {/* Col 1 — PARTENAIRE (name + muted email stacked) */}
                <td style={{ ...TD_BASE_STYLE, borderBottom: lastBorder }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong
                      style={{
                        fontSize: '14.5px',
                        fontWeight: 600,
                        color: 'var(--ink)',
                      }}
                    >
                      {row.name}
                    </strong>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 400,
                        color: 'var(--muted)',
                        marginTop: 2,
                      }}
                    >
                      {row.email}
                    </span>
                  </div>
                </td>
                {/* Col 2 — EMAIL (single-line per UI-SPEC keep-both decision) */}
                <td style={{ ...TD_BASE_STYLE, borderBottom: lastBorder }}>{row.email}</td>
                {/* Col 3 — DATE CRÉATION */}
                <td style={{ ...TD_BASE_STYLE, borderBottom: lastBorder }}>
                  {formatRowDate(row.createdAt, lang)}
                </td>
                {/* Col 4 — DERNIÈRE ACTIVITÉ (D-08 em-dash fallback) */}
                <td style={{ ...TD_BASE_STYLE, borderBottom: lastBorder }}>
                  {row.lastActivityAt ? formatRowDate(row.lastActivityAt, lang) : '—'}
                </td>
                {/* Col 5 — STATUT */}
                <td
                  style={{
                    ...TD_BASE_STYLE,
                    borderBottom: lastBorder,
                    textAlign: 'center',
                  }}
                >
                  <StatusChip
                    variant={chipVariant(row.status)}
                    label={chipLabel(row.status, lang)}
                  />
                </td>
                {/* Col 5b — TYPE (D-07: at-a-glance partner type badge). ADMIN-09: enum, not a rate. */}
                <td
                  style={{
                    ...TD_BASE_STYLE,
                    borderBottom: lastBorder,
                    textAlign: 'center',
                  }}
                >
                  <span
                    // `className="chip chip-type"` removed: .chip-type was never
                    // declared in any stylesheet, and every property .chip would
                    // have contributed is overridden by the inline style below —
                    // except line-height, which is carried over explicitly here so
                    // the rendering is unchanged.
                    style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      letterSpacing: '0.02em',
                      background: 'var(--border)',
                      color: 'var(--ink)',
                    }}
                  >
                    {row.partnerType}
                  </span>
                </td>
                {/* Col 6 — ⋯ overflow menu (D-10, wired in Task 2) */}
                <td
                  style={{
                    ...TD_BASE_STYLE,
                    borderBottom: lastBorder,
                    textAlign: 'center',
                    width: 48,
                  }}
                >
                  <PartnerRowActions
                    partnerId={row.id}
                    status={row.status}
                    adminSegment={adminSegment}
                    lang={lang}
                    partnerEmail={row.email}
                    partnerDisplayName={row.name}
                    partnerType={row.partnerType}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {nextCursor && (
        <div style={{ padding: '16px 20px', textAlign: 'center' }}>
          <Link
            href={`/${adminSegment}/partners?cursor=${encodeURIComponent(nextCursor)}${currentStatus ? `&status=${currentStatus}` : ''}${currentQ ? `&q=${encodeURIComponent(currentQ)}` : ''}`}
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
