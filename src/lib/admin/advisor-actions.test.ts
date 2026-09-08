/**
 * Phase 42 Plan 06 Task 2 — advisorFormSchema and adminUpdateAdvisor coverage.
 *
 * The load-bearing assertions are the two authorization ones: requireAdmin() runs
 * before upsertAdvisor, and a throwing requireAdmin leaves upsertAdvisor uncalled.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { requireAdminMock, getAdvisorMock, upsertAdvisorMock, writeAuditLogMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getAdvisorMock: vi.fn(),
  upsertAdvisorMock: vi.fn(),
  writeAuditLogMock: vi.fn(),
}));

vi.mock('@/lib/auth/require', () => ({ requireAdmin: requireAdminMock }));
vi.mock('@/lib/db/queries', () => ({
  getAdvisor: getAdvisorMock,
  upsertAdvisor: upsertAdvisorMock,
}));
vi.mock('@/lib/db/queries/audit-log', () => ({
  writeAuditLog: writeAuditLogMock,
}));

import { advisorFormSchema } from './advisor-schemas';
import { adminUpdateAdvisor } from './advisor-actions';

const validPayload = {
  name: 'Jane Doe',
  fonction: 'Chargée de compte',
  telephone: '0612345678',
  email: 'jane.doe@leasetic.fr',
};

describe('advisorFormSchema', () => {
  it('fails with error.field.required on a blank name', () => {
    const result = advisorFormSchema.safeParse({ ...validPayload, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'name' && i.message === 'error.field.required')).toBe(true);
    }
  });

  it('fails with error.field.required on a blank fonction', () => {
    const result = advisorFormSchema.safeParse({ ...validPayload, fonction: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'fonction' && i.message === 'error.field.required')).toBe(true);
    }
  });

  it('fails with error.field.required on a blank telephone', () => {
    const result = advisorFormSchema.safeParse({ ...validPayload, telephone: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'telephone' && i.message === 'error.field.required')).toBe(true);
    }
  });

  it('fails with error.field.required on a blank email', () => {
    const result = advisorFormSchema.safeParse({ ...validPayload, email: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'email' && i.message === 'error.field.required')).toBe(true);
    }
  });

  it('fails with error.field.phone.invalid on a short telephone', () => {
    const result = advisorFormSchema.safeParse({ ...validPayload, telephone: '0612' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('error.field.phone.invalid');
    }
  });

  it('fails with error.field.email.invalid on a malformed email', () => {
    const result = advisorFormSchema.safeParse({ ...validPayload, email: 'nope' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('error.field.email.invalid');
    }
  });

  it('parses a fully valid payload', () => {
    const result = advisorFormSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });
});

describe('adminUpdateAdvisor', () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getAdvisorMock.mockReset();
    upsertAdvisorMock.mockReset();
    writeAuditLogMock.mockReset();
  });

  it('calls requireAdmin() before any DB access', async () => {
    requireAdminMock.mockResolvedValue({ session: { user: { id: 'admin-1' } } });
    getAdvisorMock.mockResolvedValue(null);
    upsertAdvisorMock.mockResolvedValue({ ...validPayload, id: 'x' });

    await adminUpdateAdvisor(validPayload);

    expect(requireAdminMock).toHaveBeenCalled();
    const requireAdminOrder = requireAdminMock.mock.invocationCallOrder[0];
    const upsertOrder = upsertAdvisorMock.mock.invocationCallOrder[0];
    expect(requireAdminOrder).toBeLessThan(upsertOrder);
  });

  it('leaves upsertAdvisor uncalled when requireAdmin() rejects', async () => {
    requireAdminMock.mockRejectedValue(new Error('not admin'));

    await expect(adminUpdateAdvisor(validPayload)).rejects.toThrow();
    expect(upsertAdvisorMock).not.toHaveBeenCalled();
  });

  it('re-parses input with advisorFormSchema server-side even when the client already validated', async () => {
    requireAdminMock.mockResolvedValue({ session: { user: { id: 'admin-1' } } });
    getAdvisorMock.mockResolvedValue(null);
    upsertAdvisorMock.mockResolvedValue({ ...validPayload, id: 'x' });

    // Tampered payload — missing required field, bypassing any client-side check.
    const tampered = { ...validPayload, name: '' } as typeof validPayload;
    const result = await adminUpdateAdvisor(tampered);

    expect(result.ok).toBe(false);
    expect(upsertAdvisorMock).not.toHaveBeenCalled();
  });

  it('calls upsertAdvisor with the parsed fields and the actor id after requireAdmin', async () => {
    requireAdminMock.mockResolvedValue({ session: { user: { id: 'admin-42' } } });
    getAdvisorMock.mockResolvedValue(null);
    upsertAdvisorMock.mockResolvedValue({ ...validPayload, id: 'x' });

    const result = await adminUpdateAdvisor(validPayload);

    expect(result.ok).toBe(true);
    expect(upsertAdvisorMock).toHaveBeenCalledWith({ ...validPayload, actorId: 'admin-42' });
  });

  it('writes exactly one audit-log entry on success, naming action admin.advisor.update', async () => {
    requireAdminMock.mockResolvedValue({ session: { user: { id: 'admin-1' } } });
    getAdvisorMock.mockResolvedValue(null);
    upsertAdvisorMock.mockResolvedValue({ ...validPayload, id: 'x' });

    await adminUpdateAdvisor(validPayload);

    expect(writeAuditLogMock).toHaveBeenCalledTimes(1);
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin-1', action: 'admin.advisor.update' }),
    );
  });

  it('audit payload never contains a commission, rate or derived value field (ADMIN-09)', async () => {
    requireAdminMock.mockResolvedValue({ session: { user: { id: 'admin-1' } } });
    getAdvisorMock.mockResolvedValue(null);
    upsertAdvisorMock.mockResolvedValue({ ...validPayload, id: 'x' });

    await adminUpdateAdvisor(validPayload);

    const payload = writeAuditLogMock.mock.calls[0][0].payload as Record<string, unknown>;
    const serialized = JSON.stringify(payload).toLowerCase();
    expect(serialized).not.toMatch(/commission|rate|coefficient/);
  });

  it('returns a bounded generic error on unexpected upsertAdvisor failure, never echoing the thrown message', async () => {
    requireAdminMock.mockResolvedValue({ session: { user: { id: 'admin-1' } } });
    getAdvisorMock.mockResolvedValue(null);
    upsertAdvisorMock.mockRejectedValue(new Error('raw db secret detail'));

    const result = await adminUpdateAdvisor(validPayload);

    expect(result).toEqual({ ok: false, error: 'admin.advisor.error.save' });
  });
});
