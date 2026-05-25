import 'server-only';
import { and, count, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

/**
 * Phase 17 Plan 03 — server-side aggregate count helpers for the Partner Home
 * MetricTile values (PHOME-02). Three helpers, all scoped strictly to a single
 * partner (`userId`) — T-17-03-01 IDOR mitigation.
 *
 * D-05 (inclusion rules):
 *   - "Ce mois-ci" + "Total" = COUNT(*) WHERE status IN ('active', 'draft')
 *     AND deleted_at IS NULL [AND created_at >= monthStartUtc for "Ce mois-ci"]
 *   - "Brouillons" = COUNT(*) WHERE status = 'draft' AND deleted_at IS NULL
 *   - Soft-deleted proposals are EXCLUDED from all three counts.
 *   - Note: `expired` is NOT a stored status — finalized proposals carry
 *     `status='active'` even after their validity_days window elapses.
 *     `deriveDisplayStatus` derives "expired" at render time from
 *     `pdfGeneratedAt + validityDays < now()`. For SSR aggregates, expired
 *     rows naturally roll into the active count via the `'active'` filter.
 *
 * D-06 (Europe/Paris timezone math):
 *   App-side computation of `monthStartUtc` using `Intl.DateTimeFormat` with
 *   `timeZone: 'Europe/Paris'`. The resulting Date is the UTC equivalent of
 *   `YYYY-MM-01 00:00 Europe/Paris`, passed to Drizzle as the `gte` operand
 *   on `created_at` (which is `timestamp with time zone` — stored as UTC).
 *
 *   DST survival: the Intl-based approach asks the OS for the canonical
 *   wall-clock time in Europe/Paris, so DST transitions in March (UTC+1 →
 *   UTC+2) and October (UTC+2 → UTC+1) are handled correctly without any
 *   manual offset bookkeeping. Test 6 in proposal-aggregates.test.ts covers
 *   both boundaries against fixed `Date.now()` mocks.
 *
 * T-17-03-01: every helper takes `userId` as a required arg and applies
 * `eq(schema.proposals.userId, userId)` as the FIRST `AND` predicate in the
 * composed WHERE clause. No cross-user count leak is possible.
 *
 * Pattern: based on `listProposalsByUser` (proposals.ts:152) — same
 * `eq + isNull + inArray` shape — but the projection is `count()` from
 * drizzle-orm and the call site terminates with a single `await` on the
 * resolved select chain (no `.orderBy`, no `.limit` — aggregates return one
 * row).
 */

const ACTIVE_INCLUSION_STATUSES = ['active', 'draft'] as const;

/**
 * Compute the UTC equivalent of "first day of current month at 00:00 in
 * Europe/Paris" using Intl.DateTimeFormat. The returned Date is what the
 * Postgres comparator should receive for a `created_at >= ?` filter on a
 * `timestamp with time zone` column.
 *
 * Implementation: ask Intl for the year + month of `now` in Europe/Paris,
 * then build an ISO string `YYYY-MM-01T00:00:00` and resolve it back to UTC
 * using a one-shot Date trick. The `Intl.DateTimeFormat` shouldering of
 * timezone-aware year/month extraction means DST transitions are handled by
 * the OS time-zone database — the helper never manually adds/subtracts
 * hours.
 *
 * Returns a `Date` whose `.toISOString()` is the UTC instant matching
 * 00:00 wall-clock in Europe/Paris on the 1st of the current Paris month.
 */
function getEuropeParisMonthStartUtc(now: Date = new Date()): Date {
  // Step 1: extract Europe/Paris-localized year + month parts.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
  });
  const parts = fmt.formatToParts(now);
  const yearStr = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const monthStr = parts.find((p) => p.type === 'month')?.value ?? '01';
  const year = Number(yearStr);
  const month = Number(monthStr); // 1..12

  // Step 2: find the UTC instant that, when formatted in Europe/Paris,
  // reads `YYYY-MM-01T00:00:00`. We approximate by constructing a UTC Date
  // for `YYYY-MM-01T00:00:00Z` then asking Intl how that instant displays
  // in Europe/Paris — the difference between displayed and target wall
  // clock IS the timezone offset we need to subtract from the UTC instant.
  const approxUtc = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const dtfParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(approxUtc);
  const getNum = (type: string, fallback: number) =>
    Number(dtfParts.find((p) => p.type === type)?.value ?? String(fallback));
  // What Europe/Paris reads when `approxUtc` is the UTC moment.
  const parisYear = getNum('year', year);
  const parisMonth = getNum('month', month);
  const parisDay = getNum('day', 1);
  let parisHour = getNum('hour', 0);
  // Intl 'en-US' may render midnight as '24' — normalize to 0.
  if (parisHour === 24) parisHour = 0;
  const parisMinute = getNum('minute', 0);
  const parisSecond = getNum('second', 0);

  // The wall-clock Paris time displayed for the approxUtc instant, as a
  // pseudo-UTC ms count (treat the Paris wall-clock fields as if they were
  // UTC for differencing purposes).
  const parisAsUtcMs = Date.UTC(
    parisYear,
    parisMonth - 1,
    parisDay,
    parisHour,
    parisMinute,
    parisSecond,
    0,
  );
  // The wall-clock we WANT Paris to display: YYYY-MM-01 00:00:00.
  const targetAsUtcMs = Date.UTC(year, month - 1, 1, 0, 0, 0, 0);
  // Difference is the Paris-offset-from-UTC at the approxUtc moment, in ms.
  const offsetMs = parisAsUtcMs - targetAsUtcMs;
  // Subtracting that offset from approxUtc gives the UTC instant whose
  // Paris wall-clock reads exactly the target.
  return new Date(approxUtc.getTime() - offsetMs);
}

/**
 * D-05 / D-06 — count of partner proposals created in the current
 * Europe/Paris calendar month, excluding soft-deleted rows.
 *
 * Status filter: `IN ('active', 'draft')` — expired proposals still have
 * `status='active'` in storage and naturally roll into the active count.
 */
export async function countThisMonth(userId: string): Promise<number> {
  const dbi = db();
  const monthStartUtc = getEuropeParisMonthStartUtc();
  // T-17-03-01: userId is the FIRST AND predicate (defense in depth).
  const where = and(
    eq(schema.proposals.userId, userId),
    inArray(schema.proposals.status, [...ACTIVE_INCLUSION_STATUSES]),
    isNull(schema.proposals.deletedAt),
    gte(schema.proposals.createdAt, monthStartUtc),
  );
  const rows = await dbi
    .select({ count: count() })
    .from(schema.proposals)
    .where(where);
  return rows[0]?.count ?? 0;
}

/**
 * D-05 — partner's all-time inclusive count (status IN ('active', 'draft')),
 * excluding soft-deleted rows. Expired rows roll into the active count.
 */
export async function countTotal(userId: string): Promise<number> {
  const dbi = db();
  const where = and(
    eq(schema.proposals.userId, userId),
    inArray(schema.proposals.status, [...ACTIVE_INCLUSION_STATUSES]),
    isNull(schema.proposals.deletedAt),
  );
  const rows = await dbi
    .select({ count: count() })
    .from(schema.proposals)
    .where(where);
  return rows[0]?.count ?? 0;
}

/**
 * D-05 — count of partner's drafts (status='draft'), excluding soft-deleted
 * and excluding empty phantom rows (inputs='{}') minted on wizard page-load
 * but never touched by the user.
 */
export async function countDrafts(userId: string): Promise<number> {
  const dbi = db();
  const where = and(
    eq(schema.proposals.userId, userId),
    eq(schema.proposals.status, 'draft'),
    isNull(schema.proposals.deletedAt),
    sql`${schema.proposals.inputs} != '{}'::jsonb`,
  );
  const rows = await dbi
    .select({ count: count() })
    .from(schema.proposals)
    .where(where);
  return rows[0]?.count ?? 0;
}

// ── Phase 18 Plan 01 Task 1 — Cross-partner Admin Home aggregate (D-02) ─────

/**
 * D-02 (18-CONTEXT) — Cross-partner monthly proposal count for Admin Home
 * stat tile. Includes ALL non-deleted statuses INCLUDING drafts (broader
 * than the partner-scoped countThisMonth which only counts active+draft via
 * inArray). Bounded by Europe/Paris calendar month start.
 *
 * Reuses getEuropeParisMonthStartUtc() — same DST-safe boundary as the
 * partner-scoped helper. Drops the userId filter (intentional cross-partner
 * scope; admin-only consumer per requireAdmin() gate at the SSR layer).
 *
 * SECURITY (T-18-01-02): admin-only data — consumed ONLY by the Admin Home
 * stat tile rendered inside `(admin)/[adminSegment]/` (requireAdmin()
 * gate). This helper is NOT exposed via any API route.
 *
 * @returns count of non-deleted proposals created in the current Europe/Paris
 *          calendar month across all partners.
 */
export async function getMonthlyProposalCountAll(): Promise<number> {
  const dbi = db();
  const monthStartUtc = getEuropeParisMonthStartUtc();
  // No userId predicate (cross-partner). No status filter (D-02 explicit:
  // includes drafts). Only filter: not soft-deleted + within current Paris
  // calendar month.
  const where = and(
    isNull(schema.proposals.deletedAt),
    gte(schema.proposals.createdAt, monthStartUtc),
  );
  const rows = await dbi
    .select({ count: count() })
    .from(schema.proposals)
    .where(where);
  return rows[0]?.count ?? 0;
}
