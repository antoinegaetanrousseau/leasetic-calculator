/**
 * Plan 14-04 Task 2 — Coefficient History Sidebar (server component).
 *
 * Per UI-SPEC §5.2 + D-17..D-20:
 *   - Fetches 5 most-recent coefficient_history rows via Phase 12's
 *     listCoefficientHistory({ limit: 5 }) helper.
 *   - Renders a single .card with the `● HISTORIQUE` chrome, up to 5
 *     CoefficientHistorySidebarRow client components, and a footer
 *     `Voir tout l'historique →` Link to /<seg>/history.
 *   - Empty state (no rows): italic muted "Aucun changement…" line +
 *     footer link HIDDEN.
 *
 * Trust boundary inherited (T-14-04-01): the parent /coefficients page
 * calls requireAdmin() upstream; this server component is rendered ONLY
 * inside that gated surface. The sidebar's `listCoefficientHistory({
 * limit: 5 })` call is read-only (no untrusted input).
 */

import Link from 'next/link';
import { listCoefficientHistory } from '@/lib/db/queries/coefficient-history';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { CoefficientHistorySidebarRow } from './CoefficientHistorySidebarRow';

export interface CoefficientHistorySidebarProps {
  /** Current language for date formatting + i18n labels. */
  lang: Lang;
  /** Resolved adminSegment for the "Voir tout l'historique →" link href. */
  adminSegment: string;
}

export async function CoefficientHistorySidebar({
  lang,
  adminSegment,
}: CoefficientHistorySidebarProps) {
  const { rows } = await listCoefficientHistory({ limit: 5 });

  return (
    <section
      className="card"
      aria-label={t('coefficients.history.aria.label', lang)}
      style={{ padding: 28 }}
    >
      <div className="ctitle" style={{ marginBottom: 16 }}>
        <span
          className="dot"
          style={{ background: 'var(--gd)' }}
          aria-hidden="true"
        />
        <span>{t('coefficients.history.title', lang)}</span>
      </div>

      {rows.length === 0 ? (
        <p
          style={{
            fontStyle: 'italic',
            color: 'var(--muted)',
            padding: '20px 0',
            fontSize: 14.5,
            margin: 0,
          }}
        >
          {t('coefficients.history.empty', lang)}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((row) => (
            <CoefficientHistorySidebarRow key={row.id} row={row} lang={lang} />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            marginTop: 16,
            paddingTop: 12,
          }}
        >
          <Link
            href={`/${adminSegment}/history`}
            style={{
              color: 'var(--teal)',
              fontSize: 14.5,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {t('coefficients.history.viewAll', lang)}
          </Link>
        </div>
      )}
    </section>
  );
}
