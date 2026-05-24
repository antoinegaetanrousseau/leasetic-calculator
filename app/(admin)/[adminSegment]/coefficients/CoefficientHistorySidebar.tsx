/**
 * Plan 18-05 Task 2 — Coefficient History Sidebar (D-21 in-place refresh,
 * D-22 click-to-diff removal).
 *
 * Phase 14 baseline preserved:
 *   - Server component fetching 5 most-recent coefficient_history rows.
 *   - Single .card with ● HISTORIQUE chrome.
 *   - Empty state hides the footer link.
 *   - 2-column layout owned by the parent page (left = editor, right = this).
 *   - Cursor pagination preserved (the page-level "+ N autres" / load-more
 *     control stays as the Phase 14 mount).
 *
 * Plan 18-05 changes:
 *   - Rows render via the refreshed CoefficientHistorySidebarRow — tighter
 *     row chrome per UI-SPEC §Coefficients lines 511-518, NO click-to-diff
 *     handler, NO CoefficientDiffPanel mount.
 *   - Footer link copy uses the Plan 18-01 new key
 *     'admin.coefficients.history.viewAll' (FR: "Voir tout l'historique →").
 *   - The CoefficientDiffPanel still lives at /history (full-page mode) per
 *     D-22 — not referenced from this surface anymore.
 *
 * Trust boundary inherited (T-14-04-01): parent /coefficients page calls
 * requireAdmin() upstream; this server component renders only inside that
 * gated surface. listCoefficientHistory({ limit: 5 }) is read-only.
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
        <div>
          {rows.map((row) => (
            <CoefficientHistorySidebarRow key={row.id} row={row} lang={lang} />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Link
            href={`/${adminSegment}/history`}
            style={{
              color: 'var(--teal)',
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {t('admin.coefficients.history.viewAll', lang)}
          </Link>
        </div>
      )}
    </section>
  );
}
