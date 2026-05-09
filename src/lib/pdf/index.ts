/**
 * @/lib/pdf — public API barrel.
 *
 * Consumers (Plan 08-07 server route, Plan 08-06 byte-determinism fixture)
 * import from '@/lib/pdf' — never from individual sibling files. Mirrors
 * the @/lib/calc and @/lib/db/queries discipline.
 */
export { renderProposalPdf } from './render';
export type { RenderProposalPdfArgs, RenderProposalPdfResult } from './render';

// ProposalDocument is re-exported so Plan 08-06's fixture script can render
// the same component directly for the byte-determinism gate.
export { ProposalDocument } from './document';
export type { ProposalDocumentProps } from './document';
