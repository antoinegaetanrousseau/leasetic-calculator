import 'server-only';
import {
  listProposalsByUser, searchProposals,
  type ListResult, encodeCursor, decodeCursor,
} from '@/lib/db/queries';

export interface ProposalRowDto {
  id: string;
  lcRef: string;
  clientCo: string;          // pulled from inputs jsonb
  amountHT: string;          // digit-only, formatted client-side via formatCurrency
  createdAt: string;         // ISO 8601 (server stringifies the Date for JSON wire shape)
  validityDays: 15 | 30 | 60;
  language: 'fr' | 'en';
  deletedAt: string | null;  // present in deleted-view; null otherwise
}

export interface ListResponse {
  rows: ProposalRowDto[];
  hasMore: boolean;
  /** base64url-encoded cursor for the next page; null if no more pages */
  nextCursor: string | null;
}

export interface BuildListParams {
  userId: string;
  q?: string;
  cursorEncoded?: string | null;
  deleted?: boolean;
  limit?: number;
}

/**
 * Used by:
 *   - GET /api/proposals (Plan 08-08 Task 3)
 *   - app/(authed)/page.tsx (Plan 08-11) for the SSR initial render
 *
 * Note: Plan 08-11 calls this directly server-side instead of fetching
 * /api/proposals on the SSR pass — saves one round-trip and keeps the
 * type-safe path. Plan 08-11's "Load More" button is the only client-side
 * caller of GET /api/proposals.
 */
export async function buildListResponse(args: BuildListParams): Promise<ListResponse> {
  const cursor = args.cursorEncoded ? decodeCursor(args.cursorEncoded) : null;
  const q = args.q?.trim() ?? '';

  const result: ListResult = q.length > 0
    ? await searchProposals({
        userId: args.userId, q,
        cursor: cursor ?? undefined,
        deleted: args.deleted ?? false,
        limit: args.limit ?? 20,
      })
    : await listProposalsByUser({
        userId: args.userId,
        cursor: cursor ?? undefined,
        deleted: args.deleted ?? false,
        limit: args.limit ?? 20,
      });

  return {
    rows: result.rows.map((row) => ({
      id: row.id,
      lcRef: row.lcRef,
      clientCo: typeof (row.inputs as { clientCo?: unknown })?.clientCo === 'string'
        ? (row.inputs as { clientCo: string }).clientCo
        : '',
      amountHT: typeof (row.inputs as { amountHT?: unknown })?.amountHT === 'string'
        ? (row.inputs as { amountHT: string }).amountHT
        : '0',
      createdAt: row.createdAt.toISOString(),
      validityDays: ((row.inputs as { validityDays?: unknown })?.validityDays as 15 | 30 | 60) ?? 30,
      language: row.language as 'fr' | 'en',
      deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    })),
    hasMore: result.hasMore,
    nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
  };
}
