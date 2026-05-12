/**
 * Plan 13-02 Task 2 — finalize-wizard.ts tests (behavior 1-11 from PLAN.md).
 *
 * D-16 8-step pipeline: requireUser already handled by route → re-validate →
 * getLatestGlobalParams → computeLoyer → render PDF → upload blob → allocate
 * lc_ref + idempotencyKey → single-shot finalizeDraft (which atomically writes
 * all 8 finalize columns + the audit_log proposal.create entry).
 *
 * ADMIN-09 invariants (D-12 + D-28):
 *   - persisted `computed` jsonb passed to finalizeDraft contains NO commission
 *   - data passed to @react-pdf/renderer contains NO commission
 *   - finalize-wizard.ts NEVER calls writeAuditLog directly — finalizeDraft owns
 *     the audit_log write (Phase 12 D-discretion-bullet)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  getDraftByIdMock,
  getLatestGlobalParamsMock,
  finalizeDraftMock,
  renderProposalPdfMock,
  storagePutMock,
  storageMock,
} = vi.hoisted(() => {
  const storagePut = vi.fn();
  return {
    getDraftByIdMock: vi.fn(),
    getLatestGlobalParamsMock: vi.fn(),
    finalizeDraftMock: vi.fn(),
    renderProposalPdfMock: vi.fn(),
    storagePutMock: storagePut,
    storageMock: vi.fn(() => ({ put: storagePut })),
  };
});

vi.mock('@/lib/db/queries/proposals', () => ({
  getDraftById: (...args: unknown[]) => getDraftByIdMock(...args),
  finalizeDraft: (...args: unknown[]) => finalizeDraftMock(...args),
}));
vi.mock('@/lib/db/queries/global-params', () => ({
  getLatestGlobalParams: (...args: unknown[]) => getLatestGlobalParamsMock(...args),
}));
vi.mock('@/lib/pdf', () => ({
  renderProposalPdf: (...args: unknown[]) => renderProposalPdfMock(...args),
}));
vi.mock('@/lib/storage', () => ({ storage: storageMock }));

import { finalizeWizard } from './finalize-wizard';

const VALID_INPUTS = {
  partnerCo: 'Leasetic SAS',
  partnerName: 'Bob',
  clientCo: 'Acme',
  amountHT: '75000',
  durationMonths: 48 as const,
  validityDays: 30 as const,
};

const PARAMS = {
  id: 'gp-1',
  commissionPct: '5.0000',
  maxAmount: '500000.00',
  validityDays: 30,
  coefficients: {
    t1: { 36: '2.5000', 48: '2.2500', 60: '2.0000' },
    t2: { 36: '2.5000', 48: '2.2500', 60: '2.0000' },
    t3: { 36: '2.5000', 48: '2.2500', 60: '2.0000' },
    t4: { 36: '2.5000', 48: '2.2500', 60: '2.0000' },
  },
  effectiveFrom: new Date('2026-01-01'),
};

const PDF_RENDER_RESULT = {
  buffer: Buffer.from('%PDF-1.7 mock buffer ' + 'a'.repeat(1000)),
  sha256: 'b'.repeat(64),
  contentHash: 'c'.repeat(64),
  sizeBytes: 1020,
};

beforeEach(() => {
  getDraftByIdMock.mockReset();
  getLatestGlobalParamsMock.mockReset();
  finalizeDraftMock.mockReset();
  renderProposalPdfMock.mockReset();
  storagePutMock.mockReset();
  storageMock.mockClear();

  // Happy-path defaults
  getDraftByIdMock.mockResolvedValue({ id: 'd-1', inputs: VALID_INPUTS, createdAt: new Date('2026-05-12') });
  getLatestGlobalParamsMock.mockResolvedValue(PARAMS);
  renderProposalPdfMock.mockResolvedValue(PDF_RENDER_RESULT);
  storagePutMock.mockResolvedValue({
    key: 'proposals/u-1/d-1.pdf',
    size: PDF_RENDER_RESULT.sizeBytes,
    etag: 'etag-1',
    contentType: 'application/pdf',
    uploadedAt: new Date(),
  });
  finalizeDraftMock.mockResolvedValue({ id: 'd-1' });
});

afterEach(() => vi.clearAllMocks());

describe('finalizeWizard (D-16 8-step pipeline)', () => {
  it('Test 1: throws when proposalInputSchema.safeParse(draft.inputs) fails (D-16 step 1)', async () => {
    // Missing required clientCo
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      inputs: { partnerCo: 'X', partnerName: 'Y' },
      createdAt: new Date(),
    });
    await expect(
      finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' }),
    ).rejects.toThrow();
    expect(renderProposalPdfMock).not.toHaveBeenCalled();
    expect(finalizeDraftMock).not.toHaveBeenCalled();
  });

  it('Test 1b: throws DraftNotFound when getDraftById returns null', async () => {
    getDraftByIdMock.mockResolvedValue(null);
    await expect(
      finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' }),
    ).rejects.toThrow(/DraftNotFound/);
  });

  it('Test 2: calls getLatestGlobalParams (D-16 step 2); throws NoGlobalParams if null', async () => {
    await finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' });
    expect(getLatestGlobalParamsMock).toHaveBeenCalledTimes(1);

    // Now exercise the null branch.
    getLatestGlobalParamsMock.mockResolvedValueOnce(null);
    await expect(
      finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' }),
    ).rejects.toThrow(/NoGlobalParams/);
  });

  it('Test 3: passes validated inputs + global params to PDF render (computeLoyer invoked inline)', async () => {
    await finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' });
    expect(renderProposalPdfMock).toHaveBeenCalledTimes(1);
    const callArg = renderProposalPdfMock.mock.calls[0][0] as {
      data: { inputs: Record<string, unknown>; computed: Record<string, unknown> };
    };
    expect(callArg.data.inputs.amountHT).toBe('75000');
    expect(callArg.data.inputs.durationMonths).toBe(48);
    // computed must reflect a 'computed' or 'on-demand' state with no commission key
    expect(callArg.data.computed.state).toMatch(/computed|on-demand/);
  });

  it('Test 4: invokes @react-pdf/renderer with our ProposalDocument data (assert call shape)', async () => {
    await finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' });
    expect(renderProposalPdfMock).toHaveBeenCalledOnce();
    const arg = renderProposalPdfMock.mock.calls[0][0] as { data: { lcRef: string; language: string } };
    expect(typeof arg.data.lcRef).toBe('string');
    expect(arg.data.language).toBe('fr');
  });

  it('Test 5: uploads the rendered buffer via storage().put and obtains a pdfBlobKey (D-16 step 5)', async () => {
    await finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' });
    expect(storagePutMock).toHaveBeenCalledTimes(1);
    const [keyArg, bodyArg, optsArg] = storagePutMock.mock.calls[0];
    expect(typeof keyArg).toBe('string');
    expect((keyArg as string).startsWith('proposals/u-1/')).toBe(true);
    expect(Buffer.isBuffer(bodyArg)).toBe(true);
    expect((optsArg as { contentType: string }).contentType).toBe('application/pdf');
  });

  it('Test 6: allocates lc_ref + idempotency_key (D-16 step 6)', async () => {
    await finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' });
    expect(finalizeDraftMock).toHaveBeenCalledTimes(1);
    const [, , payload] = finalizeDraftMock.mock.calls[0];
    const p = payload as { lcRef: string; idempotencyKey: string };
    expect(p.lcRef).toMatch(/^LC-/);
    expect(typeof p.idempotencyKey).toBe('string');
    expect(p.idempotencyKey.length).toBeGreaterThan(0);
  });

  it('Test 7: calls finalizeDraft(draftId, userId, { ...all 8 fields }) — single-shot atomic UPDATE (D-16 step 7-8)', async () => {
    await finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' });
    expect(finalizeDraftMock).toHaveBeenCalledTimes(1);
    const [draftIdArg, userIdArg, payload] = finalizeDraftMock.mock.calls[0];
    expect(draftIdArg).toBe('d-1');
    expect(userIdArg).toBe('u-1');
    const p = payload as Record<string, unknown>;
    // All 8 finalize columns present
    expect(p.lcRef).toBeDefined();
    expect(p.idempotencyKey).toBeDefined();
    expect(p.paramsSnapshot).toBeDefined();
    expect(p.computed).toBeDefined();
    expect(p.pdfBlobKey).toBeDefined();
    expect(p.pdfSha256).toBeDefined();
    expect(p.pdfSizeBytes).toBeDefined();
    expect(p.pdfGeneratedAt).toBeInstanceOf(Date);
  });

  it('Test 8: finalize-wizard does NOT write a second audit_log entry — finalizeDraft owns it (Phase 12 D-discretion)', async () => {
    // We assert this both behaviorally (mocks reveal no extra invocation) AND
    // structurally via the verification grep contract (audit_log substring count).
    await finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' });
    // No direct writeAuditLog mock — but we can verify by ensuring finalizeDraft
    // is called exactly once (it owns the audit_log entry internally).
    expect(finalizeDraftMock).toHaveBeenCalledTimes(1);
  });

  it('Test 9: returns { id: newProposalId } on success', async () => {
    finalizeDraftMock.mockResolvedValue({ id: 'd-1-finalized' });
    const result = await finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' });
    expect(result).toEqual({ id: 'd-1-finalized' });
  });

  it('Test 9b: throws FinalizeFailed when finalizeDraft returns null (cross-user / already-finalized)', async () => {
    finalizeDraftMock.mockResolvedValue(null);
    await expect(
      finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' }),
    ).rejects.toThrow(/FinalizeFailed/);
  });

  it('Test 10: ADMIN-09 — PDF render data props contain NO commission field', async () => {
    await finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' });
    const renderArg = renderProposalPdfMock.mock.calls[0][0] as {
      data: {
        inputs: Record<string, unknown>;
        computed: Record<string, unknown>;
      };
    };
    // Deep stringify and assert commission substring absent.
    const dataJson = JSON.stringify(renderArg.data);
    expect(dataJson.toLowerCase()).not.toContain('commission');
  });

  it('Test 10b: ADMIN-09 — persisted `computed` jsonb (passed to finalizeDraft) contains NO commission field', async () => {
    await finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' });
    const [, , payload] = finalizeDraftMock.mock.calls[0];
    const computed = (payload as { computed: Record<string, unknown> }).computed;
    expect('commission' in computed).toBe(false);
    expect(JSON.stringify(computed).toLowerCase()).not.toContain('commission');
  });

  it('Test 10c: ADMIN-09 — audit_log payload written by finalizeDraft contains NO commission field', async () => {
    // The audit_log entry is written INSIDE Phase 12's finalizeDraft using
    // ONLY { lcRef } as payload (see src/lib/db/queries/proposals.ts:484-490).
    // We assert by reading the finalize-wizard.ts source: no commission
    // substring may appear anywhere in the file.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'src/lib/api/proposals/finalize-wizard.ts'),
      'utf8',
    );
    // Strip comments before grepping (comments may explain ADMIN-09 enforcement).
    const stripped = source
      .replace(/\/\/.*$/gm, '')         // single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // block comments
    // The codepath must never reference "commission" in non-comment positions.
    expect(stripped.toLowerCase()).not.toContain('commission');
  });

  it('Test 11: paramsSnapshot is captured from getLatestGlobalParams verbatim (Stripe Option A immutability)', async () => {
    await finalizeWizard({ userId: 'u-1', draftId: 'd-1', language: 'fr' });
    const [, , payload] = finalizeDraftMock.mock.calls[0];
    const snapshot = (payload as { paramsSnapshot: Record<string, unknown> }).paramsSnapshot;
    // Must include the 4 v1.1 fields that submit.ts captures.
    expect(snapshot.commissionPct).toBe(PARAMS.commissionPct);
    expect(snapshot.maxAmount).toBe(PARAMS.maxAmount);
    expect(snapshot.validityDays).toBe(PARAMS.validityDays);
    expect(snapshot.coefficients).toEqual(PARAMS.coefficients);
  });
});
