'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface DuplicatePrefillToastProps {
  lang: Lang;
}

/**
 * PROP-21: Mounts on /proposals/new?duplicate=<id>. On first client render:
 *   1. Fires a sonner.info toast: "Fields pre-filled from source proposal."
 *   2. Strips the ?duplicate= flag from the URL via router.replace
 *      (so a refresh doesn't re-fire the toast + gives a cleaner URL).
 *
 * Note: duplicate prefill is server-side (D-25), not a client POST-body
 * field. app/(authed)/proposals/new/parametres/page.tsx reads ?duplicate=
 * on the server and spreads the same-user source proposal's `inputs` into
 * the new draft when it is minted, before this component ever mounts.
 *
 * The `fired` ref prevents the toast from re-firing on React Strict Mode's
 * double-invoke and on searchParams identity changes (T-08-13-04).
 */
export function DuplicatePrefillToast({ lang }: DuplicatePrefillToastProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (searchParams.get('duplicate')) {
      toast.info(t('proposal.toast.duplicate.prefilled', lang));
      fired.current = true;
      // Strip ?duplicate= from the URL after first read.
      const next = new URLSearchParams(Array.from(searchParams.entries()));
      next.delete('duplicate');
      const qs = next.toString();
      router.replace(qs.length > 0 ? `?${qs}` : '?', { scroll: false });
    }
  }, [searchParams, router, lang]);

  return null;
}
