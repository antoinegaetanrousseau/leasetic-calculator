'use client';

import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  subscribeView,
  getViewSnapshot,
  getServerViewSnapshot,
  setView,
  type ViewMode,
} from '@/lib/view-store';
import { t, type Lang } from '@/lib/i18n/dictionaries';

interface ViewToggleProps {
  lang: Lang;
  adminHrefs: { home: string };
  /** When true, render the full segmented control (expanded sidebar). */
  fullWidth?: boolean;
  /** When true, render the collapsed pill (cycles on click). */
  collapsed?: boolean;
}

/**
 * ViewToggle — Admin-only segmented Admin | Agent control (expanded) or
 * single cycling pill (collapsed).
 *
 * Caller is responsible for gating render on isAdmin (C-03). This component
 * assumes it is only rendered for admins.
 *
 * Reads view mode from sessionStorage via useSyncExternalStore (C-01 — survives
 * sidebar remount across route-group boundaries). On switch: setView writes
 * sessionStorage + dispatches VIEW_TOGGLE_EVENT, then router.push redirects to
 * the new view's home (D-01).
 */
export function ViewToggle({
  lang,
  adminHrefs,
  fullWidth: _fullWidth = false,
  collapsed = false,
}: ViewToggleProps) {
  const currentView = useSyncExternalStore(
    subscribeView,
    getViewSnapshot,
    getServerViewSnapshot,
  );
  const router = useRouter();

  /**
   * Switch to mode: write flag + redirect per D-01.
   * Agent home: '/'; Admin home: adminHrefs.home.
   */
  function goto(mode: ViewMode) {
    setView(mode);
    router.push(mode === 'agent' ? '/' : adminHrefs.home);
  }

  // Collapsed branch: single cycling pill (matches collapsed LocaleToggle/ThemeToggle geometry).
  if (collapsed) {
    // WR-04: surface the CURRENT view to assistive tech (a11y parity with the
    // expanded radiogroup, which exposes aria-checked). The collapsed pill cycles
    // on click, so we announce the active view in aria-label and reflect it via
    // aria-pressed (pressed === currently in Admin view). Without this a screen
    // reader user only hears the generic "Switch view" label with no A/G state.
    const currentLabel = t(
      currentView === 'admin' ? 'sidebar.view.admin' : 'sidebar.view.agent',
      lang,
    );
    return (
      <button
        type="button"
        onClick={() => goto(currentView === 'admin' ? 'agent' : 'admin')}
        aria-label={`${t('sidebar.view.cycle', lang)} (${currentLabel})`}
        aria-pressed={currentView === 'admin'}
        title={currentLabel}
        style={{
          width: 36,
          height: 28,
          borderRadius: 9999,
          background: 'var(--paper)',
          border: '1px solid var(--border)',
          color: 'var(--ink)',
          fontSize: '11.5px',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        {currentView === 'admin' ? 'A' : 'G'}
      </button>
    );
  }

  // Expanded branch: radiogroup segmented control.
  const options: { mode: ViewMode; labelKey: Parameters<typeof t>[0] }[] = [
    { mode: 'admin', labelKey: 'sidebar.view.admin' },
    { mode: 'agent', labelKey: 'sidebar.view.agent' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t('sidebar.view.aria', lang)}
      className="flex items-center rounded-full border p-1"
      style={{
        background: 'var(--paper)',
        borderColor: 'var(--border)',
        width: '100%',
      }}
    >
      {options.map(({ mode, labelKey }) => {
        const active = currentView === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => goto(mode)}
            onKeyDown={(e) => {
              // Standard radiogroup keyboard navigation (UI-SPEC interaction contract).
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const next: ViewMode = mode === 'admin' ? 'agent' : 'admin';
                goto(next);
              }
            }}
            onMouseEnter={(e) => {
              // Hover: unselected segment only — selected retains tint (UI-SPEC hover rule).
              if (!active) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'var(--hover-overlay)';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }
            }}
            className="rounded-full px-3 py-2 uppercase transition-colors"
            style={{
              background: active ? 'rgba(18, 150, 87, 0.10)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--muted)',
              fontWeight: 600,
              fontSize: '11.5px',
              letterSpacing: '0.04em',
              flex: 1,
              textAlign: 'center',
            }}
          >
            {t(labelKey, lang)}
          </button>
        );
      })}
    </div>
  );
}
