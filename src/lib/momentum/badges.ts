/**
 * Phase 35 — the streak fold + badge tier ladder (D-02, D-05, D-06, D-07,
 * D-11, D-13). Pure module, no framework import gating its execution to
 * the server: no DB access, no clock read (`nowMs` is a required
 * parameter on every function that needs "now").
 */
import type {
  BadgeAxisId,
  BadgeAxisProgress,
  BadgeTierId,
  MomentumBadgeCounts,
  StreakSummary,
} from './types';
import { shiftWeekKey, weekKeyFromMs } from './window';

/**
 * Badge tier thresholds (UI-SPEC § "Badge tier thresholds"). An
 * operator-adjustable STARTING POINT (UI-SPEC A-2, `35-CONTEXT.md`
 * Claude's Discretion): changing one is a constant edit here, never a
 * migration (D-03). Numbers are deliberately reachable early, given every
 * partner starts from zero history (D-14).
 */
export const BADGE_THRESHOLDS: Record<BadgeAxisId, Record<BadgeTierId, number>> = {
  clients: { bronze: 3, silver: 10, gold: 25 },
  wins: { bronze: 1, silver: 5, gold: 15 },
  consistency: { bronze: 2, silver: 6, gold: 12 },
};

/** Axis order + tier order the ladder always renders in (D-06). */
const AXIS_ORDER: readonly BadgeAxisId[] = ['clients', 'wins', 'consistency'];
const TIER_ORDER: readonly BadgeTierId[] = ['bronze', 'silver', 'gold'];

/**
 * Folds a set of `YYYY-MM-DD` Paris-Monday week keys — the weeks in which
 * the owner's book made real progress (D-01: a forward stage advance or a
 * finalized proposal; D-11: never a backwards move or a move to `perdu`)
 * — into a current/longest streak pair.
 *
 * `longestWeeks` is the length of the longest run of consecutive keys,
 * where consecutive means `shiftWeekKey(previous, 1) === next`. This is
 * the value the consistency badge axis reads (UI-SPEC A-5, D-07: a
 * milestone reached stays reached, so a broken current streak must not
 * erase it).
 *
 * `currentWeeks` uses a two-branch rule — the single most likely
 * misreading of this function, so spelled out explicitly:
 *   1. If the CURRENT week key is present, `currentWeeks` is the length of
 *      the run ending at it.
 *   2. Else, if the PREVIOUS week key is present, `currentWeeks` is the
 *      length of the run ending at the previous week — the streak is
 *      still ALIVE (this is what D-12's "un dossier doit avancer d'ici
 *      dimanche" refers to: the current week has not moved yet, but the
 *      streak has not broken either).
 *   3. Else, `currentWeeks` is `0` — broken.
 */
export function summarizeStreaks(
  weekKeys: readonly string[],
  nowMs: number,
): StreakSummary {
  const keySet = new Set(weekKeys);

  if (keySet.size === 0) {
    return { currentWeeks: 0, longestWeeks: 0 };
  }

  // Length of the consecutive run ENDING at `key`, walking backward via
  // shiftWeekKey(-1) until a gap is found. Dedup is handled by keySet;
  // sort order of the input doesn't matter — the walk is key-driven, not
  // index-driven.
  const runLengthEndingAt = (key: string): number => {
    if (!keySet.has(key)) return 0;
    let length = 0;
    let cursor = key;
    while (keySet.has(cursor)) {
      length += 1;
      cursor = shiftWeekKey(cursor, -1);
    }
    return length;
  };

  let longestWeeks = 0;
  // A run can only START at a key whose predecessor is absent — walking
  // forward from every such start avoids re-walking the same run from
  // every member key (O(n) instead of O(n^2) in the common case).
  for (const key of keySet) {
    const predecessor = shiftWeekKey(key, -1);
    if (keySet.has(predecessor)) continue; // not a run start
    let length = 0;
    let cursor = key;
    while (keySet.has(cursor)) {
      length += 1;
      cursor = shiftWeekKey(cursor, 1);
    }
    if (length > longestWeeks) longestWeeks = length;
  }

  const currentKey = weekKeyFromMs(nowMs);
  const previousKey = shiftWeekKey(currentKey, -1);

  let currentWeeks = runLengthEndingAt(currentKey);
  if (currentWeeks === 0) {
    currentWeeks = runLengthEndingAt(previousKey);
  }

  return { currentWeeks, longestWeeks };
}

/**
 * Derives the full 3-axis × 3-tier badge ladder from the caller's own
 * already-scoped counts and streak summary. ALWAYS returns all nine
 * rungs, earned or not (GAME-03: every criterion must be readable; D-13:
 * the zero state is the same ladder unlit, not a separate shape).
 *
 * `clients` reads `counts.distinctClients`, `wins` reads `counts.wins`,
 * `consistency` reads `streaks.longestWeeks` — NOT `currentWeeks`, so a
 * broken current streak never un-earns a consistency badge (D-07).
 */
export function deriveBadgeProgress(
  counts: MomentumBadgeCounts,
  streaks: StreakSummary,
): BadgeAxisProgress[] {
  const values: Record<BadgeAxisId, number> = {
    clients: counts.distinctClients,
    wins: counts.wins,
    consistency: streaks.longestWeeks,
  };

  return AXIS_ORDER.map((axis) => {
    const value = values[axis];
    return {
      axis,
      value,
      tiers: TIER_ORDER.map((tier) => {
        const threshold = BADGE_THRESHOLDS[axis][tier];
        return { tier, threshold, earned: value >= threshold };
      }),
    };
  });
}
