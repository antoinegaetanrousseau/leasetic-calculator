/**
 * Coefficient table type + lookup. The Q-table read.
 *
 * Storage type is `string` (Postgres-numeric-compatible per D-4) — values
 * like '2.2500' (4-decimal). lookupCoefficient parses on read for arithmetic.
 *
 * Pure module — no I/O, no React.
 */
import type { TrancheKey } from './tranche';

export type DurationMonths = 36 | 48 | 60;

export type Coefficients = {
  readonly [K in TrancheKey]: {
    readonly [D in DurationMonths]: string;
  };
};

/**
 * Look up the coefficient for a tranche × duration. Returns the string-typed
 * value verbatim (caller parses with parseNumeric for arithmetic). Returns
 * null if the table is missing the cell — matches v10 calcRent line 1418
 * `if(!c[k] || !c[k][d]) return null` (CALC-03).
 */
export function lookupCoefficient(
  coefficients: Coefficients,
  trancheKey: TrancheKey,
  durationMonths: DurationMonths,
): string | null {
  const row = coefficients[trancheKey];
  if (!row) return null;
  const cell = row[durationMonths];
  if (cell === undefined || cell === null || cell === '') return null;
  return cell;
}
