'use client';

import { usePathname } from 'next/navigation';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { getRouteMeta } from '@/lib/route-meta';

export interface TopbarTitleProps {
  lang: Lang;
  /** Set by the (admin) layout so admin-tree paths resolve to admin titles. */
  adminSegment?: string;
}

/**
 * Topbar page-title island — reads the current pathname client-side and looks
 * up the i18n title key via getRouteMeta. Lives inside the (server) Topbar so
 * the rest of the topbar chrome (ADMIN pill, UserMenu) stays server-rendered.
 */
export function TopbarTitle({ lang, adminSegment }: TopbarTitleProps) {
  const pathname = usePathname() ?? '/';
  const { titleKey } = getRouteMeta(pathname, adminSegment);
  return (
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
      {t(titleKey, lang)}
    </span>
  );
}
