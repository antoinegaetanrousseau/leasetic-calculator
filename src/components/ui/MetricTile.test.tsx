import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { MetricTile } from './MetricTile';

afterEach(() => cleanup());

describe('MetricTile', () => {
  it('AC-MT-01: variant=month renders label + value (with color var(--gd)) + sublabel; 3 child <div>s', () => {
    const { container } = render(
      <MetricTile variant="month" label="Ce mois-ci" value="12" sublabel="propositions" />,
    );
    const group = within(container).getByRole('group');
    const children = group.querySelectorAll(':scope > div');
    expect(children).toHaveLength(3);
    // value div is the 2nd child
    const valueDiv = children[1] as HTMLDivElement;
    expect(valueDiv.getAttribute('style')).toMatch(/color:\s*var\(--gd\)/);
    // text content for each
    expect(group).toHaveTextContent('Ce mois-ci');
    expect(group).toHaveTextContent('12');
    expect(group).toHaveTextContent('propositions');
  });

  it('AC-MT-02: omitting sublabel renders only 2 <div> children (label + value); "propositions" not in DOM', () => {
    const { container } = render(<MetricTile variant="total" label="Total" value="248" />);
    const group = within(container).getByRole('group');
    const children = group.querySelectorAll(':scope > div');
    expect(children).toHaveLength(2);
    expect(within(container).queryByText('propositions')).toBeNull();
  });

  it('AC-MT-03: variant=drafts produces value <div> with style color var(--gold)', () => {
    const { container } = render(
      <MetricTile variant="drafts" label="Brouillons" value="3" sublabel="à compléter" />,
    );
    const group = within(container).getByRole('group');
    const children = group.querySelectorAll(':scope > div');
    const valueDiv = children[1] as HTMLDivElement;
    expect(valueDiv.getAttribute('style')).toMatch(/color:\s*var\(--gold\)/);
  });

  it('AC-MT-07: outer wrapper has role="group" and aria-label="{label}: {value}"', () => {
    const { container } = render(<MetricTile variant="month" label="Ce mois-ci" value="12" />);
    const group = within(container).getByRole('group');
    expect(group).toHaveAttribute('aria-label', 'Ce mois-ci: 12');
  });

  it('AC-MT-08: variant=total produces value <div> with style color var(--navy)', () => {
    const { container } = render(<MetricTile variant="total" label="Total" value="248" />);
    const group = within(container).getByRole('group');
    const children = group.querySelectorAll(':scope > div');
    const valueDiv = children[1] as HTMLDivElement;
    expect(valueDiv.getAttribute('style')).toMatch(/color:\s*var\(--navy\)/);
  });
});
