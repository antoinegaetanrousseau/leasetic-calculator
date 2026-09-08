/**
 * Phase 42 Plan 08 Task 2 — lookupSiretAction tests (FIELD-01 / D-01 / D-03,
 * T-42-08-A / T-42-08-B / T-42-08-D).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { requireUserMock, lookupCompanyBySirenMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  lookupCompanyBySirenMock: vi.fn(),
}));

vi.mock('@/lib/auth/require', () => ({ requireUser: requireUserMock }));
vi.mock('@/lib/registry/recherche-entreprises', () => ({
  lookupCompanyBySiren: (...args: unknown[]) => lookupCompanyBySirenMock(...args),
}));

import { lookupSiretAction } from './lookupSiret.action';

beforeEach(() => {
  requireUserMock.mockReset();
  lookupCompanyBySirenMock.mockReset();
  requireUserMock.mockResolvedValue({ session: { user: { id: 'u-1' } } });
});

afterEach(() => vi.clearAllMocks());

describe('lookupSiretAction (FIELD-01 / D-01 / D-03)', () => {
  it('rejects when requireUser rejects, and never calls lookupCompanyBySiren', async () => {
    requireUserMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/login'));
    await expect(lookupSiretAction('123456789')).rejects.toThrow(/NEXT_REDIRECT:\/login/);
    expect(lookupCompanyBySirenMock).not.toHaveBeenCalled();
  });

  it('a SIREN that does not normalise to 9 digits returns { ok: false } without calling lookupCompanyBySiren', async () => {
    const result = await lookupSiretAction('123');
    expect(result).toEqual({ ok: false });
    expect(lookupCompanyBySirenMock).not.toHaveBeenCalled();
  });

  it('when lookupCompanyBySiren resolves ok:true with a siret, returns { ok: true, siret }', async () => {
    lookupCompanyBySirenMock.mockResolvedValue({
      ok: true,
      data: { siret: '12345678900012' },
    });
    const result = await lookupSiretAction('123456789');
    expect(result).toEqual({ ok: true, siret: '12345678900012' });
  });

  it('when lookupCompanyBySiren resolves ok:true with siret null, returns { ok: false }', async () => {
    lookupCompanyBySirenMock.mockResolvedValue({
      ok: true,
      data: { siret: null },
    });
    const result = await lookupSiretAction('123456789');
    expect(result).toEqual({ ok: false });
  });

  it.each(['timeout', 'not_found', 'upstream_error', 'malformed'] as const)(
    'when lookupCompanyBySiren resolves ok:false reason=%s, returns { ok: false } and does not throw',
    async (reason) => {
      lookupCompanyBySirenMock.mockResolvedValue({ ok: false, reason });
      await expect(lookupSiretAction('123456789')).resolves.toEqual({ ok: false });
    },
  );

  it('the returned failure shape carries no reason, message or upstream payload', async () => {
    lookupCompanyBySirenMock.mockResolvedValue({ ok: false, reason: 'upstream_error' });
    const result = await lookupSiretAction('123456789');
    expect(Object.keys(result)).toEqual(['ok']);
  });
});
