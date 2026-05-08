import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers()),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error('__REDIRECT__:' + url); }),
  notFound: vi.fn(() => { throw new Error('__NOT_FOUND__'); }),
}));
const mockGetSession = vi.fn();
vi.mock('./index', () => ({
  auth: () => ({ api: { getSession: (a: unknown) => mockGetSession(a) } }),
}));
const mockFindFirst = vi.fn();
vi.mock('@/lib/db', () => ({
  db: () => ({ query: { users: { findFirst: (a: unknown) => mockFindFirst(a) } } }),
  schema: { users: { id: 'id-col' } },
}));

import { requireUser, requireAdmin } from './require';
import { redirect, notFound } from 'next/navigation';

beforeEach(() => { vi.clearAllMocks(); });

describe('requireUser', () => {
  it('redirects to /login when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow('__REDIRECT__:/login');
    expect(redirect).toHaveBeenCalledWith('/login');
  });
  it('returns {session, role:partner} for active partner', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u_1' } });
    mockFindFirst.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'partner' });
    const r = await requireUser();
    expect(r.role).toBe('partner');
  });
  it('returns role admin for active admin', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u_a' } });
    mockFindFirst.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'admin' });
    const r = await requireUser();
    expect(r.role).toBe('admin');
  });
  it('forces sign-out when deletedAt is set', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u_2' } });
    mockFindFirst.mockResolvedValue({ sessionVersion: 5, deletedAt: new Date(), role: 'partner' });
    await expect(requireUser()).rejects.toThrow('__REDIRECT__:/api/auth/sign-out?redirect=/login');
  });
  it('forces sign-out when DB user row missing', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u_3' } });
    mockFindFirst.mockResolvedValue(undefined);
    await expect(requireUser()).rejects.toThrow('__REDIRECT__:/api/auth/sign-out?redirect=/login');
  });
});

describe('requireAdmin', () => {
  it('returns session for role admin', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u_a' } });
    mockFindFirst.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'admin' });
    const r = await requireAdmin();
    expect(r.session.user.id).toBe('u_a');
  });
  it('calls notFound for partner role', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u_p' } });
    mockFindFirst.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'partner' });
    await expect(requireAdmin()).rejects.toThrow('__NOT_FOUND__');
    expect(notFound).toHaveBeenCalled();
  });
  it('calls notFound defensively for unknown role string', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'u_x' } });
    mockFindFirst.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'guest' });
    await expect(requireAdmin()).rejects.toThrow('__NOT_FOUND__');
  });
});
