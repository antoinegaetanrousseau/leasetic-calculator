import type { ComponentType } from 'react';
import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChartIcon,
  CheckCircleIcon,
  HistoryIcon,
  UsersIcon,
  type IconProps,
} from '@/components/ui/icons';
import { STAGE_DICT_KEY } from '@/lib/pipeline/stages';
import { MOMENTUM_TIME_ZONE } from '@/lib/momentum/window';
import type {
  BadgeAxisId,
  BadgeAxisProgress,
  BadgeTierId,
  MomentumRow,
  WeeklyMovements,
} from '@/lib/momentum/types';

/**
 * Phase 35 (GAME-01..05) — the "your progress" home-page card: one streak
 * headline, this week's movements, and the 3-axis x 3-tier badge ladder.
 *
 * VISUAL DIRECTION — D-19a (operator, 2026-09-05), which SUPERSEDES D-19.
 * The original bet was restraint; against the live render it failed, because
 * the ladder rendered as three run-on `·`-separated text lines. D-19a
 * authorises a gamified treatment: tier-identified rung tiles, per-axis
 * progress tracks, axis iconography and greater prominence for the streak
 * figure. What it explicitly did NOT authorise is listed below, because each
 * item is a requirement or a privacy property rather than a matter of taste.
 *
 * CRM-02 / GAME-04: this component enforces no ownership itself and computes
 * no rank, percentile, average or cross-partner total. It renders ONLY what
 * it is handed — every prop is already owner-scoped, already window-filtered,
 * already derived by `src/lib/db/queries/momentum.ts` (35-02) and
 * `@/lib/momentum/badges` (35-01). There is no query inside this file, and
 * the ONLY arithmetic here is `value / nextThreshold` against the partner's
 * own numbers.
 *
 * GAME-03 / D-13: all nine rungs render, earned or not, with their criteria
 * legible. Tier colour and weight distinguish earned from unearned; nothing
 * is hidden, blurred, locked or truncated. A criterion that cannot be read
 * cannot be aimed at, so there is no "unlock" affordance and no collapse.
 *
 * D-11: `movementCopy` has no branch for a backwards move or a move to
 * `perdu`, and no movement row reads a tier colour, an inline style, or any
 * conditional class. Forward, backward and `perdu` rows are byte-identical.
 * Tier colour lives on badge rungs ONLY.
 *
 * D-12 / D-14 / D-16: the streak's break condition and both footer lines
 * render unconditionally, in every state. No control, no dismiss, no
 * opt-out, no collapse — the card has zero buttons by construction.
 *
 * SERVER COMPONENT — no client directive. Every interactive element here is
 * a plain `<Link>`; the progress tracks are static width declarations, not
 * animations, so nothing on this surface needs to hydrate in the browser.
 * Same posture `RelanceCard` already takes.
 *
 * ABSENT, NOT EMPTY — INVERTED from `RelanceCard`'s own rule. `RelanceCard`
 * returns `null` from inside itself when its row list is empty, because an
 * admin's empty follow-up list IS the correct answer for an admin. That
 * collapse is deliberately NOT repeated here: an admin's "empty" result
 * would be indistinguishable from a real partner's genuine zero-history
 * zero state (D-13/D-14's invitation copy), and showing that copy to an
 * admin is itself a GAME-04-adjacent tell ("this feature exists and would
 * apply to you"). So this component is skipped entirely by
 * `{!isAdmin && <MomentumCard .../>}` at the call site in `page.tsx`
 * (D-15, wired in 35-05) — never by a branch inside this file, and never by
 * returning `null` from here.
 */

export interface MomentumCardProps {
  lang: Lang;
  streakWeeks: number;
  movements: WeeklyMovements;
  badgeProgress: BadgeAxisProgress[];
  trackedSinceLabel: string;
}

/**
 * D-11 GUARD. One frozen class string, shared by every movement row with no
 * conditional segment and no `style` prop anywhere near it. A forward move,
 * a backwards move and a move to `perdu` therefore render with a
 * string-equal `className` — the property `MomentumCard.test.tsx` asserts
 * directly. Do not make any part of this depend on the row.
 */
const ROW_LINK_CLASSNAME =
  'flex min-w-0 items-center gap-3 border-b border-border px-3 py-2.5 text-inherit no-underline transition-colors last:border-b-0 hover:bg-[var(--hover-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset';

/**
 * Axis iconography (D-19a). Reused from the existing Iconly vocabulary in
 * `@/components/ui/icons` (UIC-07) — this phase adds no new glyph. Each icon
 * names its axis rather than decorating it: people for the client count,
 * a bar chart for wins, a clock for consistency.
 */
const AXIS_ICON: Record<BadgeAxisId, ComponentType<IconProps>> = {
  clients: UsersIcon,
  wins: BarChartIcon,
  consistency: HistoryIcon,
};

/**
 * Tier identity colour (D-19a). The three tokens are declared once in
 * `app/globals.css`, light and dark, each measured to clear WCAG AA against
 * `--card` and against its own 12%-tinted rung tile — see the comment block
 * beside the declarations for the ratios. Referenced here as `var()` strings
 * so a theme flip is handled by CSS, never by this component.
 */
const TIER_COLOR: Record<BadgeTierId, string> = {
  bronze: 'var(--tier-bronze)',
  silver: 'var(--tier-silver)',
  gold: 'var(--tier-gold)',
};

/** Section-label treatment, shared by "Cette semaine" and "Vos paliers". */
const SECTION_LABEL_CLASSNAME =
  'text-[12px] font-semibold tracking-[0.02em] text-muted-foreground';

/** Card-internal panel chrome: an inset surface one step off `--card`. */
const PANEL_CLASSNAME =
  'rounded-container-xs border border-border bg-[var(--momentum-panel)]';

/**
 * Builds the full copy-contract sentence and its row-detail fragment for one
 * movement row. `full` is the complete sentence (used as the row's
 * `aria-label`, per the copy contract); `detail` is `full` with the company
 * name removed, matching `RelanceCard`'s row two-column split (name left,
 * detail right).
 *
 * D-11: there is no branch here for a backwards move or a move to `perdu` —
 * every row (forward, backward, or `perdu`) is built through this identical
 * path with the identical stage-changed template. No penalty framing.
 */
function movementCopy(row: MomentumRow, lang: Lang): { full: string; detail: string } {
  const weekday = formatDate(row.occurredAt, lang, {
    weekday: 'long',
    timeZone: MOMENTUM_TIME_ZONE,
  });

  let full: string;
  if (row.kind === 'stage_changed' && row.toStage) {
    const stageLabel = t(STAGE_DICT_KEY[row.toStage], lang);
    full = t('dashboard.momentum.move.stageChanged', lang)
      .replace('{0}', row.companyName)
      .replace('{1}', stageLabel)
      .replace('{2}', weekday);
  } else {
    full = t('dashboard.momentum.move.proposalFinalized', lang)
      .replace('{0}', row.companyName)
      .replace('{1}', weekday);
  }

  const detail = full.replace(row.companyName, '').trim();

  return { full, detail };
}

/**
 * Splits the interpolated streak sentence once at the first `'. '` so the
 * number+unit fragment can carry the display weight while the
 * break-condition clause stays a quiet supporting line (D-12: both are
 * always visible, this is styling only). Falls back to rendering the whole
 * string as the head if no `'. '` is found — the split must never drop text.
 *
 * Both states go through it, so the zero-state invitation gets exactly the
 * same two-line shape as an active streak: "Pas encore de série." as the
 * headline, the invitation as the supporting line (D-13).
 */
function splitStreakSentence(sentence: string): { head: string; rest: string } {
  const separatorIndex = sentence.indexOf('. ');
  if (separatorIndex === -1) {
    return { head: sentence, rest: '' };
  }
  return {
    head: sentence.slice(0, separatorIndex + 1),
    rest: sentence.slice(separatorIndex + 2),
  };
}

/**
 * One axis's ladder: header (icon + label + progress figure), a progress
 * track toward the next unearned threshold, and the three rungs.
 *
 * The "next threshold" is the FIRST unearned tier in the ladder's own order.
 * When every rung is earned there is no next threshold, so the track renders
 * full and the figure is replaced by the all-earned line rather than an
 * invented "25 / 25" that implies more to come.
 */
function BadgeAxisRow({ axis, lang }: { axis: BadgeAxisProgress; lang: Lang }) {
  const AxisIcon = AXIS_ICON[axis.axis];
  const axisLabel = t(`dashboard.momentum.badge.axis.${axis.axis}`, lang);

  const nextTier = axis.tiers.find((tier) => !tier.earned) ?? null;
  // No new query, no new field: `value` is already on BadgeAxisProgress
  // (D-19a scope note). Clamped defensively — a tier is "earned" precisely
  // when value >= threshold, so an unearned tier always has value < threshold
  // and the ratio is already in [0, 1).
  const filledPercent = nextTier
    ? Math.min(100, Math.max(0, Math.round((axis.value / nextTier.threshold) * 100)))
    : 100;
  const trackColor = TIER_COLOR[nextTier?.tier ?? 'gold'];

  const progressText = nextTier
    ? t('dashboard.momentum.badge.progress', lang)
        .replace('{0}', String(axis.value))
        .replace('{1}', String(nextTier.threshold))
    : t('dashboard.momentum.badge.allEarned', lang);

  // The visible figure is a bare "3 / 10", which is ambiguous read aloud, so
  // the assistive-tech copy spells it out. Both strings come from the
  // dictionary; neither mentions anyone else's book.
  const spokenProgress = nextTier
    ? t('dashboard.momentum.badge.progressLabel', lang)
        .replace('{0}', axisLabel)
        .replace('{1}', String(axis.value))
        .replace('{2}', String(nextTier.threshold))
    : `${axisLabel} — ${progressText}`;

  return (
    <div data-testid="momentum-axis" data-axis={axis.axis} className={cn(PANEL_CLASSNAME, 'p-3')}>
      <div className="flex items-center gap-2">
        <AxisIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-[11.8px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          {axisLabel}
        </span>
        <span className="ml-auto shrink-0 text-[12px] font-semibold tabular-nums text-foreground">
          <span aria-hidden>{progressText}</span>
          <span className="sr-only">{spokenProgress}</span>
        </span>
      </div>

      {/* Progress toward the next rung. Presentational: the figure above
          already states it in text, so this adds no second announcement. */}
      <div
        data-testid="momentum-track"
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--momentum-track)]"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${filledPercent}%`, background: trackColor }}
        />
      </div>

      {/* GAME-03 / D-13: all three rungs, always, criteria legible. One
          column on narrow viewports so a criterion never has to truncate. */}
      <ul className="mt-2.5 grid list-none grid-cols-1 gap-1.5 p-0 sm:grid-cols-3">
        {axis.tiers.map((tier) => {
          const color = TIER_COLOR[tier.tier];
          return (
            <li
              key={tier.tier}
              data-testid="momentum-rung"
              data-tier={tier.tier}
              data-earned={tier.earned ? 'true' : 'false'}
              className={cn(
                'flex items-start gap-1.5 rounded-lg border px-2 py-1.5 text-[12px] leading-[1.35]',
                tier.earned ? 'font-semibold' : 'border-border font-normal text-muted-foreground',
              )}
              style={
                tier.earned
                  ? {
                      color,
                      borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
                      background: `color-mix(in oklab, ${color} 12%, transparent)`,
                    }
                  : undefined
              }
            >
              {tier.earned ? (
                <>
                  <CheckCircleIcon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="sr-only">
                    {t('dashboard.momentum.badge.earnedMarker', lang)}
                  </span>
                </>
              ) : (
                // An unearned rung keeps its tier identity (a hollow ring in
                // the tier colour) without claiming to be reached. No lock,
                // no ban glyph: a restriction affordance would contradict
                // GAME-03's "aim at the next rung" framing.
                <span
                  className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full border"
                  style={{ borderColor: `color-mix(in oklab, ${color} 60%, transparent)` }}
                  aria-hidden
                />
              )}
              <span className="min-w-0">
                {t(`dashboard.momentum.badge.entry.${axis.axis}`, lang)
                  .replace('{0}', t(`dashboard.momentum.badge.tier.${tier.tier}`, lang))
                  .replace('{1}', String(tier.threshold))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MomentumCard({
  lang,
  streakWeeks,
  movements,
  badgeProgress,
  trackedSinceLabel,
}: MomentumCardProps) {
  const streakSentence =
    streakWeeks >= 1
      ? t('dashboard.momentum.streak.active', lang).replace('{0}', String(streakWeeks))
      : t('dashboard.momentum.streak.zero', lang);
  const { head, rest } = splitStreakSentence(streakSentence);

  return (
    <Card className="mt-0 mb-6">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {t('dashboard.momentum.title', lang)}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Part 1 — the streak, as the card's headline figure (D-12, D-19a).
            Rendered through one code path in both states: an active streak
            and the zero-state invitation get the same two-line shape. */}
        <section className={cn(PANEL_CLASSNAME, 'px-4 py-4 sm:px-5 sm:py-5')}>
          <p className="m-0 text-[11.8px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            {t('dashboard.momentum.streak.label', lang)}
          </p>
          <p
            data-testid="momentum-streak-head"
            className="m-0 mt-1.5 text-[26px] font-bold leading-[1.15] tracking-[-0.015em] text-foreground"
          >
            {head}
          </p>{' '}
          {rest !== '' && (
            <p
              data-testid="momentum-streak-rest"
              className="m-0 mt-1.5 text-[13.5px] leading-[1.45] text-muted-foreground"
            >
              {rest}
            </p>
          )}
        </section>

        {/* Part 2 — this week's movements (D-09, D-10). */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className={SECTION_LABEL_CLASSNAME}>
              {t('dashboard.momentum.thisWeek', lang)}
            </span>
            {movements.total > 0 && (
              <span className="rounded-full bg-[var(--momentum-track)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">
                {movements.total}
              </span>
            )}
          </div>
          <div className={cn(PANEL_CLASSNAME, 'overflow-hidden')}>
            {movements.rows.length === 0 ? (
              <p className="m-0 px-3 py-3 text-[14.5px] text-muted-foreground">
                {t('dashboard.momentum.empty', lang)}
              </p>
            ) : (
              movements.rows.map((row) => {
                const { full, detail } = movementCopy(row, lang);
                return (
                  <Link
                    key={row.eventId}
                    href={`/clients/${row.relationshipId}`}
                    data-testid="momentum-row"
                    aria-label={full}
                    className={ROW_LINK_CLASSNAME}
                  >
                    <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-foreground">
                      {row.companyName}
                    </span>
                    <span className="shrink-0 text-[13px] text-muted-foreground">{detail}</span>
                  </Link>
                );
              })
            )}
            {movements.total > movements.rows.length && (
              <p className="m-0 border-t border-border px-3 py-2 text-[13px] text-muted-foreground">
                {t('dashboard.momentum.moreCount', lang).replace(
                  '{0}',
                  String(movements.total - movements.rows.length),
                )}
              </p>
            )}
          </div>
        </section>

        {/* Part 3 — badge ladder, always fully rendered (GAME-03, D-13). */}
        <section className="flex flex-col gap-2">
          <span className={SECTION_LABEL_CLASSNAME}>
            {t('dashboard.momentum.badge.sectionLabel', lang)}
          </span>
          <div className="flex flex-col gap-2.5">
            {badgeProgress.map((axis) => (
              <BadgeAxisRow key={axis.axis} axis={axis} lang={lang} />
            ))}
          </div>
        </section>

        {/* Footer — two permanent lines, always rendered, never conditional
            on streakWeeks or movements.length (D-14, D-16). */}
        <div className="flex flex-col gap-1">
          <p className="m-0 text-xs text-muted-foreground">
            {t('dashboard.momentum.trackedSince', lang).replace('{0}', trackedSinceLabel)}
          </p>
          <p className="m-0 text-xs text-muted-foreground">
            {t('dashboard.momentum.disclosure', lang)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
