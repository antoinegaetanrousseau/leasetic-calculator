import { TopbarBreadcrumb } from './TopbarBreadcrumb';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { t, type Lang } from '@/lib/i18n';

// PHASE 16: verified visual match to Figma 9:46 on 2026-05-22 (D-16). Zero functional change.

/**
 * Topbar — collapse control + breadcrumb + ADMIN badge.
 *
 * User identity moved to the sidebar footer (NavUser) when the app-shell-1
 * block structure was adopted; the block puts the account card at the bottom
 * of the sidebar, not in the header. Phase 31.1 (D-04) removed the last of
 * the title chrome too: the topbar is now navigation chrome only — the
 * breadcrumb trail plus the sidebar collapse control — and the page title
 * lives in `PageHero`, in the content area.
 *
 * The breadcrumb is rendered by the `<TopbarBreadcrumb>` client island so it
 * can read the current pathname; the rest of the topbar chrome stays
 * server-rendered.
 */
export interface TopbarProps {
  lang: Lang;
  isAdmin?: boolean;
  /** Forwarded to TopbarBreadcrumb so admin-tree paths resolve to admin trails. */
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
      <div className="flex min-w-0 items-center gap-3">
        {/* Phase 31.1 (D-07): the single, focusable, FR/EN-labelled collapse
            control for the whole shell — rendered at every width, not just
            below md. SidebarRail cannot serve as it: the primitive hardcodes
            tabIndex={-1} and an English "Toggle Sidebar" label, which would
            cost keyboard users the control and drop FR/EN in a bilingual
            product (the same reasoning that used to live on the in-sidebar
            chevron this control replaces — AppSidebar.tsx, until Plan
            31.1-06 removes it). The aria-label below supersedes — it does
            not remove — the primitive's own sr-only English span. */}
        <SidebarTrigger
          className="-ml-1"
          aria-label={t('shell.topbar.toggleSidebar', lang)}
        />
        <TopbarBreadcrumb lang={lang} adminSegment={adminSegment} />
      </div>
      {isAdmin && (
        <Badge
          variant="secondary"
          className="ml-auto"
          aria-label={t('shell.topbar.admin.badge', lang)}
        >
          {t('shell.topbar.admin.badge', lang)}
        </Badge>
      )}
    </header>
  );
}
