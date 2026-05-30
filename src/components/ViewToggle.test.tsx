import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VIEW_STORAGE_KEY } from '@/lib/view-store';
import { ViewToggle } from './ViewToggle';

// Mock next/navigation
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  window.sessionStorage.clear();
  pushMock.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ViewToggle', () => {
  // Test 1: default selected state (DEFAULT_VIEW = 'admin')
  it('Test 1 (admin gate / default): Admin segment is aria-checked=true by default (DEFAULT_VIEW=admin)', () => {
    render(<ViewToggle lang="fr" adminHrefs={{ home: '/x' }} />);
    const adminBtn = screen.getByRole('radio', { name: 'Admin' });
    const agentBtn = screen.getByRole('radio', { name: 'Agent' });
    expect(adminBtn).toHaveAttribute('aria-checked', 'true');
    expect(agentBtn).toHaveAttribute('aria-checked', 'false');
  });

  // Test 2: two radio segments
  it('Test 2 (two radio segments): renders exactly 2 role="radio" elements with labels Admin and Agent (FR)', () => {
    render(<ViewToggle lang="fr" adminHrefs={{ home: '/x' }} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0].textContent).toBe('Admin');
    expect(radios[1].textContent).toBe('Agent');
  });

  // Test 3: radiogroup + aria-label
  it('Test 3 (radiogroup + aria-label): wrapper has role="radiogroup" and aria-label "Vue" (FR)', () => {
    render(<ViewToggle lang="fr" adminHrefs={{ home: '/x' }} />);
    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAttribute('aria-label', 'Vue');
  });

  it('Test 3b (aria-label EN): aria-label is "View" when lang="en"', () => {
    render(<ViewToggle lang="en" adminHrefs={{ home: '/x' }} />);
    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAttribute('aria-label', 'View');
  });

  // Test 4: selected tint
  it('Test 4 (selected tint): agent segment has green tint when stored view is agent; admin segment has transparent background', () => {
    window.sessionStorage.setItem(VIEW_STORAGE_KEY, 'agent');
    render(<ViewToggle lang="fr" adminHrefs={{ home: '/x' }} />);

    const agentBtn = screen.getByRole('radio', { name: 'Agent' });
    const adminBtn = screen.getByRole('radio', { name: 'Admin' });

    const agentStyle = agentBtn.getAttribute('style') ?? '';
    const adminStyle = adminBtn.getAttribute('style') ?? '';

    expect(agentStyle).toContain('rgba(18, 150, 87, 0.10)');
    expect(agentStyle).toContain('var(--ink)');
    expect(adminStyle).toContain('transparent');
  });

  // Test 5: switch to agent redirects home
  it('Test 5 (switch to agent): click Agent segment ⇒ sessionStorage=agent AND router.push("/")', () => {
    render(<ViewToggle lang="fr" adminHrefs={{ home: '/x' }} />);

    const agentBtn = screen.getByRole('radio', { name: 'Agent' });
    fireEvent.click(agentBtn);

    expect(window.sessionStorage.getItem(VIEW_STORAGE_KEY)).toBe('agent');
    expect(pushMock).toHaveBeenCalledWith('/');
  });

  // Test 6: switch to admin redirects to adminHrefs.home
  it('Test 6 (switch to admin): click Admin segment ⇒ sessionStorage=admin AND router.push(adminHrefs.home)', () => {
    // Start with agent view
    window.sessionStorage.setItem(VIEW_STORAGE_KEY, 'agent');
    render(<ViewToggle lang="fr" adminHrefs={{ home: '/x' }} />);

    const adminBtn = screen.getByRole('radio', { name: 'Admin' });
    fireEvent.click(adminBtn);

    expect(window.sessionStorage.getItem(VIEW_STORAGE_KEY)).toBe('admin');
    expect(pushMock).toHaveBeenCalledWith('/x');
  });

  // Test 7: collapsed pill
  it('Test 7 (collapsed pill): renders a single button (no radiogroup) with "A" when view=admin and "G" when view=agent', () => {
    render(<ViewToggle lang="fr" adminHrefs={{ home: '/x' }} collapsed />);

    // No radiogroup in collapsed mode
    expect(screen.queryByRole('radiogroup')).toBeNull();

    // Single button with content 'A' (admin default)
    const pill = screen.getByRole('button');
    expect(pill.textContent).toBe('A');
    expect(pill).toHaveAttribute('aria-label', 'Changer de vue');

    cleanup();

    // Now test with agent stored
    window.sessionStorage.setItem(VIEW_STORAGE_KEY, 'agent');
    render(<ViewToggle lang="fr" adminHrefs={{ home: '/x' }} collapsed />);
    const pillAgent = screen.getByRole('button');
    expect(pillAgent.textContent).toBe('G');
  });

  // Test 8: keyboard ArrowRight moves selection
  it('Test 8 (keyboard): ArrowRight on Admin segment sets view to agent (sessionStorage becomes "agent")', () => {
    render(<ViewToggle lang="fr" adminHrefs={{ home: '/x' }} />);

    const adminBtn = screen.getByRole('radio', { name: 'Admin' });
    fireEvent.keyDown(adminBtn, { key: 'ArrowRight' });

    expect(window.sessionStorage.getItem(VIEW_STORAGE_KEY)).toBe('agent');
  });
});
