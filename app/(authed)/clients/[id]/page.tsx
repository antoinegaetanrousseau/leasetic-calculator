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
  listRelationshipEvents,
} from '@/lib/db/queries';
import { ActivityTimeline } from './ActivityTimeline';
import { ClientHeader } from './ClientHeader';
import { ContactList } from './ContactList';
import { IdentityPanel } from './IdentityPanel';
import { NoteComposer } from './NoteComposer';
import { ProposalOutcomeControl } from './ProposalOutcomeControl';
import { RelationPanel } from './RelationPanel';
// Reached through the module namespace so the validator is named exactly once
// in this file, on the call line below the 404 branch — where step 4 of the
// contract can be read off the code rather than taken on trust.
import * as tabs from './ClientTabs';

/**
 * Read the current timestamp. Extracted to a module-level async helper so
 * `Date.now()` is not called inside a React component render function
 * (react-hooks/purity, which this repo's `eslint --max-warnings=0` gate
 * enforces). Same shape as the helper in `/proposals/[id]/page.tsx`.
 * Server-only; called once per request, before any rendering.
 */
async function getNowMs(): Promise<number> {
  return Date.now();
}

// PITFALLS §1.6 — cookie/session-reading route opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Client — Leasétic Matrice',
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

/**
 * `/clients/[id]` — Phase 30 Plan 07 (CRM-06, CRM-04), rebuilt as the four-tab
 * client page in Phase 34 Plan 12 (FICHE-02..05, ACTV-01, ACTV-04, D-16,
 * D-17). `[id]` is a RELATIONSHIP id, never a company id — this is the
 * phase's sharpest IDOR surface (T-30-07-01, T-34-12-01).
 *
 * Order of operations is the security boundary, not a style preference:
 *   1. requireRelationshipHolder — FIRST, before any data access
 *      (PITFALLS §7.3). Refuses admins with a 404 (they reach relationship
 *      data through the separate /[adminSegment]/companies tree instead).
 *   2. The owner-scoped lookup, called with the id AND session.user.id in
 *      the same statement — it returns null for BOTH "no such relationship"
 *      and "exists but owned by someone else" (D-18, plan 30-04).
 *   3. `if (!relationship)` → a plain 404 — not-found and not-owned render
 *      byte-identically to a probing caller. Never a client-error status
 *      that would confirm existence, never sent elsewhere. (T-30-07-01)
 *   4. ONLY THEN is `?tab=` validated against an enum allowlist. This sits
 *      AFTER step 3 deliberately: an unrecognised tab on a relationship the
 *      caller does not own must produce the SAME response as a valid one,
 *      and validating first would add a second, distinguishable outcome to a
 *      page whose entire contract is that its refusals are indistinguishable
 *      (T-34-12-02). The validated value only ever selects a branch below —
 *      it never composes a query, a path or a URL (T-34-12-03).
 *   5. ONLY THEN is the ACTIVE TAB's data fetched, re-scoped to
 *      session.user.id in its own SQL statement (plan 30-04). Exactly one
 *      tab query runs per request: a partner sitting on Informations causes
 *      no timeline read, and no code path above this line reads another
 *      partner's contacts, proposals or events and hides them client-side —
 *      they are never fetched at all on the refused path (T-30-07-02,
 *      T-34-12-09).
 */
export default async function ClientDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { session } = await requireRelationshipHolder(); // FIRST — auth before any data access
  const lang = await getCurrentLang();

  const relationship = await getClientRelationshipForOwner(id, session.user.id);

  // D-18 obscurity: not-found OR not-owned both return 404, identically.
  // Everything below is fetched ONLY after this check passes.
  if (!relationship) {
    notFound();
  }

  // Step 4 — after the refusal branch, never before it.
  const tab = tabs.validateTab((await searchParams).tab);

  // Step 5 — exactly ONE of these three runs, chosen by the validated tab.
  // Informations fetches nothing extra: the detail row above already carries
  // all three D-01 tiers.
  const contacts =
    tab === 'contacts' ? await listContactsForRelationship(id, session.user.id) : null;
  const proposals =
    tab === 'proposals' ? await listProposalsForRelationship(id, session.user.id) : null;
  const events = tab === 'activity' ? await listRelationshipEvents(id, session.user.id) : null;

  // The clock is read ONCE per request, here on the server, for the same
  // reason `deriveProposalOutcome` is computed here: a timeline bucket
  // boundary derived during client render would depend on the visitor's
  // clock and could disagree with the server's own rendering of the same
  // events.
  const nowMs = await getNowMs();

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
  const proposalRows: ProposalRowDto[] = (proposals ?? []).map((p) => ({
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
  // Phase 34 revises D-04's Decoupling Contract in one respect and one only:
  // the header now renders the relationship's board-position column as an
  // inline picker (34-CONTEXT <specifics>), so the stage is both read and
  // written from this page as well as from /pipeline. The proposals list
  // below is unchanged — it renders an outcome control per proposal and no
  // stage surface of any kind, because outcome and board position remain two
  // independent axes.
  const outcomes = new Map((proposals ?? []).map((p) => [p.id, deriveProposalOutcome(p)]));

  const newProposalHref = `/proposals/new/parametres?clientRelationshipId=${id}`;

  return (
    <div className="max-w-[720px]">
      {/* UIC-09 note: `Shell`'s <main> is already capped, so this wrapper adds
          neither a nested <main> nor a per-page width override in a style
          object. The 720px cap is Phase 30's and is kept EXACTLY as it was —
          narrowing or widening a page's measure while rebuilding its contents
          is the silent drift UIC-09 exists to stop, and the tab rail is four
          short pills that fit the existing measure. */}
      <ClientHeader
        relationshipId={id}
        companyName={relationship.companyName}
        siren={relationship.siren}
        stage={relationship.stage}
        nextActionAt={relationship.nextActionAt}
        nextActionNote={relationship.nextActionNote}
        company={{
          name: relationship.companyName,
          website: relationship.website,
          phone: relationship.phone,
          siren: relationship.siren,
        }}
        lang={lang}
      />

      <tabs.ClientTabs relationshipId={id} currentTab={tab} lang={lang} />

      {tab === 'informations' && (
        <>
          {/* Identity first: who they are, before what we think of them. */}
          <IdentityPanel
            relationshipId={id}
            identity={{
              legalName: relationship.legalName,
              addressLine: relationship.addressLine,
              postalCode: relationship.postalCode,
              city: relationship.city,
              legalForm: relationship.legalForm,
              nafCode: relationship.nafCode,
              nafSection: relationship.nafSection,
              headcountBand: relationship.headcountBand,
              foundedOn: relationship.foundedOn,
              registryState: relationship.registryState,
              registryStatus: relationship.registryStatus,
              registrySyncedAt: relationship.registrySyncedAt,
            }}
            siren={relationship.siren}
            lang={lang}
          />
          <RelationPanel
            relationshipId={id}
            leadSource={relationship.leadSource}
            description={relationship.description}
            lang={lang}
          />
        </>
      )}

      {tab === 'contacts' && (
        <section className="card">
          <SectionTitle>{t('clients.detail.section.contacts', lang)}</SectionTitle>
          <ContactList contacts={contacts ?? []} relationshipId={id} lang={lang} />
        </section>
      )}

      {tab === 'proposals' && (
        <section className="card" data-testid="proposals-section">
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
      )}

      {tab === 'activity' && (
        <section className="card">
          <SectionTitle>{t('clients.detail.tab.activity', lang)}</SectionTitle>
          <NoteComposer relationshipId={id} lang={lang} />
          <ActivityTimeline
            events={events ?? []}
            relationshipId={id}
            lang={lang}
            nowMs={nowMs}
          />
        </section>
      )}
    </div>
  );
}
