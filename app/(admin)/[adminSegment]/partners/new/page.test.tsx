/**
 * Plan 14-02 Task 2 — /partners/new server-component page tests (RED → GREEN).
 * Plan 18-04 Task 2 — extended for PageHero adoption + breadcrumb (D-15 layout).
 *
 * Phase 14 coverage (preserved):
 *   - Test 1: requireAdmin resolves → page renders the title + mounts <CreatePartnerForm>.
 *   - Test 2: requireAdmin throws → no form mounted.
 *
 * Phase 18 Plan 04 additions:
 *   - Test 3 (UI-SPEC L386-393): breadcrumb <a> with "← PARTENAIRES" links to
 *     /<adminSegment>/partners and is rendered BEFORE the PageHero in DOM order.
 *   - Test 4: PageHero renders with title=partners.new.title + subtitle=partners.new.subtitle
 *     and has NO actions slot (D-15 — submit lives in the separate action card).
 *   - Test 5 (UI-SPEC L380): breadcrumb default color is var(--muted).
 *   - Test 6 (UI-SPEC L901 / 18-04 PLAN done): page <main> max-width = 720px
 *     (Créer partenaire is a narrower-than-list surface per UI-SPEC).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const {
  requireAdminMock,
  getCurrentLangMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getCurrentLangMock: vi.fn(),
}));

vi.mock('@/lib/auth/require', () => ({ requireAdmin: requireAdminMock }));
vi.mock('@/lib/i18n', async () => {
  const real = await vi.importActual<typeof import('@/lib/i18n/dictionaries')>(
    '@/lib/i18n/dictionaries',
  );
  return {
    t: real.t,
    dictionaries: real.dictionaries,
    getCurrentLang: getCurrentLangMock,
  };
});

// Stub next/link so the breadcrumb renders as a plain <a> in jsdom (consistent
// with the project's other page.test.tsx patterns for partners list).
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={typeof href === 'string' ? href : ''} {...rest}>
      {children}
    </a>
  ),
}));

// Stub CreatePartnerForm with a marker — the page test only asserts the page
// mounts the form, not its internals (those have their own test file).
vi.mock('./CreatePartnerForm', () => ({
  CreatePartnerForm: ({ adminSegment }: { adminSegment: string }) => (
    <div data-testid="create-partner-form" data-admin-segment={adminSegment} />
  ),
}));

import CreatePartnerPage from './page';

beforeEach(() => {
  requireAdminMock.mockReset();
  getCurrentLangMock.mockReset();
  requireAdminMock.mockResolvedValue({ session: { user: { id: 'admin-1' } } });
  getCurrentLangMock.mockResolvedValue('fr');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('/partners/new page.tsx (D-05 + D-06 + AUTH-15 + 18-04 D-15 layout)', () => {
  it('Test 1: requireAdmin resolves → renders title h1 AND mounts CreatePartnerForm', async () => {
    const tree = await CreatePartnerPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
    });
    const { container } = render(tree);
    // Title h1 — the localized partners.new.title key ("Créer un partenaire" FR).
    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1!.textContent).toContain('Créer un partenaire');
    // The form was mounted with the resolved adminSegment.
    const form = container.querySelector('[data-testid="create-partner-form"]');
    expect(form).not.toBeNull();
    expect(form!.getAttribute('data-admin-segment')).toBe('admin-secret');
  });

  it('Test 2: requireAdmin throws (non-admin) → page does NOT mount the form', async () => {
    requireAdminMock.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(
      CreatePartnerPage({
        params: Promise.resolve({ adminSegment: 'admin-secret' }),
      }),
    ).rejects.toThrow();
  });

  // ─── Phase 18 Plan 04 additions (D-15 layout + breadcrumb + PageHero) ───

  it('Test 3 (UI-SPEC L386-393): breadcrumb <a> = "← PARTENAIRES" → /<seg>/partners, rendered BEFORE PageHero', async () => {
    const tree = await CreatePartnerPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
    });
    const { container } = render(tree);

    // Breadcrumb is the FIRST navigable element on the page.
    const allLinks = Array.from(container.querySelectorAll('a'));
    const breadcrumb = allLinks.find((a) =>
      (a.textContent ?? '').toUpperCase().includes('PARTENAIRES'),
    );
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb!.getAttribute('href')).toBe('/admin-secret/partners');
    // Must contain the ← character before the label.
    expect(breadcrumb!.textContent).toMatch(/←.*PARTENAIRES/);

    // DOM-order assertion: breadcrumb must appear BEFORE the title <h1>.
    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();
    const breadcrumbIndex = Array.from(container.querySelectorAll('*')).indexOf(
      breadcrumb!,
    );
    const h1Index = Array.from(container.querySelectorAll('*')).indexOf(h1!);
    expect(breadcrumbIndex).toBeLessThan(h1Index);
  });

  it('Test 4 (D-15): PageHero renders title + subtitle and has NO actions slot', async () => {
    const tree = await CreatePartnerPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
    });
    const { container } = render(tree);

    // Title from partners.new.title (FR).
    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1!.textContent).toContain('Créer un partenaire');

    // Subtitle from partners.new.subtitle (FR — contains "informations" lower).
    const paragraphs = Array.from(container.querySelectorAll('p'));
    const subtitle = paragraphs.find((p) =>
      (p.textContent ?? '').toLowerCase().includes('informations'),
    );
    expect(subtitle).toBeDefined();

    // D-15 — NO submit/CTA button in the PageHero area. The submit lives in
    // the form's separate action card (verified in CreatePartnerForm.test.tsx
    // Tests 8-10). The CreatePartnerForm stub here renders only a div marker,
    // so the only button(s) we'd see in the page tree would have to come from
    // the PageHero actions slot — verify none exist.
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.length).toBe(0);
  });

  it('Test 5 (UI-SPEC L380): breadcrumb default color is var(--muted)', async () => {
    const tree = await CreatePartnerPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
    });
    const { container } = render(tree);

    const breadcrumb = Array.from(container.querySelectorAll('a')).find((a) =>
      (a.textContent ?? '').toUpperCase().includes('PARTENAIRES'),
    );
    expect(breadcrumb).toBeDefined();
    const style = breadcrumb!.getAttribute('style') ?? '';
    // jsdom may serialize 'var(--muted)' as-is or via CSS variable resolution.
    expect(style).toMatch(/color:\s*var\(--muted\)/);
  });

  it('Test 6 (UI-SPEC L901): page max-width = 720px', async () => {
    const tree = await CreatePartnerPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
    });
    const { container } = render(tree);

    // <main> wraps the content per UI-SPEC L901.
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
    const style = main!.getAttribute('style') ?? '';
    expect(style).toMatch(/max-width:\s*720px/);
  });
});
