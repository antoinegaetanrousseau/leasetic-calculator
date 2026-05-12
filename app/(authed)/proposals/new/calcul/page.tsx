/**
 * Phase 13 — Step 2 (Résultat du calcul) wizard route.
 *
 * Server component. Pure read-only result page that:
 *
 *   1. requireUser() FIRST (D-01).
 *   2. D-03 silent self-heal — missing / cross-user / soft-deleted / non-draft
 *      ?draft_id= → redirect to /proposals/new/parametres (never 404, never
 *      leaks existence).
 *   3. Reads latest global_params for fresh coefficient table (D-08 parity).
 *   4. Runs proposalInputSchema.safeParse on draft.inputs — if fail, renders
 *      the incomplete-inputs soft-error fallback (UI-SPEC §10.2 + §5.6).
 *   5. Invokes computeLoyer server-side with the snapshot + draft inputs.
 *   6. Renders, in canonical D-11 vertical order:
 *      - Title + subtitle
 *      - Stepper (currentStep=2)
 *      - Hero card (LOYER MENSUEL label + large green value + sublabel +
 *        absolute-positioned tranche chip top-right)
 *      - "Détail du calcul" RecapSection — 5 rows. Row 1 = Montant HT;
 *        row 2 = Commission apporteur with `(non visible client)` sub-line
 *        (D-12 partial relaxation, ADMIN-09 carve-out for this surface only);
 *        row 3 = Coefficient appliqué (tranche {N}K€); row 4 = Durée;
 *        row 5 = Loyer mensuel calculé (emphasised in --gd weight 600).
 *      - "Paramètres saisis" RecapSection with ← Modifier link → /parametres
 *      - WizardActionBar (← Précédent + Save + Continuer vers la vérification →)
 *
 * D-11 invariant: step 2 has ZERO interactive form inputs. The WizardActionBar
 * is the only interactive surface (← Précédent link, Save ghost button,
 * Continuer link). All result content is read-only HTML.
 *
 * ADMIN-09 enforcement (D-12 partial relaxation):
 * The partner-only-visible parameter amount is rendered EXACTLY ONCE inside
 * the Détail du calcul recap card's row 2 (`(non visible client)` sub-line
 * clarifies it is invisible in the client-facing PDF). The amount does NOT
 * appear in: the Paramètres saisis recap (which mirrors step-1 inputs, none
 * of which include this parameter), any hidden input, any data-* attribute,
 * any server log, or any pre-finalize trace. Plan 13-06's golden-PDF test
 * verifies the rendered PDF still contains no occurrence. Plan 13-06 also
 * ships the D-28 STRIDE addendum documenting this single carve-out against
 * Phase 9's 97-threat closure.
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
  type ProposalInput,
} from '@/lib/calc';
import { Stepper } from '@/components/ui/Stepper';

import { RecapSection } from '../_components/RecapSection';
import { WizardActionBar } from '../_components/WizardActionBar';
import { saveAsDraftAction } from '../_actions/saveAsDraft.action';

// PITFALLS §1.6 — every cookie/session-reading page opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Résultat du calcul — Leasétic Matrice',
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

// trancheKey → upper bound in K€ for the row-label "(tranche {N}K€)" suffix.
// Source: src/lib/calc/tranche.ts thresholds.
const TRANCHE_UPPER_K: Record<'t1' | 't2' | 't3' | 't4', number> = {
  t1: 50,
  t2: 100,
  t3: 250,
  t4: 500, // t4 is the "and above" bucket; the displayed cap is the maxAmount.
};

export default async function CalculStep2Page({ searchParams }: PageProps) {
  // D-01: auth FIRST (PITFALLS §7.3).
  const { session } = await requireUser();
  const lang = await getCurrentLang();
  const sp = await searchParams;

  // D-03 silent self-heal — no ?draft_id= → redirect to step 1.
  if (!sp.draft_id) {
    redirect('/proposals/new/parametres');
  }

  // D-03 silent self-heal — invalid / cross-user / soft-deleted / non-draft
  // ?draft_id= → redirect to step 1. getDraftById's WHERE predicates on
  // (id, userId, status='draft') so cross-user and finalised drafts both
  // resolve to null without leaking existence (T-13-04-S mitigation).
  const draft = await getDraftById(sp.draft_id, session.user.id);
  if (!draft) {
    redirect('/proposals/new/parametres');
  }
  // Defensive: getDraftById already gates on status='draft' and not deletedAt,
  // but if a non-draft was somehow returned (future helper change), reroute.
  if (draft.status !== 'draft' || draft.deletedAt) {
    redirect('/proposals/new/parametres');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Server-side compute path. The result.state machine drives which JSX
  // variant of the hero card and the WizardActionBar primary CTA we render.
  // ──────────────────────────────────────────────────────────────────────────
  const params = await getLatestGlobalParams();
  const inputs = draft.inputs as Record<string, unknown>;
  const parsed = proposalInputSchema.safeParse(inputs);

  // Variant flags — exactly one of these (or a successful compute) renders
  // the hero card variant.
  const inputsIncomplete = !parsed.success;
  const paramsMissing = params === null;

  // Run computeLoyer only when inputs validate AND global params are seeded.
  let result: ReturnType<typeof computeLoyer> | null = null;
  let parsedData: ProposalInput | null = null;
  if (parsed.success && params) {
    parsedData = parsed.data;
    result = computeLoyer({
      amountHT: parsedData.amountHT,
      durationMonths: parsedData.durationMonths,
      validityDays: parsedData.validityDays,
      coefficients: params.coefficients,
      commissionPct: parseNumeric(params.commissionPct),
      maxAmount: parseNumeric(params.maxAmount),
    });
  }

  // Display strings — only meaningful when result.computed.state === 'computed'.
  // Use formatCurrency for locale-explicit EUR rendering (D-28).
  const amountHTNumber = parsedData ? parseNumeric(parsedData.amountHT) : 0;
  const amountHTDisplay = parsedData ? formatCurrency(amountHTNumber, lang) : '—';

  // D-12: the partner-only-visible amount = amountHT × commissionPct / 100.
  // Computed from the SAME global_params snapshot the computeLoyer call uses
  // — keeps the displayed value consistent with the underlying loyer math.
  const commissionPctNumber = params ? parseNumeric(params.commissionPct) : 0;
  const commissionAmount = parsedData
    ? (amountHTNumber * commissionPctNumber) / 100
    : 0;
  const commissionDisplay = parsedData
    ? formatCurrency(commissionAmount, lang)
    : '—';

  // Loyer + coefficient — only when state === 'computed'.
  const isComputed = result?.computed.state === 'computed';
  const loyerHTNumber = isComputed
    ? parseNumeric(
        (result!.computed as { loyerHT: string }).loyerHT,
      )
    : 0;
  const loyerDisplay = isComputed ? formatCurrency(loyerHTNumber, lang) : '—';
  const coefficientNumber = isComputed
    ? parseNumeric((result!.computed as { coeff: string }).coeff)
    : 0;
  const coefficientDisplay = isComputed
    ? `${coefficientNumber.toFixed(2)}%`
    : '—';

  // Tranche chip + Détail-row tranche labels — keyed by trancheKey from
  // either 'computed' or 'on-demand' / 'missing' (each carries a trancheKey).
  const trancheKey =
    result?.computed.state === 'computed' ||
    result?.computed.state === 'on-demand' ||
    result?.computed.state === 'missing'
      ? (result.computed as { trancheKey: 't1' | 't2' | 't3' | 't4' | null })
          .trancheKey
      : null;
  const trancheNumber = trancheKey ? TRANCHE_NUMBER[trancheKey] : null;
  const trancheUpperK = trancheKey ? TRANCHE_UPPER_K[trancheKey] : null;

  // Completed-steps for the Stepper. The partner reached step 2 by advancing
  // through step 1 (saveAndAdvanceAction marks step 1 complete); read from
  // the persisted bookkeeping field (D-20). Fallback to [1] for forward-nav
  // cases — the visual must still show step 1 done. D-22 navigate-preserves-
  // state means we do not mutate this on a GET.
  const completedStepsFromDraft =
    (inputs._completedSteps as number[] | undefined) ?? [];
  const completedSteps =
    completedStepsFromDraft.length > 0 ? completedStepsFromDraft : [1];

  // ──────────────────────────────────────────────────────────────────────────
  // Détail du calcul rows. Row 2 IS the D-12 partial-relaxation row — the
  // partner-only-visible amount is rendered into the value slot with the
  // (non visible client) sub-line drawing from rowSublabels prop.
  //
  // SAFETY NOTE: this is the SOLE site in the page where the
  // commission amount appears. No other row, no hidden input, no metadata,
  // no data-* attribute carries the value. Plan 13-06 audits the full
  // STRIDE picture in the addendum (D-28).
  // ──────────────────────────────────────────────────────────────────────────
  const detailRows = [
    {
      label: t('wizard.step2.row.amount', lang),
      value: amountHTDisplay,
    },
    {
      // D-12: ADMIN-09 partial relaxation — partner-facing step-2 surface only.
      // PDF render path / audit_log / server logs / pre-finalize traces all
      // remain commission-free. Plan 13-06 ships the STRIDE addendum (D-28).
      label: t('wizard.step2.row.commission', lang),
      value: commissionDisplay,
    },
    {
      label: t('wizard.step2.row.coefficient', lang).replace(
        '{0}',
        trancheUpperK !== null ? String(trancheUpperK) : '—',
      ),
      value: coefficientDisplay,
    },
    {
      label: t('wizard.step2.row.duration', lang),
      value: parsedData ? `${parsedData.durationMonths} mois` : '—',
    },
    {
      label: t('wizard.step2.row.loyer.calculated', lang),
      value: (
        <strong style={{ color: 'var(--gd)', fontWeight: 600 }}>
          {loyerDisplay}
        </strong>
      ),
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // Paramètres saisis recap — mirrors step-1 fields. NEVER includes the
  // commission row. (ADMIN-09 invariant for the recap surface.)
  // ──────────────────────────────────────────────────────────────────────────
  const recapRows = parsedData
    ? [
        { label: 'Nom du client', value: parsedData.clientCo },
        {
          label: 'Personne de contact',
          value: parsedData.clientName ?? '—',
        },
        { label: 'Email', value: parsedData.clientEmail ?? '—' },
        { label: 'Téléphone', value: parsedData.clientTel ?? '—' },
        { label: 'Référence du projet', value: parsedData.partnerRef ?? '—' },
        { label: 'Montant HT', value: amountHTDisplay },
        { label: 'Durée', value: `${parsedData.durationMonths} mois` },
      ]
    : [];

  // ──────────────────────────────────────────────────────────────────────────
  // WizardActionBar primary CTA. Replaced with ← Retour à l'étape 1 when:
  //   - inputs incomplete (validation fail), OR
  //   - global params missing (admin hasn't seeded — same as 'missing' UX), OR
  //   - computed state is 'missing' (out-of-range tranche, soft error).
  // Otherwise: Continuer vers la vérification → /verification.
  // ──────────────────────────────────────────────────────────────────────────
  const blockedFromAdvance =
    inputsIncomplete ||
    paramsMissing ||
    result?.computed.state === 'missing' ||
    result?.computed.state === 'idle';

  const primary = blockedFromAdvance
    ? ({
        kind: 'link' as const,
        href: `/proposals/new/parametres?draft_id=${draft.id}`,
        label: '← Retour à l’étape 1',
      } as const)
    : ({
        kind: 'link' as const,
        href: `/proposals/new/verification?draft_id=${draft.id}`,
        label: t('wizard.action.step2.continue', lang),
      } as const);

  // Bound server action for the Save ghost button. The WizardActionBar is a
  // 'use client' component; passing this inline 'use server' arrow makes it
  // a server-action reference per Next 15 RSC.
  const onSaveDraft = async () => {
    'use server';
    await saveAsDraftAction(draft.id, inputs);
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '32px 0' }}>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        {t('wizard.step2.title', lang)}
      </h1>
      <p
        style={{
          fontSize: 16,
          color: 'var(--muted)',
          marginTop: 8,
        }}
      >
        {t('wizard.step2.subtitle', lang)}
      </p>

      {/* D-20: Stepper currentStep=2 with completedSteps from the draft. */}
      <div style={{ marginTop: 24 }}>
        <Stepper
          currentStep={2}
          completedSteps={completedSteps}
          lang={lang}
          hrefForStep={(n) =>
            `/proposals/new/${['parametres', 'calcul', 'verification'][n - 1]}?draft_id=${draft.id}`
          }
        />
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          Hero loyer card (UI-SPEC §5.6).
          - state='computed': big loyer value + sublabel + tranche chip
          - state='on-demand': "Sur demande" at hero scale, chip hidden
          - state='missing': "Coefficients manquants pour cette tranche" at
            heading scale (per UI-SPEC §5.6 non-blocking recommendation)
          - inputsIncomplete or paramsMissing: error msg + ← Retour CTA
      ──────────────────────────────────────────────────────────────────── */}
      <section
        className="card"
        style={{ position: 'relative', marginTop: 16 }}
      >
        <div className="ctitle" style={{ marginBottom: 8 }}>
          <span>{t('wizard.step2.hero.label', lang)}</span>
        </div>

        {inputsIncomplete || paramsMissing ? (
          <div
            role="alert"
            className="error-msg"
            style={{
              fontSize: 14.5,
              color: 'var(--danger)',
              fontWeight: 500,
              marginTop: 8,
            }}
          >
            {t('wizard.step2.error.incomplete', lang)}
          </div>
        ) : result?.computed.state === 'computed' ? (
          <>
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                color: 'var(--gd)',
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {loyerDisplay}
            </div>
            <div
              style={{
                fontSize: 14.5,
                color: 'var(--muted)',
                marginTop: 8,
              }}
            >
              {t('wizard.step2.hero.sub', lang).replace(
                '{0}',
                String(parsedData!.durationMonths),
              )}
            </div>
            {trancheNumber !== null && (
              <div
                className="chip-language"
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  fontSize: 11.2,
                  fontWeight: 600,
                  color: 'var(--teal)',
                  background: 'color-mix(in srgb, var(--teal) 10%, transparent)',
                  borderRadius: 999,
                  padding: '4px 10px',
                }}
              >
                {t('wizard.step2.chip.tranche', lang)
                  .replace('{0}', String(trancheNumber))
                  .replace('{1}', coefficientNumber.toFixed(2))}
              </div>
            )}
          </>
        ) : result?.computed.state === 'on-demand' ? (
          <>
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                color: 'var(--gd)',
              }}
            >
              {t('result.sur.demande', lang)}
            </div>
            <div
              style={{
                fontSize: 14.5,
                color: 'var(--muted)',
                marginTop: 8,
              }}
            >
              {t('proposal.loyer.contact', lang)}
            </div>
          </>
        ) : result?.computed.state === 'missing' ? (
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: 'var(--gd)',
              marginTop: 4,
            }}
          >
            {t('result.inline.missing', lang)}
          </div>
        ) : (
          // state='idle' — defensive fallback, treat as incomplete.
          <div
            role="alert"
            className="error-msg"
            style={{
              fontSize: 14.5,
              color: 'var(--danger)',
              fontWeight: 500,
              marginTop: 8,
            }}
          >
            {t('wizard.step2.error.incomplete', lang)}
          </div>
        )}
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          Détail du calcul card — only rendered when we have enough info to
          show real numbers OR fallback placeholders. We always render the
          structure (5 rows) so the test fixture for D-12 row visibility is
          stable; row values fall back to '—' when not 'computed'.
      ──────────────────────────────────────────────────────────────────── */}
      {!inputsIncomplete && !paramsMissing && (
        <div style={{ marginTop: 16 }}>
          <RecapSection
            sectionTitle={t('wizard.section.detail.calcul', lang)}
            rows={detailRows}
            rowSublabels={{
              // D-12: partner-facing parenthetical clarifying that the row's
              // value will NOT appear in the client-facing PDF. ONLY consumer
              // of rowSublabels on this page.
              1: t('wizard.step2.row.commission.sublabel', lang),
            }}
          />
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────
          Paramètres saisis recap — mirrors step-1 fields. Has ← Modifier
          link → /parametres. NO commission row (ADMIN-09 invariant for this
          surface).
      ──────────────────────────────────────────────────────────────────── */}
      {!inputsIncomplete && recapRows.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <RecapSection
            sectionTitle={t('wizard.section.parametres.saisis', lang)}
            modifierLink={{
              href: `/proposals/new/parametres?draft_id=${draft.id}`,
              label: 'Modifier',
            }}
            rows={recapRows}
          />
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────
          WizardActionBar — D-19: ← Précédent + Save + (Continuer | Retour).
      ──────────────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <WizardActionBar
          currentStep={2}
          draftId={draft.id}
          lang={lang}
          onSaveDraft={onSaveDraft}
          primary={primary}
        />
      </div>
    </div>
  );
}
