import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { FileTextIcon } from '@/components/ui/icons';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { ProposalRow } from '@/components/proposals/ProposalRow';
import type { ProposalRowDto } from '@/lib/api/proposals/list';
import { requireRelationshipHolder } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import {
  deriveProposalOutcome,
  getClientRelationshipForOwner,
  listContactsForRelationship,
  listProposalsForRelationship,
} from '@/lib/db/queries';
import { ContactList } from './ContactList';
import { ProposalOutcomeControl } from './ProposalOutcomeControl';

// PITFALLS §1.6 — cookie/session-reading route opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Client — Leasétic Matrice',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * `/clients/[id]` — Phase 30 Plan 07 (CRM-06, CRM-04). `[id]` is a
 * RELATIONSHIP id, never a company id — this is the phase's sharpest IDOR
 * surface (T-30-07-01).
 *
 * Order of operations is the security boundary, not a style preference:
 *   1. requireRelationshipHolder() — FIRST, before any data access
 *      (PITFALLS §7.3). Refuses admins via notFound() (they reach
 *      relationship data through the separate /[adminSegment]/companies
 *      tree instead).
 *   2. getClientRelationshipForOwner(id, session.user.id) — returns null
 *      for BOTH "no such relationship" and "exists but owned by someone
 *      else" (D-18, plan 30-04).
 *   3. `if (!relationship) notFound();` — not-found and not-owned render
 *      byte-identically to a probing caller. Never a client-error status
 *      that would confirm existence, never sent elsewhere. (T-30-07-01)
 *   4. ONLY THEN are contacts and proposals fetched, each re-scoped to
 *      session.user.id in their own SQL statement (plan 30-04). There is no
 *      code path above this line that reads another partner's contacts and
 *      hides them client-side — they are never fetched at all on the
 *      non-owned path (T-30-07-02).
 */
export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { session } = await requireRelationshipHolder(); // FIRST — auth before any data access
  const lang = await getCurrentLang();

  const relationship = await getClientRelationshipForOwner(id, session.user.id);

  // D-18 obscurity: not-found OR not-owned both return 404, identically.
  // Contacts/proposals below are fetched ONLY after this check passes.
  if (!relationship) {
    notFound();
  }

  const [contacts, proposals] = await Promise.all([
    listContactsForRelationship(id, session.user.id),
    listProposalsForRelationship(id, session.user.id),
  ]);

  // Adapter onto ProposalRowDto so ProposalRow (src/components/proposals/
  // ProposalRow.tsx) is reused verbatim, per 30-UI-SPEC.md §3 — no new
  // proposal-row component. `listProposalsForRelationship`'s row shape
  // (plan 30-04) is deliberately narrower than the full DB row for
  // ADMIN-09 (no params_snapshot as a returned row shape) — two
  // consequences follow, both documented in this plan's SUMMARY:
  //   - `amountHT` carries `computedClientMonthly` (the client-facing
  //     monthly figure already projected out of `computed.loyerHT` by plan
  //     30-04), not the raw equipment price — the only currency figure this
  //     narrower row shape exposes.
  //   - `displayStatus` is the stored draft/active status as-is; this page
  //     still cannot distinguish "active" from "expired" the lifecycle-
  //     status way `/proposals` can. Plan 33-03 DID additionally project
  //     `validityDays` (out of `params_snapshot`, narrowly, ADMIN-09) and
  //     `pdfGeneratedAt` onto this row shape — but solely so
  //     `deriveProposalOutcome` below can resolve the commercial-outcome
  //     axis's `unanswered` state at render time (D-06). The raw
  //     `params_snapshot` object itself still never reaches any returned
  //     row shape; lifecycle status (D-05) and commercial outcome remain
  //     two independent facts, rendered as two independent chips.
  const proposalRows: ProposalRowDto[] = proposals.map((p) => ({
    id: p.id,
    lcRef: p.lcRef ?? '',
    clientCo: relationship.companyName,
    amountHT: p.computedClientMonthly != null ? String(p.computedClientMonthly) : '0',
    createdAt: p.createdAt.toISOString(),
    validityDays: (p.validityDays as 15 | 30 | 60 | null) ?? 30,
    language: p.language,
    deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
    displayStatus: p.status,
  }));

  // Phase 33 (PIPE-03, D-06) — the derived outcome per proposal, computed
  // HERE on the server, beside the adapter above, never inside the client
  // component: `deriveProposalOutcome` reads `new Date()`, and deriving it
  // during client render would make a row's outcome depend on the client
  // clock (react-hooks purity — the same reason ProposalRow itself takes
  // `nowMs` from the server rather than calling `Date.now()` in render).
  //
  // Nothing below on this page reads, renders or writes the relationship's
  // board-position column at all — that column is written only from
  // `/pipeline` (D-04's Decoupling Contract). This page renders an outcome
  // control per proposal only, never a board-position control.
  const outcomes = new Map(proposals.map((p) => [p.id, deriveProposalOutcome(p)]));

  const newProposalHref = `/proposals/new/parametres?clientRelationshipId=${id}`;

  return (
    <div className="max-w-[720px]">
      {/* Header — SIREN omitted entirely when null (never "—" in a header). */}
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-[22px] font-bold">{relationship.companyName}</h1>
        {relationship.siren && (
          <span className="text-[13px] text-muted-foreground">{relationship.siren}</span>
        )}
      </div>

      {/* Section 1 — Contacts (CRM-04). Placed first in reading order, though
          Propositions is the page's focal point (CRM-06). */}
      <section className="card mb-4">
        <SectionTitle>{t('clients.detail.section.contacts', lang)}</SectionTitle>
        <ContactList contacts={contacts} relationshipId={id} lang={lang} />
      </section>

      {/* Section 2 — Propositions (CRM-06's stated reason to exist). */}
      <section className="card">
        <SectionTitle>{t('clients.detail.section.proposals', lang)}</SectionTitle>
        {proposalRows.length === 0 ? (
          <Empty className="px-5 py-10">
            <EmptyMedia variant="icon">
              <FileTextIcon size={20} aria-hidden="true" />
            </EmptyMedia>
            <EmptyDescription className="text-[14.5px]">
              {t('clients.detail.empty.proposals.title', lang)}
            </EmptyDescription>
            <EmptyContent>
              <Button variant="outline" render={<Link href={newProposalHref} />}>
                {t('clients.detail.cta.newProposal', lang)}
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="flex flex-col">
              {proposalRows.map((row) => (
                <ProposalRow
                  key={row.id}
                  row={row}
                  lang={lang}
                  hideClient
                  actionsSlot={
                    // 33-REVIEW CR-04: only a FINALIZED proposal can carry an
                    // outcome. A draft was never sent, so there is nothing to
                    // win or lose, and `getConversionRateForOwner` counts only
                    // finalized rows — offering the triggers here produced a
                    // "Gagné" badge the headline conversion rate disagreed
                    // with, and no way to undo it. The server actions refuse
                    // drafts too; this is the matching half, not the guard.
                    row.displayStatus === 'active' ? (
                      <ProposalOutcomeControl
                        proposalId={row.id}
                        outcome={outcomes.get(row.id) ?? null}
                        lang={lang}
                      />
                    ) : null
                  }
                />
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline" render={<Link href={newProposalHref} />}>
                {t('clients.detail.cta.newProposal', lang)}
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
