import { getCurrentLang } from '@/lib/i18n';
import { NotFoundCard } from '@/components/ui/NotFoundCard';

/**
 * 404 boundary for the admin tree — rendered INSIDE the Shell.
 *
 * Applies to notFound() raised by a PAGE within the admin segment once the
 * layout's two gates have already passed — i.e. a legitimate admin hitting a
 * bad id, such as the T-30-08-04 company/relationship id-pair mismatch on
 * /[adminSegment]/companies/[id]/relations/[relationshipId].
 *
 * It deliberately does NOT catch the layout's own gates. app/(admin)/
 * [adminSegment]/layout.tsx calls notFound() for a segment mismatch and for a
 * non-admin role; a layout that throws cannot render its own children boundary,
 * so those still fall through to the chromeless root app/not-found.tsx — which
 * is correct, since someone who should not know this tree exists must not be
 * shown the admin shell around the 404 (D-18 / AUTH-14).
 */
export const dynamic = 'force-dynamic';

export default async function AdminNotFound() {
  const lang = await getCurrentLang();

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <NotFoundCard lang={lang} />
    </div>
  );
}
