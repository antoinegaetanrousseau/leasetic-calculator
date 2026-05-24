import 'server-only';
import {
  listProposalsByUser, searchProposals,
  deriveDisplayStatus, type DisplayStatus,
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
  /**
   * Phase 14 D-27 — server-derived chip variant. Computed via
   * deriveDisplayStatus() at list-build time so the helper stays the single
   * source of truth AND so the row's paramsSnapshot (which contains
   * commission_pct) NEVER leaves the server. ADMIN-09 defense in depth.
   */
  displayStatus: DisplayStatus;
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
  /**
   * v1.1 Partner Home "Recently Deleted" toggle param. Retiring with Phase 17
   * (Partner Home no longer mounts RecentlyDeletedToggle), kept for backward
   * compat until callers are confirmed migrated.
   */
  deleted?: boolean;
  /**
   * Phase 17 D-13 — Archivées filter. When true, returns rows that are EITHER
   * expired (status='active' but past validity) OR soft-deleted within the
   * 30-day window. Scoped to `userId` (T-17-01-01 IDOR mitigation enforced
   * inside listProposalsByUser/searchProposals). Defaults to false.
   *
   * Orthogonal to `q` per 17-CONTEXT.md Claude's Discretion: q + archived
   * combine cleanly, e.g. `/proposals?archived=1&q=acme`.
   */
  archived?: boolean;
  limit?: number;
  /**
   * Phase 18 D-11 — admin scoping override. When set AND `_callerRole === 'admin'`,
   * the list query runs scoped to `adminUserIdOverride` INSTEAD of `userId`
   * (the caller's own session userId). This powers the admin Partners-list
   * `Voir les propositions du partenaire` action, which navigates to
   * `/proposals?user_id={partnerId}`.
   *
   * SECURITY (T-18-01-01 IDOR): the override is ONLY honored when the
   * caller is admin. For partners, the override is silently IGNORED — the
   * query stays scoped to the caller's own userId. `_callerRole` MUST be
   * derived from `session.user.role` at the SSR layer (NEVER from request
   * params). The library layer trusts the role hint; the SSR layer is the
   * authorization gate.
   *
   * An empty-string override is treated as not-set (defensive — Next.js
   * App Router string searchParams come through as the empty string when
   * the URL has `?user_id=` with no value).
   */
  adminUserIdOverride?: string;
  /**
   * Phase 18 D-11 — caller's session role. Used to gate the
   * `adminUserIdOverride` honoring. Defaults to 'partner' if omitted
   * (fail-closed). MUST be derived from `session.user.role` at the SSR
   * layer — NEVER from request params. See D-11 + T-18-01-01.
   */
  _callerRole?: 'admin' | 'partner';
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
  // Phase 17 D-13: thread the archived flag (default false → Actives).
  const archived = args.archived ?? false;

  // Phase 18 D-11 — admin can scope /proposals to another partner via
  // ?user_id=; gate is admin role enforced at SSR layer. _callerRole MUST
  // be passed in by the route — never derived from request params.
  // Empty-string override (e.g. from `?user_id=` with no value) is treated
  // as not-set (fail-closed). T-18-01-01 IDOR mitigation.
  const effectiveUserId =
    args._callerRole === 'admin' && args.adminUserIdOverride
      ? args.adminUserIdOverride
      : args.userId;

  const result: ListResult = q.length > 0
    ? await searchProposals({
        userId: effectiveUserId, q,
        cursor: cursor ?? undefined,
        deleted: args.deleted ?? false,
        archived,
        limit: args.limit ?? 20,
      })
    : await listProposalsByUser({
        userId: effectiveUserId,
        cursor: cursor ?? undefined,
        deleted: args.deleted ?? false,
        archived,
        limit: args.limit ?? 20,
      });

  return {
    rows: result.rows.map((row) => ({
      id: row.id,
      // Active rows (filtered by status='active' in the helper) always have lcRef
      // set per proposals_finalized_completeness_check (Phase 12 D-04).
      lcRef: row.lcRef!,
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
      // D-27 — derive server-side from full ProposalRow (status / deletedAt /
      // pdfGeneratedAt / paramsSnapshot). The paramsSnapshot (commission_pct
      // bearing) never leaves the server; we project the bounded 4-string
      // DisplayStatus union onto the wire shape.
      displayStatus: deriveDisplayStatus(row),
    })),
    hasMore: result.hasMore,
    nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
  };
}
