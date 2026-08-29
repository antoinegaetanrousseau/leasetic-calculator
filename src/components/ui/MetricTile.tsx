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
import { Card } from '@/components/ui/card';

export interface MetricTileProps {
  label: string;
  value: string;
  sublabel?: string;
  variant: 'month' | 'total' | 'drafts';
  valueColor?: string;
}

const VALUE_COLOR_CLASSES: Record<MetricTileProps['variant'], string> = {
  month: 'text-success', // ReUI success green
  total: 'text-primary', // ReUI navy/primary
  drafts: 'text-warning', // ReUI warning gold
};

export function MetricTile({ label, value, sublabel, variant, valueColor }: MetricTileProps) {
  return (
    // role="group" + aria-label are load-bearing accessibility semantics, not
    // decoration: the tile's label and value are separate text nodes, so screen
    // readers need the pairing announced ("Ce mois-ci: 12"). Both were dropped
    // when this component was moved to the ReUI Card and are restored here.
    // data-variant is the stable hook for tests — assert the semantic variant,
    // never the colour classes, so restyling cannot break the suite.
    <Card
      role="group"
      aria-label={`${label}: ${value}`}
      data-variant={variant}
      className="flex flex-col gap-1.5 p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div
        data-slot="metric-label"
        className="text-[11.8px] font-bold tracking-[0.06em] uppercase text-muted-foreground leading-snug"
      >
        {label}
      </div>
      <div
        data-slot="metric-value"
        className={`text-2xl font-semibold leading-tight ${!valueColor ? VALUE_COLOR_CLASSES[variant] : ''}`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
      {sublabel && (
        <div
          data-slot="metric-sublabel"
          className="text-[12.5px] font-medium text-muted-foreground leading-snug"
        >
          {sublabel}
        </div>
      )}
    </Card>
  );
}
