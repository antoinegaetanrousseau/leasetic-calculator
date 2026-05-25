/**
 * Phase 19 Plan 01 (post-19 hotfix) — POST /api/proposals/export route tests.
 *
 * Replaces app/(authed)/proposals/_actions/exportProposals.action.test.ts after
 * the Server Action → Route Handler migration. 11 behaviour tests covering:
 *   Test 1:  requireUser() resolves before buildExportQuery (PITFALLS §7.3).
 *   Test 2:  userId is sourced from session (not body) — IDOR mitigation.
 *   Test 3:  returns a Response with status 200 on the happy path.
 *   Test 4:  Content-Type header is the XLSX MIME type.
 *   Test 5:  Content-Disposition is attachment with filename propositions-YYYY-MM-DD.xlsx.
 *   Test 6:  Content-Length matches the buffer byte length.
 *   Test 7:  q field in body is threaded through to buildExportQuery.
 *   Test 8:  archived field in body is threaded through to buildExportQuery.
 *   Test 9:  locale from session.user.language is threaded into both buildExportQuery and generateProposalsXlsx.
 *   Test 10: requireUser throwing returns 401 JSON (not a thrown error).
 *   Test 11: invalid JSON body returns 400.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

// ── Mocks ────────────────────────────────────────────────────────────────────

const requireUserMock = vi.fn();
vi.mock('@/lib/auth/require', () => ({
  requireUser: (...args: unknown[]) => requireUserMock(...args),
}));

const buildExportQueryMock = vi.fn();
vi.mock('@/lib/api/proposals/list', () => ({
  buildExportQuery: (...args: unknown[]) => buildExportQueryMock(...args),
}));

const generateProposalsXlsxMock = vi.fn();
vi.mock('@/lib/xlsx', () => ({
  generateProposalsXlsx: (...args: unknown[]) => generateProposalsXlsxMock(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const FAKE_USER_ID = 'user-abc-123';
const FAKE_LOCALE = 'fr' as const;
const FAKE_BUF = Buffer.from('xlsx-bytes');

function makeSession(language: 'fr' | 'en' = FAKE_LOCALE) {
  return {
    session: {
      user: {
        id: FAKE_USER_ID,
        language,
      },
    },
    role: 'partner' as const,
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/proposals/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/proposals/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue(makeSession());
    buildExportQueryMock.mockResolvedValue([]);
    generateProposalsXlsxMock.mockResolvedValue(FAKE_BUF);
  });

  it('Test 1: requireUser resolves before buildExportQuery is called (PITFALLS §7.3 order)', async () => {
    const callOrder: string[] = [];
    requireUserMock.mockImplementation(async () => {
      callOrder.push('requireUser');
      return makeSession();
    });
    buildExportQueryMock.mockImplementation(async () => {
      callOrder.push('buildExportQuery');
      return [];
    });

    const { POST } = await import('./route');
    await POST(makeRequest({}));

    const requireIdx = callOrder.indexOf('requireUser');
    const exportIdx = callOrder.indexOf('buildExportQuery');
    expect(requireIdx).toBeGreaterThanOrEqual(0);
    expect(exportIdx).toBeGreaterThanOrEqual(0);
    expect(requireIdx).toBeLessThan(exportIdx);
  });

  it('Test 2: userId passed to buildExportQuery comes from session, not from body (IDOR)', async () => {
    const { POST } = await import('./route');
    // Attempt to inject a different userId via the request body — must be ignored.
    await POST(makeRequest({ userId: 'attacker-user-id' }));

    expect(buildExportQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: FAKE_USER_ID }),
    );
  });

  it('Test 3: returns a Response with status 200', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest({}));

    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(200);
  });

  it('Test 4: Content-Type is the XLSX MIME type', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest({}));

    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('Test 5: Content-Disposition is attachment with filename propositions-YYYY-MM-DD.xlsx', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest({}));

    const cd = res.headers.get('Content-Disposition') ?? '';
    expect(cd).toMatch(/^attachment; filename="propositions-\d{4}-\d{2}-\d{2}\.xlsx"$/);
  });

  it('Test 6: Content-Length matches the buffer byte length', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest({}));

    expect(res.headers.get('Content-Length')).toBe(String(FAKE_BUF.length));
  });

  it('Test 7: q field in body is threaded through to buildExportQuery', async () => {
    const { POST } = await import('./route');
    await POST(makeRequest({ q: 'dupont' }));

    expect(buildExportQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'dupont' }),
    );
  });

  it('Test 8: archived field in body is threaded through to buildExportQuery', async () => {
    const { POST } = await import('./route');
    await POST(makeRequest({ archived: true }));

    expect(buildExportQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ archived: true }),
    );
  });

  it('Test 9: locale from session.user.language is threaded into buildExportQuery and generateProposalsXlsx', async () => {
    requireUserMock.mockResolvedValue(makeSession('en'));
    const { POST } = await import('./route');
    await POST(makeRequest({}));

    expect(buildExportQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en' }),
    );
    expect(generateProposalsXlsxMock).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en' }),
    );
  });

  it('Test 10: requireUser throwing returns 401 JSON (not a thrown error)', async () => {
    requireUserMock.mockRejectedValue(new Error('Unauthorized'));
    const { POST } = await import('./route');
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('unauthorized');
  });

  it('Test 11: invalid JSON body returns 400', async () => {
    const { POST } = await import('./route');
    // Pass raw non-JSON string — NextRequest.json() will throw.
    const res = await POST(makeRequest('not-json-at-all'));

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('invalid_body');
  });
});
