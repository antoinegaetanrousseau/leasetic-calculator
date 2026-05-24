/**
 * MetricTile — labelled metric primitive for partner home (COMP-03, UI-SPEC §6.4).
 *
 * 3 color variants:
 *   - month  → value color var(--gd)    "Ce mois-ci" / "This month"
 *   - total  → value color var(--navy)  "Total"
 *   - drafts → value color var(--gold)  "Brouillons" / "Drafts"
 *
 * Server component (no state); consumers pass i18n-resolved strings.
 * Phase 11 ships zero-state primitive — Phase 14 wires it into the partner home.
 */
export interface MetricTileProps {
  label: string;
  value: string;
  sublabel?: string;
  variant: 'month' | 'total' | 'drafts';
  /**
   * Override the value text color. When provided, wins over the variant's
   * default color (VALUE_COLOR_BY_VARIANT). Typically a `var(--token)`
   * reference.
   *
   * Phase 18 D-04 uses `var(--teal)` for ALL three admin home stat tiles
   * (user-confirmed deviation from Figma gold for `Dernière modif. coeffs`;
   * `--gold` reserved for warnings only — palette discipline). Existing
   * Phase 11/17 partner-home callers do NOT pass this prop and keep their
   * variant-driven defaults.
   */
  valueColor?: string;
}

const VALUE_COLOR_BY_VARIANT: Record<MetricTileProps['variant'], string> = {
  month: 'var(--gd)',
  total: 'var(--navy)',
  drafts: 'var(--gold)',
};

export function MetricTile({ label, value, sublabel, variant, valueColor }: MetricTileProps) {
  const resolvedValueColor = valueColor ?? VALUE_COLOR_BY_VARIANT[variant];
  return (
    <div
      role="group"
      aria-label={`${label}: ${value}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: '11.8px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          lineHeight: 1.4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 600,
          lineHeight: 1.3,
          color: resolvedValueColor,
        }}
      >
        {value}
      </div>
      {sublabel && (
        <div
          style={{
            fontSize: '12.5px',
            fontWeight: 500,
            color: 'var(--muted)',
            lineHeight: 1.4,
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}
