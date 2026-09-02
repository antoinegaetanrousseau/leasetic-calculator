import type { db } from '@/lib/db';

/**
 * Phase 31 Plan 02 — the reconciliation engine's source-agnostic contracts
 * (IMPORT-01/03/04).
 *
 * `ReconciliationSource` is the seam that keeps `src/lib/reconcile/engine.ts`
 * reusable: Phase 32 (HubSpot Import) supplies a second implementation of
 * this interface, and the engine itself never references the word
 * "proposal" outside `ReconciliationPlan.proposalLinks`. Every shape below
 * must stay JSON-serializable — plan 04 writes a `ReconciliationPlan` to
 * disk verbatim as the machine-readable half of the D-14 dry-run report, and
 * plan 07 diffs two of them.
 */

/** The Drizzle database handle, as returned by the memoized `db()` singleton. */
export type DbHandle = ReturnType<typeof db>;

export type ReconciliationSourceId = 'proposal_extraction' | 'hubspot_import';

/**
 * One row of raw, unvalidated candidate data as read from a source. Every
 * field is deliberately loose — `rawSiren` is `unknown` because
 * `proposals.inputs` is typed `Record<string, unknown>` at the DB layer and
 * historical rows may predate the current shape.
 */
export interface SourceRow {
  sourceRowId: string;
  ownerId: string;
  companyName: string | null;
  rawSiren: unknown;
  contactName: string | null;
  contactRole: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  occurredAt: Date;
  alreadyLinkedRelationshipId: string | null;
}

/**
 * The seam `engine.ts` depends on instead of any concrete source module.
 * `loadRows` performs zero writes — it is a pure read.
 */
export interface ReconciliationSource {
  id: ReconciliationSourceId;
  loadRows(dbi: DbHandle): Promise<SourceRow[]>;
}

/**
 * The three values here must stay identical to
 * `company_pair_decisions_reason_check` in
 * `drizzle/0008_phase31_reconciliation.sql`.
 */
export type PairReason = 'differing' | 'one_missing' | 'both_missing';

export interface PlannedCompany {
  key: string;
  canonicalName: string;
  nameNormalized: string;
  siren: string | undefined;
  existingCompanyId: string | null;
}

export interface PlannedRelationship {
  companyKey: string;
  ownerId: string;
  existingRelationshipId: string | null;
  sourceRowIds: string[];
}

export interface PlannedContact {
  relationshipKey: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  existingContactId: string | null;
  mergedFromSourceRowIds: string[];
}

export interface PlannedPair {
  sideAKey: string;
  sideBKey: string;
  nameNormalized: string;
  reason: PairReason;
  companyKeyA: string;
  companyKeyB: string;
  alreadyPending: boolean;
}

export interface SkippedRow {
  sourceRowId: string;
  reason: 'blank_company_name' | 'contact_without_name' | 'already_linked' | 'contact_conflicts_with_human_row';
  detail?: string;
}

export interface ReconciliationPlan {
  sourceId: ReconciliationSourceId;
  generatedAt: string;
  companies: PlannedCompany[];
  relationships: PlannedRelationship[];
  contacts: PlannedContact[];
  proposalLinks: Array<{ sourceRowId: string; relationshipKey: string }>;
  flaggedPairs: PlannedPair[];
  suppressedPairs: Array<{ sideAKey: string; sideBKey: string; verdict: 'merged' | 'kept_separate' }>;
  skipped: SkippedRow[];
}
