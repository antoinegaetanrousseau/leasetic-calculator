import type { Metadata } from 'next';
import { requireRelationshipHolder } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { listClientBook, type ClientBookDir, type ClientBookSort } from '@/lib/db/queries';
import { PageHero } from '@/components/ui/PageHero';
import { SearchBar } from '@/components/proposals/SearchBar';
import { ClientsGrid } from './ClientsGrid';
import { CreateClientDialog } from './CreateClientDialog';

// PITFALLS §1.6 — cookie/session-reading route opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Clients — Leasétic Matrice',
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    dir?: string;
    cursor?: string;
  }>;
}

const VALID_SORTS: ReadonlySet<ClientBookSort> = new Set(['company', 'lastActivity']);
const VALID_DIRS: ReadonlySet<ClientBookDir> = new Set(['asc', 'desc']);

/** Enum-validate `sort` — invalid/absent values fall back to undefined (server default). */
function validateSort(raw: string | undefined): ClientBookSort | undefined {
  if (raw && (VALID_SORTS as Set<string>).has(raw)) {
    return raw as ClientBookSort;
  }
  return undefined;
}

/** Enum-validate `dir` — invalid/absent values fall back to undefined (server default). */
function validateDir(raw: string | undefined): ClientBookDir | undefined {
  if (raw && (VALID_DIRS as Set<string>).has(raw)) {
    return raw as ClientBookDir;
  }
  return undefined;
}

/**
 * /clients — Phase 30 Plan 06 (CRM-07). The partner/sales client book.
 *
 * Renders directly inside Shell's capped `<main>` — no nested width-capping
 * wrapper (30-UI-SPEC.md §0 Container convention).
 *
 * SECURITY (CRM-02): `ownerId` passed to `listClientBook` comes exclusively
 * from `session.user.id`. There is no `ownerId`/`owner_id`/`user_id` search
 * param read anywhere in this file — a forged one is simply never consulted.
 * `requireRelationshipHolder()` runs first, before any data access
 * (PITFALLS §7.3), and refuses admins via `notFound()`.
 */
export default async function ClientsPage({ searchParams }: PageProps) {
  const { session } = await requireRelationshipHolder(); // FIRST — auth before any data access
  const lang = await getCurrentLang();

  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const sort = validateSort(sp.sort);
  const dir = validateDir(sp.dir);
  const cursor = sp.cursor || undefined;

  const { rows, nextCursor } = await listClientBook({
    ownerId: session.user.id,
    q,
    sort,
    dir,
    cursor,
    limit: 20,
  });

  return (
    <div>
      <PageHero
        title={t('clients.page.title', lang)}
        subtitle={t('clients.page.subtitle', lang)}
        actions={<CreateClientDialog lang={lang} />}
      />

      <div className="mb-4">
        <SearchBar
          lang={lang}
          placeholderKey="clients.search.placeholder"
          ariaKey="clients.search.aria"
        />
      </div>

      <ClientsGrid
        rows={rows}
        nextCursor={nextCursor}
        lang={lang}
        q={q}
        sort={sort}
        dir={dir}
      />
    </div>
  );
}
