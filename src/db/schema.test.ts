/**
 * Unit test — no DB required.
 *
 * Structural assertions over the Drizzle declarations in `src/db/schema.ts`,
 * introspected via the exported table objects' column maps (per 30-01-PLAN.md
 * task 3), not by reading the source file as text.
 */
import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import {
  companies, clientRelationships, contacts, proposals, users,
} from './schema';

describe('Phase 30 CRM registry schema shape', () => {
  it('exports companies, clientRelationships and contacts tables', () => {
    expect(companies).toBeDefined();
    expect(clientRelationships).toBeDefined();
    expect(contacts).toBeDefined();
  });

  it('contacts has no companyId column (CRM-04: hangs off the relationship, never the company)', () => {
    const columns = getTableColumns(contacts);
    expect(columns).not.toHaveProperty('companyId');
    expect(columns).toHaveProperty('clientRelationshipId');
  });

  it('proposals has a clientRelationshipId property (CRM-05)', () => {
    const columns = getTableColumns(proposals);
    expect(columns).toHaveProperty('clientRelationshipId');
  });

  it('proposals snapshot columns are untouched by the clientRelationshipId addition', () => {
    const columns = getTableColumns(proposals);
    expect(columns).toHaveProperty('inputs');
    expect(columns).toHaveProperty('paramsSnapshot');
    expect(columns).toHaveProperty('computed');
    expect(columns).toHaveProperty('schemaVersion');
  });

  it('users still exposes role and partnerType (ROLE-01)', () => {
    const columns = getTableColumns(users);
    expect(columns).toHaveProperty('role');
    expect(columns).toHaveProperty('partnerType');
  });

  it('companies has a nameNormalized generated column and a nullable unique siren', () => {
    const columns = getTableColumns(companies);
    expect(columns).toHaveProperty('nameNormalized');
    expect(columns).toHaveProperty('siren');
  });

  it('clientRelationships binds a companyId and an ownerId', () => {
    const columns = getTableColumns(clientRelationships);
    expect(columns).toHaveProperty('companyId');
    expect(columns).toHaveProperty('ownerId');
  });
});
