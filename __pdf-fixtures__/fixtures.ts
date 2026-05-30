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
};

export interface PdfFixture {
  name: string;
  data: ProposalDocumentProps['data'];
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
};

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
