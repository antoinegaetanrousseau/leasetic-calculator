import { getCurrentLang } from '@/lib/i18n';
import { NotFoundCard } from '@/components/ui/NotFoundCard';

/**
 * 404 boundary for the (authed) tree — rendered INSIDE the Shell.
 *
 * Next.js renders the nearest not-found boundary within the surrounding layout.
 * app/(authed)/layout.tsx does not gate the whole tree away (requireUser()
 * redirects rather than throwing), so every notFound() raised from a page in
 * this group renders here, inside the sidebar shell.
 *
 * That makes the root app/not-found.tsx wrong for this context: it is a
 * standalone full-viewport page carrying its own wordmark and its own
 * locale/theme toggles, which duplicated the controls the Shell already shows in
 * its settings popover. This boundary renders the card alone.
 *
 * Reached by, among others:
 *  - requireRelationshipHolder() refusing an admin on the /clients tree
 *  - the D-18 URL-secrecy 404 when a partner opens another owner's
 *    /clients/[id] (indistinguishable from a nonexistent id, by design)
 *
 * No theme prop is read here — the Shell owns the theme control on this surface.
 */
export const dynamic = 'force-dynamic';

export default async function AuthedNotFound() {
  const lang = await getCurrentLang();

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <NotFoundCard lang={lang} />
    </div>
  );
}
