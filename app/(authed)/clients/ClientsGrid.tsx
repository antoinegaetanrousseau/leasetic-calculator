'use client';

/**
 * Phase 30 Plan 06 — ClientsGrid (CRM-07, 30-UI-SPEC.md §1).
 *
 * DataGrid's table/column/header machinery (`DataGrid` + `DataGridTable` +
 * `DataGridColumnHeader`), WITHOUT its pagination, filter builder or
 * row-selection sub-components — this app's lists are cursor-based, and
 * CRM-02 forbids a field-and-operator query builder over data scoped to
 * "my own relationships only". See 30-UI-SPEC.md's DataGrid decision.
 *
 * `recordCount` is `rows.length` — the CURRENT PAGE length, never a total.
 * A total row count over the unscoped table would be a CRM-02 inference
 * channel (T-30-06-02).
 *
 * Sorting is server-side (`manualSorting: true`): clicking a sortable header
 * pushes `sort`/`dir` into the URL and deletes `cursor` — the same reset
 * `SearchBar` already performs on query change — instead of re-ordering the
 * already-loaded partial page in place (T-30-06-07).
 */

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ColumnDef, SortingState, Updater } from '@tanstack/react-table';
import {
  DataGrid,
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { BuildingIcon, SearchIcon } from '@/components/ui/icons';
import { formatDate } from '@/lib/i18n/format';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { ClientBookDir, ClientBookRow, ClientBookSort } from '@/lib/db/queries';
import { CreateClientDialog } from './CreateClientDialog';

// TanStack's own hook is `useTable` in the v9 line this app pins
// (@tanstack/react-table ^9). There is no `useReactTable` export at this
// version — confirmed against every other data-grid block already vendored
// under src/components/blocks/*.
import { useTable } from '@tanstack/react-table';

export interface ClientsGridProps {
  rows: ClientBookRow[];
  /** base64url-encoded cursor for the next page; null when no more pages. */
  nextCursor: string | null;
  lang: Lang;
  q?: string;
  sort?: ClientBookSort;
  dir?: ClientBookDir;
}

function formatRowDate(date: Date, lang: Lang): string {
  return formatDate(date, lang, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Build the "Charger plus" href, preserving q/sort/dir alongside the cursor. */
function buildLoadMoreHref(nextCursor: string, q?: string, sort?: ClientBookSort, dir?: ClientBookDir): string {
  const params = new URLSearchParams();
  params.set('cursor', nextCursor);
  if (q) params.set('q', q);
  if (sort) params.set('sort', sort);
  if (dir) params.set('dir', dir);
  return `/clients?${params.toString()}`;
}

export function ClientsGrid({ rows, nextCursor, lang, q, sort, dir }: ClientsGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeSort: ClientBookSort = sort ?? 'lastActivity';
  const activeDir: ClientBookDir = dir ?? 'desc';

  const sorting: SortingState = useMemo(
    () => [{ id: activeSort, desc: activeDir === 'desc' }],
    [activeSort, activeDir],
  );

  // Server-side sort + cursor reset (T-30-06-07). Never re-sorts `rows`
  // client-side — a fresh page for the new sort is requested from the server.
  const handleSortingChange = useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      const nextState =
        typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue;

      // DataGridColumnHeader's own click handler cycles asc -> desc -> clear
      // for the currently-sorted column. There is no "no sort" URL state on
      // this surface, so a clear collapses back to a direction toggle on the
      // column that was already active, keeping the interaction a clean
      // 2-way toggle from the caller's perspective.
      const [columnId, desc] = nextState[0]
        ? [nextState[0].id as ClientBookSort, nextState[0].desc]
        : [activeSort, activeDir !== 'desc'];

      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', columnId);
      params.set('dir', desc ? 'desc' : 'asc');
      // Same reset SearchBar already performs on query change.
      params.delete('cursor');
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [sorting, activeSort, activeDir, searchParams, router],
  );

  const columns = useMemo<ColumnDef<DataGridFeatures, ClientBookRow>[]>(
    () => [
      {
        accessorKey: 'companyName',
        id: 'company',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('clients.col.company', lang)} />
        ),
        cell: ({ row }) => (
          <span className="text-[14.5px] font-semibold">{row.original.companyName}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'siren',
        id: 'siren',
        header: t('clients.col.siren', lang),
        cell: ({ row }) => (
          <span className="text-[13px] text-muted-foreground">
            {row.original.siren ?? '—'}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'proposalsCount',
        id: 'proposals',
        header: t('clients.col.proposals', lang),
        cell: ({ row }) => (
          <span className="text-[13px] text-muted-foreground">
            {row.original.proposalsCount}
          </span>
        ),
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
      },
      {
        accessorKey: 'lastActivityAt',
        id: 'lastActivity',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('clients.col.lastActivity', lang)} />
        ),
        cell: ({ row }) =>
          row.original.lastActivityAt ? formatRowDate(row.original.lastActivityAt, lang) : '—',
        enableSorting: true,
      },
    ],
    [lang],
  );

  // The `dataGridFeatures` bundle registers a row-pagination row model
  // (default pageSize 10), which would silently truncate an already
  // owner-scoped, already server-paginated page of up to 20 rows. This
  // surface never renders the pagination footer component at all
  // (30-UI-SPEC.md's DataGrid decision — cursor "Charger plus" only), so the
  // pagination slice is neutralized here by sizing it to the full loaded
  // page rather than pulling in a second, leaner feature bundle.
  const pagination = useMemo(
    () => ({ pageIndex: 0, pageSize: Math.max(rows.length, 1) }),
    [rows.length],
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    getRowId: (row) => row.relationshipId,
    manualSorting: true,
    state: { sorting, pagination },
    onSortingChange: handleSortingChange,
    onPaginationChange: () => {},
  });

  const hasQuery = Boolean(q && q.length > 0);

  if (rows.length === 0) {
    if (hasQuery) {
      return (
        <section className="card overflow-hidden p-0">
          <Empty className="px-5 py-10">
            <EmptyMedia variant="icon">
              <SearchIcon size={20} aria-hidden="true" />
            </EmptyMedia>
            <EmptyDescription className="text-[14.5px]">
              {t('clients.empty.search.title', lang)}
            </EmptyDescription>
          </Empty>
        </section>
      );
    }
    return (
      <section className="card overflow-hidden p-0">
        {/* First-run state. A partner or sales user landing here has no client book
            yet, so this is the one place in the app that has to invite the work
            rather than just report its absence — title + body + the create CTA. */}
        <Empty className="px-5 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BuildingIcon size={20} aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{t('clients.empty.zero.title', lang)}</EmptyTitle>
            <EmptyDescription className="text-[14.5px]">
              {t('clients.empty.zero.body', lang)}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateClientDialog lang={lang} />
          </EmptyContent>
        </Empty>
      </section>
    );
  }

  return (
    <section className="card overflow-hidden p-0">
      <DataGrid
        table={table}
        recordCount={rows.length}
        tableLayout={{ headerBackground: true, rowBorder: true }}
        onRowClick={(row) => router.push(`/clients/${row.relationshipId}`)}
      >
        <DataGridTable />
      </DataGrid>

      {nextCursor && (
        <div className="px-5 py-4 text-center">
          <Link
            href={buildLoadMoreHref(nextCursor, q, sort, dir)}
            className="btn-out inline-flex items-center gap-2 text-[13px] no-underline"
          >
            {t('proposal.list.load.more', lang)}
          </Link>
        </div>
      )}
    </section>
  );
}
