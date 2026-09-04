/**
 * Phase 35 — the ONE Europe/Paris Mon–Sun week-window definition (D-10).
 *
 * Both the streak (`badges.ts`) and the weekly movements list (35-02's
 * query layer) read this same window. D-10 forbids a second window
 * definition anywhere else in the repo — do not add one.
 *
 * Pure module — no framework import gating its execution to the server:
 * consumed by both the server component (`MomentumCard`) and the query
 * layer. `nowMs` is a REQUIRED parameter on
 * every exported function that needs "now" — this module never calls
 * `Date.now()` or `new Date()` with no argument, matching the
 * `react-hooks/purity` + determinism discipline `page.tsx`'s `getNowMs` and
 * `RelanceCard`'s `statusLabel(row, lang, nowMs)` already enforce.
 */
import { TZDate } from '@date-fns/tz';
import { addWeeks, format, startOfWeek } from 'date-fns';
import { formatDate } from '@/lib/i18n/format';
import type { Lang } from '@/lib/i18n/dictionaries';

export const MOMENTUM_TIME_ZONE = 'Europe/Paris';

/** `YYYY-MM-DD` civil-date key format shared by every function below. */
const KEY_FORMAT = 'yyyy-MM-dd';

/**
 * Constructs a `TZDate` anchored to a `YYYY-MM-DD` key at Europe/Paris
 * midnight. The key is a civil date, not an instant, so it is parsed as
 * Paris wall-clock time rather than derived from a UTC epoch.
 */
function parisDateFromKey(key: string): TZDate {
  const [year, month, day] = key.split('-').map(Number);
  return new TZDate(year, month - 1, day, MOMENTUM_TIME_ZONE);
}

/**
 * The current Europe/Paris Mon–Sun week window containing `nowMs`.
 *
 * `start` is the Monday 00:00:00.000 Europe/Paris instant of the week
 * containing `nowMs`. `end` is the FOLLOWING Monday 00:00:00.000
 * Europe/Paris instant and is EXCLUSIVE. `key` is `start` rendered as
 * `YYYY-MM-DD` in Europe/Paris civil terms.
 */
export function currentWeekWindow(nowMs: number): { start: Date; end: Date; key: string } {
  const nowInParis = new TZDate(nowMs, MOMENTUM_TIME_ZONE);
  const startInParis = startOfWeek(nowInParis, { weekStartsOn: 1 });
  const endInParis = addWeeks(startInParis, 1);

  return {
    // Materialize as plain Date instants — callers (SQL bind params, Date
    // arithmetic) need a real UTC instant, not a TZDate wrapper.
    start: new Date(startInParis.getTime()),
    end: new Date(endInParis.getTime()),
    key: format(startInParis, KEY_FORMAT),
  };
}

/** The `YYYY-MM-DD` Paris-Monday key for any instant. */
export function weekKeyFromMs(ms: number): string {
  return currentWeekWindow(ms).key;
}

/**
 * Key arithmetic in whole weeks, DST-safe: adds calendar weeks to the civil
 * date (via `TZDate` + `addWeeks`), never 7×86_400_000 milliseconds.
 */
export function shiftWeekKey(key: string, deltaWeeks: number): string {
  const shifted = addWeeks(parisDateFromKey(key), deltaWeeks);
  return format(shifted, KEY_FORMAT);
}

/**
 * MOMENTUM_TRACKING_STARTED_AT (D-14): the date the `relationship_events`
 * `INSERT … SELECT` fix (`62e26fa`) shipped. Per the ROADMAP's measured
 * data constraint #1: `relationship_events` held exactly two rows on
 * 2026-09-04, both written that day — every stage change and finalize
 * before this instant recorded nothing and is unrecoverable. This is the
 * date behind the credibility line "Activité suivie depuis septembre 2026."
 */
export const MOMENTUM_TRACKING_STARTED_AT: Date = new Date('2026-09-04T00:00:00.000Z');

/**
 * Returns the month-year FRAGMENT only ("septembre 2026" / "September
 * 2026") — not the full sentence. The sentence lives in the
 * `dashboard.momentum.trackedSince` dictionary value and is assembled by
 * `.replace('{0}', fragment)` at the component call site.
 */
export function formatTrackedSinceFragment(lang: Lang): string {
  return formatDate(MOMENTUM_TRACKING_STARTED_AT, lang, {
    month: 'long',
    year: 'numeric',
    timeZone: MOMENTUM_TIME_ZONE,
  });
}
