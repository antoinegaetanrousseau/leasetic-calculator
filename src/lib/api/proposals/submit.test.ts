import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

// ── Per-test mock state ────────────────────────────────────────────────────
const mocks = {
  findByIdempotencyKey: vi.fn(),
  createProposal: vi.fn(),
  finalizePdfBlobOnProposal: vi.fn(),
  softDeleteProposal: vi.fn(),
  writeAuditLog: vi.fn(),
  getLatestGlobalParams: vi.fn(),
  renderProposalPdf: vi.fn(),
  storagePut: vi.fn(),
};

vi.mock('@/lib/db/queries', () => ({
  findByIdempotencyKey: (...args: unknown[]) => mocks.findByIdempotencyKey(...args),
  createProposal: (...args: unknown[]) => mocks.createProposal(...args),
  finalizePdfBlobOnProposal: (...args: unknown[]) => mocks.finalizePdfBlobOnProposal(...args),
  softDeleteProposal: (...args: unknown[]) => mocks.softDeleteProposal(...args),
  writeAuditLog: (...args: unknown[]) => mocks.writeAuditLog(...args),
  getLatestGlobalParams: (...args: unknown[]) => mocks.getLatestGlobalParams(...args),
}));

vi.mock('@/lib/pdf', () => ({
  renderProposalPdf: (...args: unknown[]) => mocks.renderProposalPdf(...args),
}));

vi.mock('@/lib/storage', () => ({
  storage: () => ({ put: (...args: unknown[]) => mocks.storagePut(...args) }),
}));

import { submitProposal } from './submit';
import { SubmitError } from './errors';

const VALID_KEY = '11111111-2222-4333-9444-555555555555';     // valid UUIDv4

const VALID_BODY = {
  partnerCo: 'Memento IT',
  partnerName: 'Antoine Rousseau',
  clientCo: 'Société Cliente Alpha',
  amountHT: '75000',
  durationMonths: 48,
  validityDays: 30,
  // optional fields omitted intentionally
};

const PARAMS_ROW = {
  id: 'gp-1',
  effectiveFrom: new Date('2026-05-09T00:00:00Z'),
  createdBy: null,
  commissionPct: '5.0000',
  maxAmount: '500000.00',
  validityDays: 30,
  coefficients: {
    t1: { 36: '3.0000', 48: '2.3000', 60: '1.8765' },
    t2: { 36: '2.9000', 48: '2.2500', 60: '1.8500' },
    t3: { 36: '2.8000', 48: '2.2000', 60: '1.8000' },
    t4: { 36: '2.7000', 48: '2.1500', 60: '1.7500' },
  },
  note: null,
};

const PROPOSAL_ROW = {
  id: 'p-1', userId: 'u-1', language: 'fr', lcRef: 'LC-12345',
  idempotencyKey: VALID_KEY, schemaVersion: '1.0.0',
  inputs: {}, paramsSnapshot: {}, computed: {},
  pdfBlobKey: null, pdfSha256: null, pdfSizeBytes: null, pdfGeneratedAt: null,
  deletedAt: null, duplicatedFromId: null,
  createdAt: new Date('2026-05-09T10:00:00Z'),
};

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
});

describe('submitProposal', () => {
  it('rejects an invalid idempotency key', async () => {
    await expect(submitProposal({
      userId: 'u-1', language: 'fr', idempotencyKey: 'not-a-uuid', body: VALID_BODY,
    })).rejects.toThrow(SubmitError);
  });

  it('rejects a missing idempotency key (empty string)', async () => {
    await expect(submitProposal({
      userId: 'u-1', language: 'fr', idempotencyKey: '', body: VALID_BODY,
    })).rejects.toMatchObject({ code: 'invalid_idempotency_key', httpStatus: 400 });
  });

  it('rejects an invalid body via Zod', async () => {
    await expect(submitProposal({
      userId: 'u-1', language: 'fr', idempotencyKey: VALID_KEY, body: { foo: 'bar' },
    })).rejects.toThrow(SubmitError);
  });

  it('rejects body with missing required clientCo', async () => {
    await expect(submitProposal({
      userId: 'u-1', language: 'fr', idempotencyKey: VALID_KEY,
      body: { ...VALID_BODY, clientCo: '' },
    })).rejects.toMatchObject({ code: 'invalid_body', httpStatus: 400 });
  });

  it('returns existing row on idempotency hit', async () => {
    mocks.findByIdempotencyKey.mockResolvedValueOnce({ ...PROPOSAL_ROW, pdfBlobKey: 'proposals/u-1/p-1.pdf' });
    const result = await submitProposal({
      userId: 'u-1', language: 'fr', idempotencyKey: VALID_KEY, body: VALID_BODY,
    });
    expect(result.id).toBe('p-1');
    expect(result.pdfUrl).toBe('/api/proposals/p-1/pdf');
    expect(result.idempotent).toBe(true);
    expect(mocks.createProposal).not.toHaveBeenCalled();
    expect(mocks.renderProposalPdf).not.toHaveBeenCalled();
  });

  it('returns 503 when seed not applied', async () => {
    mocks.findByIdempotencyKey.mockResolvedValueOnce(null);
    mocks.getLatestGlobalParams.mockResolvedValueOnce(null);
    await expect(submitProposal({
      userId: 'u-1', language: 'fr', idempotencyKey: VALID_KEY, body: VALID_BODY,
    })).rejects.toMatchObject({ code: 'seed_not_applied', httpStatus: 503 });
  });

  it('full happy-path: INSERT → render → upload → finalize → audit', async () => {
    mocks.findByIdempotencyKey.mockResolvedValueOnce(null);
    mocks.getLatestGlobalParams.mockResolvedValueOnce(PARAMS_ROW);
    mocks.createProposal.mockResolvedValueOnce(PROPOSAL_ROW);
    mocks.renderProposalPdf.mockResolvedValueOnce({
      buffer: Buffer.from('mock-pdf-bytes'),
      sha256: '0000000000000000000000000000000000000000000000000000000000000000',
      contentHash: 'aaaa',
      sizeBytes: 14,
    });
    mocks.storagePut.mockResolvedValueOnce({ key: 'proposals/u-1/p-1.pdf', size: 14, etag: 'mock', contentType: 'application/pdf', uploadedAt: new Date() });
    mocks.finalizePdfBlobOnProposal.mockResolvedValueOnce(undefined);
    mocks.writeAuditLog.mockResolvedValue({} as never);

    const result = await submitProposal({
      userId: 'u-1', language: 'fr', idempotencyKey: VALID_KEY, body: VALID_BODY,
    });

    expect(result).toEqual({ id: 'p-1', pdfUrl: '/api/proposals/p-1/pdf', idempotent: false });
    expect(mocks.renderProposalPdf).toHaveBeenCalledOnce();
    expect(mocks.storagePut).toHaveBeenCalledOnce();
    expect(mocks.finalizePdfBlobOnProposal).toHaveBeenCalledOnce();
    // DATA-09: finalize must receive sha256 (raw buffer hash), not contentHash
    expect(mocks.finalizePdfBlobOnProposal).toHaveBeenCalledWith(expect.objectContaining({
      pdfSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    }));
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'proposal.create',
      targetId: 'p-1',
    }));
    expect(mocks.softDeleteProposal).not.toHaveBeenCalled();
  });

  it('D-B1 fail-loud: render failure tombstones row + audit-logs failure', async () => {
    mocks.findByIdempotencyKey.mockResolvedValueOnce(null);
    mocks.getLatestGlobalParams.mockResolvedValueOnce(PARAMS_ROW);
    mocks.createProposal.mockResolvedValueOnce(PROPOSAL_ROW);
    mocks.renderProposalPdf.mockRejectedValueOnce(new Error('font-load-failed'));
    mocks.softDeleteProposal.mockResolvedValueOnce(1);
    mocks.writeAuditLog.mockResolvedValue({} as never);

    await expect(submitProposal({
      userId: 'u-1', language: 'fr', idempotencyKey: VALID_KEY, body: VALID_BODY,
    })).rejects.toMatchObject({ code: 'pdf_render_failed', httpStatus: 500 });

    // D-B1: tombstone must have been called with the row id + userId
    expect(mocks.softDeleteProposal).toHaveBeenCalledWith('p-1', 'u-1');
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'proposal.create_failed',
    }));
  });

  it('D-B1 fail-loud: storage upload failure tombstones row', async () => {
    mocks.findByIdempotencyKey.mockResolvedValueOnce(null);
    mocks.getLatestGlobalParams.mockResolvedValueOnce(PARAMS_ROW);
    mocks.createProposal.mockResolvedValueOnce(PROPOSAL_ROW);
    mocks.renderProposalPdf.mockResolvedValueOnce({
      buffer: Buffer.from('x'), sha256: 'a'.repeat(64), contentHash: 'b'.repeat(64), sizeBytes: 1,
    });
    const storageErr = new Error('blob-403'); storageErr.name = 'StorageAuthError';
    mocks.storagePut.mockRejectedValueOnce(storageErr);
    mocks.softDeleteProposal.mockResolvedValueOnce(1);
    mocks.writeAuditLog.mockResolvedValue({} as never);

    await expect(submitProposal({
      userId: 'u-1', language: 'fr', idempotencyKey: VALID_KEY, body: VALID_BODY,
    })).rejects.toMatchObject({ code: 'pdf_upload_failed', httpStatus: 500 });

    expect(mocks.softDeleteProposal).toHaveBeenCalledWith('p-1', 'u-1');
  });
});
