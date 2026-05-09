'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface DeleteJustToastProps { lang: Lang; }

/**
 * Mounts on the home page; reads ?deleted_just=1, fires the discoverable
 * delete-success toast (with the "Voir" action button → /?deleted=1), then
 * strips the flag from the URL.
 *
 * D-8-09: keeps the URL clean post-toast; the action button remains the
 * only visual entry point to the Recently Deleted view from this flow.
 *
 * The `fired` ref prevents double-toast on React Strict Mode double-invoke.
 */
export function DeleteJustToast({ lang }: DeleteJustToastProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (searchParams.get('deleted_just') !== '1') return;

    fired.current = true;
    toast.success(t('proposal.toast.delete.success', lang), {
      action: {
        label: t('proposal.toast.delete.action.view.deleted', lang),
        onClick: () => router.push('/?deleted=1'),
      },
      duration: 6000,
    });
    // strip the flag from URL
    const next = new URLSearchParams(Array.from(searchParams.entries()));
    next.delete('deleted_just');
    const qs = next.toString();
    router.replace(qs.length > 0 ? `?${qs}` : '?', { scroll: false });
  }, [searchParams, router, lang]);

  return null;
}
