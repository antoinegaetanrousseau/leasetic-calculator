import { UserMenu } from './UserMenu';
import { t, type Lang } from '@/lib/i18n';

/**
 * Topbar — page title + ADMIN pill + UserMenu (UI-SPEC §6.7, Plan 11-05 D-06).
 *
 * Plan 11-05 refactor: `<LocaleToggle />` + `<ThemeToggle />` relocated to the
 * bottom of `<RetractableSidebar />` (Plan 11-04). The `theme` prop is removed —
 * Topbar no longer renders any theme-aware controls.
 */
export interface TopbarProps {
  displayName: string;
  email: string;
  lang: Lang;
  isAdmin?: boolean;
  pageTitle?: string;
}

export function Topbar({
  displayName,
  email,
  lang,
  isAdmin = false,
  pageTitle,
}: TopbarProps) {
  const title = pageTitle ?? t('header.home', lang);

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
      <span
        style={{
          fontSize: '16.5px',
          fontWeight: 600,
          color: 'var(--ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '60%',
        }}
      >
        {title}
      </span>
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
