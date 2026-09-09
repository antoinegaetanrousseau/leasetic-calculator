/**
 * Phase 44 Plan 03 — three-way drift classification between an approved
 * dry-run report and a freshly re-planned candidate set (D-09).
 *
 * D-01 removed the rollback, so this is what stops the approved plan and the
 * executed plan from diverging in between: before apply writes anything, it
 * re-plans the in-scope set and refuses when that set differs from the
 * report a human approved, unless the drift is explicitly allowed. Mirrors
 * `src/lib/reconcile/drift.ts`'s `computeDrift` / `formatDrift` shape and
 * its `status: 'clean' | 'drift'` discriminator.
 *
 * Pure module — no filesystem, no database, no imports beyond the type
 * import from `./types`.
 */
import type { BackfillCandidate, BackfillReportEnvelope } from './types';
import type { BackfillDriftResult } from './types';

// Re-exported for convenience — declared in `./types` (not here) because
// plan 04's `RunBackfillResult` also carries a drift verdict, and declaring
// it in this module would make `types.ts` depend on a module that itself
// depends on `types.ts`.
export type { BackfillDriftResult };

/**
 * Classifies every proposal id that appears in either the stored (approved)
 * report or the freshly re-planned candidate set into exactly one of three
 * buckets:
 *
 * - `added` — present in `fresh`, absent from `stored`. Real drift: a
 *   proposal was finalized after the report was approved, so approving that
 *   report never authorised overwriting this one.
 * - `alreadyMigrated` — present in `stored`, absent from `fresh`, AND
 *   present in `migratedIds`. This is NOT drift, even though the id left the
 *   set. It is the expected shape of a resumed run: apply-mode's candidate
 *   query anti-joins on the `proposal.pdf_backfill` marker, so every row a
 *   previous interrupted run already completed drops out of the fresh set
 *   on its own. Classifying these as `removed` would make the second half
 *   of an interrupted migration abort on its own progress, and MIG-05 would
 *   fail — this branch exists specifically so that never happens. Do not
 *   "simplify" this away into `removed`.
 * - `removed` — present in `stored`, absent from `fresh`, and NOT in
 *   `migratedIds`. Real drift: the row was hard-purged, or its status left
 *   the in-scope set, between approval and apply.
 *
 * `status` is `'drift'` when `added` or `removed` is non-empty, and
 * `'clean'` otherwise — `alreadyMigrated` never moves the verdict, no matter
 * how large it grows as a run progresses toward completion.
 */
export function computeBackfillDrift(args: {
  stored: BackfillReportEnvelope;
  fresh: BackfillCandidate[];
  migratedIds: readonly string[];
}): BackfillDriftResult {
  const { stored, fresh, migratedIds } = args;

  const storedIds = new Set(stored.rows.map((r) => r.proposalId));
  const freshIds = new Set(fresh.map((c) => c.id));
  const migratedSet = new Set(migratedIds);

  const added: string[] = [];
  for (const id of freshIds) {
    if (!storedIds.has(id)) {
      added.push(id);
    }
  }

  const removed: string[] = [];
  const alreadyMigrated: string[] = [];
  for (const id of storedIds) {
    if (freshIds.has(id)) {
      continue;
    }
    if (migratedSet.has(id)) {
      // Resumed-run case (MIG-05) — see the doc comment above. NOT drift.
      alreadyMigrated.push(id);
    } else {
      removed.push(id);
    }
  }

  // Sorted so output order never depends on Set/array iteration order —
  // determinism matters for anything a human or a test compares by eye.
  added.sort();
  removed.sort();
  alreadyMigrated.sort();

  const status = added.length > 0 || removed.length > 0 ? 'drift' : 'clean';

  return { status, added, removed, alreadyMigrated };
}

/**
 * Renders a `BackfillDriftResult` as operator-readable lines, in reconcile's
 * `+` / `-` prefix style: one line per `added` and `removed` id, plus a
 * summary count line for `alreadyMigrated` (never one line per id — a large
 * resumed run can have thousands of already-migrated ids, and none of them
 * are drift). Prints proposal ids only — never a blob key, a user id, a
 * figure or a hostname.
 */
export function formatBackfillDrift(result: BackfillDriftResult): string {
  const lines: string[] = [];
  for (const id of result.added) {
    lines.push(`+ ${id}`);
  }
  for (const id of result.removed) {
    lines.push(`- ${id}`);
  }
  lines.push(`${result.alreadyMigrated.length} proposal(s) already migrated (not drift)`);
  return lines.join('\n');
}
