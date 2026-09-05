import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircleIcon } from '@/components/ui/icons';
import { STAGE_DICT_KEY } from '@/lib/pipeline/stages';
import { MOMENTUM_TIME_ZONE } from '@/lib/momentum/window';
import type { BadgeAxisProgress, MomentumRow, WeeklyMovements } from '@/lib/momentum/types';

/**
 * Phase 35 (GAME-01..05) — the "your progress" home-page card: one streak
 * sentence, this week's movements, and the 3-axis x 3-tier badge ladder.
 *
 * CRM-02: this component enforces no ownership itself and computes no
 * count, rank or total. It renders ONLY what it is handed — every prop is
 * already owner-scoped, already window-filtered, already derived by
 * `src/lib/db/queries/momentum.ts` (35-02) and `@/lib/momentum/badges`
 * (35-01). There is no query inside this file.
 *
 * SERVER COMPONENT — no client directive. Every interactive element here is
 * a plain `<Link>`; nothing on this surface needs to hydrate in the
 * browser, the same posture `RelanceCard` already takes.
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

const ROW_LINK_CLASSNAME =
  'flex min-w-0 items-center gap-3 rounded-lg border-b border-border px-2.5 py-2.5 text-inherit no-underline transition-colors last:border-b-0 hover:bg-[var(--hover-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

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
 * number+unit fragment can be bolded while the break-condition clause
 * stays regular weight (D-12: both are always visible, this is styling
 * only). Falls back to rendering the whole string unbolded if no `'. '` is
 * found — the split must never drop text.
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
      : null;

  return (
    <Card className="mt-0 mb-6">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {t('dashboard.momentum.title', lang)}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Part 1 — streak sentence, always rendered (D-12). */}
        {streakSentence === null ? (
          <p className="text-[14.5px] text-foreground">
            {t('dashboard.momentum.streak.zero', lang)}
          </p>
        ) : (
          (() => {
            const { head, rest } = splitStreakSentence(streakSentence);
            return (
              <p className="text-[14.5px] text-foreground">
                <span className="font-semibold">{head}</span>
                {rest && <span> {rest}</span>}
              </p>
            );
          })()
        )}

        {/* Part 2 — this week's movements (D-09, D-10). */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-muted-foreground">
            {t('dashboard.momentum.thisWeek', lang)}
          </p>
          {movements.rows.length === 0 ? (
            <p className="text-muted-foreground text-[14.5px] m-0">
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
            <p className="text-[13px] text-muted-foreground">
              {t('dashboard.momentum.moreCount', lang).replace(
                '{0}',
                String(movements.total - movements.rows.length),
              )}
            </p>
          )}
        </div>

        {/* Part 3 — badge ladder, always fully rendered (GAME-03, D-13). */}
        <div className="flex flex-col gap-1.5">
          {badgeProgress.map((axis) => (
            <div key={axis.axis} className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
                {t(`dashboard.momentum.badge.axis.${axis.axis}`, lang)}
              </span>
              {axis.tiers.map((tier, index) => (
                <span key={tier.tier} className="flex items-center gap-1">
                  {index > 0 && <span className="text-[13px] text-muted-foreground"> · </span>}
                  {tier.earned && (
                    <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden />
                  )}
                  <span
                    className={
                      tier.earned
                        ? 'text-[13px] font-semibold text-foreground'
                        : 'text-[13px] text-muted-foreground'
                    }
                  >
                    {t(`dashboard.momentum.badge.entry.${axis.axis}`, lang)
                      .replace('{0}', t(`dashboard.momentum.badge.tier.${tier.tier}`, lang))
                      .replace('{1}', String(tier.threshold))}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Footer — two permanent lines, always rendered, never conditional
            on streakWeeks or movements.length (D-14, D-16). */}
        <p className="text-xs text-muted-foreground">
          {t('dashboard.momentum.trackedSince', lang).replace('{0}', trackedSinceLabel)}
        </p>
        <p className="text-xs text-muted-foreground">{t('dashboard.momentum.disclosure', lang)}</p>
      </CardContent>
    </Card>
  );
}
