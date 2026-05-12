import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PlusDeDetailsAccordion } from './PlusDeDetailsAccordion';

afterEach(() => cleanup());

describe('PlusDeDetailsAccordion', () => {
  it('AC-PDA-01: starts collapsed when defaultOpen === false (trigger aria-expanded="false")', () => {
    render(
      <PlusDeDetailsAccordion defaultOpen={false} onToggle={() => {}} lang="fr">
        <div data-testid="inner">hidden child</div>
      </PlusDeDetailsAccordion>,
    );
    const trigger = screen.getByRole('button', { name: /plus de détails/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC-PDA-02: starts expanded when defaultOpen === true (aria-expanded="true", children visible)', () => {
    render(
      <PlusDeDetailsAccordion defaultOpen={true} onToggle={() => {}} lang="fr">
        <div data-testid="inner">visible child</div>
      </PlusDeDetailsAccordion>,
    );
    const trigger = screen.getByRole('button', { name: /plus de détails/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('inner')).toBeInTheDocument();
  });

  it('AC-PDA-03: toggles aria-expanded between true/false on click', () => {
    render(
      <PlusDeDetailsAccordion defaultOpen={false} onToggle={() => {}} lang="fr">
        <div>child</div>
      </PlusDeDetailsAccordion>,
    );
    const trigger = screen.getByRole('button', { name: /plus de détails/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC-PDA-04: calls onToggle(true) when expanding and onToggle(false) when collapsing', () => {
    const onToggle = vi.fn();
    render(
      <PlusDeDetailsAccordion defaultOpen={false} onToggle={onToggle} lang="fr">
        <div>child</div>
      </PlusDeDetailsAccordion>,
    );
    const trigger = screen.getByRole('button', { name: /plus de détails/i });
    fireEvent.click(trigger);
    expect(onToggle).toHaveBeenLastCalledWith(true);
    fireEvent.click(trigger);
    expect(onToggle).toHaveBeenLastCalledWith(false);
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('AC-PDA-05: trigger has aria-controls="plus-de-details-region" and is focusable via tab', () => {
    render(
      <PlusDeDetailsAccordion defaultOpen={false} onToggle={() => {}} lang="fr">
        <div>child</div>
      </PlusDeDetailsAccordion>,
    );
    const trigger = screen.getByRole('button', { name: /plus de détails/i });
    expect(trigger).toHaveAttribute('aria-controls', 'plus-de-details-region');
    // Native <button> is focusable; verify tabIndex doesn't disable it.
    expect(trigger.getAttribute('tabindex') ?? '0').not.toBe('-1');
  });

  it('AC-PDA-06: child content is in DOM regardless of open state (D-21 RHF state preservation)', () => {
    // Children stay mounted whether open or closed — collapsed visual state
    // uses height:0 + opacity:0 + overflow:hidden, NOT conditional rendering.
    render(
      <PlusDeDetailsAccordion defaultOpen={false} onToggle={() => {}} lang="fr">
        <div data-testid="rhf-child">RHF-controlled field</div>
      </PlusDeDetailsAccordion>,
    );
    expect(screen.getByTestId('rhf-child')).toBeInTheDocument();
  });

  it('AC-PDA-07: Plus icon has transform: rotate(45deg) inline style when open', () => {
    render(
      <PlusDeDetailsAccordion defaultOpen={true} onToggle={() => {}} lang="fr">
        <div>child</div>
      </PlusDeDetailsAccordion>,
    );
    const trigger = screen.getByRole('button', { name: /plus de détails/i });
    const svg = trigger.querySelector('svg');
    expect(svg).not.toBeNull();
    const style = svg!.getAttribute('style') ?? '';
    expect(style).toMatch(/rotate\(45deg\)/);
  });
});
