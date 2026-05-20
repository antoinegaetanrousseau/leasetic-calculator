/**
 * Plan 14-02 Task 1 — adminCreateInvitation extended-args tests (RED → GREEN).
 *
 * Phase 14 extends `adminCreateInvitation` to accept 6 optional fields from
 * the new /partners/new form (UI-SPEC §5.1): firstName, lastName, companyName,
 * siret, phone, invitationMessage. These flow into the existing audit_log
 * payload under a new `profile` sub-key (empty values omitted), preserving
 * the legacy 3-field call site (CreatePartnerModal) and the D-09-09b
 * ADMIN-09 redaction discipline (no commission fields).
 *
 * Coverage:
 *   - Test 1: extended-args call succeeds and writes a `profile` sub-key
 *     into BOTH audit-log writes (user.create + invitation.create).
 *   - Test 2: legacy 3-field call still succeeds — profile sub-key is
 *     OMITTED (or empty {}) when no extended fields are passed.
 *   - Test 3: empty-string fields (siret: '', invitationMessage: '') are
 *     dropped from the profile payload (decision: empty = not provided).
 *   - Test 4: invitationMessage IS persisted to the audit log when provided.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  requireAdminMock,
  createInvitationMock,
  writeAuditLogMock,
  dbMock,
} = vi.hoisted(() => {
  // db().query.users.findFirst → { id: '...' }
  // db().update(...).set(...).where(...) → no-op chain
  const findFirstMock = vi.fn();
  const setMock = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  const updateMock = vi.fn().mockReturnValue({ set: setMock });
  const dbInstance = {
    query: { users: { findFirst: findFirstMock } },
    update: updateMock,
    _findFirstMock: findFirstMock,
  };
  return {
    requireAdminMock: vi.fn(),
    createInvitationMock: vi.fn(),
    writeAuditLogMock: vi.fn(),
    dbMock: vi.fn(() => dbInstance),
  };
});

vi.mock('@/lib/auth/require', () => ({ requireAdmin: requireAdminMock }));
vi.mock('@/lib/auth/actions', () => ({
  createInvitation: createInvitationMock,
  disableUser: vi.fn(),
  reEnableUser: vi.fn(),
  createPasswordReset: vi.fn(),
}));
vi.mock('@/lib/db/queries/audit-log', () => ({
  writeAuditLog: writeAuditLogMock,
}));
vi.mock('@/lib/db/queries/global-params', () => ({
  insertGlobalParams: vi.fn(),
}));
vi.mock('@/lib/db', async () => {
  // Provide enough surface for actions.ts to resolve `db()` + `schema.users.email/id`.
  return {
    db: dbMock,
    schema: {
      users: { email: 'users.email', id: 'users.id' },
    },
  };
});
vi.mock('drizzle-orm', () => ({
  eq: (a: unknown, b: unknown) => ({ _eq: [a, b] }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ _sql: { strings, values } }),
}));

import { adminCreateInvitation } from './actions';

const ADMIN_SESSION = { user: { id: 'admin-1', email: 'admin@example.com' } } as never;

beforeEach(() => {
  requireAdminMock.mockReset();
  createInvitationMock.mockReset();
  writeAuditLogMock.mockReset();
  dbMock.mockClear();

  // Happy-path defaults.
  requireAdminMock.mockResolvedValue({ session: ADMIN_SESSION });
  createInvitationMock.mockResolvedValue({ url: 'https://app/invite/abc123' });
  writeAuditLogMock.mockResolvedValue({ id: 'audit-1' });
  // db().query.users.findFirst → return the freshly created user row.
  // We can pull the hoisted findFirst via the dbMock factory return value.
  const inst = dbMock();
  (inst as unknown as { _findFirstMock: ReturnType<typeof vi.fn> })._findFirstMock.mockResolvedValue({
    id: 'user-1',
  });
});

afterEach(() => vi.clearAllMocks());

describe('adminCreateInvitation — Phase 14 extended args', () => {
  it('Test 1: extended-args call writes a `profile` sub-key into both audit-log payloads', async () => {
    await adminCreateInvitation({
      email: 'marie.dupont@example.com',
      displayName: 'Marie Dupont',
      language: 'fr',
      firstName: 'Marie',
      lastName: 'Dupont',
      companyName: 'Acme SAS',
      siret: '12345678901234',
      phone: '01 23 45 67 89',
      invitationMessage: 'Bonjour Marie, ravi de vous accueillir.',
    });

    expect(writeAuditLogMock).toHaveBeenCalledTimes(2);
    const calls = writeAuditLogMock.mock.calls.map((c) => c[0]);
    const userCreate = calls.find((c) => c.action === 'user.create');
    const inviteCreate = calls.find((c) => c.action === 'invitation.create');
    expect(userCreate).toBeDefined();
    expect(inviteCreate).toBeDefined();

    // Both writes carry a non-empty profile sub-key with the 6 extended fields.
    for (const c of [userCreate, inviteCreate]) {
      const profile = (c!.payload as { profile?: Record<string, unknown> }).profile;
      expect(profile).toBeDefined();
      expect(profile!.firstName).toBe('Marie');
      expect(profile!.lastName).toBe('Dupont');
      expect(profile!.companyName).toBe('Acme SAS');
      expect(profile!.siret).toBe('12345678901234');
      expect(profile!.phone).toBe('01 23 45 67 89');
      expect(profile!.invitationMessage).toBe(
        'Bonjour Marie, ravi de vous accueillir.',
      );
    }
  });

  it('Test 2: legacy 3-field call still succeeds — profile sub-key is omitted or empty', async () => {
    await adminCreateInvitation({
      email: 'legacy@example.com',
      displayName: 'Legacy User',
      language: 'en',
    });

    expect(writeAuditLogMock).toHaveBeenCalledTimes(2);
    for (const c of writeAuditLogMock.mock.calls.map((call) => call[0])) {
      const payload = c.payload as { profile?: Record<string, unknown> };
      // Omitted is preferred (decision documented in SUMMARY); empty {} also acceptable.
      const profile = payload.profile;
      const isEmpty =
        profile === undefined ||
        (typeof profile === 'object' && Object.keys(profile).length === 0);
      expect(isEmpty).toBe(true);
    }
  });

  it("Test 3: empty-string extended fields (siret='', invitationMessage='') are dropped from profile", async () => {
    await adminCreateInvitation({
      email: 'partial@example.com',
      displayName: 'Partial User',
      language: 'fr',
      firstName: 'Pierre',
      lastName: 'Martin',
      companyName: 'Acme SAS',
      siret: '',
      phone: '01 02 03 04 05',
      invitationMessage: '',
    });

    expect(writeAuditLogMock).toHaveBeenCalledTimes(2);
    for (const c of writeAuditLogMock.mock.calls.map((call) => call[0])) {
      const profile = (c.payload as { profile?: Record<string, unknown> }).profile!;
      expect(profile).toBeDefined();
      // Empty fields dropped.
      expect('siret' in profile).toBe(false);
      expect('invitationMessage' in profile).toBe(false);
      // Non-empty fields preserved.
      expect(profile.firstName).toBe('Pierre');
      expect(profile.phone).toBe('01 02 03 04 05');
    }
  });

  it('Test 4: invitationMessage is persisted to the audit log when provided', async () => {
    await adminCreateInvitation({
      email: 'msg@example.com',
      displayName: 'Sam Test',
      language: 'fr',
      firstName: 'Sam',
      lastName: 'Test',
      companyName: 'Co',
      phone: '01 99 99 99 99',
      invitationMessage: 'Custom welcome message here.',
    });

    expect(writeAuditLogMock).toHaveBeenCalledTimes(2);
    for (const c of writeAuditLogMock.mock.calls.map((call) => call[0])) {
      const profile = (c.payload as { profile?: Record<string, unknown> }).profile!;
      expect(profile.invitationMessage).toBe('Custom welcome message here.');
    }
  });
});
