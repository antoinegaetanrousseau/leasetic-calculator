/**
 * Phase 33 Plan 05 — pure formatting for the pipeline surface's copy.
 *
 * No `server-only`, no React import: this module is called from a server
 * page (the board's `MetricTile`) AND from client components (the board,
 * the mobile list, the column header), so it must stay import-safe for
 * both bundles.
 *
 * `ConversionRate` is pulled in as a TYPE-ONLY import.
 * `src/lib/db/queries/pipeline.ts` starts with `import 'server-only'` — a
 * value import here would drag that guard into the client bundle through
 * `stageLabel`'s client-component callers. A type-only import is erased at
 * compile time, so it carries none of that risk.
 */
import type { ConversionRate } from '@/lib/db/queries/pipeline';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { STAGE_DICT_KEY, type PipelineStage } from '@/lib/pipeline/stages';

/**
 * `pct === null` renders an em dash, never "0 %" — the two are different
 * claims. `pct === null` means the caller has quoted nothing yet (an
 * undefined rate); `pct === 0` means the caller has quoted and converted
 * none of it (a real, meaningful zero). Only one of those is ever true for
 * a given partner, and conflating them would misreport which one it is.
 *
 * `won`/`total` in the sublabel always render literally, including the
 * zero case (UIC-08 — a meaningful zero renders as a zero), so a partner
 * with nothing quoted reads "0 gagnée(s) sur 0 proposition(s)" beneath an
 * em-dash value. This tile plus the lane count badges are the only two
 * motivating elements the board carries (D-11) — this module must never
 * grow a third.
 */
export function formatConversionRate(
  rate: ConversionRate,
  lang: Lang,
): { value: string; sublabel: string } {
  const value =
    rate.pct === null ? '—' : lang === 'fr' ? `${rate.pct} %` : `${rate.pct}%`;

  const sublabel = t('pipeline.metric.conversionRate.sublabel', lang)
    .replace('{won}', String(rate.won))
    .replace('{total}', String(rate.total));

  return { value, sublabel };
}

/**
 * Resolves a stage's display string through the dictionary. A one-line
 * indirection on purpose: the board, the mobile picker, the column header
 * and every test must all resolve a stage's label through this single
 * function, so a stage can never render with a hand-written literal.
 */
export function stageLabel(stage: PipelineStage, lang: Lang): string {
  return t(STAGE_DICT_KEY[stage], lang);
}
