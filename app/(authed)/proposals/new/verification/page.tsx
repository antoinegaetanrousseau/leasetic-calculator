/**
 * Phase 13 — Step 3 (Vérifier la proposition) wizard route.
 *
 * Server component. Terminal page of the 3-step wizard. The partner reviews
 * everything in a 2-column layout (3 RecapSection cards left + PdfPreviewMock
 * right), clicks Confirmer & Générer le PDF, and the D-16 8-step pipeline
 * fires via /api/proposals/finalize (plan 13-02 owns the route handler).
 *
 *   1. D-01 requireUser() FIRST.
 *   2. D-03 silent self-heal — missing / cross-user / soft-deleted / non-draft
 *      ?draft_id= → redirect to /proposals/new/parametres. UNLIKE step 2,
 *      step 3 ALSO redirects when proposalInputSchema.safeParse fails (UI-SPEC
 *      §10.3 — no visual fallback on the review surface; bounce to step 1
 *      where the partner can finish entering data). Same disposition for
 *      missing global_params (computeLoyer can't run → bounce).
 *   3. Server-side compute via computeLoyer + getLatestGlobalParams.
 *   4. Renders (UI-SPEC §5.7):
 *        - title + subtitle + Stepper(currentStep=3)
 *        - 2-column grid (1040px outer, minmax(0, 1fr) 360px columns, gap 24px)
 *          - Left column: 3 RecapSection cards (CLIENT / PROJET / CALCUL)
 *            with their respective ← Modifier links
 *          - Right column: PdfPreviewMock (D-15 — literal LC-2026-XXX, no
 *            real PDF blob, no lc_ref allocated until Confirmer click)
 *        - WizardActionBar (full 1040px width, OUTSIDE the 2-column grid),
 *          rendered via FinalizeButton — wires the Confirmer CTA to POST
 *          /api/proposals/finalize (D-24 spinner UX owned by FinalizeButton).
 *
 * ADMIN-09 enforcement (D-12 partial relaxation):
 * The partner-only-visible parameter amount is rendered EXACTLY ONCE inside
 * the ● CALCUL RecapSection's commission row (with the `(non visible client)`
 * sub-line clarifying it will not appear in the client-facing PDF). It does
 * NOT appear in: the PdfPreviewMock (no commission prop per plan 13-01 §5.3),
 * the ● CLIENT or ● PROJET recap cards, any hidden input, any data-*
 * attribute, page metadata, server logs, or pre-finalize traces. Plan 13-06
 * ships the formal STRIDE addendum (D-28) documenting this single carve-out.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { formatCurrency } from '@/lib/i18n/format';
import { getDraftById } from '@/lib/db/queries/proposals';
import { getLatestGlobalParams } from '@/lib/db/queries/global-params';
import {
  computeLoyer,
  parseNumeric,
  proposalInputSchema,
} from '@/lib/calc';
import { Stepper } from '@/components/ui/Stepper';

import { PdfPreviewMock } from '../_components/PdfPreviewMock';
import { RecapSection } from '../_components/RecapSection';
import { saveAsDraftAction } from '../_actions/saveAsDraft.action';

import { FinalizeButton } from './FinalizeButton';

// PITFALLS §1.6 — every cookie/session-reading page opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Vérifier la proposition — Leasétic Matrice',
};

interface PageProps {
  searchParams: Promise<{ draft_id?: string }>;
}

// trancheKey 't1'..'t4' → integer chip suffix (1..4).
const TRANCHE_NUMBER: Record<'t1' | 't2' | 't3' | 't4', 1 | 2 | 3 | 4> = {
  t1: 1,
  t2: 2,
  t3: 3,
  t4: 4,
};

export default async function VerificationStep3Page({ searchParams }: PageProps) {
  // D-01: auth FIRST (PITFALLS §7.3).
  const { session } = await requireUser();
  const lang = await getCurrentLang();
  const sp = await searchParams;

  // D-03 silent self-heal — no ?draft_id= → redirect to step 1.
  if (!sp.draft_id) {
    redirect('/proposals/new/parametres');
  }

  // D-03 silent self-heal — invalid / cross-user / soft-deleted / non-draft.
  const draft = await getDraftById(sp.draft_id, session.user.id);
  if (!draft) {
    redirect('/proposals/new/parametres');
  }
  if (draft.status !== 'draft' || draft.deletedAt) {
    redirect('/proposals/new/parametres');
  }

  // UI-SPEC §10.3: step 3 redirects on incomplete inputs BEFORE render. The
  // review surface only makes sense when there's a complete proposal to
  // review; otherwise bounce to step 1 so the partner can finish.
  const inputs = draft.inputs as Record<string, unknown>;
  const parsed = proposalInputSchema.safeParse(inputs);
  if (!parsed.success) {
    redirect('/proposals/new/parametres');
  }

  // Same disposition when no global_params seeded: computeLoyer can't run
  // without a coefficient table, and a "review" with missing numbers is
  // meaningless. Bounce to step 1.
  const params = await getLatestGlobalParams();
  if (!params) {
    redirect('/proposals/new/parametres');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Server-side compute. Same call site as plan 13-04 step-2's calcul page.
  // ──────────────────────────────────────────────────────────────────────────
  const parsedData = parsed.data;
  const result = computeLoyer({
    amountHT: parsedData.amountHT,
    durationMonths: parsedData.durationMonths,
    validityDays: parsedData.validityDays,
    coefficients: params.coefficients,
    commissionPct: parseNumeric(params.commissionPct),
    maxAmount: parseNumeric(params.maxAmount),
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Display strings.
  // ──────────────────────────────────────────────────────────────────────────
  const amountHTNumber = parseNumeric(parsedData.amountHT);
  const amountHTDisplay = formatCurrency(amountHTNumber, lang);

  // D-12: commission = amountHT × commissionPct / 100. Same formula + same
  // params snapshot computeLoyer consumes internally (formula.ts:114-121).
  // No drift risk — both values flow from the SAME getLatestGlobalParams call.
  const commissionPctNumber = parseNumeric(params.commissionPct);
  const commissionAmount = (amountHTNumber * commissionPctNumber) / 100;
  const commissionDisplay = formatCurrency(commissionAmount, lang);

  // Loyer + coefficient — only meaningful when state==='computed'. The
  // 'on-demand' branch falls back to a localized "Sur demande" placeholder
  // in the PdfPreviewMock; missing/idle would have been bounced upstream.
  const isComputed = result.computed.state === 'computed';
  const loyerHTNumber = isComputed
    ? parseNumeric((result.computed as { loyerHT: string }).loyerHT)
    : 0;
  const loyerDisplay = isComputed
    ? formatCurrency(loyerHTNumber, lang)
    : t('result.sur.demande', lang);
  const coefficientNumber = isComputed
    ? parseNumeric((result.computed as { coeff: string }).coeff)
    : 0;
  const coefficientDisplay = isComputed
    ? `${coefficientNumber.toFixed(2)}%`
    : '—';

  // Tranche chip + label — keyed by trancheKey from computed/on-demand state.
  const trancheKey =
    result.computed.state === 'computed' ||
    result.computed.state === 'on-demand'
      ? (result.computed as { trancheKey: 't1' | 't2' | 't3' | 't4' | null })
          .trancheKey
      : null;
  const trancheNumber = trancheKey ? TRANCHE_NUMBER[trancheKey] : null;

  // Completed-steps for the Stepper. The partner reached step 3 by advancing
  // through 1 then 2; read from the persisted bookkeeping field (D-20).
  // Fallback to [1, 2] for forward-nav defensiveness. D-22 navigate-preserves-
  // state — we do not mutate this on a GET.
  const completedStepsFromDraft =
    (inputs._completedSteps as number[] | undefined) ?? [];
  const completedSteps =
    completedStepsFromDraft.length > 0 ? completedStepsFromDraft : [1, 2];

  // ──────────────────────────────────────────────────────────────────────────
  // RecapSection row builders.
  // ──────────────────────────────────────────────────────────────────────────
  // ● CLIENT — D-25 hide-when-empty for the accordion fields (clientRole +
  // clientSiren) per UI-SPEC §16 recommendation.
  const clientRows: Array<{ label: string; value: string }> = [
    { label: 'Nom du client', value: parsedData.clientCo },
  ];
  if (parsedData.clientName) {
    clientRows.push({ label: 'Personne de contact', value: parsedData.clientName });
  }
  if (parsedData.clientEmail) {
    clientRows.push({ label: 'Email', value: parsedData.clientEmail });
  }
  if (parsedData.clientTel) {
    clientRows.push({ label: 'Téléphone', value: parsedData.clientTel });
  }
  if (parsedData.clientRole) {
    clientRows.push({ label: 'Qualité / Fonction', value: parsedData.clientRole });
  }
  if (parsedData.clientSiren) {
    clientRows.push({ label: 'SIREN', value: parsedData.clientSiren });
  }

  // ● PROJET
  const projetRows: Array<{ label: string; value: string }> = [];
  if (parsedData.partnerRef) {
    projetRows.push({ label: 'Référence du projet', value: parsedData.partnerRef });
  }
  projetRows.push({ label: 'Montant HT', value: amountHTDisplay });
  projetRows.push({
    label: 'Durée',
    value: `${parsedData.durationMonths} mois`,
  });
  if (parsedData.projectDesc) {
    projetRows.push({
      label: 'Descriptif du projet',
      value: parsedData.projectDesc,
    });
  }

  // ● CALCUL — row 2 (commission) is the D-12 ADMIN-09 partial-relaxation
  // surface for step 3. SAFETY NOTE: this is the SOLE site in the page where
  // the commission amount appears. The PdfPreviewMock has no commission prop;
  // the ● CLIENT and ● PROJET recap arrays do not include commission rows.
  const calculRows = [
    { label: 'Coefficient appliqué', value: coefficientDisplay },
    {
      label: 'Tranche',
      value: trancheNumber !== null ? String(trancheNumber) : '—',
    },
    {
      // D-12: ADMIN-09 partial relaxation — partner-facing step-3 review
      // surface. The eventual PDF (plan 13-02 finalize-wizard) excludes
      // commission from the persisted computed jsonb and the rendered PDF.
      // Plan 13-06's golden-PDF test enforces this cross-surface invariant.
      label: t('wizard.step2.row.commission', lang),
      value: commissionDisplay,
    },
  ];

  // Bound server action for the Save ghost button. Inline 'use server' arrow
  // captures draft.id + inputs from server scope; mirrors plan 13-04's idiom.
  const onSaveDraft = async () => {
    'use server';
    await saveAsDraftAction(draft.id, inputs);
  };

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 0' }}>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        {t('wizard.step3.title', lang)}
      </h1>
      <p
        style={{
          fontSize: 16,
          color: 'var(--muted)',
          marginTop: 8,
        }}
      >
        {t('wizard.step3.subtitle', lang)}
      </p>

      {/* D-20: Stepper currentStep=3 with completedSteps from the draft. */}
      <div style={{ marginTop: 24 }}>
        <Stepper
          currentStep={3}
          completedSteps={completedSteps}
          lang={lang}
          hrefForStep={(n) =>
            `/proposals/new/${['parametres', 'calcul', 'verification'][n - 1]}?draft_id=${draft.id}`
          }
        />
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          2-column grid (UI-SPEC §5.7).
          - Left column (minmax(0, 1fr)): 3 RecapSection cards.
          - Right column (360px fixed): PdfPreviewMock.
      ──────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 24,
          alignItems: 'start',
          marginTop: 16,
        }}
      >
        <div>
          {/* ● CLIENT — links back to step 1 (D-23) */}
          <RecapSection
            sectionTitle={t('wizard.section.client', lang)}
            modifierLink={{
              href: `/proposals/new/parametres?draft_id=${draft.id}`,
              label: 'Modifier',
            }}
            rows={clientRows}
          />

          {/* ● PROJET — links back to step 1 (D-23) */}
          <RecapSection
            sectionTitle={t('wizard.section.projet', lang)}
            modifierLink={{
              href: `/proposals/new/parametres?draft_id=${draft.id}`,
              label: 'Modifier',
            }}
            rows={projetRows}
          />

          {/* ● CALCUL — links back to step 2 (D-23). Row 2 carries the
              commission amount per D-12 (the ONLY commission disclosure
              site on this page). */}
          <RecapSection
            sectionTitle={t('wizard.section.calcul', lang)}
            modifierLink={{
              href: `/proposals/new/calcul?draft_id=${draft.id}`,
              label: 'Modifier',
            }}
            rows={calculRows}
            rowSublabels={{
              // D-12: partner-facing parenthetical clarifying that the row's
              // value will NOT appear in the client-facing PDF.
              2: t('wizard.step2.row.commission.sublabel', lang),
            }}
          />
        </div>

        <div>
          {/* D-15: PdfPreviewMock — CSS-only mock. Literal LC-2026-XXX (sourced
              from the wizard.step3.pdf.ref.line dictionary entry, not hardcoded
              in JSX). NO commission prop — ADMIN-09 invariant enforced
              structurally by the component signature (plan 13-01 §5.3). */}
          <PdfPreviewMock
            loyerDisplay={loyerDisplay}
            validityDays={params.validityDays as 15 | 30 | 60}
            lang={lang}
          />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          FinalizeButton — WizardActionBar at the bottom, full 1040px width,
          OUTSIDE the 2-column grid. Wires the Confirmer CTA to POST
          /api/proposals/finalize (D-16/D-24 owned by FinalizeButton).
      ──────────────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <FinalizeButton
          draftId={draft.id}
          onSaveDraft={onSaveDraft}
          lang={lang}
        />
      </div>
    </div>
  );
}
