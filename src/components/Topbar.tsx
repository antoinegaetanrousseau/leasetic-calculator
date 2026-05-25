import { UserMenu } from './UserMenu';
import { TopbarTitle } from './TopbarTitle';
import { t, type Lang } from '@/lib/i18n';

// PHASE 16: verified visual match to Figma 9:46 on 2026-05-22 (D-16). Zero functional change.

/**
 * Topbar — page title + ADMIN pill + UserMenu (UI-SPEC §6.7, Plan 11-05 D-06).
 *
 * The title is rendered by the `<TopbarTitle>` client island so it can read
 * the current pathname; the rest of the topbar chrome stays server-rendered.
 */
export interface TopbarProps {
  displayName: string;
  email: string;
  lang: Lang;
  isAdmin?: boolean;
  /** Forwarded to TopbarTitle so admin-tree paths resolve to admin titles. */
  adminSegment?: string;
}

export function Topbar({
  displayName,
  email,
  lang,
  isAdmin = false,
  adminSegment,
}: TopbarProps) {
  return (
    <header
      style={{
        gridRow: '1',
        gridColumn: '2',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        height: 'var(--topbar-h)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <TopbarTitle lang={lang} adminSegment={adminSegment} />
      {isAdmin && (
        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 9999,
            background: 'var(--navy)',
            color: '#ffffff',
          }}
          aria-label={t('shell.topbar.admin.badge', lang)}
        >
          {t('shell.topbar.admin.badge', lang)}
        </span>
      )}
      <div style={{ flex: 1 }} />
      <UserMenu displayName={displayName} email={email} lang={lang} />
    </header>
  );
}
