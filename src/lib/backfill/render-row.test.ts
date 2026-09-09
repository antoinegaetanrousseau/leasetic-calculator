/**
 * Phase 44 Plan 02 — `renderRow` / `redactDetail` tests (D-01, D-04, D-06,
 * D-10, MIG-01).
 *
 * Drives a fully stubbed `BackfillDeps` — no live database, no live blob
 * store, no live PDF renderer.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { redactDetail, renderRow } from './render-row';
import type { AdvisorIdentity, BackfillCandidate, BackfillDeps } from './types';

const ADVISOR: AdvisorIdentity = {
  name: 'Jeanne Dupont',
  fonction: 'Directrice commerciale',
  telephone: '0102030405',
  email: 'jeanne@leasetic.fr',
};

const VALID_INPUTS: Record<string, unknown> = {
  partnerName: 'Marc Partner',
  clientCo: 'ACME SAS',
  amountHT: '75000',
  durationMonths: 36,
  validityDays: 30,
};

const VALID_COMPUTED: Record<string, unknown> = {
  state: 'computed',
  trancheKey: 't2',
  loyerHT: '1234',
  coeff: '0.0321',
  isOnDemand: false,
};

function makeRow(overrides: Partial<BackfillCandidate> = {}): BackfillCandidate {
  return {
    id: 'proposal-1',
    userId: 'user-1',
    lcRef: 'LC-2026-0001',
    language: 'fr',
    status: 'active',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    inputs: VALID_INPUTS,
    computed: VALID_COMPUTED,
    pdfBlobKey: 'proposals/user-1/proposal-1.pdf',
    partnerCompanyTelephone: '0611223344',
    ...overrides,
  };
}

const RENDERED = { buffer: Buffer.from('pdf-bytes'), sha256: 'abc123', sizeBytes: 42 };
const NOW = new Date('2026-09-09T12:00:00Z');

let callOrder: string[];
let deps: BackfillDeps;

beforeEach(() => {
  callOrder = [];
  deps = {
    listCandidates: vi.fn().mockResolvedValue([]),
    listMigratedIds: vi.fn().mockResolvedValue([]),
    getAdvisor: vi.fn().mockResolvedValue(ADVISOR),
    renderPdf: vi.fn().mockImplementation(async () => {
      callOrder.push('render');
      return RENDERED;
    }),
    putBlob: vi.fn().mockImplementation(async () => {
      callOrder.push('put');
    }),
    persistPdfArtifact: vi.fn().mockImplementation(async () => {
      callOrder.push('persist');
    }),
    writeMarker: vi.fn().mockImplementation(async () => {
      callOrder.push('marker');
    }),
    now: vi.fn().mockReturnValue(NOW),
    log: vi.fn(),
  };
});

describe('renderRow — dry-run zero-write proof (MIG-01)', () => {
  it('dry-run calls renderPdf once and never calls putBlob/persistPdfArtifact/writeMarker', async () => {
    const outcome = await renderRow({ row: makeRow(), advisor: ADVISOR, mode: 'dry-run', deps });
    expect(outcome.status).toBe('rendered');
    expect(deps.renderPdf).toHaveBeenCalledTimes(1);
    expect(deps.putBlob).toHaveBeenCalledTimes(0);
    expect(deps.persistPdfArtifact).toHaveBeenCalledTimes(0);
    expect(deps.writeMarker).toHaveBeenCalledTimes(0);
  });
});

describe('renderRow — apply order (D-06)', () => {
  it('apply mode calls all four deps in order render -> put -> persist -> marker', async () => {
    const outcome = await renderRow({ row: makeRow(), advisor: ADVISOR, mode: 'apply', deps });
    expect(outcome.status).toBe('migrated');
    expect(deps.renderPdf).toHaveBeenCalledTimes(1);
    expect(deps.putBlob).toHaveBeenCalledTimes(1);
    expect(deps.persistPdfArtifact).toHaveBeenCalledTimes(1);
    expect(deps.writeMarker).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['render', 'put', 'persist', 'marker']);
  });
});

describe('renderRow — blob key shape', () => {
  it('the key passed to putBlob equals proposals/<userId>/<id>.pdf', async () => {
    await renderRow({ row: makeRow({ userId: 'user-A', id: 'prop-A' }), advisor: ADVISOR, mode: 'apply', deps });
    expect(deps.putBlob).toHaveBeenCalledWith('proposals/user-A/prop-A.pdf', expect.anything());
  });

  it('falsification: changing userId changes the key', async () => {
    await renderRow({ row: makeRow({ userId: 'user-B', id: 'prop-A' }), advisor: ADVISOR, mode: 'apply', deps });
    expect(deps.putBlob).toHaveBeenCalledWith('proposals/user-B/prop-A.pdf', expect.anything());
    expect(deps.putBlob).not.toHaveBeenCalledWith('proposals/user-A/prop-A.pdf', expect.anything());
  });
});

describe('renderRow — persisted values are the render/clock outputs', () => {
  it('pdfSha256 is renderPdf\'s returned value and pdfGeneratedAt is now()\'s returned value', async () => {
    await renderRow({ row: makeRow(), advisor: ADVISOR, mode: 'apply', deps });
    expect(deps.persistPdfArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ pdfSha256: RENDERED.sha256, pdfGeneratedAt: NOW, pdfSizeBytes: RENDERED.sizeBytes }),
    );
  });
});

describe('renderRow — failure containment', () => {
  it('a putBlob rejection yields failed/upload-failed, never calls writeMarker, and resolves rather than rejecting', async () => {
    deps.putBlob = vi.fn().mockRejectedValue(new Error('blob store down'));
    const outcome = await renderRow({ row: makeRow(), advisor: ADVISOR, mode: 'apply', deps });
    expect(outcome).toEqual(
      expect.objectContaining({ status: 'failed', reason: 'upload-failed' }),
    );
    expect(deps.writeMarker).toHaveBeenCalledTimes(0);
  });

  it('a writeMarker rejection still leaves putBlob and persistPdfArtifact called once each, and yields a failed outcome', async () => {
    deps.writeMarker = vi.fn().mockRejectedValue(new Error('audit write failed'));
    const outcome = await renderRow({ row: makeRow(), advisor: ADVISOR, mode: 'apply', deps });
    expect(outcome.status).toBe('failed');
    expect(deps.putBlob).toHaveBeenCalledTimes(1);
    expect(deps.persistPdfArtifact).toHaveBeenCalledTimes(1);
  });

  it('a row buildBackfillPdfData rejects never reaches renderPdf', async () => {
    const outcome = await renderRow({
      row: makeRow({ lcRef: null }),
      advisor: ADVISOR,
      mode: 'apply',
      deps,
    });
    expect(outcome).toEqual(
      expect.objectContaining({ status: 'failed', reason: 'missing-lc-ref' }),
    );
    expect(deps.renderPdf).toHaveBeenCalledTimes(0);
  });

  it('a renderPdf rejection yields failed/render-failed and never calls putBlob', async () => {
    deps.renderPdf = vi.fn().mockRejectedValue(new Error('renderer crashed'));
    const outcome = await renderRow({ row: makeRow(), advisor: ADVISOR, mode: 'apply', deps });
    expect(outcome).toEqual(
      expect.objectContaining({ status: 'failed', reason: 'render-failed' }),
    );
    expect(deps.putBlob).toHaveBeenCalledTimes(0);
  });

  it('a persistPdfArtifact rejection yields failed/persist-failed and never calls writeMarker', async () => {
    deps.persistPdfArtifact = vi.fn().mockRejectedValue(new Error('db down'));
    const outcome = await renderRow({ row: makeRow(), advisor: ADVISOR, mode: 'apply', deps });
    expect(outcome).toEqual(
      expect.objectContaining({ status: 'failed', reason: 'persist-failed' }),
    );
    expect(deps.writeMarker).toHaveBeenCalledTimes(0);
  });
});

describe('redactDetail', () => {
  it('turns a message containing a connection string into one containing [redacted-url] and neither the password nor the host', () => {
    const result = redactDetail(new Error('connection failed: postgres://user:pw@host/db'));
    expect(result).toContain('[redacted-url]');
    expect(result).not.toContain('pw');
    expect(result).not.toContain('host');
  });

  it('truncates a 1000-character message to 200 characters', () => {
    const result = redactDetail(new Error('x'.repeat(1000)));
    expect(result).toHaveLength(200);
  });
});

describe('render-row.ts source assertions (dependency-injection contract)', () => {
  it('the module source never matches .head(, @/lib/storage, @/lib/db, or the @/lib/pdf barrel import', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'render-row.ts'), 'utf8');
    expect(src).not.toMatch(/head\(|@\/lib\/storage|@\/lib\/db|@\/lib\/pdf'/);
  });
});
