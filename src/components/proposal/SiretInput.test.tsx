/**
 * Phase 42 Plan 08 Task 1 — SiretInput tests (FIELD-01 / D-01..D-04).
 *
 * Behaviours from PLAN.md's <behavior> block, all six covered.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { formatSiret, SiretInput } from './SiretInput';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('formatSiret (FIELD-01 / D-04)', () => {
  it('groups a 14-digit string as 3-3-3-5', () => {
    expect(formatSiret('12345678900012')).toBe('123 456 789 00012');
  });

  it('drops digits beyond the 14th', () => {
    expect(formatSiret('123456789000123456')).toBe('123 456 789 00012');
  });

  it('strips non-digit characters before grouping', () => {
    expect(formatSiret('abc123')).toBe('123');
  });

  it('returns an empty string for an empty input', () => {
    expect(formatSiret('')).toBe('');
  });
});

describe('SiretInput (FIELD-01)', () => {
  it('calls onChange with the formatted string, not the raw keystrokes', () => {
    const onChange = vi.fn();
    render(
      <SiretInput
        inputId="client-siret"
        value=""
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '12345678900012' } });
    expect(onChange).toHaveBeenCalledWith('123 456 789 00012');
  });

  it('renders aria-invalid when invalid is set and forwards ariaDescribedBy', () => {
    render(
      <SiretInput
        inputId="client-siret"
        value=""
        onChange={vi.fn()}
        invalid
        ariaDescribedBy="client-siret-error"
      />,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'client-siret-error');
  });

  it('sets maxLength=17 and inputMode="numeric"', () => {
    render(
      <SiretInput
        inputId="client-siret"
        value=""
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxlength', '17');
    expect(input).toHaveAttribute('inputmode', 'numeric');
  });

  it('renders no spinner, badge or status text', () => {
    const { container } = render(
      <SiretInput
        inputId="client-siret"
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(container.querySelectorAll('input').length).toBe(1);
  });
});
