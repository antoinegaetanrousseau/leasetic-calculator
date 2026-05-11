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
}

const VALUE_COLOR_BY_VARIANT: Record<MetricTileProps['variant'], string> = {
  month: 'var(--gd)',
  total: 'var(--navy)',
  drafts: 'var(--gold)',
};

export function MetricTile({ label, value, sublabel, variant }: MetricTileProps) {
  const valueColor = VALUE_COLOR_BY_VARIANT[variant];
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
          color: valueColor,
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
