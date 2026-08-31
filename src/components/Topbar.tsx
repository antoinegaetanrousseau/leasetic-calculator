import { TopbarTitle } from './TopbarTitle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { t, type Lang } from '@/lib/i18n';

// PHASE 16: verified visual match to Figma 9:46 on 2026-05-22 (D-16). Zero functional change.

/**
 * Topbar — page title + ADMIN badge.
 *
 * User identity moved to the sidebar footer (NavUser) when the app-shell-1
 * block structure was adopted; the block puts the account card at the bottom
 * of the sidebar, not in the header. The topbar is now title chrome only.
 *
 * The title is rendered by the `<TopbarTitle>` client island so it can read
 * the current pathname; the rest of the topbar chrome stays server-rendered.
 */
export interface TopbarProps {
  lang: Lang;
  isAdmin?: boolean;
  /** Forwarded to TopbarTitle so admin-tree paths resolve to admin titles. */
  adminSegment?: string;
}

export function Topbar({
  lang,
  isAdmin = false,
  adminSegment,
}: TopbarProps) {
  return (
    // Phase 3: the gridRow/gridColumn placement is gone with the CSS grid that
    // needed it — SidebarInset is a flex column now. The height stays bound to
    // --topbar-h because the proposal detail page offsets a sticky element
    // against it (`top: calc(var(--topbar-h) + 24px)`).
    <header className="sticky top-0 z-100 flex h-[var(--topbar-h)] items-center gap-3 border-b border-border bg-background px-6">
      {/* Opens the sidebar as a sheet below the md breakpoint, where the
          collapsible rail is not shown. */}
      <SidebarTrigger className="-ml-1 md:hidden" />
      <TopbarTitle lang={lang} adminSegment={adminSegment} />
      {isAdmin && (
        <Badge variant="secondary" aria-label={t('shell.topbar.admin.badge', lang)}>
          {t('shell.topbar.admin.badge', lang)}
        </Badge>
      )}
    </header>
  );
}
