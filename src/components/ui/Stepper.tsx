/**
 * Stepper — 3-step horizontal progress indicator (COMP-01, UI-SPEC §6.2),
 * restyled on ReUI's `wizard-1` block nav at the Phase 33 acceptance
 * checkpoint: 24px indicators (completed = filled primary with a check,
 * active = primary tint with a slowly spinning dashed ring, pending = muted
 * with a border), a small title, and hairline connectors that turn primary
 * once the step before them is done.
 *
 * It stays a server component with the same `<ol role="list">` / `<li>`
 * contract: the wizard's state is the URL, so the ReUI Stepper primitive's
 * client state machine is not needed — pages derive `currentStep` and
 * `completedSteps` server-side and pass them as props.
 *
 * Step-state derivation (per UI-SPEC §6.2):
 *   completedSteps.includes(n) AND n !== currentStep → done   (Check icon, optionally <Link>)
 *   n === currentStep                                → active (numeric, no Link)
 *   else                                             → pending (numeric, outlined, no Link)
 */
import { Fragment } from 'react';
import Link from 'next/link';
import { CheckIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
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

const DEFAULT_LABELS_FR: [string, string, string] = ['Paramètres', 'Calcul', 'Vérification'];
const DEFAULT_LABELS_EN: [string, string, string] = ['Parameters', 'Calculation', 'Verification'];

function deriveState(n: StepNumber, currentStep: StepNumber, completedSteps: number[]): StepState {
  if (completedSteps.includes(n) && n !== currentStep) return 'done';
  if (n === currentStep) return 'active';
  return 'pending';
}

const INDICATOR_BASE =
  'relative isolate flex size-6 shrink-0 items-center justify-center overflow-visible rounded-full text-xs font-medium';

const INDICATOR_BY_STATE: Record<StepState, string> = {
  done: 'bg-primary text-primary-foreground',
  active:
    "bg-primary/10 text-primary before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-full before:border before:border-dashed before:border-primary before:content-[''] before:animate-[spin_8s_linear_infinite] motion-reduce:before:animate-none",
  pending: 'border border-border bg-muted text-foreground',
};

export function Stepper({ currentStep, completedSteps, lang, stepLabels, hrefForStep }: StepperProps) {
  const labels: [string, string, string] =
    stepLabels ?? (lang === 'fr' ? DEFAULT_LABELS_FR : DEFAULT_LABELS_EN);

  return (
    <ol role="list" aria-label="Wizard progress" className="m-0 flex w-full list-none items-center gap-2 p-0">
      {([1, 2, 3] as const).map((n, idx) => {
        const state = deriveState(n, currentStep, completedSteps);
        const label = labels[n - 1];

        const circle = (
          <span
            data-slot="stepper-indicator"
            data-state={state}
            className={cn(INDICATOR_BASE, INDICATOR_BY_STATE[state])}
          >
            {state === 'done' ? <CheckIcon size={14} aria-hidden="true" /> : String(n)}
          </span>
        );

        const title = (
          <span
            data-slot="stepper-title"
            className={cn('text-sm', state === 'active' ? 'font-medium text-foreground' : 'text-foreground')}
          >
            {label}
          </span>
        );

        const inner =
          state === 'done' && hrefForStep ? (
            <Link
              href={hrefForStep(n)}
              aria-label={label}
              className="inline-flex items-center gap-1.5 text-inherit no-underline hover:text-primary"
            >
              {circle}
              {title}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              {circle}
              {title}
            </span>
          );

        const liAria: { 'aria-current'?: 'step'; 'aria-disabled'?: 'true' } = {};
        if (state === 'active') liAria['aria-current'] = 'step';
        if (state === 'pending') liAria['aria-disabled'] = 'true';

        return (
          <Fragment key={n}>
            <li data-slot="stepper-item" data-state={state} className="flex shrink-0 items-center" {...liAria}>
              {inner}
            </li>
            {idx < 2 && (
              <span
                aria-hidden="true"
                data-slot="stepper-separator"
                className={cn('mx-2.5 h-px flex-1', state === 'done' ? 'bg-primary' : 'bg-border')}
              />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
