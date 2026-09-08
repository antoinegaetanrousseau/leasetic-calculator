'use server';

/**
 * PROF-03 / D-07 / D-08 / D-09 — the single Leasetic advisor identity's admin write path.
 *
 * New file, NOT added to `./actions.ts` (Plan 42-05 edits that file in the same wave).
 *
 * PITFALLS §7.3 ordering (same discipline as every wrapper in `./actions.ts`):
 *   const { session } = await requireAdmin();   // AUTH-15 — authorization before payload/DB
 *   await upsertAdvisor(...);
 *   await writeAuditLog({...});
 */

import { requireAdmin } from '@/lib/auth/require';
import { getAdvisor, upsertAdvisor } from '@/lib/db/queries';
import { writeAuditLog } from '@/lib/db/queries/audit-log';
import { advisorFormSchema, type AdvisorFormValues } from './advisor-schemas';

export type AdminUpdateAdvisorResult = { ok: true } | { ok: false; error: string };

/**
 * Admin-only write of the single Leasetic advisor row. `requireAdmin()` runs FIRST,
 * before the payload is read or any DB access happens (AUTH-15 ordering discipline —
 * a server action is a public endpoint, so the page-level guard alone is not enough).
 *
 * Re-validates `data` against `advisorFormSchema` server-side regardless of the
 * client's own validation (defence-in-depth against tampered client state), then
 * writes exactly one `UPDATE` via `upsertAdvisor` and one `admin.advisor.update`
 * audit-log entry recording only the changed field names and the actor — never a
 * commission, rate or derived value (ADMIN-09 holds by construction: this action
 * never reads `global_params`).
 */
export async function adminUpdateAdvisor(data: AdvisorFormValues): Promise<AdminUpdateAdvisorResult> {
  const { session } = await requireAdmin();

  try {
    const parsed = advisorFormSchema.parse(data);

    const before = await getAdvisor();
    const changedFields = (['name', 'fonction', 'telephone', 'email'] as const).filter(
      (field) => (before?.[field] ?? null) !== parsed[field],
    );

    await upsertAdvisor({ ...parsed, actorId: session.user.id });

    await writeAuditLog({
      actorId: session.user.id,
      action: 'admin.advisor.update',
      targetType: 'leasetic_advisor',
      targetId: null,
      payload: { changed_fields: changedFields },
    });

    return { ok: true };
  } catch {
    // PITFALLS §9.4 — never echo the raw error to the caller.
    return { ok: false, error: 'admin.advisor.error.save' };
  }
}
