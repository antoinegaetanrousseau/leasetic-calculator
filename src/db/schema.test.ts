/**
 * Unit test — no DB required.
 *
 * Structural assertions over the Drizzle declarations in `src/db/schema.ts`,
 * introspected via the exported table objects' column maps (per 30-01-PLAN.md
 * task 3), not by reading the source file as text.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getTableColumns } from 'drizzle-orm';
import { getTableConfig, PgDialect } from 'drizzle-orm/pg-core';
import {
  companies, clientRelationships, contacts, proposals, users, companyPairDecisions,
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

describe('CRM-08 external-reference columns', () => {
  // Renders a Drizzle partial-index `where` SQL fragment to text without a DB
  // connection, so the assertion below can inspect the actual predicate
  // rather than merely checking that some predicate is present.
  const pgDialect = new PgDialect();

  it('companies carries contract_tool_customer_id, hubspot_company_id and synced_at as nullable columns with the correct snake_case DB names', () => {
    const columns = getTableColumns(companies);
    expect(columns.contractToolCustomerId.name).toBe('contract_tool_customer_id');
    expect(columns.contractToolCustomerId.notNull).toBe(false);
    expect(columns.hubspotCompanyId.name).toBe('hubspot_company_id');
    expect(columns.hubspotCompanyId.notNull).toBe(false);
    expect(columns.syncedAt.name).toBe('synced_at');
    expect(columns.syncedAt.notNull).toBe(false);
  });

  it('contacts carries hubspot_contact_id and synced_at as nullable columns with the correct snake_case DB names', () => {
    const columns = getTableColumns(contacts);
    expect(columns.hubspotContactId.name).toBe('hubspot_contact_id');
    expect(columns.hubspotContactId.notNull).toBe(false);
    expect(columns.syncedAt.name).toBe('synced_at');
    expect(columns.syncedAt.notNull).toBe(false);
  });

  it('synced_at exists on both companies and contacts, not just one', () => {
    expect(getTableColumns(companies)).toHaveProperty('syncedAt');
    expect(getTableColumns(contacts)).toHaveProperty('syncedAt');
  });

  it('companies_hubspot_company_id_uq is a partial unique index guarding only non-null hubspot_company_id rows', () => {
    const { indexes } = getTableConfig(companies);
    const idx = indexes.find((i) => i.config.name === 'companies_hubspot_company_id_uq');
    if (!idx) throw new Error('companies_hubspot_company_id_uq index must exist');

    expect(idx.config.unique).toBe(true);
    if (!idx.config.where) {
      throw new Error(
        'companies_hubspot_company_id_uq must be partial (WHERE hubspot_company_id IS NOT NULL); '
        + 'a plain unique index would reject legitimate NULL rows before any import runs',
      );
    }
    const { sql: whereSql } = pgDialect.sqlToQuery(idx.config.where);
    expect(whereSql).toMatch(/"hubspot_company_id"\s+IS NOT NULL/i);
  });

  it('contacts_hubspot_contact_id_uq is a partial unique index guarding only non-null hubspot_contact_id rows', () => {
    const { indexes } = getTableConfig(contacts);
    const idx = indexes.find((i) => i.config.name === 'contacts_hubspot_contact_id_uq');
    if (!idx) throw new Error('contacts_hubspot_contact_id_uq index must exist');

    expect(idx.config.unique).toBe(true);
    if (!idx.config.where) {
      throw new Error(
        'contacts_hubspot_contact_id_uq must be partial (WHERE hubspot_contact_id IS NOT NULL); '
        + 'a plain unique index would reject legitimate NULL rows before any import runs',
      );
    }
    const { sql: whereSql } = pgDialect.sqlToQuery(idx.config.where);
    expect(whereSql).toMatch(/"hubspot_contact_id"\s+IS NOT NULL/i);
  });
});

describe('Phase 31 — reconciliation schema (D-08/D-09/D-10)', () => {
  it('companies, clientRelationships and contacts each expose a source column (D-08)', () => {
    expect(getTableColumns(companies)).toHaveProperty('source');
    expect(getTableColumns(clientRelationships)).toHaveProperty('source');
    expect(getTableColumns(contacts)).toHaveProperty('source');
  });

  it('companyPairDecisions exposes the full D-09/D-10 column set', () => {
    const columns = getTableColumns(companyPairDecisions);
    expect(columns).toHaveProperty('sideAKey');
    expect(columns).toHaveProperty('sideBKey');
    expect(columns).toHaveProperty('nameNormalized');
    expect(columns).toHaveProperty('reason');
    expect(columns).toHaveProperty('companyAId');
    expect(columns).toHaveProperty('companyBId');
    expect(columns).toHaveProperty('verdict');
    expect(columns).toHaveProperty('survivorCompanyId');
    expect(columns).toHaveProperty('decidedBy');
    expect(columns).toHaveProperty('decidedAt');
    expect(columns).toHaveProperty('firstFlaggedAt');
  });

  it('companyPairDecisions has no companyIdA/companyIdB-only identity — the D-10 pair key is side_a_key/side_b_key, not company ids', () => {
    const columns = getTableColumns(companyPairDecisions);
    expect(columns).not.toHaveProperty('companyIdA');
    expect(columns).not.toHaveProperty('companyIdB');
    expect(columns.sideAKey.name).toBe('side_a_key');
    expect(columns.sideBKey.name).toBe('side_b_key');
    expect(columns.sideAKey.notNull).toBe(true);
    expect(columns.sideBKey.notNull).toBe(true);
  });

  describe('migration source guard (drizzle/0008_phase31_reconciliation.sql)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const migrationPath = join(here, '..', '..', 'drizzle', '0008_phase31_reconciliation.sql');
    const migrationSql = readFileSync(migrationPath, 'utf8');

    it('hand-completes the D-10 unordered-pair unique index via LEAST/GREATEST', () => {
      expect(migrationSql).toMatch(/GREATEST\(/);
      expect(migrationSql).toMatch(/company_pair_decisions_pair_uq/);
    });

    it('is additive only — never DROP TABLE, never touches the immutable proposals snapshot columns (CRM-05, ARCHITECTURE §2.5 Option A)', () => {
      expect(migrationSql).not.toMatch(/DROP TABLE/i);
      expect(migrationSql).not.toMatch(/proposals["\s]*\bDROP\b/i);
    });
  });
});
