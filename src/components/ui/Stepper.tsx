/**
 * Stepper — 3-step horizontal progress indicator (COMP-01, UI-SPEC §6.2).
 *
 * Server component: state is fully derived from `currentStep` + `completedSteps` props.
 * No client boundary; Phase 13 wizard derives currentStep + completedSteps from URL
 * pathname server-side and passes as props.
 *
 * Step-state derivation (per UI-SPEC §6.2):
 *   completedSteps.includes(n) AND n !== currentStep → done   (Check icon, optionally <Link>)
 *   n === currentStep                                → active (numeric, no Link)
 *   else                                             → pending (numeric, outlined, no Link)
 *
 * Phase 11 ships in-component fallback labels (DEFAULT_LABELS_FR / EN). Phase 13 will
 * override via the `stepLabels` prop (no `proposals.wizard.stepN` i18n keys yet).
 */
import { Fragment, type CSSProperties } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { type Lang } from '@/lib/i18n/dictionaries';

type StepNumber = 1 | 2 | 3;
type StepState = 'active' | 'done' | 'pending';

export interface StepperProps {
  /** Which step is the "current" step (highlighted as active). */
  currentStep: StepNumber;
  /** Array of step numbers that have been completed (render with check, optionally clickable). */
  completedSteps: number[];
  /** i18n language — required even when stepLabels is provided (forward-compat). */
  lang: Lang;
  /** Optional override for step labels. Defaults: in-component DEFAULT_LABELS_{FR,EN}. */
  stepLabels?: [string, string, string];
  /** Optional href builder. If provided, completed steps wrap in <Link>. Otherwise non-interactive <span>. */
  hrefForStep?: (step: StepNumber) => string;
}

// Phase 11 hardcoded fallback labels — Phase 13 will provide via stepLabels prop.
const DEFAULT_LABELS_FR: [string, string, string] = ['Paramètres', 'Calcul', 'Vérification'];
const DEFAULT_LABELS_EN: [string, string, string] = ['Parameters', 'Calculation', 'Verification'];

function deriveState(n: StepNumber, currentStep: StepNumber, completedSteps: number[]): StepState {
  if (completedSteps.includes(n) && n !== currentStep) return 'done';
  if (n === currentStep) return 'active';
  return 'pending';
}

export function Stepper({ currentStep, completedSteps, lang, stepLabels, hrefForStep }: StepperProps) {
  const labels: [string, string, string] =
    stepLabels ?? (lang === 'fr' ? DEFAULT_LABELS_FR : DEFAULT_LABELS_EN);

  return (
    <ol
      role="list"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
        padding: '20px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        listStyle: 'none',
        margin: 0,
      }}
    >
      {([1, 2, 3] as const).map((n, idx) => {
        const state = deriveState(n, currentStep, completedSteps);
        const label = labels[n - 1];

        const circleClass =
          state === 'active'
            ? 'stepper-circle stepper-circle--active'
            : state === 'done'
              ? 'stepper-circle stepper-circle--done'
              : 'stepper-circle stepper-circle--pending';

        const circleStyle: CSSProperties = {
          width: 32,
          height: 32,
          borderRadius: 9999,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          background: state === 'pending' ? 'var(--paper)' : 'var(--gd)',
          border: state === 'pending' ? '2px solid var(--border)' : 'none',
          color: state === 'pending' ? 'var(--muted)' : '#ffffff',
        };

        const labelStyle: CSSProperties = {
          fontSize: '14.5px',
          lineHeight: 1.55,
          fontFamily: 'var(--font-sans)',
          color: state === 'pending' ? 'var(--muted)' : 'var(--ink)',
          fontWeight: state === 'pending' ? 500 : 600,
        };

        const circle = (
          <span className={circleClass} style={circleStyle}>
            {state === 'done' ? (
              <Check size={16} strokeWidth={2.5} aria-hidden="true" />
            ) : (
              String(n)
            )}
          </span>
        );

        // Done step wrapped in Link only when hrefForStep provided.
        const inner =
          state === 'done' && hrefForStep ? (
            <Link
              href={hrefForStep(n)}
              aria-label={label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              {circle}
              <span style={labelStyle}>{label}</span>
            </Link>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {circle}
              <span style={labelStyle}>{label}</span>
            </span>
          );

        const liAria: { 'aria-current'?: 'step'; 'aria-disabled'?: 'true' } = {};
        if (state === 'active') liAria['aria-current'] = 'step';
        if (state === 'pending') liAria['aria-disabled'] = 'true';

        return (
          <Fragment key={n}>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }} {...liAria}>
              {inner}
            </li>
            {idx < 2 && (
              <span
                aria-hidden="true"
                style={{ flex: 1, height: 2, background: 'var(--border)' }}
              />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
