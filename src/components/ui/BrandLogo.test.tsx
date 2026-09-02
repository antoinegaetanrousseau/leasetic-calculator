import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, getAllByAltText, render } from '@testing-library/react';
import { BrandLogo } from './BrandLogo';

afterEach(() => cleanup());

describe('BrandLogo', () => {
  it('AC-BL-06a: renders TWO <img> tags both with alt="" when alt prop omitted (decorative default)', () => {
    const { container } = render(<BrandLogo />);
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toHaveAttribute('alt', '');
    expect(imgs[1]).toHaveAttribute('alt', '');
  });

  it('AC-BL-06b: renders both <img> with provided alt when alt prop given (CSS picker hides one, duplication OK)', () => {
    const { container } = render(<BrandLogo alt="Leasétic" />);
    const altMatches = getAllByAltText(container, 'Leasétic');
    expect(altMatches).toHaveLength(2);
  });

  it('UI-SPEC §6.1: outer span has class brand-logo; first img is brand-logo-light → /logo-light.svg; second img is brand-logo-dark → /logo-dark.svg', () => {
    const { container } = render(<BrandLogo />);
    const span = container.firstChild as HTMLElement | null;
    expect(span).not.toBeNull();
    expect(span?.tagName).toBe('SPAN');
    expect(span).toHaveClass('brand-logo');

    const imgs = container.querySelectorAll('img');
    expect(imgs[0]).toHaveClass('brand-logo-light');
    expect(imgs[0]).toHaveAttribute('src', '/logo-light.svg');
    expect(imgs[1]).toHaveClass('brand-logo-dark');
    expect(imgs[1]).toHaveAttribute('src', '/logo-dark.svg');
  });

  // The lockup assets are 862×200. Height is DERIVED from width, so the <img>
  // box always matches the viewBox — a mismatch makes the browser letterbox the
  // logo inside a slot of dead space rather than fail visibly. These assert the
  // ratio holds, not two hard-coded numbers, so swapping the asset is one edit.
  const ASPECT = 862 / 200;

  it('UI-SPEC §6.1: default height derives from width at the asset aspect', () => {
    const { container } = render(<BrandLogo />);
    const imgs = container.querySelectorAll('img');
    const expected = String(Math.round(190 / ASPECT));
    for (const img of imgs) {
      expect(img).toHaveAttribute('width', '190');
      expect(img).toHaveAttribute('height', expected);
    }
  });

  it('UI-SPEC §6.1: a custom width re-derives the height, preserving the aspect', () => {
    const { container } = render(<BrandLogo width={120} />);
    const imgs = container.querySelectorAll('img');
    const expected = String(Math.round(120 / ASPECT));
    for (const img of imgs) {
      expect(img).toHaveAttribute('width', '120');
      expect(img).toHaveAttribute('height', expected);
    }
  });

  it('UI-SPEC §6.1: an explicit height still overrides the derived one', () => {
    const { container } = render(<BrandLogo width={120} height={20} />);
    const imgs = container.querySelectorAll('img');
    for (const img of imgs) {
      expect(img).toHaveAttribute('width', '120');
      expect(img).toHaveAttribute('height', '20');
    }
  });

  it('UI-SPEC §6.1: className prop is appended to outer span className (alongside brand-logo)', () => {
    const { container } = render(<BrandLogo className="hero-logo" />);
    const span = container.firstChild as HTMLElement | null;
    expect(span).not.toBeNull();
    expect(span).toHaveClass('brand-logo');
    expect(span).toHaveClass('hero-logo');
  });
});
