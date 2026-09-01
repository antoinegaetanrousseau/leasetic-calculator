import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { FileTextIcon, MailIcon, PhoneIcon, UsersIcon } from '@/components/ui/icons';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { ProposalRow } from '@/components/proposals/ProposalRow';
import type { ProposalRowDto } from '@/lib/api/proposals/list';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import {
  getRelationshipForAdmin,
  listContactsForRelationshipAdmin,
  listProposalsForRelationshipAdmin,
} from '@/lib/db/queries';

// PITFALLS §1.6 — cookie/session-reading route opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Relation — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string; id: string; relationshipId: string }>;
}

/**
 * `/[adminSegment]/companies/[id]/relations/[relationshipId]` — Phase 30
 * Plan 08 Task 3 (CRM-03).
 *
 * The admin-only relationship detail behind the company detail's "Voir →"
 * link: the same Contacts/Propositions two-card composition as the
 * partner-facing `/clients/[id]` page (30-07), but gated by `requireAdmin()`
 * instead of the `relationship.ownerId` check, with the holder's name and
 * owner-type badge added to the header. Deliberately does NOT import from
 * the sibling partner-facing client-detail route tree — the two trees are
 * separate surfaces on purpose; sharing a component here would invite a
 * role branch, which is exactly the failure mode T-30-08-03 mitigates.
 *
 * Order of operations is the security boundary, not a style preference:
 *   1. requireAdmin() — FIRST, before any data access (AUTH-15/PITFALLS §7.3).
 *      Non-admins get notFound(), never a client-error status that would
 *      confirm existence (D-18).
 *   2. getRelationshipForAdmin(relationshipId) -> null => notFound().
 *   3. relationship.companyId !== the `[id]` URL segment => notFound()
 *      (T-30-08-04) — a crafted mismatched company/relationship pair cannot
 *      render one company's header over another company's relationship.
 *   4. ONLY THEN are contacts and proposals fetched.
 *
 * Contacts render read-only — no add/edit/delete control is rendered here;
 * contact mutation stays exclusively on the owner's own `/clients/[id]`
 * surface (T-30-08-06).
 */
export default async function AdminRelationshipDetailPage({ params }: PageProps) {
  const { id, relationshipId } = await params;
  await requireAdmin(); // FIRST — auth before any data access

  const relationship = await getRelationshipForAdmin(relationshipId);

  // D-18 obscurity + T-30-08-04: nonexistent id AND a mismatched
  // company/relationship pair both collapse to the same notFound() branch.
  if (!relationship || relationship.companyId !== id) {
    notFound();
  }

  const lang = await getCurrentLang();

  const [contacts, proposals] = await Promise.all([
    listContactsForRelationshipAdmin(relationshipId),
    listProposalsForRelationshipAdmin(relationshipId),
  ]);

  // Adapter onto ProposalRowDto so ProposalRow is reused verbatim — same
  // shape/reasoning as the partner-facing page.tsx (30-07): the admin query
  // layer's row is deliberately narrower than the full DB row for ADMIN-09
  // (no params_snapshot ever selected at all), so amountHT carries the
  // already-projected client-facing monthly scalar and displayStatus has no
  // expiry derivation (a documented, bounded cosmetic gap, not a query
  // widening).
  const proposalRows: ProposalRowDto[] = proposals.map((p) => ({
    id: p.id,
    lcRef: p.lcRef ?? '',
    clientCo: relationship.companyName,
    amountHT: p.computedClientMonthly != null ? String(p.computedClientMonthly) : '0',
    createdAt: p.createdAt.toISOString(),
    validityDays: 30,
    language: p.language,
    deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
    displayStatus: p.status,
  }));

  return (
    <div className="max-w-[720px]">
      {/* Header — company name, holder's display name, owner-type badge. */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold">{relationship.companyName}</h1>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[14.5px] text-muted-foreground">
            {relationship.ownerDisplayName}
          </span>
          <Badge
            variant="secondary"
            className="rounded-full border-transparent bg-border text-[11.5px] font-semibold tracking-[0.02em] text-ink shadow-none"
          >
            {relationship.isInternal
              ? t('admin.companies.relation.type.sales', lang)
              : t('admin.companies.relation.type.partner', lang)}
          </Badge>
        </div>
      </div>

      {/* Section 1 — Contacts, read-only. No add/edit/delete affordance. */}
      <section className="card mb-4">
        <SectionTitle>{t('clients.detail.section.contacts', lang)}</SectionTitle>
        {contacts.length === 0 ? (
          <Empty className="px-5 py-10">
            <EmptyMedia variant="icon">
              <UsersIcon size={20} aria-hidden="true" />
            </EmptyMedia>
            <EmptyDescription className="text-[14.5px]">
              {t('clients.detail.empty.contacts.title', lang)}
            </EmptyDescription>
          </Empty>
        ) : (
          <div className="flex flex-col">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="border-b border-border py-3 last:border-b-0"
              >
                <div className="text-[14.5px] font-semibold">{contact.name}</div>
                {contact.role && (
                  <div className="text-[13px] text-muted-foreground">{contact.role}</div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <PhoneIcon size={14} aria-hidden="true" />
                    {contact.phone}
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <MailIcon size={14} aria-hidden="true" />
                    {contact.email}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2 — Propositions, ProposalRow reused verbatim. */}
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
          </Empty>
        ) : (
          <div className="flex flex-col">
            {proposalRows.map((row) => (
              <ProposalRow key={row.id} row={row} lang={lang} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
