'use client';

/**
 * FinalizeButton — Plan 13-05 Task 1.
 *
 * Client adapter that wraps `<WizardActionBar currentStep={3} primary.kind='action'>`
 * and wires the `Confirmer & Générer le PDF` CTA to a POST against
 * /api/proposals/finalize (plan 13-02 owns the route handler + the 8-step
 * D-16 pipeline). Responsibilities here are strictly client-side:
 *
 *   1. Owns the `isSubmitting` state — surfaces it to WizardActionBar so the
 *      primary CTA shows the spinner morph (`Génération en cours…` per D-24).
 *   2. Fires the fetch POST with `{ draftId }`.
 *   3. On 200 → success toast + router.push to `/proposals/{newId}`.
 *      We intentionally DO NOT reset `isSubmitting` on success — the redirect
 *      will unmount this component; keeping the CTA disabled until the
 *      navigation completes prevents a double-click race.
 *   4. On non-OK / network error → error toast (5s duration per UI-SPEC §7.10)
 *      + reset `isSubmitting` so the partner can retry.
 *
 * ADMIN-09 D-12 boundary: this component NEVER reads, transforms, or echoes
 * the partner-only-visible parameter amount. The only payload it sends is
 * `{ draftId }`; the only payload it consumes is `{ id }` on success, OR one
 * of two bounded `safeCode`s that each drive their own dictionary-string
 * branch (Phase 42 D-05 / D-18 — see below), OR any other non-OK response
 * (still a bounded `safeCode`, but converted to the generic toast). The
 * commission visibility on step 3's `● CALCUL` recap card is owned by the
 * parent server component (page.tsx) — this client adapter is structurally
 * isolated from that surface.
 *
 * Threat model coverage (per PLAN.md `<threat_model>`):
 *   - T-13-05-T (cross-user draftId): the API route re-authenticates and
 *     re-runs getDraftById under session.user.id; cross-user → DraftNotFound
 *     → 500 + safeCode. Tests 6/7 cover the client-side error handling.
 *   - T-13-05-I-FailureLeak: response body never echoed; client renders
 *     bounded `wizard.toast.finalize.error` string. Phase 42 EXTENDS this
 *     boundary rather than regressing it: the component now calls
 *     `res.json()` on the failure path and branches on `body?.error`, but it
 *     only ever renders a dictionary string keyed by the bounded code — never
 *     `body.error` itself, and never any other field from the response body.
 *     The two new branches (`MissingPartnerTelephone` → dialog, D-18;
 *     `LegacyDraftIncomplete` → toast + redirect to step 1, D-05) are each a
 *     fixed, hardcoded copy lookup, not a template interpolating server data.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { t, type Lang } from '@/lib/i18n/dictionaries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { WizardActionBar } from '../_components/WizardActionBar';

export interface FinalizeButtonProps {
  /** Draft id, also embedded in the POST body. */
  draftId: string;
  /**
   * Bound server-action wrapper passed by the parent server component. Invoked
   * verbatim by WizardActionBar's `Enregistrer comme brouillon` ghost button
   * (D-17 — preserves the same save-as-draft contract as steps 1+2). The
   * arrow created in the parent captures the draft inputs from server scope.
   */
  onSaveDraft: () => Promise<void>;
  /** Language for static strings (CTA label, spinner label, toast strings). */
  lang: Lang;
}

export function FinalizeButton({
  draftId,
  onSaveDraft,
  lang,
}: FinalizeButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleFinalize = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/proposals/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      });
      if (!res.ok) {
        // Phase 42 D-05 / D-18 — parse the body defensively first. The
        // `.catch` matters: a non-JSON error response must not turn into an
        // unhandled rejection and lose the generic path below.
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        if (body?.error === 'MissingPartnerTelephone') {
          // D-18 chose a dialog precisely because the partner must act
          // elsewhere — a 5-second toast is the wrong affordance for an
          // instruction that requires leaving the page. No toast here.
          setDialogOpen(true);
          setIsSubmitting(false);
          return;
        }
        if (body?.error === 'LegacyDraftIncomplete') {
          // D-05 — a DIFFERENT failure from the one above: fixable inside
          // this proposal by returning to step 1, not by visiting
          // /parametres, so it deliberately does not reuse the dialog.
          toast.error(t('wizard.finalize.toast.legacyMissingSiret', lang));
          setIsSubmitting(false);
          router.push(`/proposals/new/parametres?draft_id=${draftId}`);
          return;
        }
        // Bounded error code from the route — never echo body to the partner.
        throw new Error(`finalize_failed_${res.status}`);
      }
      const data = (await res.json()) as { id?: string };
      if (!data || typeof data.id !== 'string' || data.id.length === 0) {
        // Defensive: response shape contract not honoured.
        throw new Error('finalize_failed_missing_id');
      }
      toast.success(t('wizard.toast.finalize.success', lang));
      // NOTE: intentionally NOT calling setIsSubmitting(false). The redirect
      // will unmount this component; keeping the CTA disabled prevents a
      // double-click race during the brief navigation window.
      router.push(`/proposals/${data.id}`);
    } catch {
      // D-24 / UI-SPEC §7.10: error toast persists 5s, CTA re-enables.
      toast.error(t('wizard.toast.finalize.error', lang), { duration: 5000 });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <WizardActionBar
        currentStep={3}
        draftId={draftId}
        onSaveDraft={onSaveDraft}
        lang={lang}
        primary={{
          kind: 'action',
          onClick: handleFinalize,
          label: t('wizard.action.step3.confirm', lang),
          spinnerLabel: t('wizard.action.step3.confirm.spinner', lang),
          isSubmitting,
        }}
      />
      {/* Phase 42 D-18 — the finalization profile-completeness dialog. Never
          AlertDialog: this blocks progress but is not a destructive
          confirmation (UIC-06). */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('wizard.finalize.dialog.missingPhone.title', lang)}</DialogTitle>
            <DialogDescription>
              {t('wizard.finalize.dialog.missingPhone.body', lang)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('wizard.finalize.dialog.missingPhone.dismiss', lang)}
            </Button>
            <Button render={<Link href="/parametres" />}>
              {t('wizard.finalize.dialog.missingPhone.cta', lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
