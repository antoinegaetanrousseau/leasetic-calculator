import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { buildListResponse } from '@/lib/api/proposals/list';
import { ProposalsList } from '@/components/proposals/ProposalsList';
import { SearchBar } from '@/components/proposals/SearchBar';
import { RecentlyDeletedToggle } from '@/components/proposals/RecentlyDeletedToggle';

// PITFALLS §1.6: cookie-reading layout opts out of static rendering.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Accueil — Leasétic Matrice' };

/**
 * Module-level async helper so Date.now() is not called inside a React
 * component function — satisfies react-hooks/purity (same pattern as
 * Plan 08-10's getNowMs in the detail page).
 */
async function getNowMs(): Promise<number> {
  return Date.now();
}

interface PageParams {
  searchParams: Promise<{ q?: string; deleted?: string; cursor?: string }>;
}

/**
 * Authenticated home page — Phase 8 (PROP-02..05, PROP-20).
 *
 * Server Component does the initial list fetch (SSR first paint) and passes
 * { rows, hasMore, nextCursor } to the <ProposalsList> client orchestrator.
 *
 * Defence in depth: requireUser() runs again here even though the parent
 * layout already gated the route (PITFALLS §7.3 ordering).
 */
export default async function HomePage({ searchParams }: PageParams) {
  const { session } = await requireUser();
  const lang = await getCurrentLang();

  const u = session.user as {
    email: string;
    displayName?: string | null;
    name?: string | null;
  };
  const displayName = u.displayName ?? u.name ?? u.email;

  const sp = await searchParams;
  const q = sp.q ?? '';
  const deleted = sp.deleted === '1';
  const cursor = sp.cursor ?? null;

  // SSR initial fetch — called directly (no HTTP round-trip on the SSR pass).
  const initial = await buildListResponse({
    userId: session.user.id,
    q,
    cursorEncoded: cursor,
    deleted,
    limit: 20,
  });

  // nowMs passed as prop so ValidityChip stays a pure render function
  // (react-hooks/purity pattern from Plan 08-10 getNowMs helper).
  const nowMs = await getNowMs();

  // SSR re-mount key: forces ProposalsList to reset rows when URL params change.
  // Back/forward navigation re-renders the server component, which propagates
  // fresh initial props — the key change re-mounts ProposalsList so stale
  // client-side rows are discarded.
  const remountKey = `${q}|${deleted ? '1' : '0'}|${cursor ?? ''}`;

  return (
    <div>
      {/* Greeting section — UI-SPEC §3.1.1 */}
      <section style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: 8,
          }}
        >
          {t('dashboard.greeting', lang).replace('{0}', displayName)}
        </h1>
        <p
          style={{
            fontSize: '14.5px',
            fontWeight: 400,
            color: 'var(--muted)',
            marginBottom: 24,
          }}
        >
          {t('dashboard.subtext', lang)}
        </p>

        {/* Primary CTA — UI-SPEC §3.1.1 */}
        <Link
          href="/proposals/new"
          className="btn-green"
          aria-label={t('dashboard.cta.new.proposal', lang)}
          style={{
            width: 'max-content',
            padding: '0.75rem 1.5rem',
            textDecoration: 'none',
          }}
        >
          <Plus size={17} strokeWidth={1.6} aria-hidden="true" />
          <span>{t('dashboard.cta.new.proposal', lang)}</span>
        </Link>
      </section>

      {/* Recent-proposals card — UI-SPEC §3.1.1 */}
      <section className="card" style={{ marginTop: 0 }}>
        {/* Card header: title left + toggle right */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div className="ctitle">
            <span>{t('dashboard.recent.title', lang)}</span>
          </div>
          <RecentlyDeletedToggle lang={lang} />
        </div>

        {/* Search bar — full width inside card */}
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <SearchBar lang={lang} />
        </div>

        {/* List orchestrator — re-mounts on every q/deleted/cursor change */}
        <ProposalsList key={remountKey} lang={lang} initial={initial} nowMs={nowMs} />
      </section>
    </div>
  );
}
