/**
 * Phase 35 — shared momentum/streak/badge result contracts (GAME-01..03).
 *
 * D-03: nothing declared here is persisted. Every value is derived from
 * `relationship_events` at read time by `src/lib/db/queries/momentum.ts`
 * (35-02) and rendered, unmodified, by `MomentumCard` (35-03). Neither
 * downstream consumer declares its own copy of these shapes — this module
 * is the single source.
 */
import type { PipelineStage } from '@/lib/pipeline/stages';

/** The two event kinds that count as "real progress" (D-01). */
export type MomentumMoveKind = 'stage_changed' | 'proposal_finalized';

/** One movement row rendered in the "this week's movements" list. */
export interface MomentumRow {
  eventId: string;
  relationshipId: string;
  companyName: string;
  kind: MomentumMoveKind;
  toStage: PipelineStage | null;
  occurredAt: Date;
}

/**
 * The capped movement list plus the true count in the window. `total` is
 * the full count so "+ N autres" is computed as `total - rows.length` and
 * never by issuing a second query.
 */
export interface WeeklyMovements {
  rows: MomentumRow[];
  total: number;
}

/** The three badge axes (D-05, D-06). */
export type BadgeAxisId = 'clients' | 'wins' | 'consistency';

/** The three tiers per axis (D-06). */
export type BadgeTierId = 'bronze' | 'silver' | 'gold';

/** One rung on a badge axis's ladder. */
export interface BadgeTierProgress {
  tier: BadgeTierId;
  threshold: number;
  earned: boolean;
}

/** One axis's full three-tier ladder, plus the value it was measured against. */
export interface BadgeAxisProgress {
  axis: BadgeAxisId;
  value: number;
  tiers: BadgeTierProgress[];
}

/** The current-vs-longest streak pair (D-07, UI-SPEC A-5). */
export interface StreakSummary {
  currentWeeks: number;
  longestWeeks: number;
}

/** The raw counts the badge-axis derivation reads (clients + wins axes). */
export interface MomentumBadgeCounts {
  distinctClients: number;
  wins: number;
}
