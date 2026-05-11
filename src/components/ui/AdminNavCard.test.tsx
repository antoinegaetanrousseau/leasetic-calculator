import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { Sliders, Users, History } from 'lucide-react';
import { AdminNavCard } from './AdminNavCard';

afterEach(() => cleanup());

describe('AdminNavCard', () => {
  it('AC-AC-01: variant=coefficients renders <a> with supplied href (Next Link → <a>)', () => {
    const { container } = render(
      <AdminNavCard
        variant="coefficients"
        title="Coefficients"
        description="Ajuster les coefficients"
        href="/admin-segment/coefficients"
        icon={Sliders}
        openLabel="Ouvrir →"
      />,
    );
    const link = within(container).getByRole('link');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/admin-segment/coefficients');
  });

  it('AC-AC-02: variant=coefficients icon-square has bg rgba(18, 150, 87, 0.10) and icon color var(--gd)', () => {
    const { container } = render(
      <AdminNavCard
        variant="coefficients"
        title="Coefficients"
        description="..."
        href="/x"
        icon={Sliders}
        openLabel="Ouvrir →"
      />,
    );
    const link = within(container).getByRole('link');
    const iconSquare = link.querySelector(':scope > div') as HTMLDivElement;
    expect(iconSquare.getAttribute('style')).toMatch(/background:\s*rgba\(18,\s*150,\s*87,\s*0\.10?\)/);
    const svg = iconSquare.querySelector('svg');
    expect(svg).not.toBeNull();
    // lucide-react passes `color` prop onto the SVG's stroke attribute
    expect(svg).toHaveAttribute('stroke', 'var(--gd)');
  });

  it('AC-AC-03: variant=partners icon-square bg rgba(45, 122, 140, 0.10), icon color var(--teal)', () => {
    const { container } = render(
      <AdminNavCard
        variant="partners"
        title="Partenaires"
        description="..."
        href="/x"
        icon={Users}
        openLabel="Ouvrir →"
      />,
    );
    const link = within(container).getByRole('link');
    const iconSquare = link.querySelector(':scope > div') as HTMLDivElement;
    expect(iconSquare.getAttribute('style')).toMatch(/background:\s*rgba\(45,\s*122,\s*140,\s*0\.10?\)/);
    const svg = iconSquare.querySelector('svg');
    expect(svg).toHaveAttribute('stroke', 'var(--teal)');
  });

  it('AC-AC-04: variant=history icon-square bg rgba(17, 44, 59, 0.10), icon color var(--navy)', () => {
    const { container } = render(
      <AdminNavCard
        variant="history"
        title="Historique"
        description="..."
        href="/x"
        icon={History}
        openLabel="Ouvrir →"
      />,
    );
    const link = within(container).getByRole('link');
    const iconSquare = link.querySelector(':scope > div') as HTMLDivElement;
    expect(iconSquare.getAttribute('style')).toMatch(/background:\s*rgba\(17,\s*44,\s*59,\s*0\.10?\)/);
    const svg = iconSquare.querySelector('svg');
    expect(svg).toHaveAttribute('stroke', 'var(--navy)');
  });

  it('AC-AC-07: CTA <div> text content includes Unicode → glyph (U+2192)', () => {
    const { container } = render(
      <AdminNavCard
        variant="partners"
        title="Partenaires"
        description="Gérer les partenaires"
        href="/x"
        icon={Users}
        openLabel="Ouvrir →"
      />,
    );
    // matches the → arrow inside any element
    expect(within(container).getByText(/→/)).toBeTruthy();
  });

  it('AC-AC-10: outer <a> has aria-label="{title}: {description}. {openLabel}"', () => {
    const { container } = render(
      <AdminNavCard
        variant="partners"
        title="Partenaires"
        description="Gérer les partenaires"
        href="/x"
        icon={Users}
        openLabel="Ouvrir →"
      />,
    );
    const link = within(container).getByRole('link');
    expect(link).toHaveAttribute(
      'aria-label',
      'Partenaires: Gérer les partenaires. Ouvrir →',
    );
  });

  it('AC-AC-05: title <div> style contains font-size: 18px and font-weight: 600', () => {
    const { container } = render(
      <AdminNavCard
        variant="coefficients"
        title="Coefficients"
        description="Ajuster"
        href="/x"
        icon={Sliders}
        openLabel="Ouvrir →"
      />,
    );
    const link = within(container).getByRole('link');
    const children = link.querySelectorAll(':scope > div');
    // expected order: [iconSquare, title, description, cta]
    expect(children.length).toBe(4);
    const titleDiv = children[1] as HTMLDivElement;
    expect(titleDiv).toHaveTextContent('Coefficients');
    const styleAttr = titleDiv.getAttribute('style') ?? '';
    expect(styleAttr).toMatch(/font-size:\s*18px/);
    expect(styleAttr).toMatch(/font-weight:\s*600/);
  });
});
