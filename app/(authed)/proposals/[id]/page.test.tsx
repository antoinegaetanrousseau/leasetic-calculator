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

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

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
  requireUserMock.mockResolvedValue({
    session: { user: { id: 'user-1', email: 'u@e.com' } },
    role: 'partner',
  });
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

describe('/proposals/[id] page.tsx — GAP-01 / D-37-01 admin oversight bypass', () => {
  it('Case 1: admin + proposal owned by a different user id -> the page renders (no notFound)', async () => {
    requireUserMock.mockResolvedValue({
      session: { user: { id: 'admin-1', email: 'admin@e.com' } },
      role: 'admin',
    });
    getProposalByIdMock.mockResolvedValue(
      makeProposal({ userId: 'user-2', inputs: { ...makeProposal().inputs, clientCo: 'Other Partner Client SAS' } }),
    );

    const tree = await ProposalDetailPage({ params: Promise.resolve({ id: 'prop-1' }) });
    const { container } = render(tree);

    expect(container.textContent).toContain('Other Partner Client SAS');
  });

  it('Case 2: partner + proposal owned by a different user id -> notFound() is taken', async () => {
    requireUserMock.mockResolvedValue({
      session: { user: { id: 'user-1', email: 'u@e.com' } },
      role: 'partner',
    });
    getProposalByIdMock.mockResolvedValue(makeProposal({ userId: 'user-2' }));

    await expect(
      ProposalDetailPage({ params: Promise.resolve({ id: 'prop-1' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('Case 3: sales + proposal owned by a different user id -> notFound() is taken (bypass is admin-only)', async () => {
    requireUserMock.mockResolvedValue({
      session: { user: { id: 'sales-1', email: 's@e.com' } },
      role: 'sales',
    });
    getProposalByIdMock.mockResolvedValue(makeProposal({ userId: 'user-2' }));

    await expect(
      ProposalDetailPage({ params: Promise.resolve({ id: 'prop-1' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('Case 4: admin + getProposalById resolves null -> notFound() is taken (absence is not bypassable)', async () => {
    requireUserMock.mockResolvedValue({
      session: { user: { id: 'admin-1', email: 'admin@e.com' } },
      role: 'admin',
    });
    getProposalByIdMock.mockResolvedValue(null);

    await expect(
      ProposalDetailPage({ params: Promise.resolve({ id: 'does-not-exist' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('/proposals/[id] page.tsx — WR-01 owner-gated write controls', () => {
  // The write-side controls are gated on OWNERSHIP, not on `!isAdmin`. Their handlers are
  // owner-scoped one layer down, so a non-owning admin could only ever get an error toast
  // (Delete/Restore) or a silent stray empty draft (Duplicate). Download is NOT gated —
  // `/api/proposals/[id]/pdf` honours the D-37-01 admin bypass since commit 7999759.

  // DeleteButtonClient / RestoreButtonClient are mocked to stubs at the top of this file, so
  // their French labels never reach the DOM — asserting on 'Supprimer' / 'Restaurer' would be
  // VACUOUS and would pass against the unfixed page. Assert on the stub testids instead.
  const DUPLICATE = 'Dupliquer';
  const DELETE_STUB = '[data-testid="delete-btn-stub"]';
  const RESTORE_STUB = '[data-testid="restore-btn-stub"]';
  const DOWNLOAD_HREF = '/api/proposals/prop-1/pdf';

  it('WR-01 a: non-owning admin sees NO Duplicate and NO Delete', async () => {
    requireUserMock.mockResolvedValue({
      session: { user: { id: 'admin-1', email: 'admin@e.com' } },
      role: 'admin',
    });
    getProposalByIdMock.mockResolvedValue(makeProposal({ userId: 'user-2' }));

    const { container } = render(
      await ProposalDetailPage({ params: Promise.resolve({ id: 'prop-1' }) }),
    );

    expect(container.textContent).not.toContain(DUPLICATE);
    expect(container.querySelector(DELETE_STUB)).toBeNull();
    // Non-vacuity: the page really did render, and Download is still offered.
    expect(container.innerHTML).toContain(DOWNLOAD_HREF);
  });

  it('WR-01 b: non-owning admin on a DELETED proposal sees NO Restore', async () => {
    requireUserMock.mockResolvedValue({
      session: { user: { id: 'admin-1', email: 'admin@e.com' } },
      role: 'admin',
    });
    getProposalByIdMock.mockResolvedValue(
      makeProposal({ userId: 'user-2', deletedAt: new Date('2026-09-01T00:00:00Z') }),
    );

    const { container } = render(
      await ProposalDetailPage({ params: Promise.resolve({ id: 'prop-1' }) }),
    );

    expect(container.querySelector(RESTORE_STUB)).toBeNull();
    expect(container.innerHTML).toContain(DOWNLOAD_HREF);
  });

  it('WR-01 c: an admin who OWNS the proposal KEEPS Duplicate and Delete', async () => {
    // This is the case a `!isAdmin` gate would have broken. Admins do own proposals.
    requireUserMock.mockResolvedValue({
      session: { user: { id: 'admin-1', email: 'admin@e.com' } },
      role: 'admin',
    });
    getProposalByIdMock.mockResolvedValue(makeProposal({ userId: 'admin-1' }));

    const { container } = render(
      await ProposalDetailPage({ params: Promise.resolve({ id: 'prop-1' }) }),
    );

    expect(container.textContent).toContain(DUPLICATE);
    expect(container.querySelector(DELETE_STUB)).not.toBeNull();
  });

  it('WR-01 d: the owning partner is unaffected — Duplicate and Delete still render', async () => {
    requireUserMock.mockResolvedValue({
      session: { user: { id: 'user-1', email: 'u@e.com' } },
      role: 'partner',
    });
    getProposalByIdMock.mockResolvedValue(makeProposal({ userId: 'user-1' }));

    const { container } = render(
      await ProposalDetailPage({ params: Promise.resolve({ id: 'prop-1' }) }),
    );

    expect(container.textContent).toContain(DUPLICATE);
    expect(container.querySelector(DELETE_STUB)).not.toBeNull();
  });
});
