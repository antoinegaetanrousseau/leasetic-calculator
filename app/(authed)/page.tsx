import { getCurrentLang, t } from '@/lib/i18n';

// PITFALLS §1.6 — cookies are read by the parent layout; opt out of static
// rendering so session state is always fresh on this page too.
export const dynamic = 'force-dynamic';

/**
 * Authenticated home page.
 *
 * Phase 7 will replace this body with the "Create new proposal" CTA + recent
 * proposals list (PROP-01 / PROP-02).
 *
 * For Phase 6, this is intentionally minimal — uses the legacy Phase 5
 * welcomeHeading + welcomeSubtext keys (preserved by Plan 06-02 for this
 * exact backward-compat purpose).
 */
export default async function HomePage() {
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
        {t('welcomeHeading', lang)}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14.5px' }}>
        {t('welcomeSubtext', lang)}
      </p>
    </div>
  );
}
