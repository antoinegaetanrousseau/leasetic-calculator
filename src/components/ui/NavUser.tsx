'use client';

/**
 * NavUser — the sidebar footer identity card, following the app-shell-1 block's
 * nav-user structure.
 *
 * This replaces two things at once:
 *
 *   1. The hand-rolled UserMenu that lived in the topbar. It implemented its
 *      own dropdown with useState, a document-level mousedown listener and a
 *      manual role="menu" tree. The shadcn DropdownMenu does all of that,
 *      correctly, including focus management and escape handling.
 *
 *   2. The three bespoke segmented toggles that sat loose in the sidebar
 *      footer. The block puts its theme control inside this dropdown as a
 *      labelled row, so view / language / theme go there too. The sidebar
 *      footer is now a single card, as in the reference.
 *
 * The logout sequence is carried over verbatim, including the WR-05 `finally`:
 * the view flag must be cleared even when signOut rejects, or VIEW-03's
 * "a fresh login always lands in Admin view" guarantee breaks for an admin who
 * had switched to agent view.
 */

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOutIcon, MoreHorizontalIcon, SettingsIcon } from '@/components/ui/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { LocaleToggle } from '../LocaleToggle';
import { ThemeToggle } from '../ThemeToggle';
import { ViewToggle } from '../ViewToggle';
import { authClient } from '@/lib/auth/client';
import { clearView } from '@/lib/view-store';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface NavUserProps {
  displayName: string;
  email: string;
  lang: Lang;
  theme: 'light' | 'dark' | 'system';
  /** Admin-only: gates the view switch (C-03). */
  isAdmin: boolean;
  /** Resolved admin home; when absent the view switch has nowhere to go (WR-02). */
  adminHomeHref?: string | null;
}

/** "Antoine Rousseau" -> "AR"; a single word -> its first two letters. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function NavUser({
  displayName,
  email,
  lang,
  theme,
  isAdmin,
  adminHomeHref,
}: NavUserProps) {
  const router = useRouter();
  const { isMobile } = useSidebar();

  const handleLogout = async () => {
    // AUTH-18 / D-24: official client function only — never a custom POST.
    try {
      await authClient.signOut();
    } finally {
      // WR-05 / VIEW-03: clear the view flag even if signOut rejected, so a
      // fresh login always lands in Admin view.
      clearView();
      router.push('/login?logged_out=1');
      router.refresh();
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="h-auto shrink-0 border border-border bg-background p-1.5 text-sm shadow-sm shadow-black/5 group-data-[collapsible=icon]:justify-center"
            render={<SidebarMenuButton size="lg" aria-label={t('shell.user.menu.aria', lang)} />}
          >
            <Avatar className="size-6 transition-all duration-300 ease-in-out in-data-[state=collapsed]:size-7!">
              <AvatarFallback>{initials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">{displayName}</span>
            </div>
            <MoreHorizontalIcon
              className="mr-1 ml-auto size-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden"
              aria-hidden="true"
            />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side={isMobile ? 'top' : 'right'}
            align="end"
            sideOffset={8}
            className="w-64"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
                <Avatar className="size-8">
                  <AvatarFallback>{initials(displayName)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-foreground">{displayName}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {email}
                  </span>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem render={<Link href="/parametres" />}>
                <SettingsIcon aria-hidden="true" />
                {t('shell.user.menu.settings', lang)}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* The block puts its theme control inside this menu as a labelled
                  row; view, language and theme all follow that pattern. Each row
                  is non-navigating, so it keeps focus rather than closing. */}
              {isAdmin && adminHomeHref && (
                <DropdownMenuItem className="cursor-default focus:bg-transparent!">
                  <span className="text-muted-foreground">{t('sidebar.view.aria', lang)}</span>
                  <div className="ml-auto">
                    <ViewToggle lang={lang} adminHrefs={{ home: adminHomeHref }} />
                  </div>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="cursor-default focus:bg-transparent!">
                <span className="text-muted-foreground">{t('sidebar.lang.cycle', lang)}</span>
                <div className="ml-auto">
                  <LocaleToggle current={lang} />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-default focus:bg-transparent!">
                <span className="text-muted-foreground">{t('sidebar.theme.cycle', lang)}</span>
                <div className="ml-auto">
                  <ThemeToggle current={theme} />
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleLogout}>
                <LogOutIcon aria-hidden="true" />
                {t('shell.user.menu.logout', lang)}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
