import { describe, expect, it } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import type { PipelineCardRow } from '@/lib/db/queries/pipeline';
import { PipelineCard } from './PipelineCard';

afterEach(() => {
  cleanup();
});

const BASE_ROW: PipelineCardRow = {
  relationshipId: 'rel-1',
  companyId: 'co-1',
  companyName: 'Acme SARL',
  siren: '123456789',
  stage: 'prospect',
  contactsCount: 2,
  proposalsCount: 3,
};

describe('PipelineCard', () => {
  it('renders the company name as a link to /clients/{relationshipId}, not companyId', () => {
    render(<PipelineCard row={BASE_ROW} lang="fr" />);
    const link = screen.getByRole('link', { name: 'Acme SARL' });
    expect(link).toHaveAttribute('href', '/clients/rel-1');
  });

  it('renders the SIREN when present', () => {
    render(<PipelineCard row={BASE_ROW} lang="fr" />);
    expect(screen.getByText('123456789')).toBeDefined();
  });

  it('renders an em dash when SIREN is null (UIC-08)', () => {
    render(<PipelineCard row={{ ...BASE_ROW, siren: null }} lang="fr" />);
    expect(screen.getByText('—')).toBeDefined();
  });

  it('renders a real zero for contacts/proposals as two literal 0s, never an em dash', () => {
    render(
      <PipelineCard row={{ ...BASE_ROW, contactsCount: 0, proposalsCount: 0 }} lang="fr" />,
    );
    expect(screen.getByText('0 contact(s)')).toBeDefined();
    expect(screen.getByText('0 proposition(s)')).toBeDefined();
  });

  it('renders in both langs', () => {
    const { unmount } = render(<PipelineCard row={BASE_ROW} lang="en" />);
    expect(screen.getByText('2 contact(s)')).toBeDefined();
    expect(screen.getByText('3 proposal(s)')).toBeDefined();
    unmount();
    render(<PipelineCard row={BASE_ROW} lang="fr" />);
    expect(screen.getByText('2 contact(s)')).toBeDefined();
    expect(screen.getByText('3 proposition(s)')).toBeDefined();
  });
});
