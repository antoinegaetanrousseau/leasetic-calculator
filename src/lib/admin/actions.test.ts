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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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
    _setMock: setMock,
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

import {
  adminCreateInvitation,
  adminUpdatePartnerType,
  adminUpdatePartnerCompanyTelephone,
} from './actions';

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
    role: 'partner',
  });
  (inst as unknown as { _setMock: ReturnType<typeof vi.fn> })._setMock.mockClear();
});

/** Test-only accessor for the hoisted db mock's findFirst/set spies. */
function dbSpies() {
  const inst = dbMock();
  return inst as unknown as {
    _findFirstMock: ReturnType<typeof vi.fn>;
    _setMock: ReturnType<typeof vi.fn>;
  };
}

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

describe('Phase 30 Plan 03 (ROLE-01/02) — adminCreateInvitation derives role from partnerType', () => {
  it('partnerType "Commercial" writes role: "sales"', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ id: 'user-2', role: 'partner' });
    await adminCreateInvitation({
      email: 'commercial@example.com',
      displayName: 'Commercial User',
      language: 'fr',
      partnerType: 'Commercial',
    });
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(setCall.role).toBe('sales');
  });

  it.each(['Agent', 'Partenaire'] as const)(
    'partnerType %s writes role: "partner"',
    async (partnerType) => {
      dbSpies()._findFirstMock.mockResolvedValue({ id: 'user-3', role: 'partner' });
      await adminCreateInvitation({
        email: `${partnerType.toLowerCase()}@example.com`,
        displayName: 'Some User',
        language: 'fr',
        partnerType,
      });
      const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
      expect(setCall.role).toBe('partner');
    },
  );

  it('partnerType omitted leaves role untouched (no role key in the .set() payload)', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ id: 'user-4', role: 'partner' });
    await adminCreateInvitation({
      email: 'legacy2@example.com',
      displayName: 'Legacy User',
      language: 'en',
    });
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect('role' in setCall).toBe(false);
  });

  it('never overwrites an existing "admin" row\'s role, even when partnerType is "Commercial"', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ id: 'admin-user', role: 'admin' });
    await adminCreateInvitation({
      email: 'admin-reinvite@example.com',
      displayName: 'Admin User',
      language: 'fr',
      partnerType: 'Commercial',
    });
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect('role' in setCall).toBe(false);
  });

  it('records the derived role in the user.create audit payload when written', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ id: 'user-5', role: 'partner' });
    await adminCreateInvitation({
      email: 'audited@example.com',
      displayName: 'Audited User',
      language: 'fr',
      partnerType: 'Commercial',
    });
    const userCreateCall = writeAuditLogMock.mock.calls
      .map((c) => c[0])
      .find((c) => c.action === 'user.create');
    expect((userCreateCall!.payload as { role?: string }).role).toBe('sales');
    // ADMIN-09 — no commission/rate field anywhere in the payload.
    const payloadStr = JSON.stringify(userCreateCall!.payload);
    expect(payloadStr.toLowerCase()).not.toContain('commission');
  });

  it('never writes role: "admin" anywhere in adminCreateInvitation (grep-level contract)', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'actions.ts'), 'utf8');
    expect(src).not.toMatch(/role:\s*'admin'/);
  });
});

describe('Phase 30 Plan 03 (ROLE-01/02) — adminUpdatePartnerType moves role with partnerType', () => {
  it('moving a user to "Commercial" sets role: "sales" alongside partnerType', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ partnerType: 'Agent', role: 'partner' });
    await adminUpdatePartnerType('user-1', 'Commercial');
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(setCall.partnerType).toBe('Commercial');
    expect(setCall.role).toBe('sales');
  });

  it('moving a user away from "Commercial" sets role: "partner"', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ partnerType: 'Commercial', role: 'sales' });
    await adminUpdatePartnerType('user-1', 'Agent');
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(setCall.partnerType).toBe('Agent');
    expect(setCall.role).toBe('partner');
  });

  it('never demotes an existing "admin" row\'s role, even when moved to "Commercial"', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ partnerType: 'Agent', role: 'admin' });
    await adminUpdatePartnerType('admin-user', 'Commercial');
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(setCall.partnerType).toBe('Commercial');
    expect('role' in setCall).toBe(false);
  });

  it('no-op guard (same type) skips the write entirely — no role key to inspect', async () => {
    dbSpies()._setMock.mockClear();
    dbSpies()._findFirstMock.mockResolvedValue({ partnerType: 'Agent', role: 'partner' });
    await adminUpdatePartnerType('user-1', 'Agent');
    expect(dbSpies()._setMock).not.toHaveBeenCalled();
  });

  it('does not include a commission/rate field in the audit payload', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ partnerType: 'Agent', role: 'partner' });
    await adminUpdatePartnerType('user-1', 'Commercial');
    const call = writeAuditLogMock.mock.calls.at(-1)![0];
    const payloadStr = JSON.stringify(call.payload);
    expect(payloadStr.toLowerCase()).not.toContain('commission');
  });
});

describe('Phase 42 — telephone persistence (D-13 / D-19)', () => {
  it("phone (company telephone) writes companyTelephone into the users UPDATE's set object", async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ id: 'user-6', role: 'partner' });
    await adminCreateInvitation({
      email: 'company-phone@example.com',
      displayName: 'Company Phone User',
      language: 'fr',
      phone: '01 23 45 67 89',
    });
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(setCall.companyTelephone).toBe('01 23 45 67 89');
  });

  it("telephone (partner's own) writes telephone into the users UPDATE's set object", async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ id: 'user-7', role: 'partner' });
    await adminCreateInvitation({
      email: 'own-telephone@example.com',
      displayName: 'Own Telephone User',
      language: 'fr',
      telephone: '06 12 34 56 78',
    });
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(setCall.telephone).toBe('06 12 34 56 78');
  });

  it('omitting both telephones leaves neither key present in the set object', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ id: 'user-8', role: 'partner' });
    await adminCreateInvitation({
      email: 'no-phones@example.com',
      displayName: 'No Phones User',
      language: 'fr',
    });
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect('companyTelephone' in setCall).toBe(false);
    expect('telephone' in setCall).toBe(false);
  });

  it("phone: '' also omits companyTelephone — an absent value must not overwrite an existing column", async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ id: 'user-9', role: 'partner' });
    await adminCreateInvitation({
      email: 'empty-phone@example.com',
      displayName: 'Empty Phone User',
      language: 'fr',
      phone: '',
      telephone: '',
    });
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect('companyTelephone' in setCall).toBe(false);
    expect('telephone' in setCall).toBe(false);
  });

  it('existing language/partnerType/roleUpdate behaviour is unchanged and exactly ONE users UPDATE is issued', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ id: 'user-10', role: 'partner' });
    await adminCreateInvitation({
      email: 'full@example.com',
      displayName: 'Full User',
      language: 'en',
      partnerType: 'Agent',
      phone: '01 23 45 67 89',
      telephone: '06 12 34 56 78',
    });
    expect(dbSpies()._setMock).toHaveBeenCalledTimes(1);
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(setCall.language).toBe('en');
    expect(setCall.partnerType).toBe('Agent');
    expect(setCall.companyTelephone).toBe('01 23 45 67 89');
    expect(setCall.telephone).toBe('06 12 34 56 78');
  });

  it('the audit_log profile payload still contains phone and telephone when supplied', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ id: 'user-11', role: 'partner' });
    await adminCreateInvitation({
      email: 'audited-phones@example.com',
      displayName: 'Audited Phones User',
      language: 'fr',
      phone: '01 23 45 67 89',
      telephone: '06 12 34 56 78',
    });
    const userCreateCall = writeAuditLogMock.mock.calls
      .map((c) => c[0])
      .find((c) => c.action === 'user.create');
    const profile = (userCreateCall!.payload as { profile?: Record<string, unknown> }).profile;
    expect(profile).toBeDefined();
    expect(profile!.phone).toBe('01 23 45 67 89');
    expect(profile!.telephone).toBe('06 12 34 56 78');
  });
});

/* ─────────────────────────────────────────────────────────────────────────── */
/*  adminUpdatePartnerCompanyTelephone (FIELD-02 follow-up)                    */
/* ─────────────────────────────────────────────────────────────────────────── */

describe('adminUpdatePartnerCompanyTelephone — FIELD-02 admin edit path', () => {
  it('writes the trimmed telephone into companyTelephone', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ companyTelephone: null, role: 'partner' });
    await adminUpdatePartnerCompanyTelephone('user-1', '  01 23 45 67 89  ');
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(setCall.companyTelephone).toBe('01 23 45 67 89');
  });

  it('NEVER writes the partner\'s own `telephone` column — that is PROF-02\'s gate field', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ companyTelephone: null, role: 'partner' });
    await adminUpdatePartnerCompanyTelephone('user-1', '01 23 45 67 89');
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect('telephone' in setCall).toBe(false);
    expect(Object.keys(setCall)).toEqual(['companyTelephone']);
  });

  it('an empty string is a deliberate CLEAR → writes null', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ companyTelephone: '01 23 45 67 89', role: 'partner' });
    await adminUpdatePartnerCompanyTelephone('user-1', '');
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(setCall.companyTelephone).toBeNull();
  });

  it('a whitespace-only string is also a CLEAR, not a validation failure', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ companyTelephone: '01 23 45 67 89', role: 'partner' });
    await adminUpdatePartnerCompanyTelephone('user-1', '   ');
    const setCall = dbSpies()._setMock.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(setCall.companyTelephone).toBeNull();
  });

  it('no-op guard: an unchanged value skips both the write and the audit row', async () => {
    dbSpies()._setMock.mockClear();
    dbSpies()._findFirstMock.mockResolvedValue({ companyTelephone: '01 23 45 67 89', role: 'partner' });
    await adminUpdatePartnerCompanyTelephone('user-1', '01 23 45 67 89');
    expect(dbSpies()._setMock).not.toHaveBeenCalled();
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it('audits the change with before/after under user.company_telephone_change', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ companyTelephone: '01 11 11 11 11', role: 'partner' });
    await adminUpdatePartnerCompanyTelephone('user-1', '02 22 22 22 22');
    const call = writeAuditLogMock.mock.calls.at(-1)![0];
    expect(call.action).toBe('user.company_telephone_change');
    expect(call.actorId).toBe('admin-1');
    expect(call.payload).toMatchObject({
      userId: 'user-1',
      before: '01 11 11 11 11',
      after: '02 22 22 22 22',
    });
  });

  it('ADMIN-09: no commission/rate token in the audit payload', async () => {
    dbSpies()._findFirstMock.mockResolvedValue({ companyTelephone: null, role: 'partner' });
    await adminUpdatePartnerCompanyTelephone('user-1', '01 23 45 67 89');
    const call = writeAuditLogMock.mock.calls.at(-1)![0];
    expect(JSON.stringify(call.payload).toLowerCase()).not.toContain('commission');
  });

  // ── Authorization ─────────────────────────────────────────────────────────
  it('T-22-03-E: a non-admin caller is rejected BEFORE any read or write', async () => {
    requireAdminMock.mockRejectedValue(new Error('Forbidden'));
    dbSpies()._setMock.mockClear();
    await expect(
      adminUpdatePartnerCompanyTelephone('user-1', '01 23 45 67 89'),
    ).rejects.toThrow('Forbidden');
    expect(dbSpies()._findFirstMock).not.toHaveBeenCalled();
    expect(dbSpies()._setMock).not.toHaveBeenCalled();
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  // ── Rejections ────────────────────────────────────────────────────────────
  it('rejects a malformed telephone without writing', async () => {
    dbSpies()._setMock.mockClear();
    dbSpies()._findFirstMock.mockResolvedValue({ companyTelephone: null, role: 'partner' });
    await expect(
      adminUpdatePartnerCompanyTelephone('user-1', 'not-a-phone'),
    ).rejects.toThrow('error.field.phone.invalid');
    expect(dbSpies()._setMock).not.toHaveBeenCalled();
  });

  it('rejects an unknown userId with a bounded error key', async () => {
    dbSpies()._findFirstMock.mockResolvedValue(undefined);
    await expect(
      adminUpdatePartnerCompanyTelephone('ghost', '01 23 45 67 89'),
    ).rejects.toThrow('admin.partners.error.phone_change');
  });

  it('refuses to write an admin row — this action is partner-side only', async () => {
    dbSpies()._setMock.mockClear();
    dbSpies()._findFirstMock.mockResolvedValue({ companyTelephone: null, role: 'admin' });
    await expect(
      adminUpdatePartnerCompanyTelephone('admin-user', '01 23 45 67 89'),
    ).rejects.toThrow('admin.partners.error.phone_change');
    expect(dbSpies()._setMock).not.toHaveBeenCalled();
  });

  it('never leaks a raw DB error to the caller', async () => {
    dbSpies()._findFirstMock.mockRejectedValue(new Error('connection to 10.0.0.5 refused'));
    await expect(
      adminUpdatePartnerCompanyTelephone('user-1', '01 23 45 67 89'),
    ).rejects.toThrow('admin.partners.error.phone_change');
  });
});
