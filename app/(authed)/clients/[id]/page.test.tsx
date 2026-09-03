/**
 * Phase 30 Plan 07 Task 1 — /clients/[id] page.tsx tests.
 * Phase 33 Plan 06 Task 3 — extended with the outcome-control wiring tests.
 *
 * The page is a server component that fans out:
 *   - requireRelationshipHolder()  (auth gate, FIRST)
 *   - getClientRelationshipForOwner(id, session.user.id) -> null => notFound()
 *   - listContactsForRelationship / listProposalsForRelationship (only
 *     after the notFound() branch)
 *
 * Coverage (per <acceptance_criteria>):
 *   1. notFound() is called when getClientRelationshipForOwner returns
 *      null, and contacts/proposals are NEVER fetched in that case.
 *   2. A non-owned id and a nonexistent id produce byte-identical outcomes
 *      (both collapse to the same null -> notFound() branch).
 *   3. getClientRelationshipForOwner receives session.user.id as its
 *      second argument.
 *   4. A null siren renders no SIREN element in the header; a present
 *      siren renders inline.
 *   5. contacts/proposals are fetched with session.user.id once the
 *      relationship is found.
 *   6. Source-level acceptance checks: no maxWidth wrapper, force-dynamic,
 *      clientRelationshipId= in the href, notFound() precedes the contacts
 *      read in source order.
 *   7 (Plan 33-06). Each rendered proposal row carries a
 *      `data-outcome-state` element; a `won`-outcome row renders the
 *      "Gagné" badge and no trigger buttons; a lapsed, undecided row
 *      derives `unanswered` and keeps both override triggers; the page's
 *      HTML never renders a pipeline-stage display string (D-04).
 *
 * ContactList and ProposalRow are stubbed — their own behavior is covered
 * by their dedicated test files. MarkWonDialog/MarkLostDialog (rendered
 * inside the real ProposalOutcomeControl) are also stubbed — their own
 * behavior is covered by MarkWonDialog.test.tsx / MarkLostDialog.test.tsx.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { RelationshipProposalRow } from '@/lib/db/queries';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { requireRelationshipHolderMock } = vi.hoisted(() => ({
  requireRelationshipHolderMock: vi.fn(async () => ({
    session: { user: { id: 'owner-1' } },
    role: 'partner' as const,
  })),
}));

vi.mock('@/lib/auth/require', () => ({
  requireRelationshipHolder: requireRelationshipHolderMock,
}));

vi.mock('@/lib/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/i18n')>();
  return {
    ...actual,
    getCurrentLang: vi.fn(async () => 'fr'),
  };
});

const {
  getClientRelationshipForOwnerMock,
  listContactsForRelationshipMock,
  listProposalsForRelationshipMock,
} = vi.hoisted(() => ({
  getClientRelationshipForOwnerMock: vi.fn(),
  listContactsForRelationshipMock: vi.fn(async () => []),
  listProposalsForRelationshipMock: vi.fn(
    async (): Promise<RelationshipProposalRow[]> => [],
  ),
}));

// `deriveProposalOutcome` is re-exported unmocked (real, pure function) so
// the outcome-derivation assertions below exercise the actual D-06 rule,
// not a re-implementation of it.
vi.mock('@/lib/db/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/queries')>();
  return {
    ...actual,
    getClientRelationshipForOwner: getClientRelationshipForOwnerMock,
    listContactsForRelationship: listContactsForRelationshipMock,
    listProposalsForRelationship: listProposalsForRelationshipMock,
  };
});

vi.mock('./ContactList', () => ({
  ContactList: () => <div data-testid="contact-list-stub" />,
}));

vi.mock('@/components/proposals/ProposalRow', () => ({
  ProposalRow: ({
    row,
    actionsSlot,
  }: {
    row: { id: string };
    actionsSlot?: React.ReactNode;
  }) => <div data-testid={`proposal-row-${row.id}`}>{actionsSlot}</div>,
}));

// ProposalOutcomeControl itself renders for real (it's the surface under
// test), but the two dialogs it mounts are stubbed — their own submit/gate
// behavior is covered by their dedicated test files.
vi.mock('./MarkWonDialog', () => ({
  MarkWonDialog: () => null,
}));
vi.mock('./MarkLostDialog', () => ({
  MarkLostDialog: () => null,
}));

import ClientDetailPage from './page';

const RELATIONSHIP = {
  relationshipId: 'rel-1',
  companyId: 'co-1',
  companyName: 'Dupont Menuiserie',
  siren: '123456789',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const PROPOSAL_WON = {
  id: 'prop-won',
  lcRef: 'LC-1',
  status: 'active' as const,
  language: 'fr' as const,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  computedClientMonthly: 500,
  outcome: 'won' as const,
  outcomeDate: new Date('2026-02-01T00:00:00Z'),
  outcomeReason: null,
  pdfGeneratedAt: new Date('2026-01-01T00:00:00Z'),
  validityDays: 30,
};

// No explicit outcome; a PDF generated in 2020 is well past a 30-day
// validity window — deriveProposalOutcome resolves this to 'unanswered'.
const PROPOSAL_UNANSWERED = {
  id: 'prop-unanswered',
  lcRef: 'LC-2',
  status: 'active' as const,
  language: 'fr' as const,
  createdAt: new Date('2020-01-01T00:00:00Z'),
  deletedAt: null,
  computedClientMonthly: 300,
  outcome: null,
  outcomeDate: null,
  outcomeReason: null,
  pdfGeneratedAt: new Date('2020-01-01T00:00:00Z'),
  validityDays: 30,
};

// A DRAFT: never sent, so it has no client-facing existence to win or lose.
const PROPOSAL_DRAFT = {
  id: 'prop-draft',
  lcRef: '',
  status: 'draft' as const,
  language: 'fr' as const,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  computedClientMonthly: null,
  outcome: null,
  outcomeDate: null,
  outcomeReason: null,
  pdfGeneratedAt: null,
  validityDays: 30,
};

beforeEach(() => {
  requireRelationshipHolderMock.mockClear();
  getClientRelationshipForOwnerMock.mockReset();
  listContactsForRelationshipMock.mockClear();
  listProposalsForRelationshipMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('clients/[id]/page.tsx — Task 1 server route', () => {
  it('Test 1: notFound() is called when getClientRelationshipForOwner returns null, and contacts/proposals are never fetched', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(null);

    await expect(
      ClientDetailPage({ params: Promise.resolve({ id: 'rel-not-mine' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(listContactsForRelationshipMock).not.toHaveBeenCalled();
    expect(listProposalsForRelationshipMock).not.toHaveBeenCalled();
  });

  it('Test 2: a non-owned id and a nonexistent id produce byte-identical outcomes (both a plain notFound())', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValueOnce(null); // "not owned"
    await expect(
      ClientDetailPage({ params: Promise.resolve({ id: 'rel-not-mine' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    getClientRelationshipForOwnerMock.mockResolvedValueOnce(null); // "nonexistent"
    await expect(
      ClientDetailPage({ params: Promise.resolve({ id: 'rel-does-not-exist' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('Test 3: getClientRelationshipForOwner receives session.user.id as its second argument', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
    await ClientDetailPage({ params: Promise.resolve({ id: 'rel-1' }) });
    expect(getClientRelationshipForOwnerMock).toHaveBeenCalledWith('rel-1', 'owner-1');
  });

  it('Test 4: a null siren renders no SIREN element in the header', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue({ ...RELATIONSHIP, siren: null });
    const tree = await ClientDetailPage({ params: Promise.resolve({ id: 'rel-1' }) });
    const html = renderToString(tree);
    expect(html).toContain('Dupont Menuiserie');
    expect(html).not.toContain('123456789');
  });

  it('Test 4b: a present siren renders inline beside the title', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
    const tree = await ClientDetailPage({ params: Promise.resolve({ id: 'rel-1' }) });
    const html = renderToString(tree);
    expect(html).toContain('123456789');
  });

  it('Test 5: contacts/proposals are fetched with session.user.id once the relationship is found', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
    await ClientDetailPage({ params: Promise.resolve({ id: 'rel-1' }) });
    expect(listContactsForRelationshipMock).toHaveBeenCalledWith('rel-1', 'owner-1');
    expect(listProposalsForRelationshipMock).toHaveBeenCalledWith('rel-1', 'owner-1');
  });

  it('Test 6 (acceptance): no maxWidth wrapper, force-dynamic, clientRelationshipId= present, notFound() precedes the contacts read', async () => {
    const path = await import('node:path');
    const fs = await import('node:fs/promises');
    const pageSource = await fs.readFile(
      path.join(process.cwd(), 'app/(authed)/clients/[id]/page.tsx'),
      'utf8',
    );
    expect(pageSource).not.toMatch(/maxWidth/);
    expect(pageSource).toContain("export const dynamic = 'force-dynamic'");
    expect(pageSource).toMatch(/clientRelationshipId=/);
    const notFoundIdx = pageSource.indexOf('notFound()');
    const contactsIdx = pageSource.indexOf('listContactsForRelationship(');
    expect(notFoundIdx).toBeGreaterThan(0);
    expect(contactsIdx).toBeGreaterThan(notFoundIdx);
  });
});

describe('clients/[id]/page.tsx — Plan 33-06 Task 3 outcome-control wiring', () => {
  it('Outcome Test 1: a won-outcome proposal renders the state hook and the "Gagné" badge, no trigger buttons', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
    listProposalsForRelationshipMock.mockResolvedValue([PROPOSAL_WON]);

    const tree = await ClientDetailPage({ params: Promise.resolve({ id: 'rel-1' }) });
    const html = renderToString(tree);

    expect(html).toContain('data-outcome-state="won"');
    expect(html).toContain('Gagné');
    expect(html).not.toContain('Marquer gagné');
    expect(html).not.toContain('Marquer perdu');
  });

  it('Outcome Test 2: a lapsed, undecided proposal derives "unanswered" and keeps both override triggers', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
    listProposalsForRelationshipMock.mockResolvedValue([PROPOSAL_UNANSWERED]);

    const tree = await ClientDetailPage({ params: Promise.resolve({ id: 'rel-1' }) });
    const html = renderToString(tree);

    expect(html).toContain('data-outcome-state="unanswered"');
    expect(html).toContain('Sans réponse');
    expect(html).toContain('Marquer gagné');
    expect(html).toContain('Marquer perdu');
  });

  // 33-REVIEW CR-04. The server actions refuse a draft in their own WHERE;
  // this is the matching UI half, so a partner is never offered a control
  // whose write the server would reject.
  it('Outcome Test 2b: a DRAFT proposal offers neither outcome trigger', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
    listProposalsForRelationshipMock.mockResolvedValue([PROPOSAL_DRAFT]);

    const tree = await ClientDetailPage({ params: Promise.resolve({ id: 'rel-1' }) });
    const html = renderToString(tree);

    expect(html).not.toContain('Marquer gagné');
    expect(html).not.toContain('Marquer perdu');
  });

  it('Outcome Test 3 (D-04): the page HTML never renders a pipeline-stage display string', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
    listProposalsForRelationshipMock.mockResolvedValue([PROPOSAL_WON, PROPOSAL_UNANSWERED]);

    const tree = await ClientDetailPage({ params: Promise.resolve({ id: 'rel-1' }) });
    const html = renderToString(tree);

    // 'Perdu' is deliberately excluded — it is shared vocabulary with the
    // proposal outcome badge (pipeline.outcome.badge.lost), which is the
    // legitimate, expected string this page DOES render.
    for (const stageLabel of [
      'Négociation',
      'Prospect',
      'Qualifié',
      'Proposition envoyée',
      'Signé',
      'Débloqué',
    ]) {
      expect(html).not.toContain(stageLabel);
    }
  });
});
