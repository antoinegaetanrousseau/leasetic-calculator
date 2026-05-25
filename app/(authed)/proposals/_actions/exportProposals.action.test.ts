/**
 * Phase 19 Plan 01 — exportProposals.action.test.ts
 *
 * 10 behaviour tests covering:
 *   Test 1:  requireUser() resolves before buildExportQuery (PITFALLS §7.3 order).
 *   Test 2:  userId is sourced from session (not args) — IDOR mitigation.
 *   Test 3:  returns a Response with status 200.
 *   Test 4:  Content-Type header is the XLSX MIME type.
 *   Test 5:  Content-Disposition is attachment with filename propositions-YYYY-MM-DD.xlsx.
 *   Test 6:  Content-Length matches the buffer byte length.
 *   Test 7:  q arg is threaded through to buildExportQuery.
 *   Test 8:  archived arg is threaded through to buildExportQuery.
 *   Test 9:  locale from session.user.language is threaded into both buildExportQuery and generateProposalsXlsx.
 *   Test 10: requireUser throwing causes action to throw (not swallow the error).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

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

// ── Tests ────────────────────────────────────────────────────────────────────

describe('exportProposalsAction', () => {
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

    const { exportProposalsAction } = await import('./exportProposals.action');
    await exportProposalsAction({});

    const requireIdx = callOrder.indexOf('requireUser');
    const exportIdx = callOrder.indexOf('buildExportQuery');
    expect(requireIdx).toBeGreaterThanOrEqual(0);
    expect(exportIdx).toBeGreaterThanOrEqual(0);
    expect(requireIdx).toBeLessThan(exportIdx);
  });

  it('Test 2: userId passed to buildExportQuery comes from session, not from args (IDOR)', async () => {
    const { exportProposalsAction } = await import('./exportProposals.action');
    await exportProposalsAction({});

    expect(buildExportQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: FAKE_USER_ID }),
    );
  });

  it('Test 3: returns a Response with status 200', async () => {
    const { exportProposalsAction } = await import('./exportProposals.action');
    const res = await exportProposalsAction({});

    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(200);
  });

  it('Test 4: Content-Type is the XLSX MIME type', async () => {
    const { exportProposalsAction } = await import('./exportProposals.action');
    const res = await exportProposalsAction({});

    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('Test 5: Content-Disposition is attachment with filename propositions-YYYY-MM-DD.xlsx', async () => {
    const { exportProposalsAction } = await import('./exportProposals.action');
    const res = await exportProposalsAction({});

    const cd = res.headers.get('Content-Disposition') ?? '';
    expect(cd).toMatch(/^attachment; filename="propositions-\d{4}-\d{2}-\d{2}\.xlsx"$/);
  });

  it('Test 6: Content-Length matches the buffer byte length', async () => {
    const { exportProposalsAction } = await import('./exportProposals.action');
    const res = await exportProposalsAction({});

    expect(res.headers.get('Content-Length')).toBe(String(FAKE_BUF.length));
  });

  it('Test 7: q arg is threaded through to buildExportQuery', async () => {
    const { exportProposalsAction } = await import('./exportProposals.action');
    await exportProposalsAction({ q: 'dupont' });

    expect(buildExportQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'dupont' }),
    );
  });

  it('Test 8: archived arg is threaded through to buildExportQuery', async () => {
    const { exportProposalsAction } = await import('./exportProposals.action');
    await exportProposalsAction({ archived: true });

    expect(buildExportQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ archived: true }),
    );
  });

  it('Test 9: locale from session.user.language is threaded into buildExportQuery and generateProposalsXlsx', async () => {
    requireUserMock.mockResolvedValue(makeSession('en'));
    const { exportProposalsAction } = await import('./exportProposals.action');
    await exportProposalsAction({});

    expect(buildExportQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en' }),
    );
    expect(generateProposalsXlsxMock).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en' }),
    );
  });

  it('Test 10: requireUser throwing propagates the error (not swallowed)', async () => {
    requireUserMock.mockRejectedValue(new Error('Unauthorized'));
    const { exportProposalsAction } = await import('./exportProposals.action');

    await expect(exportProposalsAction({})).rejects.toThrow('Unauthorized');
  });
});
