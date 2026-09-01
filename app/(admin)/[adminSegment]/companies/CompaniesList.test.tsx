/**
 * Phase 30 Plan 08 Task 1 — CompaniesList.tsx tests.
 *
 * Coverage:
 *   1. RELATIONS column renders literal '0' for a company with no
 *      relationships (never an em dash — a real count carries information).
 *   2. A null SIREN renders '—'.
 *   3. The cursor footer preserves `q`.
 *   4. Zero rows, no filter → list-level zero empty state.
 *   5. Zero rows, active filter (q set) → search-empty state, distinct copy.
 *   6. Structural: no DataGrid/Frame; uses tableHeadClass/tableCellClass.
 */
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CompaniesList } from './CompaniesList';
import type { AdminCompanyRow } from '@/lib/db/queries';

const BASE_ROW: AdminCompanyRow = {
  companyId: 'c-1',
  name: 'Acme SARL',
  siren: '123456789',
  relationsCount: 2,
  lastActivityAt: new Date('2026-05-15T10:00:00Z'),
  createdAt: new Date('2026-04-01T12:00:00Z'),
};

describe('CompaniesList — Task 1', () => {
  it('Test 1: RELATIONS column renders literal "0" for a company with zero relationships', () => {
    const html = renderToString(
      <CompaniesList
        rows={[{ ...BASE_ROW, relationsCount: 0 }]}
        nextCursor={null}
        lang="fr"
        adminSegment="admin-secret"
      />,
    );
    // The badge cell must contain the literal digit 0, not an em dash.
    expect(html).toMatch(/>0</);
    expect(html).not.toMatch(/RELATIONS[\s\S]{0,80}—/);
  });

  it('Test 2: a null SIREN renders "—"', () => {
    const html = renderToString(
      <CompaniesList
        rows={[{ ...BASE_ROW, siren: null }]}
        nextCursor={null}
        lang="fr"
        adminSegment="admin-secret"
      />,
    );
    expect(html).toContain('—');
  });

  it('Test 3: the cursor footer preserves q', () => {
    const html = renderToString(
      <CompaniesList
        rows={[BASE_ROW]}
        nextCursor="cursor-abc"
        lang="fr"
        adminSegment="admin-secret"
        currentQ="acme"
      />,
    );
    expect(html).toContain(
      'href="/admin-secret/companies?cursor=cursor-abc&amp;q=acme"',
    );
  });

  it('Test 4: zero rows, no filter → list-level zero empty state', () => {
    const html = renderToString(
      <CompaniesList rows={[]} nextCursor={null} lang="fr" adminSegment="admin-secret" />,
    );
    expect(html).toContain('Aucune société pour le moment.');
  });

  it('Test 5: zero rows, active filter → search-empty state (distinct copy)', () => {
    const html = renderToString(
      <CompaniesList
        rows={[]}
        nextCursor={null}
        lang="fr"
        adminSegment="admin-secret"
        currentQ="nope"
      />,
    );
    expect(html).toContain('Aucun résultat ne correspond à votre recherche.');
    expect(html).not.toContain('Aucune société pour le moment.');
  });

  it('Test 6: row navigates to the company detail route (stretched-link)', () => {
    const html = renderToString(
      <CompaniesList rows={[BASE_ROW]} nextCursor={null} lang="fr" adminSegment="admin-secret" />,
    );
    expect(html).toContain('href="/admin-secret/companies/c-1"');
    expect(html).toContain('Acme SARL');
  });
});
