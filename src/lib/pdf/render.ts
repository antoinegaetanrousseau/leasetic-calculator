import 'server-only';
import { createHash } from 'node:crypto';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import React, { type ReactElement } from 'react';
import { ProposalDocument, type ProposalDocumentProps } from './document';

export interface RenderProposalPdfArgs {
  /** Same shape as ProposalDocumentProps['data']; consumer constructs from
   *  the freshly-INSERTed proposal row (Plan 08-07 step 5). */
  data: ProposalDocumentProps['data'];
}

export interface RenderProposalPdfResult {
  buffer: Buffer;
  /** Lowercase hex sha256 of the buffer contents. DATA-09 + PROP-17. */
  sha256: string;
  sizeBytes: number;
}

/**
 * Server-side single-call PDF render. Returns the bytes + their sha256 + size
 * so the route handler (Plan 08-07) can store all three on the proposals row.
 *
 * Determinism (PROP-17): given byte-identical args, this returns byte-identical
 * output. Plan 08-06 verifies via a fixture proposal and a committed expected
 * hash file.
 *
 * Throws on any @react-pdf/renderer failure; Plan 08-07's D-B1 fail-loud
 * handler catches and rolls back the row.
 *
 * Import path: renderToBuffer lives at the top-level export in
 * @react-pdf/renderer >= 3.x (confirmed for 4.5.1).
 */
export async function renderProposalPdf(
  args: RenderProposalPdfArgs,
): Promise<RenderProposalPdfResult> {
  // Cast required: ProposalDocument's props type is ProposalDocumentProps (wrapping data),
  // but renderToBuffer expects ReactElement<DocumentProps>. The component internally renders
  // a <Document> — the cast is safe because @react-pdf/renderer only reads the DOM output.
  const element = React.createElement(
    ProposalDocument,
    { data: args.data },
  ) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  return { buffer, sha256, sizeBytes: buffer.byteLength };
}
