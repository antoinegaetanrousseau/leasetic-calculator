'use server';

import { requireAdmin } from '@/lib/auth/require';
import {
  listGlobalParamsHistory,
  type GlobalParamsCursor,
  type GlobalParamsHistoryResult,
} from '@/lib/db/queries/global-params';

/**
 * AUTH-15 — independent requireAdmin call before any DB read. Pagination cursor
 * comes from the client, but it's a non-secret tuple (effectiveFrom, id); abuse
 * surface is read-only on global_params (admin-only data, no commission redaction
 * needed because the editor + history are the explicit commission-visible surfaces
 * per ADMIN-09 §13).
 *
 * T-09-02-07 DoS mitigation: limit=20 is enforced server-side.
 *
 * WR-03: validate cursor shape server-side before trusting client-supplied strings
 * in SQL. A malformed effectiveFrom (e.g. invalid timestamptz) causes a Postgres
 * error that would propagate to the client as an unhandled exception.
 */

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadMoreHistory(
  cursor: GlobalParamsCursor,
): Promise<GlobalParamsHistoryResult> {
  await requireAdmin();
  // WR-03: validate cursor before trusting client-supplied strings in SQL template.
  if (
    !cursor ||
    typeof cursor.effectiveFrom !== 'string' ||
    typeof cursor.id !== 'string' ||
    !ISO_RE.test(cursor.effectiveFrom) ||
    !UUID_RE.test(cursor.id)
  ) {
    throw new Error('admin.coefficients.history.load.error');
  }
  return listGlobalParamsHistory({ cursor, limit: 20 });
}
