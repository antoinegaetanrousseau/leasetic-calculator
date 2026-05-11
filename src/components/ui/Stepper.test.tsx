import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Stepper } from './Stepper';

afterEach(() => cleanup());

describe('Stepper', () => {
  it('AC-ST-01: currentStep=1 completedSteps=[] — step 1 active, steps 2+3 pending, no links', () => {
    const { container } = render(<Stepper currentStep={1} completedSteps={[]} lang="fr" />);

    // Outer <ol role="list">
    const list = container.querySelector('ol[role="list"]');
    expect(list).not.toBeNull();

    // Exactly 3 <li> items
    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(3);

    // Step 1: aria-current="step"; Steps 2+3: aria-disabled="true"
    expect(items[0]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-disabled');
    expect(items[1]).toHaveAttribute('aria-disabled', 'true');
    expect(items[1]).not.toHaveAttribute('aria-current');
    expect(items[2]).toHaveAttribute('aria-disabled', 'true');

    // No <a> links rendered without hrefForStep
    expect(screen.queryAllByRole('link')).toHaveLength(0);

    // 2 connector spans with aria-hidden="true" between li items
    const connectors = container.querySelectorAll('span[aria-hidden="true"]');
    // Connectors are the only aria-hidden="true" spans (Check icons in done state would be inside <svg>, not <span>)
    expect(connectors.length).toBeGreaterThanOrEqual(2);
  });

  it('AC-ST-02: currentStep=2 completedSteps=[1] — step 1 done (Check svg), step 2 active, step 3 pending', () => {
    const { container } = render(<Stepper currentStep={2} completedSteps={[1]} lang="fr" />);

    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(3);

    // Step 1: done — contains an <svg> (lucide Check), no aria-current, no aria-disabled
    const step1Svg = items[0].querySelector('svg');
    expect(step1Svg).not.toBeNull();
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[0]).not.toHaveAttribute('aria-disabled');

    // Step 2: active — text "2", aria-current="step"
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[1].textContent).toContain('2');

    // Step 3: pending — aria-disabled="true"
    expect(items[2]).toHaveAttribute('aria-disabled', 'true');
  });

  it('AC-ST-03: currentStep=3 completedSteps=[1,2] — steps 1+2 done with Check svg, step 3 active', () => {
    const { container } = render(<Stepper currentStep={3} completedSteps={[1, 2]} lang="fr" />);

    const items = container.querySelectorAll('li');
    expect(items[0].querySelector('svg')).not.toBeNull();
    expect(items[1].querySelector('svg')).not.toBeNull();
    expect(items[2]).toHaveAttribute('aria-current', 'step');
  });

  it('AC-ST-04: without hrefForStep, no <a> elements render (queryAllByRole link returns [])', () => {
    render(<Stepper currentStep={2} completedSteps={[1]} lang="fr" />);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('AC-ST-05: with hrefForStep, exactly 1 <a> renders for done step (currentStep=2 completedSteps=[1])', () => {
    const hrefForStep = (n: 1 | 2 | 3) =>
      '/proposals/new/' + ['parametres', 'calcul', 'verification'][n - 1];

    render(
      <Stepper currentStep={2} completedSteps={[1]} lang="fr" hrefForStep={hrefForStep} />,
    );

    const links = screen.queryAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/proposals/new/parametres');
  });

  it('AC-ST-07: active <li> has aria-current="step"; pending <li>s have aria-disabled="true"', () => {
    const { container } = render(<Stepper currentStep={2} completedSteps={[1]} lang="fr" />);

    const items = container.querySelectorAll('li');
    // step 1 done — neither aria-current nor aria-disabled
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[0]).not.toHaveAttribute('aria-disabled');
    // step 2 active
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    // step 3 pending
    expect(items[2]).toHaveAttribute('aria-disabled', 'true');
  });

  it('AC-ST-09: container <ol> inline style contains padding 20px 28px, border-radius 16, var(--surface) bg, shadow-card', () => {
    const { container } = render(<Stepper currentStep={1} completedSteps={[]} lang="fr" />);

    const ol = container.querySelector('ol[role="list"]') as HTMLElement | null;
    expect(ol).not.toBeNull();
    const style = ol!.getAttribute('style') ?? '';
    expect(style).toMatch(/padding:\s*20px 28px/);
    expect(style).toMatch(/border-radius:\s*16px/);
    expect(style).toMatch(/background:\s*var\(--surface\)/);
    expect(style).toMatch(/box-shadow:\s*var\(--shadow-card\)/);
  });
});
