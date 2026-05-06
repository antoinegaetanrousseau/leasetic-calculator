/**
 * Health-check helpers for /healthz (BOOT-12).
 *
 * Each helper returns a discriminated union { ok: true } | { ok: false, message }.
 * The message is BOUNDED — short, generic strings ('connection failed', 'auth failed',
 * 'unknown error'). Original error.message values are NEVER returned — they often
 * contain connection strings, blob tokens, or other sensitive substrings.
 *
 * Per PITFALLS §9.4 (commission invisibility extends to logs / traces / admin views):
 * the same redaction discipline applies to public health endpoints. /healthz is hit
 * by anyone with the URL; we leak nothing useful to an attacker.
 */

import { db, DbAuthError } from '@/lib/db';
import { schemaMeta } from '@/db/schema';
import { storage, StorageAuthError, StorageNotFoundError } from '@/lib/storage';

export type HealthCheckResult = { ok: true } | { ok: false; message: string };

export type HealthResponse = {
  db: 'ok' | 'error';
  blob: 'ok' | 'error';
  checked_at: string;
  message?: string;
};

/** Map an unknown thrown value to a short bounded status string. */
function classifyError(e: unknown): string {
  if (e instanceof DbAuthError || e instanceof StorageAuthError) return 'auth failed';
  // Connection-level errors (network, DNS, refused). Match by error code/name when available
  // without ever returning the raw message.
  if (e && typeof e === 'object' && 'code' in e) {
    const code = String((e as { code?: unknown }).code ?? '');
    if (
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN'
    ) {
      return 'connection failed';
    }
  }
  return 'unknown error';
}

/**
 * SELECT against schema_meta proving (a) Drizzle/postgres-js connection works,
 * (b) the migration applied (the table exists), (c) the row count query roundtrips.
 * The query uses .limit(0) so we don't depend on any rows existing.
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  try {
    const d = db();
    // SELECT id FROM schema_meta LIMIT 0 — touches the table without requiring data.
    // Drizzle's typed query keeps the error surface narrow.
    await d.select({ id: schemaMeta.id }).from(schemaMeta).limit(0);
    return { ok: true };
  } catch (e) {
    console.error('[healthz] db check failed:', e); // server-side only
    return { ok: false, message: classifyError(e) };
  }
}

/**
 * Blob round-trip: put a small object, read it back, delete it.
 * Uses a unique key per call to avoid collisions if two health checks race.
 */
export async function checkBlobHealth(): Promise<HealthCheckResult> {
  const key = `_health/${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
  const body = Buffer.from(`leasetic-healthz-${new Date().toISOString()}`, 'utf-8');
  try {
    const s = storage();
    await s.put(key, body, { contentType: 'text/plain' });
    const got = await s.get(key);
    if (got.body.toString('utf-8') !== body.toString('utf-8')) {
      return { ok: false, message: 'roundtrip mismatch' };
    }
    await s.delete(key);
    return { ok: true };
  } catch (e) {
    console.error('[healthz] blob check failed:', e); // server-side only
    // Best-effort cleanup if put succeeded but get/delete failed
    try {
      await storage().delete(key);
    } catch {
      /* ignore — already-failed path */
    }
    if (e instanceof StorageNotFoundError) return { ok: false, message: 'roundtrip mismatch' };
    return { ok: false, message: classifyError(e) };
  }
}

/** Build the JSON response the route handler returns. */
export function buildHealthResponse(
  dbResult: HealthCheckResult,
  blobResult: HealthCheckResult
): HealthResponse {
  const checked_at = new Date().toISOString();
  const dbStatus = dbResult.ok ? 'ok' : 'error';
  const blobStatus = blobResult.ok ? 'ok' : 'error';

  if (dbResult.ok && blobResult.ok) {
    return { db: 'ok', blob: 'ok', checked_at };
  }
  // Combined message lists which component failed, with bounded strings only.
  const parts: string[] = [];
  if (!dbResult.ok) parts.push(`db: ${dbResult.message}`);
  if (!blobResult.ok) parts.push(`blob: ${blobResult.message}`);
  return {
    db: dbStatus,
    blob: blobStatus,
    checked_at,
    message: parts.join('; '),
  };
}
