/**
 * Phase 13 — Step 1 (Paramètres du projet) wizard route.
 *
 * Server component. Implements the full draft mint / hydrate / self-heal /
 * duplicate-prefill lifecycle from 13-CONTEXT.md:
 *
 *   D-01  requireUser() first (defence in depth).
 *   D-02  No ?draft_id= → mint a draft + 302-redirect so URL is bookmarkable.
 *   D-03  Invalid / cross-user / soft-deleted / non-draft ?draft_id= →
 *         silent redirect to /proposals/new/parametres (no 404, no leak).
 *   D-07  partnerCo + partnerName session-hydrated from Better Auth
 *         (displayName ?? name ?? '' / companyName ?? ''); never visible
 *         inputs; written into draft.inputs at next updateDraft via the
 *         RHF prefill flowing through saveAsDraft / saveAndAdvance.
 *   D-08  validityDays resolved from getLatestGlobalParams (fallback 30);
 *         never a partner-facing input.
 *   D-09  No live-loyer preview is mounted (the v1.1 sticky 360px preview
 *         pane is retired; partners see the computed loyer on step 2 only).
 *   D-20  Stepper completedSteps read from draft.inputs._completedSteps.
 *   D-25  ?duplicate=<sourceId>: spread same-user, non-deleted source.inputs
 *         into the new draft via updateDraft; overlay session partnerName +
 *         partnerCo; redirect to ?draft_id=<new_id>&duplicate=1 so the
 *         <DuplicatePrefillToast> can fire client-side on first render.
 *   D-26  ?draft_id= wins over ?duplicate= when both are present.
 *   D-30  (Phase 30 Plan 09 / CRM-05) ?clientRelationshipId=<id> on the mint
 *         branch (no ?draft_id= present — D-26 means ?draft_id= always wins,
 *         so an existing draft is never re-linked): ownership-validated via
 *         getClientRelationshipForOwner(id, session.user.id). A null result
 *         (not found, not owned, or malformed — all three collapse to the
 *         same outcome) is handled identically to "no param at all": no
 *         error page, no notFound(), no toast — the wizard proceeds as an
 *         ordinary unlinked draft (T-30-09-01/05, CRM-02 non-leakage). A
 *         valid, owned id is threaded into createDraft's clientRelationshipId
 *         and prefills clientCo/clientSiren from the company plus
 *         clientName/clientRole/clientTel/clientEmail from the relationship's
 *         first contact (editable starting point, not a locked value — same
 *         "prefilled, edit if needed" contract as the D-25 duplicate flow).
 *
 * ADMIN-09 step-1 surface invariant (D-12 + threat T-13-03-I-ADMIN-09):
 * this page renders NO partner-only-visible parameter identifier anywhere.
 * The visibility relaxation lives ONLY on steps 2 and 3 (see plan 13-04).
 *
 * NOTE: This route's `requireUser()` + Phase 12 helpers' WHERE-userId
 * predicates implement the partner-security boundary. A cross-user
 * draft_id NEVER confirms or denies existence (T-13-03-S mitigation).
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { ProposalFormProvider } from '@/components/proposal/ProposalForm';
import { DuplicatePrefillToast } from '@/components/proposals/DuplicatePrefillToast';
import {
  createDraft,
  deleteEmptyDraftsByUser,
  getDraftById,
  updateDraft,
  getProposalById,
} from '@/lib/db/queries/proposals';
import { getLatestGlobalParams } from '@/lib/db/queries/global-params';
import {
  getClientRelationshipForOwner,
  listContactsForRelationship,
} from '@/lib/db/queries/client-relationships';
import { PageHero } from '@/components/ui/PageHero';
import { Stepper } from '@/components/ui/Stepper';
import type { ProposalInput } from '@/lib/calc';

import { WizardStep1Wiring } from './WizardStep1Wiring';

// PITFALLS §1.6 — every cookie/session-reading page opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nouvelle proposition — Leasétic Matrice',
};

interface PageProps {
  searchParams: Promise<{
    duplicate?: string;
    draft_id?: string;
    clientRelationshipId?: string;
  }>;
}

export default async function ParametresStep1Page({
  searchParams,
}: PageProps) {
  // D-01: auth FIRST (PITFALLS §7.3).
  const { session } = await requireUser();
  const lang = await getCurrentLang();
  const sp = await searchParams;

  // D-07: session-derived partner attribution. Never visible inputs; carried
  // verbatim into draft.inputs at next updateDraft (via the RHF prefill).
  // companyName is not a registered additionalField — fall back to
  // displayName → name → email so partnerCo always satisfies schema min(1).
  const u = session.user as {
    email: string;
    displayName?: string | null;
    name?: string | null;
    companyName?: string | null;
  };
  const nameFallback = u.displayName?.trim() || u.name?.trim() || u.email;
  const partnerName = nameFallback;
  const partnerCo = u.companyName?.trim() || nameFallback;

  // D-08: validityDays resolved server-side; fallback 30 if the admin
  // hasn't seeded global_params yet or has set a value outside the whitelist.
  const params = await getLatestGlobalParams();
  const rawValidity = params?.validityDays;
  const defaultValidityDays: 15 | 30 | 60 =
    rawValidity === 15 || rawValidity === 30 || rawValidity === 60
      ? rawValidity
      : 30;

  // ──────────────────────────────────────────────────────────────────────
  // D-26 win-rule: when no ?draft_id= is present we mint a draft. If a
  // ?duplicate= is ALSO present in that mint flow, we spread the source
  // proposal's inputs into the new draft (D-25). When ?draft_id= IS
  // present, ?duplicate= is silently ignored regardless of validity.
  // ──────────────────────────────────────────────────────────────────────
  if (!sp.draft_id) {
    // Remove phantom drafts (inputs={}) before minting so they don't
    // inflate the BROUILLONS metric on the partner home page.
    await deleteEmptyDraftsByUser(session.user.id);

    // D-30 (CRM-05): optional ?clientRelationshipId=. Ownership-validated;
    // a null result (not found, not owned, or malformed — all three
    // collapse identically per getClientRelationshipForOwner's own D-18
    // contract) degrades to an ordinary unlinked draft. Never a client-error
    // status, never a distinguishing signal to the caller (T-30-09-01).
    let validatedRelationshipId: string | undefined;
    let relationshipPrefill: Partial<ProposalInput> | undefined;
    if (sp.clientRelationshipId) {
      try {
        const relationship = await getClientRelationshipForOwner(
          sp.clientRelationshipId,
          session.user.id,
        );
        if (relationship) {
          validatedRelationshipId = relationship.relationshipId;
          const contacts = await listContactsForRelationship(
            relationship.relationshipId,
            session.user.id,
          );
          const firstContact = contacts[0];
          relationshipPrefill = {
            clientCo: relationship.companyName,
            ...(relationship.siren ? { clientSiren: relationship.siren } : {}),
            ...(firstContact
              ? {
                  clientName: firstContact.name,
                  ...(firstContact.role ? { clientRole: firstContact.role } : {}),
                  ...(firstContact.phone ? { clientTel: firstContact.phone } : {}),
                  ...(firstContact.email ? { clientEmail: firstContact.email } : {}),
                }
              : {}),
          };
        }
      } catch {
        // Malformed id (e.g. not a valid UUID, rejected by Postgres at the
        // query layer) — degrade identically to the not-owned/not-found
        // case: stays unlinked, no prefill, no error surfaced (T-30-09-05).
      }
    }

    // D-02: mint a fresh draft.
    const newDraft = await createDraft({
      userId: session.user.id,
      language: lang,
      clientRelationshipId: validatedRelationshipId,
    });

    // D-30: prefill the freshly-minted draft from the validated relationship.
    // These are editable starting points, not locked values (same contract
    // as the D-25 duplicate prefill below) — the partner can change anything
    // before finalizing.
    if (relationshipPrefill) {
      await updateDraft(newDraft.id, session.user.id, {
        inputs: {
          ...relationshipPrefill,
          // Session-derived attribution always wins — never trust a stored
          // or prefilled value for these two fields (D-07 discipline).
          partnerName,
          partnerCo,
          validityDays: defaultValidityDays,
        },
      });
    }

    // D-25: optional same-user duplicate prefill.
    if (sp.duplicate) {
      const source = await getProposalById(sp.duplicate);
      if (source && source.userId === session.user.id && !source.deletedAt) {
        const sourceInputs = source.inputs as Partial<ProposalInput>;
        await updateDraft(newDraft.id, session.user.id, {
          inputs: {
            ...sourceInputs,
            // D-25 overlay — never carry the source row's cached partner
            // attribution. Session is authoritative.
            partnerName,
            partnerCo,
            validityDays: defaultValidityDays,
          },
        });
      }
      // Cross-user / soft-deleted / missing source: silent skip — D-7-13
      // carry-over discipline. Never confirm cross-user existence.
    }

    const dupFlag = sp.duplicate ? '&duplicate=1' : '';
    redirect(`/proposals/new/parametres?draft_id=${newDraft.id}${dupFlag}`);
  }

  // D-03: resume existing draft or self-heal redirect.
  const draft = await getDraftById(sp.draft_id, session.user.id);
  if (!draft) {
    // Cross-user, missing, non-draft (active/deleted), or soft-deleted —
    // never confirm; never 404. Just mint a fresh draft via D-02.
    redirect('/proposals/new/parametres');
  }
  // Defensive: getDraftById already predicates on status='draft', but if a
  // non-draft row was somehow returned (e.g., a future helper change), reroute.
  if (draft.status !== 'draft' || draft.deletedAt) {
    redirect('/proposals/new/parametres');
  }

  // Hydrate the RHF prefill from the draft's inputs jsonb. partnerName +
  // partnerCo + validityDays are session-/params-resolved, NEVER read from
  // the draft (D-07 + D-08 lock — even if a stale value exists in inputs,
  // we overwrite with the canonical session/server value).
  const inputs = draft.inputs as Record<string, unknown>;
  const completedSteps =
    ((inputs._completedSteps as number[] | undefined) ?? []) as number[];

  // Build the RHF prefill. Partial<ProposalInput> tolerates missing fields;
  // the resolver enforces required fields on blur per D-10.
  const prefill: Partial<ProposalInput> = {
    // 7 default fields (D-05)
    clientCo: (inputs.clientCo as string | undefined) ?? '',
    clientName: (inputs.clientName as string | undefined) ?? '',
    clientEmail: (inputs.clientEmail as string | undefined) ?? '',
    clientTel: (inputs.clientTel as string | undefined) ?? '',
    partnerRef: (inputs.partnerRef as string | undefined) ?? '',
    amountHT: (inputs.amountHT as string | undefined) ?? '',
    durationMonths: inputs.durationMonths as 36 | 48 | 60 | undefined,
    // 5 accordion fields (D-06)
    clientRole: (inputs.clientRole as string | undefined) ?? '',
    clientSiren: (inputs.clientSiren as string | undefined) ?? '',
    projectDesc: (inputs.projectDesc as string | undefined) ?? '',
    slb: inputs.slb as boolean | undefined,
    evalParc: inputs.evalParc as boolean | undefined,
    // Session-hydrated / server-resolved (NEVER user-editable)
    partnerName,
    partnerCo,
    validityDays: defaultValidityDays,
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '32px 0' }}>
      {/* D-25 toast — fires once on first client render when the URL has
          ?duplicate= and strips the flag itself. */}
      {sp.duplicate && <DuplicatePrefillToast lang={lang} />}

      {/* Phase 17 WIZ-01 (D-15 + D-19): PageHero adopter. Replaces the
          previous inline heading block (title + subtitle). Stepper remains
          a sibling BELOW PageHero (NOT composed inside) per D-19; PageHero
          bakes marginBottom: 32 so the Stepper inherits proper spacing
          automatically. */}
      <PageHero
        eyebrow={t('wizard.step1.eyebrow', lang)}
        title={t('wizard.step1.title', lang)}
        subtitle={t('wizard.step1.subtitle', lang)}
      />

      {/* Stepper at the top — D-20: completedSteps from draft.inputs. */}
      <div>
        <Stepper
          currentStep={1}
          completedSteps={completedSteps}
          lang={lang}
          hrefForStep={(n) =>
            `/proposals/new/${['parametres', 'calcul', 'verification'][n - 1]}?draft_id=${draft.id}`
          }
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <ProposalFormProvider prefill={prefill}>
          <WizardStep1Wiring
            draftId={draft.id}
            lang={lang}
          />
        </ProposalFormProvider>
      </div>
    </div>
  );
}
