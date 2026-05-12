/**
 * Pure FR diff-summary formatter for `coefficient_history.summary` auto-fill.
 *
 * Per CONTEXT.md D-16 / D-17:
 * - Auto-fallback for `coefficient_history.summary` when the admin doesn't
 *   provide a manual summary string (plan 12-04 createCoefficientHistoryEntry
 *   imports this as the auto-default).
 * - Output: French, semicolon-separated, only-changed-fields.
 * - Seed-row (before === null): returns the exact string 'Configuration initiale'.
 *
 * Pure function — no DB, no fs, no env, no `import 'server-only'`. Safely
 * importable from any module on either runtime side.
 */

/**
 * Mirrors `proposals.paramsSnapshot.$type` shape from src/db/schema.ts.
 * Used as both the diff input here and as the persisted shape on
 * coefficient_history.before_json / after_json.
 */
export type GlobalParamsSnapshot = {
  commissionPct: string;
  maxAmount: string;
  validityDays: number;
  coefficients: {
    t1: { '36': string; '48': string; '60': string };
    t2: { '36': string; '48': string; '60': string };
    t3: { '36': string; '48': string; '60': string };
    t4: { '36': string; '48': string; '60': string };
  };
};

const SCALAR_LABELS = {
  commissionPct: 'Commission',
  maxAmount: 'Montant max',
  validityDays: 'Validité',
} as const;

type ScalarKey = keyof typeof SCALAR_LABELS;

const SCALAR_SUFFIXES: Record<ScalarKey, string> = {
  commissionPct: '%',
  maxAmount: '',
  validityDays: ' jours',
};

const TRANCHES = ['t1', 't2', 't3', 't4'] as const;
const DURATIONS = ['36', '48', '60'] as const;

type Tranche = (typeof TRANCHES)[number];
type Duration = (typeof DURATIONS)[number];

function formatScalar(key: ScalarKey, value: string | number): string {
  return `${value}${SCALAR_SUFFIXES[key]}`;
}

export function generateDiffSummary(
  before: GlobalParamsSnapshot | null,
  after: GlobalParamsSnapshot,
): string {
  if (before === null) {
    return 'Configuration initiale';
  }

  const parts: string[] = [];

  for (const key of Object.keys(SCALAR_LABELS) as ScalarKey[]) {
    const b = before[key];
    const a = after[key];
    if (String(b) !== String(a)) {
      parts.push(
        `${SCALAR_LABELS[key]}: ${formatScalar(key, b)} → ${formatScalar(key, a)}`,
      );
    }
  }

  for (const tranche of TRANCHES) {
    for (const duration of DURATIONS) {
      const b = before.coefficients[tranche][duration];
      const a = after.coefficients[tranche][duration];
      if (b !== a) {
        const label = `T${tranche.slice(1)}/${duration}m`;
        parts.push(`${label}: ${b} → ${a}`);
      }
    }
  }

  if (parts.length === 0) {
    return 'Aucun changement';
  }

  return parts.join('; ');
}
