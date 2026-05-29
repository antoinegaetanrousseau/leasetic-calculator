/**
 * Phase 18 Plan 03 Task 1 — PartnersList tests (D-08, D-13, D-14).
 *
 * Coverage:
 *   Test 10 (D-14 rename): import path 'PartnersList' resolves; symbol exists.
 *   Test 11 (6 columns): thead has exactly 6 <th> with the correct uppercase labels.
 *   Test 12 (D-08 em-dash fallback): null lastActivityAt → literal "—" cell.
 *   Test 13 (D-13 empty state, zero filter): renders "Aucun partenaire pour le moment." + Inviter CTA.
 *   Test 14 (D-13 empty state, filter active): renders "Aucun partenaire ne correspond aux filtres." + Effacer link.
 *   Test 15 (D-14 scrub): grep gate — no "AccountsList" or "accountsList" in current file.
 *
 * No commission rendering — covered separately by tests/admin-09-grep-contracts.test.ts
 * post-rename in this same plan.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

import { PartnersList } from './PartnersList';
import type { PartnerRow } from '@/lib/db/queries/partners';

function makeRow(overrides: Partial<PartnerRow> = {}): PartnerRow {
  return {
    id: 'p-1',
    email: 'alice@example.com',
    name: 'Alice Example',
    status: 'active',
    createdAt: new Date('2026-04-01T12:00:00Z'),
    lastActivityAt: new Date('2026-05-15T10:00:00Z'),
    // Phase 22 Plan 03: partnerType added to PartnerRow (PTYPE-01 D-07).
    partnerType: 'Partenaire',
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe('PartnersList — D-14 rename verification', () => {
  it('Test 10: PartnersList symbol is exported from ./PartnersList', () => {
    expect(typeof PartnersList).toBe('function');
  });
});

describe('PartnersList — 6-column table (UI-SPEC §Partners list)', () => {
  it('Test 11: thead has exactly 6 <th> elements with uppercase labels', () => {
    const rows = [makeRow()];
    const { container } = render(
      <PartnersList
        rows={rows}
        nextCursor={null}
        lang="fr"
        adminSegment="admin-secret"
      />,
    );
    const ths = container.querySelectorAll('thead th');
    // Phase 22 Plan 03: 7 columns now (added TYPE col between STATUT and ⋯).
    expect(ths.length).toBe(7);
    const labels = Array.from(ths).map((th) => (th.textContent ?? '').trim());
    // Per UI-SPEC §Partners list line 332-337 + PTYPE-01 D-07 type col.
    expect(labels[0]).toBe('PARTENAIRE');
    expect(labels[1]).toBe('EMAIL');
    expect(labels[2]).toBe('DATE CRÉATION');
    expect(labels[3]).toBe('DERNIÈRE ACTIVITÉ');
    expect(labels[4]).toBe('STATUT');
    expect(labels[5]).toBe('TYPE');
    // Column 7 header is non-text (visual ⋯ or sr-only) — assert it exists but
    // does NOT include the same label as cols 1-6.
    expect(labels[6]).not.toBe('PARTENAIRE');
  });

  it('Test 11 (cont.): renders one <tr> per row with 7 cells each', () => {
    const rows = [
      makeRow({ id: 'p-a' }),
      makeRow({ id: 'p-b', email: 'bob@example.com', name: 'Bob' }),
    ];
    const { container } = render(
      <PartnersList rows={rows} nextCursor={null} lang="fr" adminSegment="admin-secret" />,
    );
    const trs = container.querySelectorAll('tbody tr');
    expect(trs.length).toBe(2);
    for (const tr of Array.from(trs)) {
      const tds = tr.querySelectorAll('td');
      // Phase 22 Plan 03: 7 cells now (added TYPE col between STATUT and ⋯).
      expect(tds.length).toBe(7);
    }
  });
});

describe('PartnersList — D-08 em-dash fallback', () => {
  it('Test 12: lastActivityAt=null renders the literal em-dash "—" in cell 4', () => {
    const rows = [makeRow({ id: 'p-no-acts', lastActivityAt: null })];
    const { container } = render(
      <PartnersList rows={rows} nextCursor={null} lang="fr" adminSegment="admin-secret" />,
    );
    const cells = container.querySelectorAll('tbody tr td');
    // Phase 22 Plan 03: 7 cells per row now.
    expect(cells.length).toBe(7);
    // Cell index 3 = DERNIÈRE ACTIVITÉ (0-indexed: 0 PARTENAIRE / 1 EMAIL / 2 DATE / 3 DERNIÈRE / 4 STATUT / 5 TYPE / 6 ⋯)
    expect((cells[3].textContent ?? '').trim()).toBe('—');
  });
});

describe('PartnersList — D-13 empty states', () => {
  it('Test 13: empty rows + no filter → "Aucun partenaire pour le moment." + Inviter CTA', () => {
    const { container } = render(
      <PartnersList rows={[]} nextCursor={null} lang="fr" adminSegment="admin-secret" />,
    );
    expect(container.textContent ?? '').toContain('Aucun partenaire pour le moment');
    // Inviter CTA is a Link to /<seg>/partners/new with .btn-green chrome.
    const cta = container.querySelector('a.btn-green[href="/admin-secret/partners/new"]');
    expect(cta).not.toBeNull();
    expect((cta!.textContent ?? '').trim()).toContain('Inviter un partenaire');
  });

  it('Test 14: empty rows + filter active → "Aucun partenaire ne correspond aux filtres." + Effacer link', () => {
    const { container } = render(
      <PartnersList
        rows={[]}
        nextCursor={null}
        lang="fr"
        adminSegment="admin-secret"
        currentStatus="invited"
      />,
    );
    expect(container.textContent ?? '').toContain('Aucun partenaire ne correspond aux filtres');
    const clearLink = container.querySelector('a[href="/admin-secret/partners"]');
    expect(clearLink).not.toBeNull();
    expect((clearLink!.textContent ?? '').trim()).toContain('Effacer les filtres');
  });

  it('Test 14 (cont.): empty rows + q filter active → also shows the filter-empty state', () => {
    const { container } = render(
      <PartnersList
        rows={[]}
        nextCursor={null}
        lang="fr"
        adminSegment="admin-secret"
        currentQ="marie"
      />,
    );
    expect(container.textContent ?? '').toContain('Aucun partenaire ne correspond aux filtres');
  });
});

describe('PartnersList — D-14 file-content scrub', () => {
  it('Test 15: the PartnersList source file does NOT reference the prior "AccountsList" identifier', async () => {
    // Read the compiled file via fs at test time — defense in depth post-rename.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const src = await fs.readFile(
      path.resolve(process.cwd(), 'app/(admin)/[adminSegment]/partners/PartnersList.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/AccountsList/);
    expect(src).not.toMatch(/accountsList/);
  });
});
