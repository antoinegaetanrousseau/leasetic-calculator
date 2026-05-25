/**
 * Plan 14-06 Task 2 — ProposalRow tests (StatusChip via row.displayStatus).
 *
 * Per <behavior> tests 1-4: each ProposalRow displayStatus variant maps to
 * the expected StatusChip className. The chip label is taken from the
 * generic chip.* dictionary (chip.active / chip.draft / chip.expired /
 * chip.deleted) wired in Plan 14-06's dictionary additions.
 *
 * Phase 14 D-27: row.displayStatus is computed server-side (deriveDisplayStatus)
 * during buildListResponse. This test exercises the projected DTO directly to
 * avoid bringing the DB layer into a client-component unit test.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ProposalRowDto } from '@/lib/api/proposals/list';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { ProposalRow } from './ProposalRow';

function makeRow(overrides: Partial<ProposalRowDto> = {}): ProposalRowDto {
  return {
    id: 'prop-1',
    lcRef: 'L-2026-001',
    clientCo: 'ACME Industries',
    amountHT: '100000',
    createdAt: new Date('2026-05-01T10:00:00Z').toISOString(),
    validityDays: 30,
    language: 'fr',
    deletedAt: null,
    displayStatus: 'active',
    ...overrides,
  };
}

afterEach(() => cleanup());

describe('ProposalRow — Plan 14-06 D-27 StatusChip via row.displayStatus', () => {
  it('Test 1: displayStatus="active" → renders <StatusChip variant="active">', () => {
    const { container } = render(<ProposalRow row={makeRow()} lang="fr" />);
    const chip = container.querySelector('.chip.chip-active');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('Actif');
    // Negative — no ad-hoc ValidityChip composition (no chip-expired in active row).
    expect(container.querySelector('.chip-expired')).toBeNull();
  });

  it('Test 2: displayStatus="deleted" → renders <StatusChip variant="deleted">', () => {
    const { container } = render(
      <ProposalRow
        row={makeRow({ displayStatus: 'deleted', deletedAt: new Date().toISOString() })}
        lang="fr"
        deleted
      />,
    );
    const chip = container.querySelector('.chip.chip-deleted');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('Supprimée');
    // Negative — chip-active should not appear on a deleted row.
    expect(container.querySelector('.chip-active')).toBeNull();
  });

  it('Test 3: displayStatus="draft" → renders <StatusChip variant="draft">', () => {
    const { container } = render(
      <ProposalRow row={makeRow({ displayStatus: 'draft' })} lang="fr" />,
    );
    const chip = container.querySelector('.chip.chip-draft');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('Brouillon');
  });

  it('Test 4: displayStatus="expired" → renders <StatusChip variant="expired">', () => {
    const { container } = render(
      <ProposalRow row={makeRow({ displayStatus: 'expired' })} lang="fr" />,
    );
    const chip = container.querySelector('.chip.chip-expired');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('Expirée');
  });

  it('Renders English labels when lang="en"', () => {
    const { container } = render(
      <ProposalRow row={makeRow({ displayStatus: 'active' })} lang="en" />,
    );
    expect(container.querySelector('.chip.chip-active')!.textContent).toContain('Active');
  });

  // ADMIN-09 row-level grep contract (per-row redundancy; the cross-cutting suite
  // in tests/admin-09-grep-contracts.test.ts is the BLOCKING gate).
  it('ADMIN-09 D-29: rendered row HTML contains zero commission strings', () => {
    const { container } = render(<ProposalRow row={makeRow()} lang="fr" />);
    const html = container.innerHTML;
    expect(html, 'ProposalRow HTML must not surface commission_pct').not.toMatch(/\bcommission_pct\b/i);
    expect(html, 'ProposalRow HTML must not surface _pct field-key suffix').not.toMatch(/_pct\b/);
  });
});
