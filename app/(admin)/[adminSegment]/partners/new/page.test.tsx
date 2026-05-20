/**
 * Plan 14-02 Task 2 — /partners/new server-component page tests (RED → GREEN).
 *
 * Mirrors verification/page.test.tsx hoisted-mock pattern.
 *
 * Coverage:
 *   - Test 1: requireAdmin resolves → page renders the partners.new.title h1
 *     AND mounts <CreatePartnerForm>.
 *   - Test 2: requireAdmin throws (Next.js redirect/notFound) → no form mounted.
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

describe('/partners/new page.tsx (D-05 + D-06 + AUTH-15)', () => {
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
});
