/**
 * Phase 18 Plan 03 Task 2 — PartnerRowActions tests (D-10, D-11).
 *
 * UI-SPEC §Partners list lines 345-364 — per-row overflow ⋯ menu with 4
 * conditional actions:
 *   - Renvoyer l'invitation       (status === 'invited')
 *   - Désactiver le compte        (status === 'active')
 *   - Réactiver le compte         (status === 'inactive')
 *   - Voir les propositions       (always, D-11 → /proposals?user_id={partnerId})
 *
 * Tests cover D-10 conditional visibility, D-11 href shape, a11y (aria-expanded,
 * Escape close), and the click-outside hook.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

// Stub the admin server actions — the unit tests don't exercise the actual
// mutations; they verify menu structure, visibility, and a11y.
vi.mock('@/lib/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/admin')>();
  return {
    ...actual,
    adminDisableUser: vi.fn(),
    adminReEnableUser: vi.fn(),
    adminReissueInvitation: vi.fn(),
  };
});

import { PartnerRowActions } from './PartnerRowActions';

afterEach(() => {
  cleanup();
});

describe('PartnerRowActions — D-10 conditional menu items', () => {
  it('Test 5: invited status → Renvoyer + Voir les propositions (2 items)', () => {
    const { container, getByLabelText } = render(
      <PartnerRowActions
        partnerId="p-1"
        status="invited"
        adminSegment="admin-secret"
        lang="fr"
      />,
    );
    // Open menu via the ⋯ trigger.
    const trigger = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    fireEvent.click(trigger);
    // Assert exactly 2 visible menu items.
    const items = container.querySelectorAll('[role="menuitem"]');
    expect(items.length).toBe(2);
    const labels = Array.from(items).map((i) => (i.textContent ?? '').trim());
    expect(labels.some((l) => l.includes("Renvoyer l'invitation"))).toBe(true);
    expect(labels.some((l) => l.includes('Voir les propositions'))).toBe(true);
    // Negative: no Désactiver / Réactiver for invited.
    expect(labels.some((l) => l.startsWith('Désactiver'))).toBe(false);
    expect(labels.some((l) => l.startsWith('Réactiver'))).toBe(false);
    // Just to use the binding from RTL.
    expect(getByLabelText).toBeDefined();
  });

  it('Test 6: active status → Désactiver + Voir les propositions', () => {
    const { container } = render(
      <PartnerRowActions
        partnerId="p-1"
        status="active"
        adminSegment="admin-secret"
        lang="fr"
      />,
    );
    const trigger = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement;
    fireEvent.click(trigger);
    const items = container.querySelectorAll('[role="menuitem"]');
    expect(items.length).toBe(2);
    const labels = Array.from(items).map((i) => (i.textContent ?? '').trim());
    expect(labels.some((l) => l.startsWith('Désactiver'))).toBe(true);
    expect(labels.some((l) => l.includes('Voir les propositions'))).toBe(true);
    expect(labels.some((l) => l.startsWith('Renvoyer'))).toBe(false);
    expect(labels.some((l) => l.startsWith('Réactiver'))).toBe(false);
  });

  it('Test 7: inactive status → Réactiver + Voir les propositions', () => {
    const { container } = render(
      <PartnerRowActions
        partnerId="p-1"
        status="inactive"
        adminSegment="admin-secret"
        lang="fr"
      />,
    );
    const trigger = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement;
    fireEvent.click(trigger);
    const items = container.querySelectorAll('[role="menuitem"]');
    expect(items.length).toBe(2);
    const labels = Array.from(items).map((i) => (i.textContent ?? '').trim());
    expect(labels.some((l) => l.startsWith('Réactiver'))).toBe(true);
    expect(labels.some((l) => l.includes('Voir les propositions'))).toBe(true);
  });
});

describe('PartnerRowActions — D-11 Voir les propositions href', () => {
  it('Test 8: Voir les propositions href = /proposals?user_id={partnerId}', () => {
    const { container } = render(
      <PartnerRowActions
        partnerId="abc-partner-123"
        status="active"
        adminSegment="admin-secret"
        lang="fr"
      />,
    );
    const trigger = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement;
    fireEvent.click(trigger);
    const viewProposalsLink = Array.from(
      container.querySelectorAll('a[role="menuitem"]'),
    ).find((a) => (a.textContent ?? '').includes('Voir les propositions')) as HTMLAnchorElement | undefined;
    expect(viewProposalsLink).toBeDefined();
    expect(viewProposalsLink!.getAttribute('href')).toBe(
      '/proposals?user_id=abc-partner-123',
    );
  });
});

describe('PartnerRowActions — D-10 a11y', () => {
  it('Test 9: click outside the menu closes it', () => {
    const { container } = render(
      <div data-testid="outside-wrapper">
        <PartnerRowActions
          partnerId="p-1"
          status="active"
          adminSegment="admin-secret"
          lang="fr"
        />
      </div>,
    );
    const trigger = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement;
    fireEvent.click(trigger);
    expect(container.querySelectorAll('[role="menuitem"]').length).toBeGreaterThan(0);
    // Simulate a click outside via mousedown on document body.
    fireEvent.mouseDown(document.body);
    expect(container.querySelectorAll('[role="menuitem"]').length).toBe(0);
  });

  it('Test 10: Escape key closes the menu + aria-expanded reflects state', () => {
    const { container } = render(
      <PartnerRowActions
        partnerId="p-1"
        status="active"
        adminSegment="admin-secret"
        lang="fr"
      />,
    );
    const trigger = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    // Escape via keydown on document.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelectorAll('[role="menuitem"]').length).toBe(0);
  });
});
