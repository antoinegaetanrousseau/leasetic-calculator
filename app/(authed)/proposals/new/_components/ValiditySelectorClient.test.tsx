/**
 * Phase 17 Plan 07 Task 2 — ValiditySelectorClient tests (RED → GREEN).
 *
 * 6 behavior tests covering WIZ-04 validity selector on wizard step 3:
 *   - AC-VSC-01: defaultValidity=30 → 30j has aria-pressed=true, others false
 *   - AC-VSC-02: defaultValidity=15 → 15j has aria-pressed=true
 *   - AC-VSC-03: clicking 60j calls updateValidityAction mock with (draftId, 60)
 *   - AC-VSC-04: clicking 60j flips aria-pressed (optimistic local state)
 *   - AC-VSC-05: container has role="group" + aria-label from i18n key
 *   - AC-VSC-06: data-testid="validity-selector"; buttons use .db class with .on
 *     added on the active button
 *
 * Mocks updateValidityAction with vi.fn() so the test never reaches the DB layer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const { updateValidityActionMock } = vi.hoisted(() => ({
  updateValidityActionMock: vi.fn(),
}));

vi.mock('../_actions/updateValidity.action', () => ({
  updateValidityAction: (...args: unknown[]) => updateValidityActionMock(...args),
}));

import { ValiditySelectorClient } from './ValiditySelectorClient';

beforeEach(() => {
  updateValidityActionMock.mockReset();
  updateValidityActionMock.mockResolvedValue({ ok: true });
});

afterEach(() => {
  cleanup();
});

describe('ValiditySelectorClient', () => {
  it('AC-VSC-01: defaultValidity=30 → 30j button has aria-pressed="true"; 15j + 60j have aria-pressed="false"', () => {
    render(
      <ValiditySelectorClient draftId="d-1" defaultValidity={30} lang="fr" />,
    );
    const btn15 = screen.getByRole('button', { name: /15j/i });
    const btn30 = screen.getByRole('button', { name: /30j/i });
    const btn60 = screen.getByRole('button', { name: /60j/i });
    expect(btn30).toHaveAttribute('aria-pressed', 'true');
    expect(btn15).toHaveAttribute('aria-pressed', 'false');
    expect(btn60).toHaveAttribute('aria-pressed', 'false');
  });

  it('AC-VSC-02: defaultValidity=15 → 15j button has aria-pressed="true"', () => {
    render(
      <ValiditySelectorClient draftId="d-1" defaultValidity={15} lang="fr" />,
    );
    const btn15 = screen.getByRole('button', { name: /15j/i });
    const btn30 = screen.getByRole('button', { name: /30j/i });
    const btn60 = screen.getByRole('button', { name: /60j/i });
    expect(btn15).toHaveAttribute('aria-pressed', 'true');
    expect(btn30).toHaveAttribute('aria-pressed', 'false');
    expect(btn60).toHaveAttribute('aria-pressed', 'false');
  });

  it('AC-VSC-03: clicking 60j calls updateValidityAction with (draftId, 60)', async () => {
    render(
      <ValiditySelectorClient draftId="draft-abc" defaultValidity={30} lang="fr" />,
    );
    const btn60 = screen.getByRole('button', { name: /60j/i });
    fireEvent.click(btn60);
    // useTransition queues the server-action call; await microtasks.
    await Promise.resolve();
    await Promise.resolve();
    expect(updateValidityActionMock).toHaveBeenCalledTimes(1);
    expect(updateValidityActionMock).toHaveBeenCalledWith('draft-abc', 60);
  });

  it('AC-VSC-04: clicking 60j flips aria-pressed (optimistic local state)', () => {
    render(
      <ValiditySelectorClient draftId="d-1" defaultValidity={30} lang="fr" />,
    );
    const btn30 = screen.getByRole('button', { name: /30j/i });
    const btn60 = screen.getByRole('button', { name: /60j/i });
    expect(btn30).toHaveAttribute('aria-pressed', 'true');
    expect(btn60).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn60);
    expect(btn60).toHaveAttribute('aria-pressed', 'true');
    expect(btn30).toHaveAttribute('aria-pressed', 'false');
  });

  it('AC-VSC-05: container has role="group" and aria-label from proposal.validity.ariaLabel', () => {
    const { container } = render(
      <ValiditySelectorClient draftId="d-1" defaultValidity={30} lang="fr" />,
    );
    const group = container.querySelector('[role="group"]');
    expect(group).not.toBeNull();
    // FR aria-label per dict line 328: 'Sélectionner la durée de validité'
    expect(group!.getAttribute('aria-label')).toBe(
      'Sélectionner la durée de validité',
    );
  });

  it('AC-VSC-06: container keeps its test hook and exactly one segment reads as selected', () => {
    const { container } = render(
      <ValiditySelectorClient draftId="d-1" defaultValidity={30} lang="fr" />,
    );
    const wrapper = container.querySelector('[data-testid="validity-selector"]');
    expect(wrapper).not.toBeNull();

    const btn15 = screen.getByRole('button', { name: /15j/i });
    const btn30 = screen.getByRole('button', { name: /30j/i });
    const btn60 = screen.getByRole('button', { name: /60j/i });

    // Phase 5 retired the .dg/.db/.on classes for the shared segmented chrome.
    // Selection was only ever *styled* by `.on`; what conveys it is
    // aria-pressed, already covered by AC-VSC-01..04. The invariant worth
    // keeping here is that the group is single-select.
    const pressed = [btn15, btn30, btn60].filter(
      (b) => b.getAttribute('aria-pressed') === 'true',
    );
    expect(pressed).toEqual([btn30]);
  });
});
