/**
 * SectionTitle — the card section header extracted in Phase 5.
 *
 * This component absorbed 19 hand-copied instances of the same markup, so the
 * accent colour and the decorative-bullet contract are asserted once here
 * rather than in each caller's suite.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { SectionTitle } from './SectionTitle';

afterEach(() => cleanup());

const bullet = (c: HTMLElement) =>
  c.querySelector('[data-slot="section-title-bullet"]');

describe('SectionTitle', () => {
  it('renders the title text inside a section-title slot', () => {
    const { container } = render(<SectionTitle>HISTORIQUE</SectionTitle>);
    const header = container.querySelector('[data-slot="section-title"]');
    expect(header).not.toBeNull();
    expect(header!.textContent).toContain('HISTORIQUE');
  });

  it('defaults the bullet to the Leasétic accent, which every caller used to set by hand', () => {
    const { container } = render(<SectionTitle>CLIENT</SectionTitle>);
    expect(bullet(container)!.className).toContain('bg-[var(--gd)]');
  });

  it('accent="teal" switches the bullet without touching the label', () => {
    const { container } = render(
      <SectionTitle accent="teal">IDENTITÉ</SectionTitle>,
    );
    const b = bullet(container)!;
    expect(b.className).toContain('bg-[var(--teal)]');
    expect(b.className).not.toContain('bg-[var(--gd)]');
  });

  it('the bullet is decorative — hidden from assistive tech', () => {
    const { container } = render(<SectionTitle>CLIENT</SectionTitle>);
    expect(bullet(container)!.getAttribute('aria-hidden')).toBe('true');
  });

  it('bullet={false} omits it entirely (the PDF-preview header never had one)', () => {
    const { container } = render(
      <SectionTitle bullet={false}>APERÇU</SectionTitle>,
    );
    expect(bullet(container)).toBeNull();
    expect(container.textContent).toContain('APERÇU');
  });

  it('a className overrides the default margin rather than stacking with it', () => {
    // cn() runs twMerge, so `mb-0` must WIN over the built-in `mb-4` — if it
    // merely appended, the header would keep a stray 16px inside a centered
    // flex row (the admin recent-activity card).
    const { container } = render(
      <SectionTitle className="mb-0">ACTIVITÉ</SectionTitle>,
    );
    const cls = container.querySelector('[data-slot="section-title"]')!.className;
    expect(cls).toContain('mb-0');
    expect(cls).not.toContain('mb-4');
  });
});
