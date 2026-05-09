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
});
