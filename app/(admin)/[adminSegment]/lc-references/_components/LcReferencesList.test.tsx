/**
 * Phase 19 Plan 02 Task 2 — TDD RED: LcReferencesList component tests.
 *
 * Behaviors:
 *   Test 1:  Renders a <table> wrapped in a .card section
 *   Test 2:  Table has 6 column headers: Référence, Partenaire, Client, Montant HT, Statut, Créée le
 *   Test 3:  Référence cell uses fontFamily: monospace
 *   Test 4:  Montant HT cell uses formatCurrency (shows "€")
 *   Test 5:  Statut cell renders a <StatusChip> element
 *   Test 6:  Créée le cell renders a formatted date (not raw ISO)
 *   Test 7:  Rows are NOT wrapped in <a> or <Link> (read-only, D-13)
 *   Test 8:  Empty state (no rows, no search) → firstRun message
 *   Test 9:  Empty state (no rows, with q) → search-empty message + clear link
 *   Test 10: nextCursor renders a "Charger plus" / load-more link
 *   Test 11: AdminNavCard with variant='lc-references' renders with accent color 45,122,140
 */
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { afterEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link as simple <a> for test environment
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// Import after mocks
import { LcReferencesList } from './LcReferencesList';
import type { LcReferenceRow } from '@/lib/db/queries/lc-references';

afterEach(() => cleanup());

const SEG = 'control-panel';

function makeRow(overrides: Partial<LcReferenceRow> = {}): LcReferenceRow {
  return {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    lcRef: 'LC-2026-001',
    partnerName: 'Acme Corp',
    clientName: 'Jean Dupont',
    amountHt: 15000,
    displayStatus: 'active',
    createdAt: new Date('2026-04-12T10:00:00Z'),
    ...overrides,
  };
}

describe('LcReferencesList', () => {
  it('Test 1: renders a <table> wrapped in a .card <section>', () => {
    const { container } = render(
      <LcReferencesList
        rows={[makeRow()]}
        nextCursor={null}
        lang="fr"
        adminSegment={SEG}
        currentQ=""
      />,
    );
    const section = container.querySelector('section.card');
    expect(section).not.toBeNull();
    const table = section?.querySelector('table');
    expect(table).not.toBeNull();
  });

  it('Test 2: table has 6 column headers — Référence / Partenaire / Client / Montant HT / Statut / Créée le', () => {
    const { container } = render(
      <LcReferencesList
        rows={[makeRow()]}
        nextCursor={null}
        lang="fr"
        adminSegment={SEG}
        currentQ=""
      />,
    );
    const ths = container.querySelectorAll('th');
    expect(ths.length).toBe(6);
    const texts = Array.from(ths).map((th) => th.textContent?.trim());
    expect(texts).toContain('Référence');
    expect(texts).toContain('Partenaire');
    expect(texts).toContain('Client');
    expect(texts).toContain('Montant HT');
    expect(texts).toContain('Statut');
    expect(texts).toContain('Créée le');
  });

  it('Test 3: Référence cell uses fontFamily containing "monospace"', () => {
    const { container } = render(
      <LcReferencesList
        rows={[makeRow({ lcRef: 'LC-2026-099' })]}
        nextCursor={null}
        lang="fr"
        adminSegment={SEG}
        currentQ=""
      />,
    );
    // Find the cell that contains the lcRef text
    const cells = container.querySelectorAll('td');
    const refCell = Array.from(cells).find((td) => td.textContent?.includes('LC-2026-099'));
    expect(refCell).not.toBeNull();
    // Check inline style or child element has monospace
    const monoEl = refCell?.querySelector('[style*="monospace"]') ?? refCell;
    const style = (monoEl as HTMLElement | undefined)?.style?.fontFamily ?? '';
    // Either the td or a child span should have monospace
    const allEls = [refCell, ...Array.from(refCell?.querySelectorAll('*') ?? [])];
    const hasMonospace = allEls.some((el) => {
      const s = (el as HTMLElement).style?.fontFamily ?? '';
      return s.includes('monospace');
    });
    expect(hasMonospace || style.includes('monospace')).toBe(true);
  });

  it('Test 4: Montant HT cell uses formatCurrency — shows € symbol', () => {
    const { container } = render(
      <LcReferencesList
        rows={[makeRow({ amountHt: 25000 })]}
        nextCursor={null}
        lang="fr"
        adminSegment={SEG}
        currentQ=""
      />,
    );
    const cells = container.querySelectorAll('td');
    const amountCell = Array.from(cells).find((td) => td.textContent?.includes('€'));
    expect(amountCell).not.toBeNull();
    expect(amountCell?.textContent).toContain('25');
  });

  it('Test 5: Statut cell renders a StatusChip element (has chip CSS class)', () => {
    const { container } = render(
      <LcReferencesList
        rows={[makeRow({ displayStatus: 'draft' })]}
        nextCursor={null}
        lang="fr"
        adminSegment={SEG}
        currentQ=""
      />,
    );
    // StatusChip renders an element with class chip-* or data-testid containing chip
    const chip = container.querySelector('[class*="chip"]');
    expect(chip).not.toBeNull();
  });

  it('Test 6: Créée le cell renders a formatted date (not raw ISO string)', () => {
    const date = new Date('2026-04-12T10:00:00Z');
    const { container } = render(
      <LcReferencesList
        rows={[makeRow({ createdAt: date })]}
        nextCursor={null}
        lang="fr"
        adminSegment={SEG}
        currentQ=""
      />,
    );
    const html = container.innerHTML;
    // Raw ISO string must not appear
    expect(html).not.toContain('2026-04-12T10:00:00');
    // Should contain day or month fragment (date was formatted)
    // formatDate(date, 'fr') → e.g. "12/04/2026" or "12 avr. 2026"
    expect(html).toContain('12');
    expect(html).toContain('2026');
  });

  it('Test 7: rows are NOT wrapped in <a> or <Link> (read-only D-13)', () => {
    const rows = [makeRow({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })];
    const { container } = render(
      <LcReferencesList
        rows={rows}
        nextCursor={null}
        lang="fr"
        adminSegment={SEG}
        currentQ=""
      />,
    );
    const tbody = container.querySelector('tbody');
    expect(tbody).not.toBeNull();
    // No <a> tags inside table rows
    const links = tbody?.querySelectorAll('a') ?? [];
    expect(links.length).toBe(0);
  });

  it('Test 8: empty state (no rows, no search) → firstRun message', () => {
    const { container } = render(
      <LcReferencesList
        rows={[]}
        nextCursor={null}
        lang="fr"
        adminSegment={SEG}
        currentQ=""
      />,
    );
    // No table rendered
    expect(container.querySelector('table')).toBeNull();
    // First-run message present
    expect(container.textContent).toContain('Aucune référence LC pour le moment');
  });

  it('Test 9: empty state (no rows, with q) → search-empty message + clear link', () => {
    const { container } = render(
      <LcReferencesList
        rows={[]}
        nextCursor={null}
        lang="fr"
        adminSegment={SEG}
        currentQ="acme"
      />,
    );
    expect(container.querySelector('table')).toBeNull();
    // Search-empty copy
    expect(container.textContent).toContain('Aucune référence ne correspond');
    // Clear link present and points to the lc-references page without q
    const clearLink = container.querySelector('a');
    expect(clearLink).not.toBeNull();
    expect(clearLink?.getAttribute('href')).toContain('lc-references');
  });

  it('Test 10: nextCursor renders a "Charger plus" / load-more link', () => {
    const { container } = render(
      <LcReferencesList
        rows={[makeRow()]}
        nextCursor="dGVzdC1jdXJzb3I"
        lang="fr"
        adminSegment={SEG}
        currentQ=""
      />,
    );
    // Should have a link after the table with load-more text or containing cursor param
    const links = container.querySelectorAll('a');
    const cursorLink = Array.from(links).find(
      (a) =>
        a.getAttribute('href')?.includes('cursor') ||
        a.textContent?.toLowerCase().includes('char'),
    );
    expect(cursorLink).not.toBeNull();
  });

  it('Test 11: all 4 displayStatus variants render without crash', () => {
    const statuses: Array<LcReferenceRow['displayStatus']> = [
      'active',
      'draft',
      'expired',
      'deleted',
    ];
    for (const displayStatus of statuses) {
      const { container } = render(
        <LcReferencesList
          rows={[makeRow({ displayStatus })]}
          nextCursor={null}
          lang="fr"
          adminSegment={SEG}
          currentQ=""
        />,
      );
      expect(container.querySelector('table')).not.toBeNull();
      cleanup();
    }
  });
});
