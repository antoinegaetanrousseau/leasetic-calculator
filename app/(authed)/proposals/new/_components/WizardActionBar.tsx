'use client';

/**
 * WizardActionBar — shared action bar for all 3 wizard step routes.
 *
 * Renders a `.card` containing (left → right):
 *   [← Précédent text-link (omitted on step 1)] [Enregistrer comme brouillon ghost btn]
 *   [flex:1 spacer] [primary CTA — Link (steps 1/2) OR <button> (step 3 finalize)]
 *
 * Decisions referenced:
 *   - D-17: save-as-draft server action + sonner toast on success/error,
 *     server-side redirect — no router.push needed here.
 *   - D-18: same Enregistrer button on all 3 steps; step 3's save does NOT
 *     finalize (caller passes a non-finalizing onSaveDraft).
 *   - D-19: action-bar composition (Précédent omitted on step 1; primary
 *     CTA is Link for steps 1/2, button for step 3).
 *   - D-24: finalize spinner UX — when primary.kind==='action' &&
 *     isSubmitting===true, label morphs to spinnerLabel + Loader2 spins
 *     + aria-busy=true + disabled + filter:brightness(0.9).
 *
 * Locked in 13-UI-SPEC.md §5.1.
 */

import { useTransition } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, ChevronLeftIcon, LoaderIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export type WizardActionBarPrimary =
  | { kind: 'link'; href: string; label: string }
  | {
      kind: 'action';
      onClick: () => void;
      label: string;
      spinnerLabel: string;
      isSubmitting: boolean;
    };

export interface WizardActionBarProps {
  /** Step number — drives "← Précédent" visibility (omitted on step 1). */
  currentStep: 1 | 2 | 3;
  /** Draft id, threaded into hrefs for "← Précédent" navigation. */
  draftId: string;
  /**
   * Server-action handler for "Enregistrer comme brouillon".
   * Returning a promise lets useTransition keep the bar disabled until
   * the redirect resolves. Throwing surfaces a sonner error toast.
   */
  onSaveDraft: () => Promise<void> | void;
  /**
   * Primary CTA spec. Steps 1+2 use `kind:'link'`; step 3 uses
   * `kind:'action'` to thread the finalize submission + spinner state.
   */
  primary: WizardActionBarPrimary;
  /** Language for static strings. */
  lang: Lang;
}

export function WizardActionBar({
  currentStep,
  draftId,
  onSaveDraft,
  primary,
  lang,
}: WizardActionBarProps) {
  const [isSavePending, startSaveTransition] = useTransition();

  const isPrimaryActionSubmitting =
    primary.kind === 'action' && primary.isSubmitting;
  // Composite "any control busy" — disables siblings during save or finalize.
  const anyBusy = isSavePending || isPrimaryActionSubmitting;

  const handleSave = () => {
    startSaveTransition(async () => {
      try {
        await onSaveDraft();
        toast.success(t('wizard.toast.save.draft.success', lang));
        // D-17: server action handles the redirect to `/` itself. No
        // router.push here — keeps the action-bar a pure surface.
      } catch (e) {
        if (isRedirectError(e)) throw e;
        toast.error(t('wizard.toast.draft.error', lang));
      }
    });
  };

  // Précédent target: step 2 → parametres; step 3 → calcul.
  const prevSlug = currentStep === 2 ? 'parametres' : 'calcul';
  const prevHref = `/proposals/new/${prevSlug}?draft_id=${draftId}`;

  return (
    <section
      data-slot="wizard-footer"
      className="flex items-center gap-2 border-t border-border px-7 py-4"
    >
      {/* D-19: ← Précédent omitted entirely on step 1. */}
      {currentStep > 1 && (
        <Button
          variant="outline"
          render={
            <Link
              href={prevHref}
              aria-label={t('wizard.action.previous.aria', lang)}
              aria-disabled={anyBusy || undefined}
            />
          }
          // Saving in progress → suppress nav to avoid a race with the
          // server-side redirect from saveAsDraftAction.
          className={cn(anyBusy && 'pointer-events-none opacity-60')}
        >
          <ChevronLeftIcon size={16} data-icon="inline-start" aria-hidden="true" />
          {t('wizard.action.previous', lang)}
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        onClick={handleSave}
        disabled={anyBusy}
        aria-busy={isSavePending || undefined}
      >
        {t('wizard.action.save.draft', lang)}
      </Button>

      {/* Flex spacer — pushes the primary CTA to the right edge. */}
      <div className="flex-1" />

      {primary.kind === 'link' ? (
        <Button
          render={<Link href={primary.href} aria-disabled={anyBusy || undefined} />}
          className={cn(anyBusy && 'pointer-events-none opacity-60')}
        >
          {primary.label}
          <ArrowRightIcon size={16} data-icon="inline-end" aria-hidden="true" />
        </Button>
      ) : (
        // D-24: step-3 finalize CTA — when isSubmitting, label morphs to
        // spinnerLabel + the loader spins inline, button gets aria-busy and is
        // disabled. Other bar controls also disabled via `anyBusy`.
        <Button
          type="button"
          onClick={primary.onClick}
          disabled={primary.isSubmitting}
          aria-busy={primary.isSubmitting || undefined}
        >
          {primary.isSubmitting ? (
            <LoaderIcon
              size={16}
              aria-hidden="true"
              data-icon="inline-start"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          ) : null}
          {primary.isSubmitting ? primary.spinnerLabel : primary.label}
          {!primary.isSubmitting ? (
            <ArrowRightIcon size={16} data-icon="inline-end" aria-hidden="true" />
          ) : null}
        </Button>
      )}
    </section>
  );
}
