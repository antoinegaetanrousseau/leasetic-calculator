'use server';

/**
 * Phase 31 Plan 03 — requireAdmin-gated server actions for the reconciliation
 * review queue (D-11, D-12, IMPORT-05).
 *
 * Mirrors `src/lib/crm/actions.ts`'s discipline, with two substitutions:
 * the guard is `requireAdmin()` — this surface is admin-only, unlike the
 * partner/sales guard `src/lib/crm/actions.ts` uses (D-11) — and the
 * bounded error key is `'admin.reconciliation.toast.error'`.
 *
 * PITFALLS §7.3 ordering — every exported function calls `requireAdmin()`
 * as the FIRST await, before any input parse or DB access.
 *
 * Bounded-error discipline: every failure class in every action throws the
 * single key `BOUNDED_ERROR`. The raw cause is logged server-side only
 * (`console.error`) — a caller can never distinguish "this pair does not
 * exist" from "this pair belongs to a state you may not see" from any
 * other cause.
 *
 * `requireAdmin()`'s `notFound()` throw is called OUTSIDE the try/catch
 * below and is therefore NEVER converted into `BOUNDED_ERROR` — a 404 and
 * a bounded toast error are different signals, and swallowing the 404
 * would itself leak that this route exists (D-18).
 */

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require';
import { mergeCompanyPair, recordKeepSeparate } from './merge';
import { keepPairSeparateSchema, mergeCompanyPairSchema } from './schemas';

const BOUNDED_ERROR = 'admin.reconciliation.toast.error';

/**
 * The review-queue route path, built from `ADMIN_URL_SEGMENT`. When the env
 * var is unset, the `(admin)` layout already `notFound()`s every request to
 * that tree — an action must not become a second place that reveals the
 * segment's absence, so revalidation is skipped rather than throwing.
 */
function reviewQueuePath(): string | null {
  const segment = process.env.ADMIN_URL_SEGMENT;
  return segment ? `/${segment}/companies/review` : null;
}

export async function mergeCompanyPairAction(pairId: string, survivorCompanyId: string): Promise<void> {
  const { session } = await requireAdmin(); // FIRST — PITFALLS §7.3, admin-only guard, D-11
  try {
    const input = mergeCompanyPairSchema.parse({ pairId, survivorCompanyId });

    const result = await mergeCompanyPair({
      pairId: input.pairId,
      survivorCompanyId: input.survivorCompanyId,
      actorId: session.user.id,
    });

    if (!result.ok) {
      console.error(`[mergeCompanyPairAction] mergeCompanyPair failed: ${result.reason}`);
      throw new Error(BOUNDED_ERROR);
    }

    const path = reviewQueuePath();
    if (path) {
      revalidatePath(path);
    }
  } catch (e) {
    if (e instanceof Error && e.message === BOUNDED_ERROR) {
      throw e; // already the bounded key — don't double-log or re-wrap
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[mergeCompanyPairAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

export async function keepPairSeparateAction(pairId: string): Promise<void> {
  const { session } = await requireAdmin(); // FIRST — PITFALLS §7.3, admin-only guard, D-11
  try {
    const input = keepPairSeparateSchema.parse({ pairId });

    const result = await recordKeepSeparate({ pairId: input.pairId, actorId: session.user.id });

    if (!result.ok) {
      console.error(`[keepPairSeparateAction] recordKeepSeparate failed: ${result.reason}`);
      throw new Error(BOUNDED_ERROR);
    }

    const path = reviewQueuePath();
    if (path) {
      revalidatePath(path);
    }
  } catch (e) {
    if (e instanceof Error && e.message === BOUNDED_ERROR) {
      throw e;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[keepPairSeparateAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}
