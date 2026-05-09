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
 */
export async function loadMoreHistory(
  cursor: GlobalParamsCursor,
): Promise<GlobalParamsHistoryResult> {
  await requireAdmin();
  return listGlobalParamsHistory({ cursor, limit: 20 });
}
