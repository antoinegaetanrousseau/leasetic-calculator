'use client';

/**
 * Phase 34 Plan 10 Task 3 — RegistryRefreshButton (FICHE-02, D-24).
 *
 * A BUTTON, NOT A DIALOG. `refreshCompanyRegistryAction` takes no user input —
 * the SIREN is already on the company row — so there is nothing to type and
 * nothing to confirm. It belongs to the read-only identity panel, beside the
 * sync timestamp, and not to `EditCompanyDialog`: it edits nothing a partner
 * wrote.
 *
 * IT CONSUMES A RETURNED DISCRIMINATED RESULT. That is the whole design of this
 * file. Next.js replaces a Server Function's thrown text with a generic string
 * plus a digest in a production build, so a sentinel matched on the caught
 * rejection would work under `npm run dev` and silently degrade once deployed —
 * the exact defect 33-REVIEW CR-01 recorded. A returned value crosses the
 * serialisation boundary intact, so the four outcomes below stay distinguishable
 * where it matters. Never reintroduce a comparison against a rejection's message
 * property; `tests/server-action-error-contracts.test.ts` fails the build on it.
 *
 * The four outcomes and the copy each earns:
 *
 *   { ok: true }              → success toast + router.refresh(); the panel above
 *                               this control just changed.
 *   { ok: false, not_found }  → a SETTLED answer. This SIREN is not in the
 *                               registry, or the registry disagrees about which
 *                               company it is (D-05). Clicking again cannot
 *                               help; correcting the SIREN can. Deliberately NO
 *                               refresh — nothing changed, and re-fetching would
 *                               imply something had.
 *   { ok: false, unavailable }→ RETRYABLE: timeout or upstream failure. This
 *                               control is the retry.
 *   { ok: false, no_siren }   → A DEFENCE, NOT A NORMAL PATH. The identity panel
 *                               does not render this control for a company with
 *                               no SIREN, and this component takes no `siren`
 *                               prop to second-guess that with. If the branch is
 *                               ever reached, the parent has a bug; the partner
 *                               gets the same retryable copy rather than a
 *                               dead end.
 *   thrown                    → one bounded toast in the catch, and nothing else.
 *
 * Only the relationship id leaves this component; the result carries a reason
 * string and no company data, so no toast interpolates anything (D-07).
 */
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { refreshCompanyRegistryAction } from '@/lib/crm/actions';

export interface RegistryRefreshButtonProps {
  relationshipId: string;
  lang: Lang;
}

export function RegistryRefreshButton({ relationshipId, lang }: RegistryRefreshButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // A ref as well as the state flag: `disabled` and `pending` both settle on a
  // React render, and a second click dispatched in the SAME tick would read the
  // stale value. One click must never become two outbound registry calls.
  const inFlight = useRef(false);

  const onClick = async () => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPending(true);

    try {
      const result = await refreshCompanyRegistryAction({ relationshipId });

      if (!result.ok) {
        toast.error(
          result.reason === 'not_found'
            ? t('clients.registry.toast.notFound', lang)
            : t('clients.registry.toast.error', lang),
        );
        return;
      }

      toast.success(t('clients.registry.toast.synced', lang));
      router.refresh();
    } catch {
      // Bounded and blind — the rejection itself is never inspected.
      toast.error(t('clients.toast.error', lang));
    } finally {
      // Every branch re-enables the control, including the rejection: this is
      // the only retry the UI offers, and a stuck flag would lock it away.
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onClick}>
      {pending ? t('clients.registry.refreshing', lang) : t('clients.registry.refresh', lang)}
    </Button>
  );
}
