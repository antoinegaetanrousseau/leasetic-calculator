import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { buildListResponse } from '@/lib/api/proposals/list';
import { ProposalsList } from '@/components/proposals/ProposalsList';
import { SearchBar } from '@/components/proposals/SearchBar';
import { DeleteJustToast } from '@/components/proposals/DeleteJustToast';
import { PageHero } from '@/components/ui/PageHero';
import { FilterPillRow } from './_components/FilterPillRow';

// PITFALLS §1.6: cookie-reading route opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mes propositions — Leasétic Matrice',
};

interface PageParams {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    cursor?: string;
  }>;
}

/**
 * /proposals — Phase 17 Plan 04 server route (PROPS-01, D-10/D-11/D-13/D-14).
 *
 * Dedicated proposals-list route split out of Partner Home (Plan 17-03
 * retired the inline list mount). Hosts the new Archivées filter pill
 * (in-page toggle via ?archived=1, NOT a separate /archives route).
 *
 * Layout (top → bottom):
 *   1. <PageHero> — title + subtitle + Nouvelle proposition CTA (D-19)
 *   2. Filter+search flex row — <FilterPillRow> (left) + <SearchBar> (right)
 *   3. <ProposalsList> card (verbatim reuse) OR empty-state copy when 0 rows
 *
 * Defense in depth: requireUser() runs again here even though the parent
 * (authed)/layout.tsx already gated the route. userId for buildListResponse
 * comes from `session.user.id` (NEVER from any query param) —
 * T-17-04-01 IDOR mitigation.
 *
 * D-13/D-14 reuse: <ProposalsList> + <SearchBar> are reused verbatim
 * (cursor pagination + ILIKE search continue working uniformly across
 * Actives/Archivées). The `archived` flag combines orthogonally with `q`.
 *
 * D-18 ADMIN-09 invariant preserved: buildListResponse returns
 * ProposalRowDto which strips paramsSnapshot (commission_pct bearing) at
 * the API layer; the 9-gate grep-contract suite stays green trivially.
 *
 * Empty-state copy switches based on the `archived` flag — server-side
 * inline conditional avoids extending ProposalsList for this surface
 * (per PLAN.md <interfaces> note: approach (a) — page handles the switch).
 */
export default async function ProposalsListPage({ searchParams }: PageParams) {
  const { session } = await requireUser();
  const lang = await getCurrentLang();

  const sp = await searchParams;
  const q = sp.q ?? '';
  const archived = sp.archived === '1';
  const cursor = sp.cursor ?? null;

  const initial = await buildListResponse({
    userId: session.user.id,
    q,
    cursorEncoded: cursor,
    archived,
    limit: 20,
  });

  const nowMs = Date.now();
  const remountKey = `${q}|${archived ? '1' : '0'}|${cursor ?? ''}`;

  return (
    <div>
      {/* D-8-09 carry-forward: fires delete-success toast when ?deleted_just=1
          is in URL, then strips it. Mounted here so the toast still surfaces
          after a delete action redirects to /proposals (the list surface). */}
      <DeleteJustToast lang={lang} />

      {/* PageHero — title + subtitle + Nouvelle proposition CTA (D-19) */}
      <PageHero
        title={t('proposals.title', lang)}
        subtitle={t('proposals.subtitle', lang)}
        actions={
          <Link
            href="/proposals/new/parametres"
            className="btn-green"
            aria-label={t('dashboard.cta.new', lang)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
            }}
          >
            <Plus size={17} strokeWidth={1.6} aria-hidden="true" />
            <span>{t('dashboard.cta.new', lang)}</span>
          </Link>
        }
      />

      {/* Filter + search flex row (UI-SPEC §/proposals Layout step 2) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          gap: 16,
        }}
      >
        <FilterPillRow archived={archived} lang={lang} />
        <SearchBar lang={lang} />
      </div>

      {/* List or empty-state — empty-state copy switches per `archived` flag */}
      {initial.rows.length === 0 ? (
        <section className="card">
          <p
            style={{
              color: 'var(--muted)',
              fontSize: '14.5px',
              textAlign: 'center',
              padding: '40px 20px',
              margin: 0,
            }}
          >
            {t(
              archived ? 'proposals.empty.archived' : 'proposals.empty.actives',
              lang,
            )}
          </p>
        </section>
      ) : (
        <ProposalsList
          key={remountKey}
          lang={lang}
          initial={initial}
          nowMs={nowMs}
        />
      )}
    </div>
  );
}
