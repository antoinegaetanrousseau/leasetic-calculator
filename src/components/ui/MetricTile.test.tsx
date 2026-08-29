/**
 * MetricTile tests — rewritten in Phase 0 of the ReUI/Maia migration.
 *
 * The previous suite asserted inline `style="color: var(--gd)"` substrings,
 * which broke the moment the component moved to ReUI Card + Tailwind utility
 * classes. Colour is presentation and is now owned by the token layer, so
 * asserting it here only re-tested the stylesheet.
 *
 * These tests assert what actually has to stay true across a restyle:
 *   - the accessible pairing of label and value (role=group + aria-label)
 *   - the semantic variant, via the stable data-variant hook
 *   - the content contract (which slots render, and which do not)
 *   - the valueColor override, which IS a real API and still uses inline style
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { MetricTile, type MetricTileProps } from './MetricTile';

afterEach(() => cleanup());

const VARIANTS: Array<MetricTileProps['variant']> = ['month', 'total', 'drafts'];

describe('MetricTile', () => {
  it('AC-MT-01: renders label, value and sublabel as three content slots', () => {
    const { container } = render(
      <MetricTile variant="month" label="Ce mois-ci" value="12" sublabel="propositions" />,
    );
    const group = within(container).getByRole('group');

    expect(group.querySelector('[data-slot="metric-label"]')).toHaveTextContent('Ce mois-ci');
    expect(group.querySelector('[data-slot="metric-value"]')).toHaveTextContent('12');
    expect(group.querySelector('[data-slot="metric-sublabel"]')).toHaveTextContent('propositions');
  });

  it('AC-MT-02: omitting sublabel renders no sublabel slot', () => {
    const { container } = render(<MetricTile variant="total" label="Total" value="248" />);
    const group = within(container).getByRole('group');

    expect(group.querySelector('[data-slot="metric-label"]')).toHaveTextContent('Total');
    expect(group.querySelector('[data-slot="metric-value"]')).toHaveTextContent('248');
    expect(group.querySelector('[data-slot="metric-sublabel"]')).toBeNull();
    expect(within(container).queryByText('propositions')).toBeNull();
  });

  it('AC-MT-03: every variant is exposed on the stable data-variant hook', () => {
    for (const variant of VARIANTS) {
      const { container, unmount } = render(
        <MetricTile variant={variant} label="X" value="1" />,
      );
      expect(within(container).getByRole('group')).toHaveAttribute('data-variant', variant);
      unmount();
    }
  });

  it('AC-MT-07: exposes role=group with the label and value paired in aria-label', () => {
    const { container } = render(<MetricTile variant="month" label="Ce mois-ci" value="12" />);
    expect(within(container).getByRole('group')).toHaveAttribute('aria-label', 'Ce mois-ci: 12');
  });

  it('AC-MT-08: aria-label pairing holds for every variant', () => {
    for (const variant of VARIANTS) {
      const { container, unmount } = render(
        <MetricTile variant={variant} label="Total" value="248" />,
      );
      expect(within(container).getByRole('group')).toHaveAttribute('aria-label', 'Total: 248');
      unmount();
    }
  });

  // ── valueColor override (D-04) ──────────────────────────────────────────
  // Admin Home renders all three tiles in --teal regardless of variant. This
  // is a real public API, so it keeps a real assertion — the prop drives an
  // inline style by design, which is exactly why it survives a restyle.
  describe('valueColor prop (D-04)', () => {
    it('AC-MT-VC-01: without valueColor, no inline colour is set on the value', () => {
      const { container } = render(
        <MetricTile variant="month" label="Partenaires actifs" value="42" />,
      );
      const value = within(container)
        .getByRole('group')
        .querySelector('[data-slot="metric-value"]') as HTMLElement;
      expect(value.getAttribute('style')).toBeNull();
    });

    it('AC-MT-VC-02: valueColor sets the inline colour on the value slot', () => {
      const { container } = render(
        <MetricTile
          variant="month"
          label="Partenaires actifs"
          value="42"
          valueColor="var(--teal)"
        />,
      );
      const value = within(container)
        .getByRole('group')
        .querySelector('[data-slot="metric-value"]') as HTMLElement;
      expect(value.getAttribute('style')).toMatch(/color:\s*var\(--teal\)/);
    });

    it('AC-MT-VC-03: valueColor override works on every variant', () => {
      for (const variant of VARIANTS) {
        const { container, unmount } = render(
          <MetricTile variant={variant} label="X" value="Y" valueColor="var(--teal)" />,
        );
        const value = within(container)
          .getByRole('group')
          .querySelector('[data-slot="metric-value"]') as HTMLElement;
        expect(value.getAttribute('style')).toMatch(/color:\s*var\(--teal\)/);
        unmount();
      }
    });
  });
});
