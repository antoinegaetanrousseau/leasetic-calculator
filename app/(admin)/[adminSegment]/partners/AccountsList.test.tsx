/**
 * Plan 14-06 Task 1 — AccountsList tests (StatusChip + Link CTA + D-10/D-11/D-12).
 *
 * Coverage (per <behavior> tests 2-6 in 14-06-PLAN.md):
 *
 *   2: invitedUserIds contains a partner's id → row shows StatusChip variant="invited" (gold).
 *   3: disabled partner not in invitedUserIds → row shows StatusChip variant="disabled" (red).
 *   3b: active partner not in invitedUserIds, not disabled → row shows StatusChip variant="active".
 *   4: CTA is an <a class="btn-green" href="/{seg}/partners/new"> — NOT a <button>.
 *   5: clicking the CTA does NOT mount CreatePartnerModal (Link navigates; no modal toggle).
 *   6: CreatePartnerModal can still be rendered standalone — D-10 shelf-code preservation.
 *
 * Test 1 (page-level: partners/page.tsx must call listInvitedPartners + pass invitedUserIds)
 * is asserted via the partners/page integration check in `page.tsx` import-grep + the
 * AccountsListProps type contract (TypeScript narrowing). No separate page.test.tsx for the
 * partners list page exists; the contract-grep in plan verify gates covers it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, fireEvent } from '@testing-library/react';
import type { PartnerWithCount } from '@/lib/db/queries/users';

vi.mock('server-only', () => ({}));

// Stub next/navigation.useRouter — refreshAfterAction calls router.refresh()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

// Sonner toast — irrelevant to chip / CTA assertions; stub to avoid console noise.
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

// Stub admin actions — none are exercised by the AccountsList tests, but the CreatePartnerModal
// standalone smoke render (Test 6) needs createPartnerSchema + adminCreateInvitation from the
// real module. Partial-mock pattern keeps the schema + action types intact while overriding the
// 4 admin* mutation actions that AccountsList imports with vi.fn() stubs.
vi.mock('@/lib/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/admin')>();
  return {
    ...actual,
    adminDisableUser: vi.fn(),
    adminReEnableUser: vi.fn(),
    adminCreatePasswordReset: vi.fn(),
    adminReissueInvitation: vi.fn(),
  };
});

import { AccountsList } from './AccountsList';
import { CreatePartnerModal } from './CreatePartnerModal';

function makePartner(overrides: Partial<PartnerWithCount> = {}): PartnerWithCount {
  return {
    id: 'partner-1',
    email: 'alice@example.com',
    displayName: 'Alice Example',
    name: 'Alice Example',
    role: 'partner',
    deletedAt: null,
    lastLoginAt: new Date('2026-05-15T10:00:00Z'),
    createdAt: new Date('2026-04-01T12:00:00Z'),
    language: 'fr',
    proposalsCount: 0,
    hasUnredeemedInvite: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('AccountsList — Plan 14-06 D-26 + D-11 + D-12', () => {
  it('Test 2: invitedUserIds contains a partner → renders StatusChip variant="invited"', () => {
    const partners = [makePartner({ id: 'p-invited', email: 'invited@example.com' })];
    const invitedUserIds = new Set(['p-invited']);

    const { container } = render(
      <AccountsList
        lang="fr"
        initialPartners={partners}
        invitedUserIds={invitedUserIds}
        adminSegment="admin-secret"
        nowMs={Date.now()}
      />,
    );

    const chip = container.querySelector('.chip.chip-invited');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('invité.e');
    // Negative: no chip-active / chip-disabled in the status column for this row.
    expect(container.querySelectorAll('.chip-active').length).toBe(0);
    expect(container.querySelectorAll('.chip-disabled').length).toBe(0);
  });

  it('Test 3: disabled partner not in invitedUserIds → StatusChip variant="disabled"', () => {
    const partners = [
      makePartner({
        id: 'p-disabled',
        email: 'disabled@example.com',
        deletedAt: new Date('2026-05-10T00:00:00Z'),
      }),
    ];
    const invitedUserIds = new Set<string>(); // empty

    const { container } = render(
      <AccountsList
        lang="fr"
        initialPartners={partners}
        invitedUserIds={invitedUserIds}
        adminSegment="admin-secret"
        nowMs={Date.now()}
      />,
    );

    const chip = container.querySelector('.chip.chip-disabled');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('Désactivé');
    expect(container.querySelectorAll('.chip-invited').length).toBe(0);
  });

  it('Test 3b: non-invited, non-disabled partner → StatusChip variant="active"', () => {
    const partners = [
      makePartner({ id: 'p-active', email: 'active@example.com', deletedAt: null }),
    ];
    const invitedUserIds = new Set<string>(); // empty — not invited

    const { container } = render(
      <AccountsList
        lang="fr"
        initialPartners={partners}
        invitedUserIds={invitedUserIds}
        adminSegment="admin-secret"
        nowMs={Date.now()}
      />,
    );

    const chip = container.querySelector('.chip.chip-active');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('Actif');
  });

  it('Test 4: CTA is an <a class="btn-green" href="/{seg}/partners/new"> — NOT a <button>', () => {
    const partners = [makePartner()];
    const { container } = render(
      <AccountsList
        lang="fr"
        initialPartners={partners}
        invitedUserIds={new Set()}
        adminSegment="admin-secret"
        nowMs={Date.now()}
      />,
    );

    const link = container.querySelector('a.btn-green[href*="/partners/new"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('/admin-secret/partners/new');

    // Negative — no <button class="btn-green"> CTA exists. (Row-action buttons use
    // .btn-out chrome, not .btn-green, so this check is unambiguous.)
    expect(container.querySelector('button.btn-green')).toBeNull();
  });

  it('Test 5: clicking the CTA does NOT mount CreatePartnerModal anywhere in the tree', () => {
    const partners = [makePartner()];
    const { container } = render(
      <AccountsList
        lang="fr"
        initialPartners={partners}
        invitedUserIds={new Set()}
        adminSegment="admin-secret"
        nowMs={Date.now()}
      />,
    );

    const link = container.querySelector('a.btn-green[href*="/partners/new"]');
    expect(link).not.toBeNull();
    // Click — Link navigation is a no-op in jsdom; what we assert is the absence of
    // a modal root in the tree. CreatePartnerModal sets a dialog role on its panel.
    fireEvent.click(link!);

    // CreatePartnerModal renders a [role="dialog"] panel; assert NONE exists.
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });

  it('Test 5 (empty-state variant): CTA in empty state is also a Link, not a button', () => {
    const { container } = render(
      <AccountsList
        lang="fr"
        initialPartners={[]}
        invitedUserIds={new Set()}
        adminSegment="admin-secret"
        nowMs={Date.now()}
      />,
    );

    const link = container.querySelector('a.btn-green[href*="/partners/new"]');
    expect(link).not.toBeNull();
    expect(container.querySelector('button.btn-green')).toBeNull();
    // No modal mounted in empty state either.
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('CreatePartnerModal — D-10 shelf-code preservation', () => {
  it('Test 6: modal renders standalone (negative case keeps the modal code warm)', () => {
    // Standalone smoke render — proves the file still exports a working component
    // even though it is no longer triggered from AccountsList. If a future refactor
    // accidentally deletes CreatePartnerModal.tsx, this test fails at import time.
    const { container } = render(
      <CreatePartnerModal
        lang="fr"
        onClose={() => {}}
        onCreated={() => {}}
      />,
    );

    // Modal mounts a [role="dialog"] panel with the create-partner title.
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
  });
});
