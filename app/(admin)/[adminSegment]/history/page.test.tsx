/**
 * Plan 14-05 Task 1 — /history page tests (RED → GREEN).
 *
 * Server-component harness. Mocks listCoefficientHistory + cursor helpers +
 * requireAdmin + getCurrentLang + t + the local <CoefficientHistoryList>.
 *
 * 3 test cases per PLAN.md `<behavior>` block (Tests 1-3):
 *   T1: requireAdmin auth gate — when requireAdmin() throws (Next.js
 *       notFound / redirect), the page does NOT render the list.
 *   T2: cursor decoding — when searchParams.cursor is set, the page calls
 *       decodeCoefficientHistoryCursor + passes the decoded result to
 *       listCoefficientHistory.
 *   T3: list mount — <CoefficientHistoryList> receives the expected props
 *       (rows, hasMore, nextCursorEncoded, currentCursor, adminSegment, lang).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const {
  requireAdminMock,
  getCurrentLangMock,
  listCoefficientHistoryMock,
  decodeCoefficientHistoryCursorMock,
  encodeCoefficientHistoryCursorMock,
  coefficientHistoryListProps,
} = vi.hoisted(() => {
  // Capture props passed to <CoefficientHistoryList> across renders.
  const propsCapture: Array<Record<string, unknown>> = [];
  return {
    requireAdminMock: vi.fn(),
    getCurrentLangMock: vi.fn(),
    listCoefficientHistoryMock: vi.fn(),
    decodeCoefficientHistoryCursorMock: vi.fn(),
    encodeCoefficientHistoryCursorMock: vi.fn(),
    coefficientHistoryListProps: propsCapture,
  };
});

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
vi.mock('@/lib/db/queries/coefficient-history', () => ({
  listCoefficientHistory: (...args: unknown[]) =>
    listCoefficientHistoryMock(...args),
  decodeCoefficientHistoryCursor: (...args: unknown[]) =>
    decodeCoefficientHistoryCursorMock(...args),
  encodeCoefficientHistoryCursor: (...args: unknown[]) =>
    encodeCoefficientHistoryCursorMock(...args),
}));

// Mock the local <CoefficientHistoryList> client component to a stub that
// records its props — keeps the page test focused on shell + data wiring.
vi.mock('./CoefficientHistoryList', () => ({
  CoefficientHistoryList: (props: Record<string, unknown>) => {
    coefficientHistoryListProps.push(props);
    return <div data-testid="history-list" />;
  },
}));

// Import AFTER all mocks are in place.
import HistoryPage from './page';

const SNAPSHOT = {
  commissionPct: '5.00',
  maxAmount: '50000.00',
  validityDays: 30,
  coefficients: {
    t1: { '36': '2.2500', '48': '2.5500', '60': '2.8500' },
    t2: { '36': '2.0500', '48': '2.8500', '60': '2.6500' },
    t3: { '36': '1.8500', '48': '2.1500', '60': '2.4500' },
    t4: { '36': '1.6500', '48': '1.9500', '60': '2.2500' },
  },
};

function mkRow(id: string, summary: string) {
  return {
    id,
    changedAt: new Date('2026-05-12T10:00:00Z'),
    changedByUserId: 'user-1',
    beforeJson: SNAPSHOT,
    afterJson: SNAPSHOT,
    summary,
    createdByDisplay: 'Marie Dupont',
  };
}

afterEach(() => {
  cleanup();
  requireAdminMock.mockReset();
  getCurrentLangMock.mockReset();
  listCoefficientHistoryMock.mockReset();
  decodeCoefficientHistoryCursorMock.mockReset();
  encodeCoefficientHistoryCursorMock.mockReset();
  coefficientHistoryListProps.length = 0;
});

describe('/history page (server component)', () => {
  beforeEach(() => {
    getCurrentLangMock.mockResolvedValue('fr');
    requireAdminMock.mockResolvedValue({ session: { user: { id: 'admin-1' } } });
  });

  it('T1: requireAdmin auth gate — when requireAdmin throws, the list is NOT rendered', async () => {
    requireAdminMock.mockImplementationOnce(() => {
      throw new Error('NEXT_NOT_FOUND');
    });

    await expect(
      HistoryPage({
        params: Promise.resolve({ adminSegment: 'admin-segment' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    // The page threw before reaching the list — listCoefficientHistory must NOT have been called.
    expect(listCoefficientHistoryMock).not.toHaveBeenCalled();
    expect(coefficientHistoryListProps.length).toBe(0);
  });

  it('T2: cursor decoding — searchParams.cursor is decoded and passed to listCoefficientHistory', async () => {
    const ENCODED_CURSOR = 'Y2hhbmdlZEF0LWlk';
    const DECODED_CURSOR = {
      changedAt: '2026-05-12T09:00:00.000Z',
      id: '11111111-1111-1111-1111-111111111111',
    };

    decodeCoefficientHistoryCursorMock.mockReturnValueOnce(DECODED_CURSOR);
    listCoefficientHistoryMock.mockResolvedValueOnce({
      rows: [],
      hasMore: false,
      nextCursor: null,
    });

    const ui = await HistoryPage({
      params: Promise.resolve({ adminSegment: 'admin-segment' }),
      searchParams: Promise.resolve({ cursor: ENCODED_CURSOR }),
    });
    render(ui);

    expect(decodeCoefficientHistoryCursorMock).toHaveBeenCalledWith(
      ENCODED_CURSOR,
    );
    expect(listCoefficientHistoryMock).toHaveBeenCalledTimes(1);
    const callArg = listCoefficientHistoryMock.mock.calls[0]![0];
    expect(callArg).toMatchObject({
      cursor: DECODED_CURSOR,
      limit: 20,
    });
  });

  it('T3: list mount — <CoefficientHistoryList> receives rows + hasMore + nextCursorEncoded + currentCursor + adminSegment + lang', async () => {
    const ROWS = [
      mkRow('hist-1', 'Change 1'),
      mkRow('hist-2', 'Change 2'),
      mkRow('hist-3', 'Change 3'),
    ];
    const NEXT_CURSOR = {
      changedAt: '2026-05-11T10:00:00.000Z',
      id: '22222222-2222-2222-2222-222222222222',
    };
    const NEXT_CURSOR_ENCODED = 'bmV4dC1jdXJzb3I=';

    listCoefficientHistoryMock.mockResolvedValueOnce({
      rows: ROWS,
      hasMore: true,
      nextCursor: NEXT_CURSOR,
    });
    encodeCoefficientHistoryCursorMock.mockReturnValueOnce(NEXT_CURSOR_ENCODED);

    const ui = await HistoryPage({
      params: Promise.resolve({ adminSegment: 'my-seg' }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(coefficientHistoryListProps.length).toBe(1);
    const props = coefficientHistoryListProps[0]!;
    expect(props.rows).toEqual(ROWS);
    expect(props.hasMore).toBe(true);
    expect(props.nextCursorEncoded).toBe(NEXT_CURSOR_ENCODED);
    expect(props.currentCursor).toBeNull();
    expect(props.adminSegment).toBe('my-seg');
    expect(props.lang).toBe('fr');
    // No cursor in URL → decoder not called.
    expect(decodeCoefficientHistoryCursorMock).not.toHaveBeenCalled();
    // listCoefficientHistory called with no cursor + limit 20.
    expect(listCoefficientHistoryMock).toHaveBeenCalledWith({ limit: 20 });
  });

  it('T3b: header renders h1 + subtitle (FR strings from dictionary)', async () => {
    listCoefficientHistoryMock.mockResolvedValueOnce({
      rows: [],
      hasMore: false,
      nextCursor: null,
    });

    const ui = await HistoryPage({
      params: Promise.resolve({ adminSegment: 'admin-segment' }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(ui);
    expect(container.textContent).toContain('Historique des coefficients');
    expect(container.textContent).toContain(
      'Tous les changements de coefficients et commission',
    );
    // h1 present
    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1!.textContent).toContain('Historique des coefficients');
  });
});
