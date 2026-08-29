/**
 * PageHero tests — rewritten in Phase 0 of the ReUI/Maia migration.
 *
 * The previous suite located the eyebrow by scanning every element for an
 * inline `text-transform: uppercase` style and asserted the h1 carried
 * `color: var(--ink)`. Both stopped being true when this component moved to
 * Tailwind utilities, and neither described anything a reader depends on.
 *
 * These assert the composition contract instead: which slots render for a
 * given set of props, their DOM order, and the heading level — all of which
 * must hold no matter how the hero is styled.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { PageHero } from './PageHero';

afterEach(() => cleanup());

const slot = (c: HTMLElement, name: string) => c.querySelector(`[data-slot="page-hero-${name}"]`);

describe('PageHero', () => {
  it('AC-PH-01: title only — renders the h1 and nothing else', () => {
    const { container, getByRole } = render(<PageHero title="Hello" />);
    expect(getByRole('heading', { level: 1 })).toHaveTextContent('Hello');
    expect(slot(container, 'eyebrow')).toBeNull();
    expect(slot(container, 'subtitle')).toBeNull();
    expect(slot(container, 'actions')).toBeNull();
  });

  it('AC-PH-02: title + subtitle — subtitle renders, eyebrow does not', () => {
    const { container, getByRole } = render(
      <PageHero title="Welcome" subtitle="Your dashboard overview" />,
    );
    expect(getByRole('heading', { level: 1 })).toHaveTextContent('Welcome');
    expect(slot(container, 'subtitle')).toHaveTextContent('Your dashboard overview');
    expect(slot(container, 'eyebrow')).toBeNull();
  });

  it('AC-PH-03: eyebrow renders its text when supplied', () => {
    const { container } = render(
      <PageHero title="Administration" subtitle="Manage accounts" eyebrow="ADMIN" />,
    );
    expect(slot(container, 'eyebrow')).toHaveTextContent('ADMIN');
  });

  it('AC-PH-04: actions render into the right-hand slot', () => {
    const { container, getByTestId } = render(
      <PageHero title="X" actions={<button data-testid="hero-cta">Go</button>} />,
    );
    expect(getByTestId('hero-cta')).toBeDefined();
    const actions = slot(container, 'actions') as HTMLElement;
    expect(within(actions).getByTestId('hero-cta')).toBeDefined();
    expect(slot(container, 'subtitle')).toBeNull();
  });

  it('AC-PH-05: all four props — DOM order is eyebrow, then h1, then subtitle', () => {
    const { container } = render(
      <PageHero
        title="Administration"
        subtitle="Manage accounts"
        eyebrow="ADMIN"
        actions={<button data-testid="hero-cta-all">Go</button>}
      />,
    );
    const main = slot(container, 'main') as HTMLElement;
    const order = Array.from(main.children).map((el) => el.getAttribute('data-slot'));
    expect(order).toEqual([
      'page-hero-eyebrow',
      'page-hero-title',
      'page-hero-subtitle',
    ]);

    // The h1 really is an h1, not a styled div.
    expect((main.children[1] as HTMLElement).tagName.toLowerCase()).toBe('h1');

    const actions = slot(container, 'actions') as HTMLElement;
    expect(within(actions).getByTestId('hero-cta-all')).toBeDefined();
  });

  it('AC-PH-06: renders the same structure regardless of the surrounding theme', () => {
    // Colour is resolved by the CSS cascade, which jsdom does not run. What we
    // can meaningfully assert is that the theme wrapper changes nothing about
    // the composition — the hero is theme-agnostic by construction.
    for (const theme of ['light', 'dark'] as const) {
      const { container, getByRole, getByTestId, unmount } = render(
        <div data-theme={theme}>
          <PageHero
            title={`${theme} title`}
            subtitle={`${theme} subtitle`}
            eyebrow="LABEL"
            actions={<button data-testid={`${theme}-cta`}>Action</button>}
          />
        </div>,
      );
      expect(container.firstElementChild).toHaveAttribute('data-theme', theme);
      expect(getByRole('heading', { level: 1 })).toHaveTextContent(`${theme} title`);
      expect(slot(container, 'subtitle')).toHaveTextContent(`${theme} subtitle`);
      expect(slot(container, 'eyebrow')).toHaveTextContent('LABEL');
      expect(getByTestId(`${theme}-cta`)).toBeDefined();
      unmount();
    }
  });
});
