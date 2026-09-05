/**
 * Phase 37 Plan 01 (walk finding) — GET /api/proposals/[id]/pdf authorization tests.
 *
 * D-37-01 / GAP-01 removed the flat ownership check from
 * `app/(authed)/proposals/[id]/page.tsx` so an admin following the oversight
 * click-through reaches the proposal detail page instead of a 404. The PDF
 * route kept its own copy of that check, so the page opened while its APERÇU
 * PDF panel rendered the raw `{"error":"not_found"}` body and both "Voir le
 * PDF" and "Télécharger le PDF" were dead for admins. Found by walking it, not
 * by reading it — see 30-UAT.md scenario 9.
 *
 *   Test 1: partner owner still streams their own PDF (no regression).
 *   Test 2: non-owner partner still gets 404 — the bypass is admin-only.
 *   Test 3: admin streams a PDF they do NOT own (the fix).
 *   Test 4: `sales` does NOT ride the bypass — only `admin` does.
 *   Test 5: absence beats role — admin + nonexistent id is still 404, because
 *           `!proposal` short-circuits ahead of the role check.
 *   Test 6: role is read from requireUser(), never from the request.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

// ── Mocks ────────────────────────────────────────────────────────────────────

const requireUserMock = vi.fn();
vi.mock('@/lib/auth/require', () => ({
  requireUser: (...args: unknown[]) => requireUserMock(...args),
}));

const getProposalByIdMock = vi.fn();
vi.mock('@/lib/db/queries', () => ({
  getProposalById: (...args: unknown[]) => getProposalByIdMock(...args),
}));

const storageGetMock = vi.fn();
vi.mock('@/lib/storage', () => ({
  storage: () => ({ get: (...args: unknown[]) => storageGetMock(...args) }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const OWNER_ID = 'user-owner-1';
const OTHER_ID = 'user-other-2';

function session(userId: string, role: string) {
  return { session: { user: { id: userId } }, role };
}

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    userId: OWNER_ID,
    deletedAt: null,
    pdfBlobKey: 'blob/key.pdf',
    pdfSha256: 'abc123',
    lcRef: 'LC-TEST-001',
    ...overrides,
  };
}

function blob() {
  return { body: 'pdf-bytes', contentType: 'application/pdf', size: 9 };
}

const req = () => new NextRequest('http://localhost/api/proposals/proposal-1/pdf');

async function callRoute() {
  const { GET } = await import('./route');
  return GET(req(), { params: Promise.resolve({ id: 'proposal-1' }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  storageGetMock.mockResolvedValue(blob());
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/proposals/[id]/pdf — D-37-01 admin bypass', () => {
  it('Test 1: the owning partner still streams their own PDF', async () => {
    requireUserMock.mockResolvedValue(session(OWNER_ID, 'partner'));
    getProposalByIdMock.mockResolvedValue(proposal());

    const res = await callRoute();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('Test 2: a non-owner partner still gets 404 — the bypass is admin-only', async () => {
    requireUserMock.mockResolvedValue(session(OTHER_ID, 'partner'));
    getProposalByIdMock.mockResolvedValue(proposal());

    const res = await callRoute();

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: 'not_found' });
    expect(storageGetMock).not.toHaveBeenCalled();
  });

  it('Test 3: an admin streams a PDF they do NOT own', async () => {
    requireUserMock.mockResolvedValue(session(OTHER_ID, 'admin'));
    getProposalByIdMock.mockResolvedValue(proposal());

    const res = await callRoute();

    expect(res.status).toBe(200);
    expect(storageGetMock).toHaveBeenCalledWith('blob/key.pdf');
  });

  it('Test 4: `sales` does NOT ride the bypass — only `admin` does', async () => {
    requireUserMock.mockResolvedValue(session(OTHER_ID, 'sales'));
    getProposalByIdMock.mockResolvedValue(proposal());

    const res = await callRoute();

    expect(res.status).toBe(404);
    expect(storageGetMock).not.toHaveBeenCalled();
  });

  it('Test 5: absence beats role — admin + nonexistent id is still 404', async () => {
    requireUserMock.mockResolvedValue(session(OTHER_ID, 'admin'));
    getProposalByIdMock.mockResolvedValue(null);

    const res = await callRoute();

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: 'not_found' });
  });

  it('Test 6: role comes from requireUser(), never from the request', async () => {
    requireUserMock.mockResolvedValue(session(OTHER_ID, 'partner'));
    getProposalByIdMock.mockResolvedValue(proposal());

    // A forged admin hint on the request must not grant the bypass.
    const { GET } = await import('./route');
    const forged = new NextRequest(
      'http://localhost/api/proposals/proposal-1/pdf?role=admin',
      { headers: { 'x-role': 'admin' } },
    );
    const res = await GET(forged, { params: Promise.resolve({ id: 'proposal-1' }) });

    expect(res.status).toBe(404);
    expect(storageGetMock).not.toHaveBeenCalled();
  });
});
