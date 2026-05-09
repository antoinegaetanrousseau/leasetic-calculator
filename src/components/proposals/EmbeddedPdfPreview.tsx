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
    <div>
      <div className="pdf-embed-wrap" title={t('proposal.detail.pdf.preview.title', lang)}>
        <embed
          src={src}
          type="application/pdf"
          aria-label={t('proposal.detail.pdf.preview.aria', lang)}
        />
      </div>
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--muted)' }}
        >
          {t('proposal.detail.pdf.fallback.link', lang)}
        </a>
      </div>
    </div>
  );
}
