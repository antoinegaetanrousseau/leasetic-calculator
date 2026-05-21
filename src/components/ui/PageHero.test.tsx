import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { PageHero } from './PageHero';

afterEach(() => cleanup());

describe('PageHero', () => {
  it('AC-PH-01: title-only — renders <h1> with title text; no subtitle <p>; no eyebrow; no right-slot', () => {
    const { container, getByRole } = render(<PageHero title="Hello" />);
    const heading = getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Hello');
    expect(container.querySelectorAll('p').length).toBe(0);
    // No eyebrow: no element with letter-spacing 0.06em
    const allElements = container.querySelectorAll('*');
    const hasEyebrow = Array.from(allElements).some((el) => {
      const style = (el as HTMLElement).getAttribute('style') ?? '';
      return /letter-spacing:\s*0\.06em/.test(style);
    });
    expect(hasEyebrow).toBe(false);
    // No right-slot: outer flex container has exactly 1 child (left column)
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.children.length).toBe(1);
  });

  it('AC-PH-02: title + subtitle — <h1> present with title; <p> present with subtitle; eyebrow absent', () => {
    const { container, getByRole } = render(
      <PageHero title="Welcome" subtitle="Your dashboard overview" />,
    );
    const heading = getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Welcome');
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0]).toHaveTextContent('Your dashboard overview');
    // No eyebrow
    const allElements = container.querySelectorAll('*');
    const hasEyebrow = Array.from(allElements).some((el) => {
      const style = (el as HTMLElement).getAttribute('style') ?? '';
      return /letter-spacing:\s*0\.06em/.test(style);
    });
    expect(hasEyebrow).toBe(false);
  });

  it('AC-PH-03: title + subtitle + eyebrow — eyebrow element has uppercase + var(--gd) in inline style', () => {
    const { container } = render(
      <PageHero title="Administration" subtitle="Manage accounts" eyebrow="ADMIN" />,
    );
    const allElements = Array.from(container.querySelectorAll('*')) as HTMLElement[];
    const eyebrowEl = allElements.find((el) => {
      const style = el.getAttribute('style') ?? '';
      return (
        /text-transform:\s*uppercase/.test(style) && /color:\s*var\(--gd\)/.test(style)
      );
    });
    expect(eyebrowEl).toBeDefined();
    expect(eyebrowEl!.textContent).toBe('ADMIN');
  });

  it('AC-PH-04: title + actions — right-slot wrapper present; no subtitle <p>; no eyebrow', () => {
    const { getByTestId, container } = render(
      <PageHero title="X" actions={<button data-testid="hero-cta">Go</button>} />,
    );
    expect(getByTestId('hero-cta')).toBeDefined();
    expect(container.querySelectorAll('p').length).toBe(0);
    // No eyebrow
    const allElements = container.querySelectorAll('*');
    const hasEyebrow = Array.from(allElements).some((el) => {
      const style = (el as HTMLElement).getAttribute('style') ?? '';
      return /letter-spacing:\s*0\.06em/.test(style);
    });
    expect(hasEyebrow).toBe(false);
  });

  it('AC-PH-05: all 4 props — DOM order is eyebrow → h1 → subtitle within left column', () => {
    const { container } = render(
      <PageHero
        title="Administration"
        subtitle="Manage accounts"
        eyebrow="ADMIN"
        actions={<button data-testid="hero-cta-all">Go</button>}
      />,
    );
    const outer = container.firstElementChild as HTMLElement;
    // Left column is first child of outer flex container
    const leftCol = outer.children[0] as HTMLElement;
    const leftChildren = Array.from(leftCol.children) as HTMLElement[];
    // eyebrow div is first
    expect(leftChildren[0].tagName.toLowerCase()).not.toBe('h1');
    const style0 = leftChildren[0].getAttribute('style') ?? '';
    expect(style0).toMatch(/text-transform:\s*uppercase/);
    // h1 is second
    expect(leftChildren[1].tagName.toLowerCase()).toBe('h1');
    // p (subtitle) is third
    expect(leftChildren[2].tagName.toLowerCase()).toBe('p');
    // Actions right-slot is second child of outer
    const rightSlot = outer.children[1] as HTMLElement;
    expect(within(rightSlot).getByTestId('hero-cta-all')).toBeDefined();
  });

  it('AC-PH-06: light wrapper — all 4 elements present; title style references var(--ink)', () => {
    const { container, getByRole, getByTestId } = render(
      <div data-theme="light">
        <PageHero
          title="Light Title"
          subtitle="Light subtitle"
          eyebrow="LABEL"
          actions={<button data-testid="light-cta">Action</button>}
        />
      </div>,
    );
    const heading = getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Light Title');
    expect(heading.getAttribute('style')).toMatch(/color:\s*var\(--ink\)/);
    expect(container.querySelectorAll('p')[0]).toHaveTextContent('Light subtitle');
    // Eyebrow present
    const allElements = Array.from(container.querySelectorAll('*')) as HTMLElement[];
    const eyebrowEl = allElements.find((el) => {
      const style = el.getAttribute('style') ?? '';
      return /text-transform:\s*uppercase/.test(style) && /color:\s*var\(--gd\)/.test(style);
    });
    expect(eyebrowEl).toBeDefined();
    expect(eyebrowEl!.textContent).toBe('LABEL');
    expect(getByTestId('light-cta')).toBeDefined();
  });

  it('AC-PH-07: dark wrapper — data-theme="dark" on wrapper; all 4 elements present', () => {
    const { container, getByRole, getByTestId } = render(
      <div data-theme="dark">
        <PageHero
          title="Dark Title"
          subtitle="Dark subtitle"
          eyebrow="DARK"
          actions={<button data-testid="dark-cta">Action</button>}
        />
      </div>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveAttribute('data-theme', 'dark');
    const heading = getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Dark Title');
    // Token references same in dark — CSS cascade resolves them, jsdom does not; test token presence
    expect(heading.getAttribute('style')).toMatch(/color:\s*var\(--ink\)/);
    expect(container.querySelectorAll('p')[0]).toHaveTextContent('Dark subtitle');
    const allElements = Array.from(container.querySelectorAll('*')) as HTMLElement[];
    const eyebrowEl = allElements.find((el) => {
      const style = el.getAttribute('style') ?? '';
      return /text-transform:\s*uppercase/.test(style) && /color:\s*var\(--gd\)/.test(style);
    });
    expect(eyebrowEl).toBeDefined();
    expect(eyebrowEl!.textContent).toBe('DARK');
    expect(getByTestId('dark-cta')).toBeDefined();
  });
});
