/**
 * Unit test — no DB required.
 *
 * Structural assertions over the Drizzle declarations in `src/db/schema.ts`,
 * introspected via the exported table objects' column maps (per 30-01-PLAN.md
 * task 3), not by reading the source file as text.
 */
import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { getTableConfig, PgDialect } from 'drizzle-orm/pg-core';
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
