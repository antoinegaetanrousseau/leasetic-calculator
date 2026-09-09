import type { ProposalDocumentProps } from '@/lib/pdf';

/**
 * Frozen byte-determinism fixtures (PROP-17). Every field is a constant
 * to avoid Date.now / Math.random / locale fallback drift.
 *
 * To intentionally update the bytes (e.g., minor PDF layout change per D-D3
 * MINOR semver bump), edit src/lib/pdf/* and run:
 *   npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE
 *
 * Cross-PR diff hygiene: keep the fixture stable. Rotate values only when
 * upstream calc changes mandate it (e.g., new tranche thresholds via MAJOR
 * schema_version bump).
 */

const SHARED_BASE: Omit<ProposalDocumentProps['data'], 'language'> = {
  lcRef: 'LC-12345',
  createdAt: new Date('2026-05-09T10:00:00.000Z'),
  inputs: {
    partnerCo: 'Memento IT',
    partnerName: 'Antoine Rousseau',
    clientCo: 'Société Cliente Alpha',
    clientName: 'M. Jean Dupont',
    clientRole: 'Directeur des Systèmes d’Information',
    clientTel: '01 23 45 67 89',
    clientEmail: 'jean.dupont@alpha.example',
    clientSiren: '123456789',
    // Gap 3 (43-VERIFICATION.md / DOC-02): populated SIRET so the
    // emDash(inputs.clientSiret) branch at document.tsx's SIRET row is
    // actually exercised with a value, not just its absent/em-dash branch.
    // '12345678900012'.slice(0, 9) === '123456789' === clientSiren above,
    // satisfying schema.ts's requiredSiretSchema refine
    // (data.clientSiret.slice(0, 9) === data.clientSiren). Synthetic
    // sequential-digit value, not a real French establishment identifier —
    // the same constant already used by src/lib/pdf/no-commission.test.ts.
    clientSiret: '12345678900012',
    slb: true,
    evalParc: false,
    amountHT: '75000',
    durationMonths: 48,
    validityDays: 30,
    projectDesc: 'Renouvellement postes commerciaux 2026',
    partnerRef: 'DEVIS-2026-042',
  },
  computed: {
    state: 'computed',
    trancheKey: 't2',
    loyerHT: '1771.88',
    coeff: '2.2500',
    isOnDemand: false,
  },
  // Phase 43 D-12 — frozen literals, chosen to be visibly synthetic.
  partner: { companyTelephone: '05 61 00 00 00' },
  advisor: {
    name: 'Camille Martin',
    fonction: 'Responsable financement',
    telephone: '05 61 11 22 33',
    email: 'camille.martin@leasetic.example',
  },
};

export interface PdfFixture {
  name: string;
  data: ProposalDocumentProps['data'];
}

/**
 * Gap 3 (43-VERIFICATION.md / DOC-02): returns a shallow copy of SHARED_BASE's
 * `inputs` with `clientSiret` deleted, so the agent-commission-free fixture
 * keeps the FIELD-03 legacy-render path (a pre-Phase-42 proposal with no
 * `clientSiret` key at all) covered by a committed fixture rather than by
 * ad-hoc test overrides alone. `delete` is valid here because `clientSiret`
 * is declared optional on `ProposalDocumentProps['data']['inputs']`.
 */
function withoutClientSiret(
  inputs: (typeof SHARED_BASE)['inputs'],
): (typeof SHARED_BASE)['inputs'] {
  const copy = { ...inputs };
  delete copy.clientSiret;
  return copy;
}

/**
 * Commission-free fixture for Agent/Commercial partner type (PTYPE-04/06).
 * Uses the same amountHT/duration/tranche as SHARED_BASE but computes
 * loyerHT WITHOUT the commission factor:
 *   loyer = round2(amountHT × coeff / 100) = round2(75000 × 2.2500 / 100) = 1687.50
 * Proof: the Partenaire loyer for the same inputs is 1771.88 (5% commission applied),
 * so 1687.50 < 1771.88 confirms the commission factor is dropped.
 */
const AGENT_COMMISSION_FREE_BASE: Omit<ProposalDocumentProps['data'], 'language'> = {
  ...SHARED_BASE,
  computed: {
    state: 'computed',
    trancheKey: 't2',
    loyerHT: '1687.50',
    coeff: '2.2500',
    isOnDemand: false,
  },
  inputs: withoutClientSiret(SHARED_BASE.inputs),
};

// Gap 3 (43-VERIFICATION.md / DOC-02) fixture split: `happy-path-fr` and
// `happy-path-en` carry a populated SIRET (DOC-02 positive branch);
// `agent-commission-free` deliberately omits the key (FIELD-03 legacy
// branch). Anyone adding a fourth fixture must preserve at least one of each.
export const pdfFixtures: ReadonlyArray<PdfFixture> = [
  {
    name: 'happy-path-fr',
    data: { ...SHARED_BASE, language: 'fr' },
  },
  {
    name: 'happy-path-en',
    data: { ...SHARED_BASE, language: 'en' },
  },
  {
    name: 'agent-commission-free',
    data: { ...AGENT_COMMISSION_FREE_BASE, language: 'fr' },
  },
];
