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
  /**
   * Raw SHA-256 of the exact bytes in `buffer`. Stored as `pdf_sha256` in the
   * proposals row (DATA-09) to verify the stored blob was not tampered with.
   * NOT byte-deterministic across renders due to React Fiber scheduler ordering
   * the PDF objects differently on each call — use `contentHash` for regression
   * detection (PROP-17).
   */
  sha256: string;
  /**
   * Deterministic content hash (PROP-17).
   *
   * Computed by sorting all zlib-compressed PDF stream hashes alphabetically,
   * then SHA-256-ing the sorted list. This is invariant to the React Fiber
   * scheduler's non-deterministic PDF object ordering while remaining sensitive
   * to any change in rendered content (text, layout, fonts, colors).
   *
   * Used by Plan 08-06 CI gate: `__pdf-fixtures__/expected.sha256.txt` stores
   * `contentHash` values, not raw `sha256` values.
   */
  contentHash: string;
  sizeBytes: number;
}

/**
 * Compute a deterministic content hash from raw PDF bytes (PROP-17).
 *
 * @react-pdf/renderer@4.5.1 uses the React Fiber scheduler (performance.now()
 * timer) to batch rendering work, causing PDF objects to be written in
 * different orders on each call — even with identical inputs. The raw sha256
 * therefore varies per-render.
 *
 * This function normalizes the variance by extracting all compressed stream
 * payloads (font subsets + page content), sorting their hashes, and hashing
 * the sorted list. The result is identical whether object 25 comes before or
 * after object 32.
 */
function computeContentHash(buffer: Buffer): string {
  const str = buffer.toString('binary');
  const streamHashes: string[] = [];
  // Match all `stream\r?\n ... \r?\nendstream` blocks (raw compressed bytes)
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match = streamRe.exec(str);
  while (match !== null) {
    const payload = Buffer.from(match[1], 'binary');
    streamHashes.push(createHash('sha256').update(payload).digest('hex'));
    match = streamRe.exec(str);
  }
  streamHashes.sort();
  return createHash('sha256').update(streamHashes.join('\n')).digest('hex');
}

/**
 * Server-side single-call PDF render. Returns the bytes + their sha256 +
 * content hash + size so the route handler (Plan 08-07) can store all values
 * on the proposals row.
 *
 * Determinism (PROP-17): given byte-identical args, `contentHash` is stable
 * across renders (order-normalized). `sha256` is the raw hash of the exact
 * bytes in `buffer` (used for blob integrity verification, DATA-09).
 *
 * Plan 08-06 verifies `contentHash` via a fixture proposal and a committed
 * expected hash file.
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
  const contentHash = computeContentHash(buffer);
  return { buffer, sha256, contentHash, sizeBytes: buffer.byteLength };
}
