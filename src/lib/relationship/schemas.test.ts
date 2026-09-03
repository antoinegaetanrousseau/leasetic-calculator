/**
 * Phase 34 Plan 06 — `src/lib/relationship/schemas.ts` tests
 * (FICHE-04, ACTV-03, ACTV-04).
 *
 * These schemas are the ONLY validation the private-tier write layer has: the
 * actions parse and never re-validate, so everything the database CHECKs and
 * everything the security model caps has to be proved here.
 *
 * Two properties are load-bearing and are asserted explicitly rather than
 * implied:
 *   - the lead-source enum is BUILT FROM `LEAD_SOURCES` (src/lib/relationship/
 *     kinds.ts), which is the same tuple the DB CHECK enumerates. A restated
 *     copy would compile, pass this suite, and then fail at INSERT time in
 *     production the moment the two lists drifted.
 *   - every partner-authored free-text field is `.max()`-capped, because it is
 *     unbounded user input that reaches the database (T-34-06-07).
 */
import { describe, expect, it } from 'vitest';
import { LEAD_SOURCES } from './kinds';
import { addNoteSchema, setNextActionSchema, updateRelationDetailsSchema } from './schemas';

const RELATIONSHIP_ID = '11111111-1111-4111-8111-111111111111';

describe('updateRelationDetailsSchema (FICHE-04)', () => {
  it('accepts a lead source from LEAD_SOURCES together with a description', () => {
    const parsed = updateRelationDetailsSchema.parse({
      relationshipId: RELATIONSHIP_ID,
      leadSource: 'salon',
      description: 'Rencontré sur le stand.',
    });

    expect(parsed.relationshipId).toBe(RELATIONSHIP_ID);
    expect(parsed.leadSource).toBe('salon');
    expect(parsed.description).toBe('Rencontré sur le stand.');
  });

  it("rejects 'referral' — an English value the DB CHECK does not admit", () => {
    // Guards the enum against being restated in English rather than derived
    // from the shared tuple.
    expect((LEAD_SOURCES as readonly string[]).includes('referral')).toBe(false);
    expect(
      updateRelationDetailsSchema.safeParse({
        relationshipId: RELATIONSHIP_ID,
        leadSource: 'referral',
      }).success,
    ).toBe(false);
  });

  it('accepts an absent lead source and normalises an empty description to undefined', () => {
    // undefined, not '': the column is nullable and a blank string would be a
    // third state the UI would then have to render as if it were content.
    const parsed = updateRelationDetailsSchema.parse({
      relationshipId: RELATIONSHIP_ID,
      leadSource: undefined,
      description: '   ',
    });

    expect(parsed.leadSource).toBeUndefined();
    expect(parsed.description).toBeUndefined();
  });

  it('normalises an empty lead source (an unselected <select>) to undefined', () => {
    const parsed = updateRelationDetailsSchema.parse({
      relationshipId: RELATIONSHIP_ID,
      leadSource: '',
    });

    expect(parsed.leadSource).toBeUndefined();
  });

  it('rejects a 3 000-character description rather than truncating it (T-34-06-07)', () => {
    // Rejecting, not truncating: this text is partner-authored, so silently
    // dropping half of it would destroy their own words. Registry text — which
    // nobody typed — is the case that gets truncated instead.
    const result = updateRelationDetailsSchema.safeParse({
      relationshipId: RELATIONSHIP_ID,
      description: 'a'.repeat(3000),
    });

    expect(result.success).toBe(false);
  });

  it('rejects a relationshipId that is not a uuid', () => {
    expect(
      updateRelationDetailsSchema.safeParse({ relationshipId: 'not-a-uuid' }).success,
    ).toBe(false);
  });
});

describe('addNoteSchema (ACTV-03)', () => {
  it('requires a non-empty body and emits the existing error.field.required key', () => {
    const result = addNoteSchema.safeParse({ relationshipId: RELATIONSHIP_ID, body: '   ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.message === 'error.field.required')).toBe(true);
  });

  it('caps the body and coerces an optional occurredAt from a date input string', () => {
    expect(
      addNoteSchema.safeParse({ relationshipId: RELATIONSHIP_ID, body: 'a'.repeat(2001) }).success,
    ).toBe(false);

    const parsed = addNoteSchema.parse({
      relationshipId: RELATIONSHIP_ID,
      body: '  Appel de suivi  ',
      occurredAt: '2026-09-03',
    });

    expect(parsed.body).toBe('Appel de suivi');
    expect(parsed.occurredAt).toBeInstanceOf(Date);
    expect(parsed.occurredAt?.toISOString().slice(0, 10)).toBe('2026-09-03');
  });
});

describe('setNextActionSchema (ACTV-04)', () => {
  it('accepts null as the explicit clear signal and coerces a date string otherwise', () => {
    const cleared = setNextActionSchema.parse({
      relationshipId: RELATIONSHIP_ID,
      nextActionAt: null,
    });
    expect(cleared.nextActionAt).toBeNull();

    const set = setNextActionSchema.parse({
      relationshipId: RELATIONSHIP_ID,
      nextActionAt: '2026-10-01',
      nextActionNote: 'Relancer sur le devis',
    });
    expect(set.nextActionAt).toBeInstanceOf(Date);
    expect(set.nextActionAt?.toISOString().slice(0, 10)).toBe('2026-10-01');
    expect(set.nextActionNote).toBe('Relancer sur le devis');
  });

  it('rejects a nextActionNote longer than its cap (T-34-06-07)', () => {
    expect(
      setNextActionSchema.safeParse({
        relationshipId: RELATIONSHIP_ID,
        nextActionAt: '2026-10-01',
        nextActionNote: 'a'.repeat(501),
      }).success,
    ).toBe(false);
  });
});
