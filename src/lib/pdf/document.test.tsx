// @vitest-environment node
// Phase 11-01 — PDF rendering uses @react-pdf/renderer's own pipeline and depends on
// native node globals (Buffer, fs, crypto). Pinned to node alongside the byte-determinism
// gate at __pdf-fixtures__/render-fixtures.test.ts to keep PDF output stable across runs.
import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { renderProposalPdf } from './render';

const FIXTURE = {
  lcRef: 'LC-12345',
  language: 'fr' as const,
  createdAt: new Date('2026-05-09T10:00:00.000Z'),
  inputs: {
    partnerCo: 'Memento IT',
    partnerName: 'Antoine Rousseau',
    clientCo: 'Société Cliente Alpha',
    clientName: 'M. Jean Dupont',
    clientRole: 'DSI',
    clientTel: '01 23 45 67 89',
    clientEmail: 'jean.dupont@alpha.fr',
    clientSiren: '123456789',
    slb: true,
    evalParc: false,
    amountHT: '75000',
    durationMonths: 48 as const,
    validityDays: 30 as const,
    projectDesc: 'Renouvellement postes commerciaux',
    partnerRef: 'DEVIS-2026-042',
  },
  computed: {
    state: 'computed' as const,
    trancheKey: 't2' as const,
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

describe('renderProposalPdf', () => {
  it('returns a non-empty Buffer for a happy-path fixture', async () => {
    const result = await renderProposalPdf({ data: FIXTURE });
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.sizeBytes).toBeGreaterThan(4_000); // minimum PDF size sanity
    expect(result.buffer.byteLength).toBe(result.sizeBytes);
  });

  it('returns a valid hex sha256 (64 chars)', async () => {
    const result = await renderProposalPdf({ data: FIXTURE });
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('PDF starts with the %PDF-1.x magic bytes', async () => {
    const result = await renderProposalPdf({ data: FIXTURE });
    const head = result.buffer.subarray(0, 5).toString('utf8');
    expect(head).toBe('%PDF-');
  });

  it('renders without throwing on the on-demand variant', async () => {
    const onDemandFixture = {
      ...FIXTURE,
      computed: {
        state: 'on-demand' as const,
        trancheKey: undefined,
        loyerHT: undefined,
        coeff: undefined,
        isOnDemand: true,
      },
      inputs: { ...FIXTURE.inputs, amountHT: '750000' },
    };
    const result = await renderProposalPdf({ data: onDemandFixture });
    expect(result.sizeBytes).toBeGreaterThan(4_000);
  });

  it('renders English language', async () => {
    const enFixture = { ...FIXTURE, language: 'en' as const };
    const result = await renderProposalPdf({ data: enFixture });
    expect(result.sizeBytes).toBeGreaterThan(4_000);
  });

  it('D-13: renders without throwing when advisor is null', async () => {
    const nullAdvisorFixture = { ...FIXTURE, advisor: null };
    const result = await renderProposalPdf({ data: nullAdvisorFixture });
    expect(result.sizeBytes).toBeGreaterThan(4_000);
  });

  it('FIELD-03: renders without throwing on a pre-Phase-42 proposal (no clientSiret/partnerTel, no companyTelephone)', async () => {
    const legacyProposalFixture = {
      ...FIXTURE,
      inputs: { ...FIXTURE.inputs, clientSiret: undefined, partnerTel: undefined },
      partner: { companyTelephone: null },
    };
    const result = await renderProposalPdf({ data: legacyProposalFixture });
    expect(result.sizeBytes).toBeGreaterThan(4_000);
  });
});
