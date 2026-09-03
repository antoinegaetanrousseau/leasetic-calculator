/**
 * Phase 34 Plan 12 Task 1 — ClientTabs tests (FICHE-05, D-17).
 *
 * The rail is a navigation, not a widget: four links, an active one derived
 * from a prop the page read out of `searchParams`, and no client state at all.
 * That is what makes a refresh keep position (D-17) and what lets each tab
 * fetch server-side.
 *
 * Coverage (per <behavior>):
 *   1. Exactly four tabs, labelled from `clients.detail.tab.*`.
 *   2. Hrefs: the DEFAULT tab drops the param entirely, so `/clients/x` and
 *      `/clients/x?tab=informations` are the same URL; the other three carry
 *      `?tab={key}`.
 *   3. The active tab is marked with `aria-current="page"` from the prop.
 *   4. Each tab carries `data-testid="client-tab-{key}"`.
 *   5. Source-level: the file is a server component — no client directive, no
 *      `useState`, no `useSearchParams`.
 *   6. `validateTab` is an enum allowlist that falls back to the default for
 *      anything unrecognised, and never throws.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  CLIENT_TABS,
  ClientTabs,
  DEFAULT_CLIENT_TAB,
  VALID_TABS,
  validateTab,
} from './ClientTabs';
import { t } from '@/lib/i18n/dictionaries';

const REL_ID = '11111111-1111-4111-8111-111111111111';

afterEach(() => {
  cleanup();
});

describe('ClientTabs — the four-tab rail (D-17)', () => {
  it('Test 1: renders exactly four tabs, labelled from clients.detail.tab.*', () => {
    render(<ClientTabs relationshipId={REL_ID} currentTab="informations" lang="fr" />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);

    expect(screen.getByText(t('clients.detail.tab.informations', 'fr'))).toBeTruthy();
    expect(screen.getByText(t('clients.detail.tab.contacts', 'fr'))).toBeTruthy();
    expect(screen.getByText(t('clients.detail.tab.proposals', 'fr'))).toBeTruthy();
    expect(screen.getByText(t('clients.detail.tab.activity', 'fr'))).toBeTruthy();
  });

  it('Test 2: the default tab drops the param; the other three carry ?tab={key}', () => {
    render(<ClientTabs relationshipId={REL_ID} currentTab="informations" lang="fr" />);

    expect(screen.getByTestId('client-tab-informations').getAttribute('href')).toBe(
      `/clients/${REL_ID}`,
    );
    expect(screen.getByTestId('client-tab-contacts').getAttribute('href')).toBe(
      `/clients/${REL_ID}?tab=contacts`,
    );
    expect(screen.getByTestId('client-tab-proposals').getAttribute('href')).toBe(
      `/clients/${REL_ID}?tab=proposals`,
    );
    expect(screen.getByTestId('client-tab-activity').getAttribute('href')).toBe(
      `/clients/${REL_ID}?tab=activity`,
    );
  });

  it('Test 3: the active tab is marked aria-current="page" from the prop, not from client state', () => {
    render(<ClientTabs relationshipId={REL_ID} currentTab="proposals" lang="fr" />);

    expect(screen.getByTestId('client-tab-proposals').getAttribute('aria-current')).toBe('page');
    for (const key of ['informations', 'contacts', 'activity'] as const) {
      expect(screen.getByTestId(`client-tab-${key}`).getAttribute('aria-current')).toBeNull();
    }
  });

  it('Test 4: every tab carries data-testid="client-tab-{key}"', () => {
    render(<ClientTabs relationshipId={REL_ID} currentTab="activity" lang="fr" />);
    for (const key of CLIENT_TABS) {
      expect(screen.getByTestId(`client-tab-${key}`)).toBeTruthy();
    }
  });

  it('Test 4b: labels follow the requested language', () => {
    render(<ClientTabs relationshipId={REL_ID} currentTab="informations" lang="en" />);
    expect(screen.getByText(t('clients.detail.tab.proposals', 'en'))).toBeTruthy();
  });

  it('Test 5 (source): a server component — no client directive, no useState, no useSearchParams', () => {
    const source = readFileSync('app/(authed)/clients/[id]/ClientTabs.tsx', 'utf-8');
    expect(source).not.toContain('use client');
    expect(source).not.toContain('useState');
    expect(source).not.toContain('useSearchParams');
  });
});

describe('validateTab — the enum allowlist (T-34-12-03)', () => {
  it('Test 6: every allowlisted value round-trips', () => {
    for (const key of CLIENT_TABS) {
      expect(validateTab(key)).toBe(key);
    }
    expect(VALID_TABS.size).toBe(4);
  });

  it('Test 6b: anything unrecognised falls back to the default, and never throws', () => {
    for (const raw of [
      undefined,
      '',
      'nonsense',
      'Informations',
      'informations ',
      '../admin',
      '__proto__',
      'proposals;drop',
    ]) {
      expect(validateTab(raw)).toBe(DEFAULT_CLIENT_TAB);
    }
    expect(DEFAULT_CLIENT_TAB).toBe('informations');
  });
});
