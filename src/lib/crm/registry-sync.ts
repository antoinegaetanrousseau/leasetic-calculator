import 'server-only';

import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { insertRelationshipEventForOwner } from '@/lib/db/queries';
import { writeAuditLog } from '@/lib/db/queries/audit-log';
import { lookupCompanyBySiren } from '@/lib/registry/recherche-entreprises';
import type { RegistryRefreshResult } from './constants';

/**
 * Phase 34 Plan 07 — the ONLY writer of the registry tier (D-01, D-02).
 *
 * THE STRUCTURAL RULE. This is the only function in the codebase that names a
 * registry column in a write. No server action, no schema and no form may write
 * `legal_name`, `address_line`, `postal_code`, `city`, `legal_form`, `naf_code`,
 * `naf_section`, `headcount_band`, `founded_on` or `registry_state`; those
 * values arrive here from `lookupCompanyBySiren` and from nowhere else. D-02 is
 * not a UI convention that a future form could quietly break — it is this file
 * being the sole call site, and a repo-wide grep gate in 34-07-PLAN.md's
 * acceptance criteria asserts that no other non-test module under `src/lib/` or
 * `app/` so much as mentions one of those column names in a write position.
 *
 * The `.set()` object below is written INLINE with literal keys and is never
 * spread from the parsed lookup result. If the registry starts returning a new
 * field tomorrow, it cannot become a column write by accident (D-02, D-10).
 *
 * IT NEVER THROWS (D-09). A registry failure must never block client creation,
 * so `createClientRelationshipAction` calls this with no guard of its own. Every
 * path — a lookup failure, a driver error, a `companies.siren` unique violation
 * caused by ANOTHER partner's data (34-PATTERNS trap 10) — is caught here, logged
 * server-side only, and reported as a bounded `RegistryRefreshResult`. Nothing
 * about the underlying error crosses the boundary.
 *
 * THE FAILURE→STATUS MAPPING. D-09 says a failure "writes registry_status =
 * 'pending'"; the status vocabulary plan 34-01 shipped has four values, and the
 * vocabulary exists to tell a partner whether refreshing again is worth a click.
 * So the mapping below is a nuance INSIDE "did not block", not a departure from
 * it:
 *
 *   { ok: true }              → 'synced'    + registry_synced_at + a timeline event
 *   { reason: 'not_found' }   → 'not_found' — settled; correcting the SIREN helps, retrying does not
 *   { reason: 'timeout' }     → 'pending'   — retryable
 *   { reason: 'upstream_error' } → 'pending' — retryable
 *   { reason: 'malformed' }   → 'error'     — the upstream answered with something we cannot use;
 *                                             distinguished so a recurring parser break is visible
 *                                             rather than looking like an outage
 *
 * A non-ok lookup writes ONLY the status and the timestamp. It must never blank
 * an identity column: a `not_found` on a re-check would otherwise destroy a
 * previously good sync.
 *
 * NO TRANSACTIONS (`crm/actions.ts` module header). The production driver is
 * `drizzle-orm/neon-http`, whose `.transaction()` throws at runtime, so the
 * column write, the event write and the audit write are three separate
 * statements. The COLUMNS GO FIRST: a crash between them leaves a synced
 * identity with no timeline entry, which is the harmless direction. The two
 * narration writes are individually try/caught so neither can report a
 * committed sync as a failure.
 */
export interface SyncCompanyRegistryArgs {
  companyId: string;
  siren: string;
  /**
   * The CALLER's own relationship, or `null` on a path that has no timeline to
   * append to. The `registry_synced` event goes on this relationship only —
   * another partner holding the same company sees the refreshed identity
   * (it is shared, D-01 tier one) but not this event (D-01 tier three).
   */
  relationshipId: string | null;
  actorId: string;
  ownerId: string;
}

export async function syncCompanyRegistry(
  args: SyncCompanyRegistryArgs,
): Promise<RegistryRefreshResult> {
  try {
    const result = await lookupCompanyBySiren(args.siren);
    const dbi = db();

    if (!result.ok) {
      const registryStatus =
        result.reason === 'not_found'
          ? 'not_found'
          : result.reason === 'malformed'
            ? 'error'
            : 'pending';

      // Status and timestamp ONLY — no identity column appears here on purpose.
      await dbi
        .update(schema.companies)
        .set({ registryStatus, updatedAt: new Date() })
        .where(eq(schema.companies.id, args.companyId));

      return result.reason === 'not_found'
        ? { ok: false, reason: 'not_found' }
        : { ok: false, reason: 'unavailable' };
    }

    // Ten identity columns, each named individually. The lookup result is
    // never spread into this object (D-02, D-10) — see the header.
    await dbi
      .update(schema.companies)
      .set({
        legalName: result.data.legalName,
        addressLine: result.data.addressLine,
        postalCode: result.data.postalCode,
        city: result.data.city,
        legalForm: result.data.legalForm,
        nafCode: result.data.nafCode,
        nafSection: result.data.nafSection,
        headcountBand: result.data.headcountBand,
        foundedOn: result.data.foundedOn,
        registryState: result.data.registryState,
        registryStatus: 'synced',
        registrySyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.companies.id, args.companyId));

    // ── Narration: the two writes below describe a change that has ALREADY
    // committed above, so neither may report the sync as failed.
    //
    // Both are wrapped individually. Without this, a throw from either would
    // unwind into the outer catch and return `{ ok: false, reason:
    // 'unavailable' }` for a sync whose ten identity columns are already on
    // disk — the caller would show a failure toast over refreshed data, and a
    // creation-time sync would look like an outage. That is the same defect
    // plan 34-08 fixed in the stage action, and 33-REVIEW WR-03 raised against
    // the outcome actions.
    if (args.relationshipId !== null) {
      try {
        await insertRelationshipEventForOwner({
          relationshipId: args.relationshipId,
          ownerId: args.ownerId,
          kind: 'registry_synced',
          actorId: args.actorId,
          // Only the SIREN the caller already submitted — no commission data,
          // no other partner's data (D-26 / ADMIN-09).
          payload: { siren: args.siren },
        });
      } catch (e) {
        console.error('[syncCompanyRegistry] timeline event failed:', e); // server-side only
      }
    }

    // D-03 — this write changed columns EVERY partner holding the company sees,
    // so who triggered it and when is recorded, the same as a shared-tier
    // display edit. Operator decision, 2026-09-03: a refresh is not a
    // partner-authored edit, but it does change shared data, and that is what
    // D-03 audits. The timeline event is scoped to one relationship; this row
    // is the company-level record.
    //
    // Payload carries IDS and the caller-submitted SIREN only — never a
    // registry value, never commission data (D-26 / ADMIN-09).
    try {
      await writeAuditLog({
        actorId: args.actorId,
        action: 'company.registry_sync',
        targetType: 'company',
        targetId: args.companyId,
        payload: { siren: args.siren, relationshipId: args.relationshipId },
      });
    } catch (e) {
      console.error('[syncCompanyRegistry] audit write failed:', e); // server-side only
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[syncCompanyRegistry] failed:', msg); // server-side only
    return { ok: false, reason: 'unavailable' };
  }
}
