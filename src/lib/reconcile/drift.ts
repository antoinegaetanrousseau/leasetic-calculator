/**
 * Phase 31 Plan 04 — drift comparison between a stored dry-run report and a
 * freshly computed plan (D-15).
 *
 * D-15 is what turns "never write without a prior dry run" from a convention
 * into something enforceable: before the real run touches the database it
 * must diff itself against the last reviewed dry run and refuse to proceed
 * silently on anything the reviewed report never promised. The fingerprint
 * and source guards below are what stop a report reviewed against one
 * database (or one source) from authorizing a write against another —
 * both checks run BEFORE any change list is computed, so plan 07 can
 * hard-abort on either without inspecting a single row.
 *
 * `computeDrift` is pure — no filesystem or database access — so it stays
 * trivially unit-testable and reusable from both a CLI script and a future
 * admin surface.
 */
import type { PlannedCompany, PlannedContact, PlannedRelationship, ReconciliationPlan, SkippedRow } from './types';
import type { DryRunReportEnvelope } from './report';

export type DriftChangeKind = 'company' | 'relationship' | 'contact' | 'proposalLink' | 'pair' | 'skipped';
export type DriftDirection = 'added' | 'removed' | 'changed';

export interface DriftChange {
  kind: DriftChangeKind;
  direction: DriftDirection;
  key: string;
  detail: string;
}

export type DriftResult =
  | { status: 'no-report' }
  | { status: 'fingerprint-mismatch'; storedFingerprint: string; freshFingerprint: string }
  | { status: 'source-mismatch' }
  | { status: 'clean'; ageMs: number }
  | { status: 'drift'; ageMs: number; changes: DriftChange[] };

export interface ComputeDriftInput {
  /** The last reviewed dry-run report, or `null` when none exists yet. */
  stored: DryRunReportEnvelope | null;
  /** The plan freshly recomputed by the real run, right before it would write. */
  fresh: ReconciliationPlan;
  /**
   * The real run's own database fingerprint (same derivation as
   * `writeDryRunReport`'s `databaseFingerprint` argument — SHA-256 of
   * hostname + database name only), computed by the caller. `ReconciliationPlan`
   * itself carries no fingerprint field, so this cannot be read off `fresh`.
   */
  freshFingerprint: string;
}

/** Generic key/value diff over two arrays, compared by a caller-supplied stable key — never by index. */
function diffByKey<T>(
  kind: DriftChangeKind,
  storedItems: T[],
  freshItems: T[],
  keyFn: (item: T) => string,
  serializeFn: (item: T) => string,
  detailFn: (item: T) => string,
): DriftChange[] {
  const storedMap = new Map<string, T>(storedItems.map((item) => [keyFn(item), item]));
  const freshMap = new Map<string, T>(freshItems.map((item) => [keyFn(item), item]));
  // Sort the union of keys so output order never depends on Map/array
  // iteration order — determinism is load-bearing for the drift diff (D-15).
  const allKeys = Array.from(new Set([...storedMap.keys(), ...freshMap.keys()])).sort();

  const changes: DriftChange[] = [];
  for (const key of allKeys) {
    const storedItem = storedMap.get(key);
    const freshItem = freshMap.get(key);
    if (storedItem === undefined && freshItem !== undefined) {
      changes.push({ kind, direction: 'added', key, detail: detailFn(freshItem) });
    } else if (storedItem !== undefined && freshItem === undefined) {
      changes.push({ kind, direction: 'removed', key, detail: detailFn(storedItem) });
    } else if (storedItem !== undefined && freshItem !== undefined) {
      if (serializeFn(storedItem) !== serializeFn(freshItem)) {
        changes.push({ kind, direction: 'changed', key, detail: detailFn(freshItem) });
      }
    }
  }
  return changes;
}

function diffCompanies(stored: PlannedCompany[], fresh: PlannedCompany[]): DriftChange[] {
  return diffByKey(
    'company',
    stored,
    fresh,
    (c) => c.key,
    (c) => JSON.stringify(c),
    (c) => `canonicalName=${c.canonicalName}${c.siren ? ` siren=${c.siren}` : ''}`,
  );
}

function diffRelationships(stored: PlannedRelationship[], fresh: PlannedRelationship[]): DriftChange[] {
  return diffByKey(
    'relationship',
    stored,
    fresh,
    (r) => `${r.companyKey}|${r.ownerId}`,
    (r) => JSON.stringify(r),
    (r) => `companyKey=${r.companyKey} ownerId=${r.ownerId}`,
  );
}

function diffContacts(stored: PlannedContact[], fresh: PlannedContact[]): DriftChange[] {
  return diffByKey(
    'contact',
    stored,
    fresh,
    (c) => `${c.relationshipKey}|${c.email ?? c.name}`,
    (c) => JSON.stringify(c),
    (c) => `name=${c.name}${c.email ? ` email=${c.email}` : ''}`,
  );
}

function diffProposalLinks(
  stored: Array<{ sourceRowId: string; relationshipKey: string }>,
  fresh: Array<{ sourceRowId: string; relationshipKey: string }>,
): DriftChange[] {
  return diffByKey(
    'proposalLink',
    stored,
    fresh,
    (p) => p.sourceRowId,
    (p) => JSON.stringify(p),
    (p) => `relationshipKey=${p.relationshipKey}`,
  );
}

function diffSkipped(stored: SkippedRow[], fresh: SkippedRow[]): DriftChange[] {
  return diffByKey(
    'skipped',
    stored,
    fresh,
    (s) => `${s.sourceRowId}|${s.reason}`,
    (s) => JSON.stringify(s),
    (s) => `reason=${s.reason}${s.detail ? ` detail=${s.detail}` : ''}`,
  );
}

/** A pair's status merges `flaggedPairs` and `suppressedPairs` into one lookup keyed on the unordered pair. */
interface PairState {
  detail: string;
}

function buildPairStates(plan: ReconciliationPlan): Map<string, PairState> {
  const states = new Map<string, PairState>();
  for (const p of plan.flaggedPairs) {
    states.set(`${p.sideAKey}|${p.sideBKey}`, { detail: `status=flagged reason=${p.reason}` });
  }
  for (const p of plan.suppressedPairs) {
    // A pair present in both is only possible if a run planned it as both
    // flagged and suppressed simultaneously, which the engine never does —
    // suppressedPairs wins here because it reflects the later decision.
    states.set(`${p.sideAKey}|${p.sideBKey}`, { detail: `status=suppressed verdict=${p.verdict}` });
  }
  return states;
}

function diffPairs(stored: ReconciliationPlan, fresh: ReconciliationPlan): DriftChange[] {
  const storedStates = buildPairStates(stored);
  const freshStates = buildPairStates(fresh);
  const allKeys = Array.from(new Set([...storedStates.keys(), ...freshStates.keys()])).sort();

  const changes: DriftChange[] = [];
  for (const key of allKeys) {
    const storedState = storedStates.get(key);
    const freshState = freshStates.get(key);
    if (storedState === undefined && freshState !== undefined) {
      changes.push({ kind: 'pair', direction: 'added', key, detail: freshState.detail });
    } else if (storedState !== undefined && freshState === undefined) {
      changes.push({ kind: 'pair', direction: 'removed', key, detail: storedState.detail });
    } else if (storedState !== undefined && freshState !== undefined && storedState.detail !== freshState.detail) {
      // e.g. a pair flagged in `stored` was resolved to suppressed in `fresh`
      // (an admin resolved it between the two runs) — the benign, expected
      // case, distinguishable from an unexpected one by its `verdict=` detail.
      changes.push({ kind: 'pair', direction: 'changed', key, detail: freshState.detail });
    }
  }
  return changes;
}

/**
 * Compares a stored dry-run report against a freshly recomputed plan.
 * Performs no I/O and no database access — every input is already in memory.
 */
export function computeDrift({ stored, fresh, freshFingerprint }: ComputeDriftInput): DriftResult {
  if (stored === null) {
    return { status: 'no-report' };
  }
  if (stored.databaseFingerprint !== freshFingerprint) {
    return { status: 'fingerprint-mismatch', storedFingerprint: stored.databaseFingerprint, freshFingerprint };
  }
  if (stored.sourceId !== fresh.sourceId) {
    return { status: 'source-mismatch' };
  }

  const ageMs = Date.parse(fresh.generatedAt) - Date.parse(stored.generatedAt);

  const changes: DriftChange[] = [
    ...diffCompanies(stored.plan.companies, fresh.companies),
    ...diffRelationships(stored.plan.relationships, fresh.relationships),
    ...diffContacts(stored.plan.contacts, fresh.contacts),
    ...diffProposalLinks(stored.plan.proposalLinks, fresh.proposalLinks),
    ...diffPairs(stored.plan, fresh),
    ...diffSkipped(stored.plan.skipped, fresh.skipped),
  ];

  if (changes.length === 0) {
    return { status: 'clean', ageMs };
  }
  return { status: 'drift', ageMs, changes };
}

/** Renders a `DriftResult` as a multi-line, human-readable string for the CLI. */
export function formatDrift(result: DriftResult): string {
  switch (result.status) {
    case 'no-report':
      return 'No prior dry-run report found — run a dry run before the real run.';
    case 'fingerprint-mismatch':
      return `Refusing to proceed: the dry-run report was generated against a different database (stored=${result.storedFingerprint}, fresh=${result.freshFingerprint}).`;
    case 'source-mismatch':
      return 'Refusing to proceed: the dry-run report was generated for a different reconciliation source.';
    case 'clean':
      return `Clean — no drift since the dry-run report (age: ${result.ageMs}ms).`;
    case 'drift': {
      const lines = result.changes.map((c) => {
        const prefix = c.direction === 'added' ? '+' : c.direction === 'removed' ? '-' : '~';
        return `${prefix} [${c.kind}] ${c.key} - ${c.detail}`;
      });
      return [`Drift detected since the dry-run report (age: ${result.ageMs}ms):`, ...lines].join('\n');
    }
  }
}
