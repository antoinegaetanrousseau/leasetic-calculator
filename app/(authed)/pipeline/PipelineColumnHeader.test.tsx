import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PipelineColumnHeader } from './PipelineColumnHeader';

afterEach(() => {
  cleanup();
});

describe('PipelineColumnHeader', () => {
  for (const stage of ['signe', 'debloque'] as const) {
    it(`reserved stage "${stage}" renders the Réservé badge, no digit, and data-lane-state="reserved"`, () => {
      const { container } = render(
        <PipelineColumnHeader stage={stage} count={0} lang="fr" />,
      );
      expect(screen.getByText('Réservé')).toBeDefined();
      expect(container.textContent).not.toMatch(/[0-9]/);
      expect(container.querySelector('[data-lane-state="reserved"]')).not.toBeNull();
    });
  }

  it('perdu renders the numeric count and data-lane-state="terminal"', () => {
    const { container } = render(<PipelineColumnHeader stage="perdu" count={5} lang="fr" />);
    expect(screen.getByText('5')).toBeDefined();
    expect(container.querySelector('[data-lane-state="terminal"]')).not.toBeNull();
  });

  it('prospect with count 0 renders a literal 0 and data-lane-state="active"', () => {
    const { container } = render(<PipelineColumnHeader stage="prospect" count={0} lang="fr" />);
    expect(screen.getByText('0')).toBeDefined();
    expect(container.querySelector('[data-lane-state="active"]')).not.toBeNull();
  });

  it('labels match stageLabel output in both langs', () => {
    const { rerender } = render(<PipelineColumnHeader stage="negociation" count={1} lang="fr" />);
    expect(screen.getByText('Négociation')).toBeDefined();
    rerender(<PipelineColumnHeader stage="negociation" count={1} lang="en" />);
    expect(screen.getByText('Negotiation')).toBeDefined();
  });
});
