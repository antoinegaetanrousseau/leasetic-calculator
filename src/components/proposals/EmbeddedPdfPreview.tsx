import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface EmbeddedPdfPreviewProps {
  proposalId: string;
  lang: Lang;
}

/**
 * D-8-10: native <embed> wrapper. Smallest API for inline PDF in Chrome+Edge.
 *
 * The stream source is /api/proposals/{id}/pdf (Plan 08-08) — same-origin,
 * auth-gated via the session cookie the browser sends automatically.
 *
 * Fallback: if <embed> can't render PDFs (some Firefox configurations, or
 * non-PDF-capable embedded contexts), the <a> below the embed provides a
 * "open in new tab" escape hatch. Rendered as a sibling so it is always
 * visible below the embed area in browsers that hide the embed entirely.
 *
 * Server-renderable (no 'use client') — the route handler /api/proposals/{id}/pdf
 * is the source of bytes; the browser fetches them directly on mount.
 */
export function EmbeddedPdfPreview({ proposalId, lang }: EmbeddedPdfPreviewProps) {
  const src = `/api/proposals/${proposalId}/pdf`;
  return (
    // Phase 2: `.pdf-embed-wrap` and the two inline styles ported to
    // utilities. The 480px height and 12px radius are preserved verbatim —
    // see ./segmented for why the radius is not moved onto the large scale.
    <div>
      <div
        className="h-[480px] w-full overflow-hidden rounded-[12px] border border-border bg-paper"
        title={t('proposal.detail.pdf.preview.title', lang)}
      >
        <embed
          src={src}
          type="application/pdf"
          aria-label={t('proposal.detail.pdf.preview.aria', lang)}
          className="h-full w-full border-0"
        />
      </div>
      <div className="mt-2 text-center">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--muted)]"
        >
          {t('proposal.detail.pdf.fallback.link', lang)}
        </a>
      </div>
    </div>
  );
}
