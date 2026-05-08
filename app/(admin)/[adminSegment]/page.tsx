import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';

// PITFALLS §1.6 — opts out of static rendering (reads session cookie via requireAdmin).
export const dynamic = 'force-dynamic';

/**
 * Admin home page placeholder.
 *
 * Per AUTH-15: every admin route/handler/page calls requireAdmin() independently —
 * defense in depth, do NOT rely on the parent layout alone. Layout-bypass attacks
 * (e.g. Next.js route hijacking in future versions) cannot bypass the per-page check
 * (PITFALLS §7.1: hidden URL is NOT security; role check is).
 *
 * Phase 9 fills this page with the coefficients editor + accounts list + audit log
 * table (ADMIN-05, ADMIN-06). Phase 6 ships the placeholder so the route is reachable
 * for build verification and acceptance testing.
 */
export default async function AdminHomePage() {
  // AUTH-15: independent requireAdmin call (not delegating to parent layout).
  await requireAdmin();

  const lang = await getCurrentLang();

  return (
    <div>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: '0.5rem',
        }}
      >
        {t('shell.topbar.admin.badge', lang)}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14.5px' }}>
        {/* Placeholder — Phase 9 replaces with coefficients editor + accounts list + audit log. */}
        {t('welcomeSubtext', lang)}
      </p>
    </div>
  );
}
