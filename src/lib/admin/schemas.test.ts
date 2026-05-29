/**
 * Plan 14-02 Task 1 — createPartnerFormSchema validation tests (RED → GREEN).
 *
 * Phase 14 UI-SPEC §5.1: the /partners/new form uses a NEW 7-field schema
 * `createPartnerFormSchema` distinct from the legacy 3-field `createPartnerSchema`
 * (which CreatePartnerModal.tsx still imports — D-10 keeps the modal as shelf code).
 *
 * Coverage:
 *   - Test 1: full valid object parses successfully
 *   - Test 2: missing firstName → issue path 'firstName' + message 'error.field.required'
 *   - Test 3: invalid SIRET (not 14 digits) → 'error.field.siret.invalid'
 *   - Test 4: empty SIRET string is allowed (optional + literal '' branch)
 *   - Test 5: invitationMessage > 1000 chars → 'partners.new.message.tooLong'
 */
import { describe, it, expect } from 'vitest';
import { createPartnerFormSchema } from './schemas';

const VALID = {
  firstName: 'Marie',
  lastName: 'Dupont',
  email: 'marie.dupont@example.com',
  companyName: 'Acme SAS',
  siret: '12345678901234',
  phone: '01 23 45 67 89',
  invitationMessage: 'Bonjour Marie,',
  // Phase 22 Plan 03: partnerType is now required (PTYPE-01, D-03 force-choice).
  partnerType: 'Partenaire' as const,
};

describe('createPartnerFormSchema (Phase 14 UI-SPEC §5.1)', () => {
  it('Test 1: parses a full valid object successfully', () => {
    const r = createPartnerFormSchema.safeParse(VALID);
    expect(r.success).toBe(true);
  });

  it("Test 2: missing firstName → issue path 'firstName' + message 'error.field.required'", () => {
    const r = createPartnerFormSchema.safeParse({ ...VALID, firstName: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const firstNameIssue = r.error.issues.find((i) => i.path[0] === 'firstName');
      expect(firstNameIssue).toBeDefined();
      expect(firstNameIssue!.message).toBe('error.field.required');
    }
  });

  it("Test 3: invalid SIRET (not 14 digits) → 'error.field.siret.invalid'", () => {
    const r = createPartnerFormSchema.safeParse({ ...VALID, siret: '12345' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const siretIssue = r.error.issues.find((i) => i.path[0] === 'siret');
      expect(siretIssue).toBeDefined();
      expect(siretIssue!.message).toBe('error.field.siret.invalid');
    }
  });

  it('Test 4: empty SIRET string is allowed (optional + literal branch)', () => {
    const r = createPartnerFormSchema.safeParse({ ...VALID, siret: '' });
    expect(r.success).toBe(true);
  });

  it("Test 5: invitationMessage > 1000 chars → 'partners.new.message.tooLong'", () => {
    const r = createPartnerFormSchema.safeParse({
      ...VALID,
      invitationMessage: 'x'.repeat(1001),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgIssue = r.error.issues.find((i) => i.path[0] === 'invitationMessage');
      expect(msgIssue).toBeDefined();
      expect(msgIssue!.message).toBe('partners.new.message.tooLong');
    }
  });
});
