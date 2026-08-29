/**
 * Shell — composes AppSidebar + Topbar + main + footer (Phase 3 of the
 * ReUI/Maia migration).
 *
 * Server component. Previously this was a hand-built 2-col / 3-row CSS grid
 * whose first column tracked `--shell-sidebar-current-w`, a variable the
 * client sidebar mutated on documentElement from an effect. The shadcn
 * SidebarProvider owns that layout now, so the grid, the width variables and
 * the effect are all gone.
 *
 * The one genuinely new behaviour: `defaultOpen` is read from the
 * `sidebar_state` cookie HERE, on the server. The old implementation kept
 * collapse state in localStorage, which the server cannot see, so a collapsed
 * user always got one frame of expanded sidebar before the effect corrected it
 * — a shift the old UI-SPEC documented and accepted. Reading the cookie
 * server-side removes it.
 *
 * adminHrefs construction is unchanged: AppSidebar is a client component and
 * cannot read process.env.ADMIN_URL_SEGMENT, so Shell resolves the four admin
 * nav hrefs and forwards them (UI-SPEC §11.6).
 */
import { cookies } from 'next/headers';
import { Topbar } from '@/components/Topbar';
import { AppSidebar } from '@/components/ui/AppSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { ActiveNav } from '@/lib/route-meta';
import { t, type Lang } from '@/lib/i18n';

export interface ShellProps {
  isAdmin: boolean;
  lang: Lang;
  theme: 'light' | 'dark' | 'system';
  displayName: string;
  email: string;
  /**
   * Optional override for sidebar active-nav highlighting. When omitted,
   * AppSidebar derives it from the current pathname via getRouteMeta.
   */
  activeNav?: ActiveNav;
  /** Required when isAdmin=true; used to build admin nav hrefs (UI-SPEC §11.6). */
  adminSegment?: string;
  /**
   * Admin-only redirect target for the agent→admin view switch on non-admin
   * routes. Distinct from adminSegment so it does NOT trigger the D-02
   * auto-reconcile (passing adminSegment would force effectiveView='admin' and
   * make agent view impossible — see Plan 24-02 Task 2).
   */
  adminHomeHref?: string;
  children: React.ReactNode;
}

export async function Shell({
  isAdmin,
  lang,
  theme,
  displayName,
  email,
  activeNav,
  adminSegment,
  adminHomeHref,
  children,
}: ShellProps) {
  const adminHrefs =
    isAdmin && adminSegment
      ? {
          home: `/${adminSegment}`,
          coefficients: `/${adminSegment}/coefficients`,
          partners: `/${adminSegment}/partners`,
          history: `/${adminSegment}/history`,
        }
      : undefined;

  // SidebarProvider writes `sidebar_state` on every toggle; reading it here is
  // what makes the collapsed state survive a reload without a visible shift.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      // These MUST go through `style`, not className. SidebarProvider sets
      // --sidebar-width / --sidebar-width-icon as an inline style and spreads
      // the incoming `style` after its defaults, so an arbitrary-property class
      // like `[--sidebar-width:260px]` is silently outranked by that inline
      // style and the sidebar keeps shadcn's 16rem/3rem. (The shipped
      // app-shell-1 block sets them via className and has the same latent bug.)
      style={
        {
          '--sidebar-width': '260px',
          '--sidebar-width-icon': '72px',
        } as React.CSSProperties
      }
    >
      <AppSidebar
        activeNav={activeNav}
        isAdmin={isAdmin}
        lang={lang}
        theme={theme}
        adminHrefs={adminHrefs}
        adminSegment={adminSegment}
        adminHomeHref={adminHomeHref}
      />

      <SidebarInset className="bg-paper">
        <Topbar
          displayName={displayName}
          email={email}
          lang={lang}
          isAdmin={isAdmin}
          adminSegment={adminSegment}
        />

        <main className="mx-auto w-full max-w-[1100px] flex-1 px-6 pt-6 pb-8">
          {children}
        </main>

        <footer className="flex h-[var(--footer-h)] items-center justify-between border-t border-border px-6 text-[10.5px] text-[var(--muted)]">
          <span>{t('shell.footer.copyright', lang)}</span>
          <a
            href="https://leasetic.fr/mentions-legales"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10.5px] text-[var(--muted)] underline"
          >
            {t('shell.footer.privacy', lang)}
          </a>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
