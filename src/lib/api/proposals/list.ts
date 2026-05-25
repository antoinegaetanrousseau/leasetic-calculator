import 'server-only';
import {
  listProposalsByUser, searchProposals,
  deriveDisplayStatus, type DisplayStatus,
  type ListResult, encodeCursor, decodeCursor,
} from '@/lib/db/queries';
import { t } from '@/lib/i18n/dictionaries';
import type { XlsxExportRow } from '@/lib/xlsx/types';

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
  /** Brouillons filter — show non-phantom drafts instead of active proposals. */
  drafts?: boolean;
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
  const drafts = args.drafts ?? false;

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
        drafts,
        limit: args.limit ?? 20,
      })
    : await listProposalsByUser({
        userId: effectiveUserId,
        cursor: cursor ?? undefined,
        deleted: args.deleted ?? false,
        archived,
        drafts,
        limit: args.limit ?? 20,
      });

  return {
    rows: result.rows.map((row) => ({
      id: row.id,
      // Draft rows have lcRef=null; active rows always have it set.
      lcRef: row.lcRef ?? '',
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

// ── Phase 19 Plan 01 — XLSX Export ──────────────────────────────────────────

/**
 * D-EXPORT-01: hard cap on unbounded export query. Partners with
 * >10 000 proposals (unreachable in v1.3 scope, per CONTEXT) would see
 * a silent truncation — acceptable versus an unbounded query.
 */
export const MAX_EXPORT_ROWS = 10_000;

export interface BuildExportParams {
  userId: string;
  q?: string;
  archived?: boolean;
  locale: 'fr' | 'en';
}

/**
 * Unbounded (no cursor) export query. Returns at most MAX_EXPORT_ROWS rows
 * projected to XlsxExportRow, applying the same q + archived filter logic as
 * buildListResponse.
 *
 * ADMIN-09 commission scrub (D-05 / EXPORT-02): `paramsSnapshot` is read ONLY
 * to derive `deriveDisplayStatus` (via the shared helper that already reads
 * validityDays internally). The `commissionPct` field from `paramsSnapshot` is
 * NEVER written to any XlsxExportRow field — the type itself has no commission
 * field, making accidental leakage a compile-time error.
 *
 * T-19-01-01 IDOR mitigation: userId is the FIRST predicate passed to both
 * listProposalsByUser and searchProposals, identical to buildListResponse.
 */
export async function buildExportQuery(params: BuildExportParams): Promise<XlsxExportRow[]> {
  const q = params.q?.trim() ?? '';
  const archived = params.archived ?? false;
  const locale = params.locale;

  const result: ListResult = q.length > 0
    ? await searchProposals({
        userId: params.userId,
        q,
        archived,
        limit: MAX_EXPORT_ROWS,
      })
    : await listProposalsByUser({
        userId: params.userId,
        archived,
        limit: MAX_EXPORT_ROWS,
      });

  // Derive i18n-resolved status label using the existing chip.* keys (D-21 reuse).
  // DisplayStatus → chip.{status} → t(key, locale).
  function resolveStatusLabel(displayStatus: DisplayStatus): string {
    return t(`chip.${displayStatus}`, locale);
  }

  return result.rows.map((row) => {
    const inputs = row.inputs as {
      clientCo?: unknown;
      amountHT?: unknown;
      durationMonths?: unknown;
      projectDesc?: unknown;
    };
    const computed = row.computed as {
      loyerHT?: unknown;
      coeff?: unknown;
    } | null;

    // Parse amountHt — stored as string digit-only in inputs.amountHT.
    const amountHt = typeof inputs.amountHT === 'string'
      ? parseFloat(inputs.amountHT)
      : typeof inputs.amountHT === 'number'
        ? inputs.amountHT
        : 0;

    // Parse durationMonths — stored as number in inputs.durationMonths.
    const durationMonths = typeof inputs.durationMonths === 'number'
      ? inputs.durationMonths
      : 0;

    // Parse monthlyRent — stored as number in computed.loyerHT.
    const monthlyRent = typeof computed?.loyerHT === 'number'
      ? computed.loyerHT
      : typeof computed?.loyerHT === 'string'
        ? parseFloat(computed.loyerHT)
        : 0;

    // Parse coefficient — stored as number in computed.coeff (e.g. 0.0369).
    // Format as percentage string "X.XX%" per UI-SPEC coefficient column.
    const coeffRaw = computed?.coeff;
    const coefficient = typeof coeffRaw === 'number'
      ? `${(coeffRaw * 100).toFixed(2)}%`
      : typeof coeffRaw === 'string'
        ? coeffRaw
        : '';

    const displayStatus = deriveDisplayStatus(row);

    return {
      lcRef: row.lcRef ?? '',
      clientName: typeof inputs.clientCo === 'string' ? inputs.clientCo : '',
      projectName: typeof inputs.projectDesc === 'string' ? inputs.projectDesc : '',
      amountHt,
      durationMonths,
      monthlyRent,
      coefficient,
      status: resolveStatusLabel(displayStatus),
      createdAt: row.createdAt,
      expiresAt: (() => {
        // expiresAt = pdfGeneratedAt + validityDays (days→ms).
        // null for drafts and rows without pdfGeneratedAt.
        if (!row.pdfGeneratedAt || !row.paramsSnapshot) return null;
        const validityDays =
          (row.paramsSnapshot as { validityDays?: number } | null)?.validityDays ?? 30;
        return new Date(
          row.pdfGeneratedAt.getTime() + validityDays * 24 * 60 * 60 * 1000,
        );
      })(),
    };
  });
}
