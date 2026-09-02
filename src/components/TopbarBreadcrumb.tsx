'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { getRouteMeta } from '@/lib/route-meta';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export interface TopbarBreadcrumbProps {
  lang: Lang;
  /** Set by the (admin) layout so admin-tree paths resolve to admin trails. */
  adminSegment?: string;
}

/**
 * Topbar breadcrumb island (D-04/D-06) — replaces the topbar's former
 * page-title island.
 *
 * A server component cannot read the current pathname in the App Router, and
 * `Topbar.tsx` is server-rendered — this island exists for the same reason
 * its predecessor did: `usePathname()` requires a client boundary. It
 * reads the pathname, resolves `RouteMeta.breadcrumb` via `getRouteMeta`
 * (Phase 31.1 Plan 02), and renders the trail through the shadcn `Breadcrumb`
 * primitive. The trail is never empty, never exceeds 2 segments, and its last
 * segment never carries an `href` (rendered as non-link `BreadcrumbPage`).
 */
export function TopbarBreadcrumb({ lang, adminSegment }: TopbarBreadcrumbProps) {
  const pathname = usePathname() ?? '/';
  const { breadcrumb } = getRouteMeta(pathname, adminSegment);

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {breadcrumb.map((segment, index) => {
          const isLast = index === breadcrumb.length - 1;
          const key = segment.href ?? segment.labelKey;
          return (
            <Fragment key={key}>
              <BreadcrumbItem className={isLast ? 'min-w-0' : undefined}>
                {isLast || !segment.href ? (
                  <BreadcrumbPage className={isLast ? 'truncate' : undefined}>
                    {t(segment.labelKey, lang)}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={segment.href} />}>
                    {t(segment.labelKey, lang)}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
