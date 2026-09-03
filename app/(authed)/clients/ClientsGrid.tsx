'use client';

/**
 * Phase 30 Plan 06 — ClientsGrid (CRM-07), rebuilt at the Phase 33 acceptance
 * checkpoint on ReUI's `list-2` block: a dense, stacked Frame whose header
 * panel carries the list title and a sort Select, and whose content panel
 * holds one row per relationship — a 36px icon tile, the company name over a
 * muted "SIREN · N proposition(s)" line, and a right-aligned "Dernière
 * activité" label/value pair. The DataGrid it replaces is gone: this list is
 * cursor-paged and CRM-02 forbids a query builder over "my own book only".
 *
 * Sorting stays server-side: changing the Select pushes `sort`/`dir` into
 * the URL and deletes `cursor` — the same reset `SearchBar` performs on
 * query change — instead of re-ordering the loaded partial page (T-30-06-07).
 *
 * No total count is ever rendered: a count over the unscoped table would be
 * a CRM-02 inference channel (T-30-06-02).
 */

import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Frame, FramePanel } from '@/components/reui/frame';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Item, ItemMedia } from '@/components/ui/item';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BuildingIcon, SearchIcon } from '@/components/ui/icons';
import { formatDate } from '@/lib/i18n/format';
import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
import type { ClientBookDir, ClientBookRow, ClientBookSort } from '@/lib/db/queries';
import { CreateClientDialog } from './CreateClientDialog';

export interface ClientsGridProps {
  rows: ClientBookRow[];
  /** base64url-encoded cursor for the next page; null when no more pages. */
  nextCursor: string | null;
  lang: Lang;
  q?: string;
  sort?: ClientBookSort;
  dir?: ClientBookDir;
}

const SORT_OPTIONS = [
  'lastActivity-desc',
  'lastActivity-asc',
  'company-asc',
  'company-desc',
] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

function isSortOption(value: unknown): value is SortOption {
  return typeof value === 'string' && (SORT_OPTIONS as readonly string[]).includes(value);
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

const ROW_CLASS = [
  'flex min-w-0 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-inherit no-underline',
  'border-b border-border transition-colors last:border-b-0 hover:bg-[var(--hover-overlay)]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

function ClientRow({ row, lang, onOpen }: { row: ClientBookRow; lang: Lang; onOpen: () => void }) {
  return (
    <div
      data-slot="client-row"
      role="button"
      tabIndex={0}
      aria-label={row.companyName}
      className={ROW_CLASS}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
    >
      <Item
        className="flex size-9 shrink-0 items-center justify-center border-2 border-background bg-muted p-0 text-muted-foreground shadow-[0_1px_3px_0_rgba(0,0,0,0.14)]"
        aria-hidden="true"
      >
        <ItemMedia variant="icon" className="size-auto">
          <BuildingIcon size={16} />
        </ItemMedia>
      </Item>

      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[15px] leading-tight font-medium text-foreground">
          {row.companyName}
        </p>
        <p className="m-0 mt-0.5 truncate text-xs text-muted-foreground">
          <span>{t('clients.row.siren', lang)}</span>{' '}
          <span className="font-mono">{row.siren ?? '—'}</span>
          <span aria-hidden="true"> · </span>
          <span className="tabular-nums">{row.proposalsCount}</span>{' '}
          {t('clients.row.proposalsSuffix', lang)}
        </p>
      </div>

      <div className="shrink-0 space-y-0.5 text-right">
        <p className="m-0 text-xs leading-none text-muted-foreground">
          {t('clients.row.lastActivity', lang)}
        </p>
        <p className="m-0 text-sm leading-tight font-medium text-foreground tabular-nums">
          {row.lastActivityAt ? formatRowDate(row.lastActivityAt, lang) : '—'}
        </p>
      </div>
    </div>
  );
}

export function ClientsGrid({ rows, nextCursor, lang, q, sort, dir }: ClientsGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeSort: ClientBookSort = sort ?? 'lastActivity';
  const activeDir: ClientBookDir = dir ?? 'desc';
  const activeOption: SortOption = `${activeSort}-${activeDir}`;

  // Server-side sort + cursor reset (T-30-06-07). Never re-sorts `rows`
  // client-side — a fresh page for the new sort is requested from the server.
  const handleSortChange = useCallback(
    (value: unknown) => {
      if (!isSortOption(value) || value === activeOption) return;
      const [columnId, direction] = value.split('-') as [ClientBookSort, ClientBookDir];
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', columnId);
      params.set('dir', direction);
      // Same reset SearchBar already performs on query change.
      params.delete('cursor');
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [activeOption, searchParams, router],
  );

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

  const sortItems = SORT_OPTIONS.map((value) => ({
    value,
    label: t(`clients.list.sort.${value}` as DictKey, lang),
  }));

  return (
    <Frame dense stacked spacing="sm" className="w-full">
      <FramePanel className="flex items-center justify-between gap-3 p-3!">
        <h2 className="m-0 text-base font-medium text-foreground">{t('clients.list.title', lang)}</h2>
        <Select items={sortItems} value={activeOption} onValueChange={handleSortChange}>
          <SelectTrigger
            aria-label={t('clients.list.sort.label', lang)}
            className="min-w-44 shrink-0 text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {sortItems.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FramePanel>

      <FramePanel className="p-1.5!">
        {rows.map((row) => (
          <ClientRow
            key={row.relationshipId}
            row={row}
            lang={lang}
            onOpen={() => router.push(`/clients/${row.relationshipId}`)}
          />
        ))}

        {nextCursor && (
          <div className="px-2.5 pt-3 pb-1.5 text-center">
            <Link
              href={buildLoadMoreHref(nextCursor, q, sort, dir)}
              className="btn-out inline-flex items-center gap-2 text-[13px] no-underline"
            >
              {t('proposal.list.load.more', lang)}
            </Link>
          </div>
        )}
      </FramePanel>
    </Frame>
  );
}
