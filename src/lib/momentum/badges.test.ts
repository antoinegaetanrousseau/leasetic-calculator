import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BADGE_THRESHOLDS, deriveBadgeProgress, summarizeStreaks } from './badges';

// Fixed clock for every case: current week key '2026-09-07', previous '2026-08-31'.
const NOW_MS = Date.parse('2026-09-09T10:00:00Z');

describe('summarizeStreaks', () => {
  it('1. empty input → {0, 0}', () => {
    expect(summarizeStreaks([], NOW_MS)).toEqual({ currentWeeks: 0, longestWeeks: 0 });
  });

  it('2. current week only → {1, 1}', () => {
    expect(summarizeStreaks(['2026-09-07'], NOW_MS)).toEqual({ currentWeeks: 1, longestWeeks: 1 });
  });

  it('3. previous week only, current week empty → {1, 1} (alive, not broken)', () => {
    expect(summarizeStreaks(['2026-08-31'], NOW_MS)).toEqual({ currentWeeks: 1, longestWeeks: 1 });
  });

  it('4. two weeks back only, nothing since → {0, 1} (broken)', () => {
    expect(summarizeStreaks(['2026-08-24'], NOW_MS)).toEqual({ currentWeeks: 0, longestWeeks: 1 });
  });

  it('5. three consecutive weeks ending at current → {3, 3}', () => {
    expect(
      summarizeStreaks(['2026-08-24', '2026-08-31', '2026-09-07'], NOW_MS),
    ).toEqual({ currentWeeks: 3, longestWeeks: 3 });
  });

  it('6. three consecutive weeks ending at previous, current empty → {3, 3}', () => {
    expect(
      summarizeStreaks(['2026-08-17', '2026-08-24', '2026-08-31'], NOW_MS),
    ).toEqual({ currentWeeks: 3, longestWeeks: 3 });
  });

  it('7. a five-week run ending months ago, nothing since → {0, 5} (D-07/A-5 regression guard)', () => {
    expect(
      summarizeStreaks(
        ['2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25', '2026-06-01'],
        NOW_MS,
      ),
    ).toEqual({ currentWeeks: 0, longestWeeks: 5 });
  });

  it('8. unsorted input with duplicates matches the sorted, deduped equivalent', () => {
    const sorted = summarizeStreaks(['2026-08-24', '2026-08-31', '2026-09-07'], NOW_MS);
    const unsortedWithDupes = summarizeStreaks(
      ['2026-09-07', '2026-08-24', '2026-08-31', '2026-08-24', '2026-09-07'],
      NOW_MS,
    );
    expect(unsortedWithDupes).toEqual(sorted);
  });
});

describe('summarizeStreaks — additional acceptance-criteria fixtures', () => {
  it('a five-week run ending months ago → {currentWeeks: 0, longestWeeks: 5}', () => {
    expect(
      summarizeStreaks(
        ['2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25', '2026-06-01'],
        NOW_MS,
      ),
    ).toEqual({ currentWeeks: 0, longestWeeks: 5 });
  });

  it('previous week only → {currentWeeks: 1, longestWeeks: 1}', () => {
    expect(summarizeStreaks(['2026-08-31'], NOW_MS)).toEqual({ currentWeeks: 1, longestWeeks: 1 });
  });
});

describe('deriveBadgeProgress', () => {
  it('9. all-zero counts and streaks return 3 axes × 3 tiers, all unearned', () => {
    const progress = deriveBadgeProgress(
      { distinctClients: 0, wins: 0 },
      { currentWeeks: 0, longestWeeks: 0 },
    );
    expect(progress).toHaveLength(3);
    for (const axis of progress) {
      expect(axis.tiers).toHaveLength(3);
      for (const tier of axis.tiers) {
        expect(tier.earned).toBe(false);
      }
    }
  });

  it('10. distinctClients: 3 earns clients-bronze only; distinctClients: 25 earns all three (monotonic)', () => {
    const bronzeOnly = deriveBadgeProgress(
      { distinctClients: 3, wins: 0 },
      { currentWeeks: 0, longestWeeks: 0 },
    );
    const clientsBronzeOnly = bronzeOnly.find((a) => a.axis === 'clients')!;
    expect(clientsBronzeOnly.tiers.map((t) => t.earned)).toEqual([true, false, false]);

    const allThree = deriveBadgeProgress(
      { distinctClients: 25, wins: 0 },
      { currentWeeks: 0, longestWeeks: 0 },
    );
    const clientsAll = allThree.find((a) => a.axis === 'clients')!;
    expect(clientsAll.tiers.map((t) => t.earned)).toEqual([true, true, true]);
  });

  it('11. wins: 1 earns wins-bronze (reachable from zero-history state, D-14)', () => {
    const progress = deriveBadgeProgress(
      { distinctClients: 0, wins: 1 },
      { currentWeeks: 0, longestWeeks: 0 },
    );
    const wins = progress.find((a) => a.axis === 'wins')!;
    expect(wins.tiers.find((t) => t.tier === 'bronze')!.earned).toBe(true);
    expect(wins.tiers.find((t) => t.tier === 'silver')!.earned).toBe(false);
  });

  it('12. consistency reads longestWeeks, not currentWeeks', () => {
    const progress = deriveBadgeProgress(
      { distinctClients: 0, wins: 0 },
      { currentWeeks: 0, longestWeeks: 6 },
    );
    const consistency = progress.find((a) => a.axis === 'consistency')!;
    expect(consistency.tiers.find((t) => t.tier === 'bronze')!.earned).toBe(true);
    expect(consistency.tiers.find((t) => t.tier === 'silver')!.earned).toBe(true);
    expect(consistency.tiers.find((t) => t.tier === 'gold')!.earned).toBe(false);
  });

  it('always returns an array of length 3, each tiers array of length 3, for every input', () => {
    const inputs: Array<[{ distinctClients: number; wins: number }, { currentWeeks: number; longestWeeks: number }]> = [
      [{ distinctClients: 0, wins: 0 }, { currentWeeks: 0, longestWeeks: 0 }],
      [{ distinctClients: 100, wins: 100 }, { currentWeeks: 50, longestWeeks: 50 }],
    ];
    for (const [counts, streaks] of inputs) {
      const progress = deriveBadgeProgress(counts, streaks);
      expect(progress).toHaveLength(3);
      for (const axis of progress) {
        expect(axis.tiers).toHaveLength(3);
      }
    }
  });
});

describe('BADGE_THRESHOLDS', () => {
  it('matches the exact UI-SPEC numbers', () => {
    expect(BADGE_THRESHOLDS.clients.bronze).toBe(3);
    expect(BADGE_THRESHOLDS.wins.bronze).toBe(1);
    expect(BADGE_THRESHOLDS.consistency.gold).toBe(12);
    expect(BADGE_THRESHOLDS).toEqual({
      clients: { bronze: 3, silver: 10, gold: 25 },
      wins: { bronze: 1, silver: 5, gold: 15 },
      consistency: { bronze: 2, silver: 6, gold: 12 },
    });
  });
});

describe('source guard', () => {
  it('never calls Date.now() with no argument', () => {
    const filePath = path.join(__dirname, 'badges.ts');
    const source = readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .join('\n');
    expect(source).not.toMatch(/Date\.now\(\)/);
  });
});
