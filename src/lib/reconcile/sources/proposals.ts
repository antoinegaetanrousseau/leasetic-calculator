import 'server-only';
import { inArray } from 'drizzle-orm';
import { schema } from '@/lib/db';
import type { ReconciliationSource, SourceRow, DbHandle } from '../types';

/**
 * Phase 31 Plan 02 — the proposals adapter behind `ReconciliationSource`
 * (IMPORT-01).
 *
 * This module reads across every owner and performs NO authorization of its
 * own — it is only ever called from the offline CLI entry point (plan 07),
 * never from a request handler. It projects exactly five `proposals`
 * columns (`id`, `userId`, `inputs`, `clientRelationshipId`, `createdAt`)
 * and selects nothing from the commission envelope (ADMIN-09) — this is a
 * client-identity extraction, not a commission read.
 *
 * D-01: only `'active'` and `'deleted'` proposals are read; a `'draft'` row
 * (an in-progress, possibly-abandoned form) is never a source row.
 *
 * Every field pulled out of `inputs` is treated as unvalidated:
 * `proposals.inputs` is typed `Record<string, unknown>` at the DB layer and
 * historical rows may predate the current shape (`schema_version` tracks
 * this). A non-string value at any of the six client-field keys yields
 * `null`, never a coerced string.
 */

function readStringField(inputs: Record<string, unknown>, key: string): string | null {
  const value = inputs[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const proposalsSource: ReconciliationSource = {
  id: 'proposal_extraction',

  async loadRows(dbi: DbHandle): Promise<SourceRow[]> {
    const rows = await dbi
      .select({
        id: schema.proposals.id,
        userId: schema.proposals.userId,
        inputs: schema.proposals.inputs,
        clientRelationshipId: schema.proposals.clientRelationshipId,
        createdAt: schema.proposals.createdAt,
      })
      .from(schema.proposals)
      .where(inArray(schema.proposals.status, ['active', 'deleted']));

    return rows.map((row): SourceRow => {
      const inputs = row.inputs ?? {};
      return {
        sourceRowId: row.id,
        ownerId: row.userId,
        companyName: readStringField(inputs, 'clientCo'),
        rawSiren: inputs['clientSiren'],
        contactName: readStringField(inputs, 'clientName'),
        contactRole: readStringField(inputs, 'clientRole'),
        contactPhone: readStringField(inputs, 'clientTel'),
        contactEmail: readStringField(inputs, 'clientEmail'),
        occurredAt: row.createdAt,
        alreadyLinkedRelationshipId: row.clientRelationshipId,
      };
    });
  },
};
