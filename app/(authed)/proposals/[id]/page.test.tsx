/**
 * Plan 14-06 Task 2 — Proposal detail page tests (StatusChip in header).
 *
 * Per <behavior> test 5: the detail-page header renders
 * <StatusChip variant={deriveDisplayStatus(proposal)} /> alongside the
 * existing <LanguageChip>. The pre-Phase-14 ValidityChip / DeletedChip
 * composition is gone.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ProposalRow } from '@/db/schema';

vi.mock('server-only', () => ({}));

const {
  requireUserMock,
  getCurrentLangMock,
  getProposalByIdMock,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  getCurrentLangMock: vi.fn(),
  getProposalByIdMock: vi.fn(),
}));

vi.mock('@/lib/auth/require', () => ({ requireUser: requireUserMock }));
vi.mock('@/lib/i18n', async () => {
  const real = await vi.importActual<typeof import('@/lib/i18n/dictionaries')>(
    '@/lib/i18n/dictionaries',
  );
  return {
    t: real.t,
    dictionaries: real.dictionaries,
    getCurrentLang: getCurrentLangMock,
  };
});
vi.mock('@/lib/db/queries', async () => {
  const real = await vi.importActual<typeof import('@/lib/db/queries')>(
    '@/lib/db/queries',
  );
  return {
    ...real,
    getProposalById: getProposalByIdMock,
  };
});

// Stub heavy server components — irrelevant to the chip assertion.
vi.mock('@/components/proposals/EmbeddedPdfPreview', () => ({
  EmbeddedPdfPreview: () => <div data-testid="pdf-preview-stub" />,
}));
vi.mock('@/components/proposals/DeleteButtonClient', () => ({
  DeleteButtonClient: () => <button data-testid="delete-btn-stub" />,
}));
vi.mock('@/components/proposals/RestoreButtonClient', () => ({
  RestoreButtonClient: () => <button data-testid="restore-btn-stub" />,
}));
vi.mock('@/components/proposal/CopyRefButton', () => ({
  CopyRefButton: () => <button data-testid="copy-ref-btn-stub" />,
}));

import ProposalDetailPage from './page';

function makeProposal(overrides: Partial<ProposalRow> = {}): ProposalRow {
  const createdAt = new Date('2026-05-01T10:00:00Z');
  return {
    id: 'prop-1',
    userId: 'user-1',
    lcRef: 'L-2026-001',
    inputs: {
      clientCo: 'ACME Industries',
      amountHT: '100000',
      validityDays: 30,
      durationMonths: 60,
    },
    computed: { state: 'computed', trancheKey: 'A', coeff: '2.5000', loyerHT: '2500' },
    paramsSnapshot: null,
    pdfGeneratedAt: createdAt,
    pdfBlobKey: 'key',
    pdfBlobUrl: 'https://example.com/p.pdf',
    schemaVersion: 1,
    language: 'fr',
    status: 'active',
    idempotencyKey: 'idem-1',
    deletedAt: null,
    createdAt,
    updatedAt: createdAt,
    completedSteps: 3,
    ...overrides,
  } as ProposalRow;
}

beforeEach(() => {
  requireUserMock.mockReset();
  getCurrentLangMock.mockReset();
  getProposalByIdMock.mockReset();
  requireUserMock.mockResolvedValue({ session: { user: { id: 'user-1', email: 'u@e.com' } } });
  getCurrentLangMock.mockResolvedValue('fr');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('/proposals/[id] page.tsx — Plan 14-06 D-28 StatusChip in header', () => {
  it('Test 5: active proposal → renders <StatusChip variant="active"> beside LanguageChip', async () => {
    getProposalByIdMock.mockResolvedValue(makeProposal({ status: 'active' }));
    const tree = await ProposalDetailPage({ params: Promise.resolve({ id: 'prop-1' }) });
    const { container } = render(tree);

    const chip = container.querySelector('[data-status="active"]');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('Actif');

    // LanguageChip still present as a sibling (UI-SPEC §5.8). Phase 2 moved it
    // onto the ReUI Badge, so it is identified by its data-language hook rather
    // than the retired .chip-language class.
    const languageChip = container.querySelector('[data-language]');
    expect(languageChip).not.toBeNull();
  });

  it('Test 5b: deleted proposal → renders <StatusChip variant="deleted">', async () => {
    getProposalByIdMock.mockResolvedValue(
      makeProposal({
        status: 'deleted',
        deletedAt: new Date('2026-05-19T12:00:00Z'),
      }),
    );
    const tree = await ProposalDetailPage({ params: Promise.resolve({ id: 'prop-1' }) });
    const { container } = render(tree);

    const chip = container.querySelector('[data-status="deleted"]');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('Supprimée');
  });

  it('ADMIN-09 D-29: detail-page header renders no commission strings', async () => {
    getProposalByIdMock.mockResolvedValue(makeProposal());
    const tree = await ProposalDetailPage({ params: Promise.resolve({ id: 'prop-1' }) });
    const { container } = render(tree);
    const html = container.innerHTML;
    // Proposal detail is partner-facing; commission must NOT leak.
    expect(html, 'detail page must not surface commission_pct').not.toMatch(/\bcommission_pct\b/i);
    expect(html, 'detail page must not surface _pct field-key suffix').not.toMatch(/_pct\b/);
  });
});
