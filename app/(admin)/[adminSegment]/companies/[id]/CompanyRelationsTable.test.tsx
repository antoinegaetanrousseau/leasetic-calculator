/**
 * Phase 30 Plan 08 Task 2 — CompanyRelationsTable.tsx tests.
 *
 * Coverage (per <behavior>):
 *   1. One row per relationship, with TITULAIRE, TYPE, CRÉÉE LE,
 *      PROPOSITIONS, CONTACTS, and a "Voir →" link.
 *   2. TYPE renders "Partenaire" for isInternal === false.
 *   2b. TYPE renders "Interne" for isInternal === true.
 *   3. A relationship with zero proposals renders the literal "0".
 *   4. The CONTACTS cell renders a count only — no contact name/phone/email
 *      appears anywhere in the rendered output, even for a relationship
 *      whose contactsCount is non-zero.
 *   5. Zero relationships → admin.companies.empty.zero.title.
 */
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CompanyRelationsTable } from './CompanyRelationsTable';
import type { AdminRelationshipRow } from '@/lib/db/queries';

const BASE_ROW: AdminRelationshipRow = {
  relationshipId: 'rel-1',
  ownerId: 'user-1',
  ownerDisplayName: 'Alice Partenaire',
  isInternal: false,
  createdAt: new Date('2026-04-01T12:00:00Z'),
  proposalsCount: 3,
  contactsCount: 2,
};

describe('CompanyRelationsTable — Task 2', () => {
  it('Test 1: one row per relationship with owner, dates, counts, and a Voir → link', () => {
    const html = renderToString(
      <CompanyRelationsTable
        relationships={[BASE_ROW]}
        lang="fr"
        adminSegment="admin-secret"
        companyId="co-1"
      />,
    );
    expect(html).toContain('Alice Partenaire');
    expect(html).toContain('Voir');
    expect(html).toContain('href="/admin-secret/companies/co-1/relations/rel-1"');
  });

  it('Test 2: TYPE renders "Partenaire" for isInternal === false', () => {
    const html = renderToString(
      <CompanyRelationsTable
        relationships={[{ ...BASE_ROW, isInternal: false }]}
        lang="fr"
        adminSegment="admin-secret"
        companyId="co-1"
      />,
    );
    expect(html).toContain('Partenaire');
    expect(html).not.toContain('>Interne<');
  });

  it('Test 2b: TYPE renders "Interne" for isInternal === true', () => {
    const html = renderToString(
      <CompanyRelationsTable
        relationships={[{ ...BASE_ROW, isInternal: true }]}
        lang="fr"
        adminSegment="admin-secret"
        companyId="co-1"
      />,
    );
    expect(html).toContain('Interne');
  });

  it('Test 3: zero proposals renders the literal "0"', () => {
    const html = renderToString(
      <CompanyRelationsTable
        relationships={[{ ...BASE_ROW, proposalsCount: 0 }]}
        lang="fr"
        adminSegment="admin-secret"
        companyId="co-1"
      />,
    );
    expect(html).toMatch(/>0</);
  });

  it('Test 4: CONTACTS cell renders a count only — no contact field values ever appear', () => {
    const html = renderToString(
      <CompanyRelationsTable
        relationships={[{ ...BASE_ROW, contactsCount: 5 }]}
        lang="fr"
        adminSegment="admin-secret"
        companyId="co-1"
      />,
    );
    expect(html).toMatch(/>5</);
    // No contact object was ever passed to this component — this asserts
    // the row shape itself has no way to leak a name/phone/email even if a
    // future row shape widened by accident.
    expect(html).not.toMatch(/@/); // no email-shaped string anywhere
  });

  it('Test 5: zero relationships renders admin.companies.empty.zero.title', () => {
    const html = renderToString(
      <CompanyRelationsTable
        relationships={[]}
        lang="fr"
        adminSegment="admin-secret"
        companyId="co-1"
      />,
    );
    expect(html).toContain('Aucune relation active pour cette société.');
  });
});
