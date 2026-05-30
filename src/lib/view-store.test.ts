import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  VIEW_STORAGE_KEY,
  VIEW_TOGGLE_EVENT,
  DEFAULT_VIEW,
  getViewSnapshot,
  getServerViewSnapshot,
  subscribeView,
  setView,
  clearView,
} from './view-store';

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('view-store', () => {
  it('Test 1 (default): getViewSnapshot() returns "admin" when sessionStorage is empty', () => {
    expect(getViewSnapshot()).toBe('admin');
    expect(DEFAULT_VIEW).toBe('admin');
  });

  it('Test 2 (set agent): setView("agent") stores "agent" and getViewSnapshot() returns "agent"', () => {
    setView('agent');
    expect(getViewSnapshot()).toBe('agent');
    expect(window.sessionStorage.getItem(VIEW_STORAGE_KEY)).toBe('agent');
  });

  it('Test 3 (set admin): setView("admin") stores "admin" and getViewSnapshot() returns "admin"', () => {
    setView('agent');
    setView('admin');
    expect(getViewSnapshot()).toBe('admin');
    expect(window.sessionStorage.getItem(VIEW_STORAGE_KEY)).toBe('admin');
  });

  it('Test 4 (unknown value coerces to admin): a junk string in sessionStorage yields "admin"', () => {
    window.sessionStorage.setItem(VIEW_STORAGE_KEY, 'xyz');
    expect(getViewSnapshot()).toBe('admin');
  });

  it('Test 5 (clear): clearView() removes the key; getViewSnapshot() returns "admin"', () => {
    setView('agent');
    clearView();
    expect(window.sessionStorage.getItem(VIEW_STORAGE_KEY)).toBeNull();
    expect(getViewSnapshot()).toBe('admin');
  });

  it('Test 6 (server snapshot): getServerViewSnapshot() returns "admin" regardless of storage', () => {
    setView('agent');
    expect(getServerViewSnapshot()).toBe('admin');
  });

  it('Test 7 (event dispatch): setView fires a VIEW_TOGGLE_EVENT on window', () => {
    const listener = vi.fn();
    window.addEventListener(VIEW_TOGGLE_EVENT, listener);
    setView('agent');
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(VIEW_TOGGLE_EVENT, listener);
  });

  it('Test 8 (subscribe wiring): subscribeView returns unsubscribe; dispatching event invokes callback; after unsubscribe it does not', () => {
    const cb = vi.fn();
    const unsubscribe = subscribeView(cb);

    // Dispatch the custom event — should trigger cb
    window.dispatchEvent(new Event(VIEW_TOGGLE_EVENT));
    expect(cb).toHaveBeenCalledTimes(1);

    // After unsubscribe, a second dispatch should NOT invoke cb
    unsubscribe();
    window.dispatchEvent(new Event(VIEW_TOGGLE_EVENT));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
