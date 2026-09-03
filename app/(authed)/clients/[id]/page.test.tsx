/**
 * Phase 30 Plan 07 Task 1 — /clients/[id] page.tsx tests.
 * Phase 33 Plan 06 Task 3 — extended with the outcome-control wiring tests.
 * Phase 34 Plan 12 Task 3 — extended for the four-tab rebuild (D-16, D-17).
 *
 * The page is a server component whose ORDER of operations is the security
 * boundary:
 *   - requireRelationshipHolder()          (auth gate, FIRST)
 *   - getClientRelationshipForOwner(id, session.user.id) -> null => a 404
 *   - validateTab(searchParams.tab)        (AFTER the 404 branch, on purpose)
 *   - exactly ONE tab query, re-scoped to session.user.id
 *
 * Coverage:
 *   1. A null relationship produces the 404, and NO tab query ran — asserted
 *      for all three tab queries, so a fetch-then-hide implementation fails
 *      (T-34-12-01).
 *   2. A non-owned id and a nonexistent id are byte-identical (D-16).
 *   3. getClientRelationshipForOwner receives session.user.id as arg 2.
 *   4. A null siren renders no SIREN in the header; a present one renders.
 *   5. Exactly one tab query runs per request, with (id, session.user.id) —
 *      and the other two do NOT run (T-34-12-09).
 *   6. An unrecognised ?tab= falls back to Informations without throwing and
 *      without a 404 (T-34-12-02); on a NON-OWNED relationship the same value
 *      produces the identical 404 with no query.
 *   7. Source-level acceptance: force-dynamic, the Metadata export, no
 *      maxWidth wrapper, the auth gate first, and validateTab after the 404.
 *   8. The header renders on every tab off the detail row alone.
 *   9. The identity panel renders no form control, re-asserted at page level.
 *  10 (Plan 33-06). Outcome-control wiring on the Propositions tab, including
 *      the CR-04 draft guard.
 *
 * WHAT CHANGED IN 34-12, and why the pre-existing cases could not survive
 * verbatim: before the rebuild the page fetched contacts AND proposals on
 * every request, and the old Test 5 asserted exactly that. D-17 replaced that
 * contract — one tab, one query — so the assertion was SPLIT per tab rather
 * than dropped. Its intent (each tab query is re-scoped to the session owner)
 * is asserted four times now instead of twice.
 *
 * ClientHeader, ClientTabs, IdentityPanel and RelationPanel render FOR REAL so
 * the page-level assertions are about the real markup. The three edit dialogs,
 * the timeline and the note composer are stubbed — each has its own suite —
 * and the server-action modules are mocked so no database module is pulled
 * into this suite's graph. Pure derivation helpers are deliberately left
 * UNMOCKED so the real outcome rule is exercised.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { cleanup, render } from '@testing-library/react';
import type { RelationshipProposalRow } from '@/lib/db/queries';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Server-action modules: mocked wholesale so the client components below can
// render for real without dragging a database module into this suite.
vi.mock('@/lib/pipeline/actions', () => ({
  advanceRelationshipStageAction: vi.fn(),
  markProposalWonAction: vi.fn(),
  markProposalLostAction: vi.fn(),
}));
vi.mock('@/lib/crm/actions', () => ({
  refreshCompanyRegistryAction: vi.fn(),
  updateCompanyDisplayAction: vi.fn(),
}));
vi.mock('@/lib/relationship/actions', () => ({
  setNextActionAction: vi.fn(),
  updateRelationDetailsAction: vi.fn(),
  addRelationshipNoteAction: vi.fn(),
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
  listRelationshipEventsMock,
} = vi.hoisted(() => ({
  getClientRelationshipForOwnerMock: vi.fn(),
  listContactsForRelationshipMock: vi.fn(async () => []),
  listProposalsForRelationshipMock: vi.fn(
    async (): Promise<RelationshipProposalRow[]> => [],
  ),
  listRelationshipEventsMock: vi.fn(async () => []),
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
    listRelationshipEvents: listRelationshipEventsMock,
  };
});

vi.mock('./ContactList', () => ({
  ContactList: () => <div data-testid="contact-list-stub" />,
}));

vi.mock('./ActivityTimeline', () => ({
  ActivityTimeline: ({ nowMs }: { nowMs: number }) => (
    <div data-testid="activity-timeline-stub" data-now-ms={String(nowMs)} />
  ),
}));

vi.mock('./NoteComposer', () => ({
  NoteComposer: () => <div data-testid="note-composer-stub" />,
}));

// The three edit dialogs are stubbed to nothing: each has its own suite, and
// a closed dialog contributes no markup on this page anyway.
vi.mock('./EditCompanyDialog', () => ({ EditCompanyDialog: () => null }));
vi.mock('./NextActionDialog', () => ({ NextActionDialog: () => null }));
vi.mock('./EditRelationDialog', () => ({ EditRelationDialog: () => null }));

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

import ClientDetailPage, { metadata } from './page';

const RELATIONSHIP = {
  relationshipId: 'rel-1',
  companyId: 'co-1',
  companyName: 'Dupont Menuiserie',
  siren: '123456789',
  website: null,
  phone: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  legalName: 'DUPONT MENUISERIE SARL',
  addressLine: '12 RUE DES LILAS',
  postalCode: '69003',
  city: 'LYON',
  legalForm: '5499',
  nafCode: '43.32A',
  nafSection: 'M',
  headcountBand: '32',
  foundedOn: '2001-03-04',
  registryState: 'A' as const,
  registryStatus: 'synced' as const,
  registrySyncedAt: new Date('2026-09-01T10:30:00Z'),
  leadSource: 'salon' as const,
  description: 'Rencontré au salon Batimat.',
  nextActionAt: null,
  nextActionNote: null,
  stage: 'prospect' as const,
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

/** Invoke the page the way Next.js does: both params and searchParams are promises. */
function callPage(id = 'rel-1', tab?: string) {
  return ClientDetailPage({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(tab === undefined ? {} : { tab }),
  });
}

/** Every tab query must be silent on the tabs that do not own it. */
function expectOnlyQueryCalled(which: 'none' | 'contacts' | 'proposals' | 'activity') {
  const table = {
    contacts: listContactsForRelationshipMock,
    proposals: listProposalsForRelationshipMock,
    activity: listRelationshipEventsMock,
  } as const;

  for (const [key, mock] of Object.entries(table)) {
    if (key === which) {
      expect(mock).toHaveBeenCalledWith('rel-1', 'owner-1');
    } else {
      expect(mock).not.toHaveBeenCalled();
    }
  }
}

beforeEach(() => {
  requireRelationshipHolderMock.mockClear();
  getClientRelationshipForOwnerMock.mockReset();
  listContactsForRelationshipMock.mockClear();
  listProposalsForRelationshipMock.mockClear();
  listRelationshipEventsMock.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('clients/[id]/page.tsx — the IDOR contract (D-16, T-34-12-01)', () => {
  it('Test 1: a null relationship produces the 404, and NOT ONE tab query ran', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(null);

    await expect(callPage('rel-not-mine')).rejects.toThrow('NEXT_NOT_FOUND');

    expect(listContactsForRelationshipMock).not.toHaveBeenCalled();
    expect(listProposalsForRelationshipMock).not.toHaveBeenCalled();
    expect(listRelationshipEventsMock).not.toHaveBeenCalled();
  });

  it('Test 2: a non-owned id and a nonexistent id produce byte-identical outcomes (both a plain 404)', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValueOnce(null); // "not owned"
    await expect(callPage('rel-not-mine')).rejects.toThrow('NEXT_NOT_FOUND');

    getClientRelationshipForOwnerMock.mockResolvedValueOnce(null); // "nonexistent"
    await expect(callPage('rel-does-not-exist')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('Test 2b (T-34-12-02): a VALID tab on a non-owned relationship 404s identically, with no query', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(null);

    await expect(callPage('rel-not-mine', 'activity')).rejects.toThrow('NEXT_NOT_FOUND');

    expect(listRelationshipEventsMock).not.toHaveBeenCalled();
    expect(listContactsForRelationshipMock).not.toHaveBeenCalled();
    expect(listProposalsForRelationshipMock).not.toHaveBeenCalled();
  });

  it('Test 2c (T-34-12-02): an INVALID tab on a non-owned relationship makes no observable difference', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(null);

    await expect(callPage('rel-not-mine', 'nonsense')).rejects.toThrow('NEXT_NOT_FOUND');

    expect(listRelationshipEventsMock).not.toHaveBeenCalled();
    expect(listContactsForRelationshipMock).not.toHaveBeenCalled();
    expect(listProposalsForRelationshipMock).not.toHaveBeenCalled();
  });

  it('Test 3: getClientRelationshipForOwner receives session.user.id as its second argument', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
    await callPage('rel-1');
    expect(getClientRelationshipForOwnerMock).toHaveBeenCalledWith('rel-1', 'owner-1');
  });
});

describe('clients/[id]/page.tsx — one tab, one query (D-17, T-34-12-09)', () => {
  beforeEach(() => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
  });

  it('Test 4: with no ?tab=, Informations renders and NO tab query runs at all', async () => {
    const html = renderToString(await callPage('rel-1'));

    expectOnlyQueryCalled('none');
    // The Informations tab is the two panels, identity first.
    expect(html).toContain('Identité (registre)');
    expect(html).toContain('Relation');
  });

  it('Test 5: ?tab=contacts fetches only the contacts, scoped to the session owner', async () => {
    const html = renderToString(await callPage('rel-1', 'contacts'));

    expectOnlyQueryCalled('contacts');
    expect(html).toContain('contact-list-stub');
  });

  it('Test 6: ?tab=proposals fetches only the proposals, scoped to the session owner', async () => {
    await callPage('rel-1', 'proposals');

    expectOnlyQueryCalled('proposals');
  });

  it('Test 7: ?tab=activity fetches only the timeline, scoped to the session owner', async () => {
    const html = renderToString(await callPage('rel-1', 'activity'));

    expectOnlyQueryCalled('activity');
    expect(html).toContain('note-composer-stub');
    expect(html).toContain('activity-timeline-stub');
  });

  it('Test 7b: nowMs is computed once on the server and handed to the timeline', async () => {
    const before = Date.now();
    const tree = await callPage('rel-1', 'activity');
    const { container } = render(tree);
    const after = Date.now();

    const nowMs = Number(
      container.querySelector('[data-testid="activity-timeline-stub"]')!.getAttribute('data-now-ms'),
    );
    expect(nowMs).toBeGreaterThanOrEqual(before);
    expect(nowMs).toBeLessThanOrEqual(after);
  });

  it('Test 8: an unrecognised ?tab= falls back to Informations — no throw, no 404', async () => {
    const html = renderToString(await callPage('rel-1', 'nonsense'));

    expectOnlyQueryCalled('none');
    expect(html).toContain('Identité (registre)');
    expect(html).toContain('aria-current="page"');
  });

  it('Test 8b: the four tabs render as links on every tab, the active one marked', async () => {
    const tree = await callPage('rel-1', 'contacts');
    const { container } = render(tree);

    for (const key of ['informations', 'contacts', 'proposals', 'activity']) {
      expect(container.querySelector(`[data-testid="client-tab-${key}"]`)).toBeTruthy();
    }
    expect(
      container.querySelector('[data-testid="client-tab-contacts"]')!.getAttribute('aria-current'),
    ).toBe('page');
  });
});

describe('clients/[id]/page.tsx — the header and the identity panel', () => {
  beforeEach(() => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
  });

  it('Test 9: a null siren renders no SIREN element in the header', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue({ ...RELATIONSHIP, siren: null });
    const html = renderToString(await callPage('rel-1'));

    expect(html).toContain('Dupont Menuiserie');
    expect(html).not.toContain('123456789');
  });

  it('Test 9b: a present siren renders inline beside the title', async () => {
    const html = renderToString(await callPage('rel-1'));
    expect(html).toContain('123456789');
  });

  it('Test 10: the header renders on EVERY tab off the detail row, with no extra query', async () => {
    for (const tab of [undefined, 'contacts', 'proposals', 'activity']) {
      listContactsForRelationshipMock.mockClear();
      listProposalsForRelationshipMock.mockClear();
      listRelationshipEventsMock.mockClear();

      const html = renderToString(await callPage('rel-1', tab));
      expect(html).toContain('Dupont Menuiserie');

      const calls =
        listContactsForRelationshipMock.mock.calls.length +
        listProposalsForRelationshipMock.mock.calls.length +
        listRelationshipEventsMock.mock.calls.length;
      expect(calls).toBe(tab === undefined ? 0 : 1);
    }
  });

  it('Test 11 (D-02, T-34-12-04): the identity panel renders NO form control at page level', async () => {
    const tree = await callPage('rel-1');
    const { container } = render(tree);

    const panel = container.querySelector('[data-testid="identity-panel"]');
    expect(panel).toBeTruthy();
    expect(panel!.querySelectorAll('input, select, textarea')).toHaveLength(0);
  });
});

describe('clients/[id]/page.tsx — source-level acceptance', () => {
  it('Test 12: force-dynamic, a Metadata export, no maxWidth wrapper', async () => {
    const path = await import('node:path');
    const fs = await import('node:fs/promises');
    const pageSource = await fs.readFile(
      path.join(process.cwd(), 'app/(authed)/clients/[id]/page.tsx'),
      'utf8',
    );
    expect(pageSource).not.toMatch(/maxWidth/);
    expect(pageSource).toContain("export const dynamic = 'force-dynamic'");
    expect(pageSource).toMatch(/clientRelationshipId=/);
    expect(metadata.title).toBe('Client — Leasétic Matrice');
  });

  it('Test 13: the auth gate is first, and tab validation sits AFTER the 404 branch', async () => {
    const path = await import('node:path');
    const fs = await import('node:fs/promises');
    const pageSource = await fs.readFile(
      path.join(process.cwd(), 'app/(authed)/clients/[id]/page.tsx'),
      'utf8',
    );

    const gateIdx = pageSource.indexOf('requireRelationshipHolder()');
    const lookupIdx = pageSource.indexOf('getClientRelationshipForOwner(');
    const notFoundIdx = pageSource.indexOf('notFound()');
    const validateIdx = pageSource.indexOf('validateTab');
    const contactsIdx = pageSource.indexOf('listContactsForRelationship(');

    expect(gateIdx).toBeGreaterThan(0);
    expect(lookupIdx).toBeGreaterThan(gateIdx);
    expect(notFoundIdx).toBeGreaterThan(lookupIdx);
    expect(validateIdx).toBeGreaterThan(notFoundIdx);
    expect(contactsIdx).toBeGreaterThan(validateIdx);
  });

  it('Test 14: the components the grep-contract suites hard-code did not move', async () => {
    const fs = await import('node:fs/promises');
    for (const file of [
      'app/(authed)/clients/[id]/MarkWonDialog.tsx',
      'app/(authed)/clients/[id]/MarkLostDialog.tsx',
      'app/(authed)/clients/[id]/ProposalOutcomeControl.tsx',
      'app/(authed)/clients/[id]/ContactList.tsx',
      'app/(authed)/clients/[id]/ContactFormDialog.tsx',
      'app/(authed)/clients/[id]/DeleteContactDialog.tsx',
    ]) {
      await expect(fs.access(file)).resolves.toBeUndefined();
    }
  });
});

describe('clients/[id]/page.tsx — Plan 33-06 outcome-control wiring (Propositions tab)', () => {
  beforeEach(() => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
  });

  it('Outcome Test 1: a won-outcome proposal renders the state hook and the "Gagné" badge, no trigger buttons', async () => {
    listProposalsForRelationshipMock.mockResolvedValue([PROPOSAL_WON]);

    const html = renderToString(await callPage('rel-1', 'proposals'));

    expect(html).toContain('data-outcome-state="won"');
    expect(html).toContain('Gagné');
    expect(html).not.toContain('Marquer gagné');
    expect(html).not.toContain('Marquer perdu');
  });

  it('Outcome Test 2: a lapsed, undecided proposal derives "unanswered" and keeps both override triggers', async () => {
    listProposalsForRelationshipMock.mockResolvedValue([PROPOSAL_UNANSWERED]);

    const html = renderToString(await callPage('rel-1', 'proposals'));

    expect(html).toContain('data-outcome-state="unanswered"');
    expect(html).toContain('Sans réponse');
    expect(html).toContain('Marquer gagné');
    expect(html).toContain('Marquer perdu');
  });

  // 33-REVIEW CR-04. The server actions refuse a draft in their own WHERE;
  // this is the matching UI half, so a partner is never offered a control
  // whose write the server would reject.
  it('Outcome Test 2b: a DRAFT proposal offers neither outcome trigger', async () => {
    listProposalsForRelationshipMock.mockResolvedValue([PROPOSAL_DRAFT]);

    const html = renderToString(await callPage('rel-1', 'proposals'));

    expect(html).not.toContain('Marquer gagné');
    expect(html).not.toContain('Marquer perdu');
    expect(html).not.toContain('data-outcome-state');
  });

  // Phase 33's version of this case asserted that NO pipeline-stage string
  // appeared anywhere on the page, because at that point the page had no stage
  // surface at all. Phase 34 deliberately gives the header an inline stage
  // picker (34-CONTEXT <specifics>), so the blanket assertion is no longer
  // true — and weakening it to "except the header" would assert nothing. It is
  // narrowed instead to the fact that still matters: outcome and board
  // position are two independent axes, so the PROPOSALS list itself carries no
  // stage string. Exactly one stage surface exists, and it is the header's.
  it('Outcome Test 3 (D-04, as revised by Phase 34): the proposals list carries no stage string', async () => {
    listProposalsForRelationshipMock.mockResolvedValue([PROPOSAL_WON, PROPOSAL_UNANSWERED]);

    const tree = await callPage('rel-1', 'proposals');
    const { container } = render(tree);

    const section = container.querySelector('[data-testid="proposals-section"]');
    expect(section).toBeTruthy();

    // 'Perdu' is deliberately excluded — it is shared vocabulary with the
    // proposal outcome badge (pipeline.outcome.badge.lost), which is the
    // legitimate, expected string this section DOES render.
    for (const stageLabel of [
      'Négociation',
      'Prospect',
      'Qualifié',
      'Proposition envoyée',
      'Signé',
      'Débloqué',
    ]) {
      expect(section!.textContent).not.toContain(stageLabel);
    }
  });

  it('Outcome Test 4: the empty Propositions tab keeps its "new proposal" call to action', async () => {
    listProposalsForRelationshipMock.mockResolvedValue([]);

    const html = renderToString(await callPage('rel-1', 'proposals'));

    expect(html).toContain('clientRelationshipId=rel-1');
  });
});
