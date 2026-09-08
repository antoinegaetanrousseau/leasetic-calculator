// @vitest-environment node
// Plan 43-02 Task 2 — D-07 evidence test. Proves the ported Leasetic marks
// (leasetic-lockup.tsx, leasetic-icon.tsx) emit real vector content in the
// rendered PDF, rather than assuming @react-pdf/renderer's partial SVG
// support draws them correctly. See 43-CONTEXT.md D-07.
import { describe, it, expect, vi } from 'vitest';
import { inflateSync } from 'node:zlib';

vi.mock('server-only', () => ({}));

import { Document, Page, Svg, Ellipse, renderToBuffer } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { LeaseticLockup } from './leasetic-lockup';
import { LeaseticIcon } from './leasetic-icon';

/** Render an arbitrary react-pdf element tree (already wrapped in Document/Page) to a Buffer. */
async function renderTreeToBuffer(element: ReactElement): Promise<Buffer> {
  return renderToBuffer(element as never);
}

/**
 * Inflate every PDF content stream and return the concatenated latin1 text.
 * Mirrors `decompressPdfStreams` in `../no-commission.test.ts`.
 */
function decompressPdfStreams(buffer: Buffer): string {
  const str = buffer.toString('binary');
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const decoded: string[] = [];
  let match = streamRe.exec(str);
  while (match !== null) {
    const payload = Buffer.from(match[1], 'binary');
    try {
      decoded.push(inflateSync(payload).toString('latin1'));
    } catch {
      // Non-flate or non-text stream — skip.
    }
    match = streamRe.exec(str);
  }
  return decoded.join('\n---\n');
}

/**
 * Count Bézier curve operator tokens (` c`) in a decompressed content stream.
 * PDFKit emits each operator on its own whitespace-delimited token (e.g.
 * `84.04 0 84.04 0 84.04 0 c`), so a token-level match — rather than a raw
 * `\s c\b` substring search, which requires two whitespace characters and
 * never matches a single-space-separated operand run — is what correctly
 * counts curveto operators.
 */
function countBezierOperators(streamText: string): number {
  const tokens = streamText.split(/\s+/);
  return tokens.filter((token) => token === 'c').length;
}

/**
 * Extract every x-coordinate from moveto/lineto/curveto operand runs in a
 * decompressed content stream. PDFKit emits `<numbers...> m|l|c`; operands
 * are consumed as (x, y) pairs, so even-indexed numbers (0, 2, 4, ...) in
 * each run are x-coordinates.
 */
function extractXCoordinates(streamText: string): number[] {
  const runRe = /((?:-?\d+\.?\d*\s+)+)([mlc])\b/g;
  const xs: number[] = [];
  let match = runRe.exec(streamText);
  while (match !== null) {
    const nums = match[1].trim().split(/\s+/).map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      xs.push(nums[i]);
    }
    match = runRe.exec(streamText);
  }
  return xs;
}

describe('D-07 mark evidence', () => {
  it('1. renders vector content — the lockup emits at least 16 Bézier operators', async () => {
    const buffer = await renderTreeToBuffer(
      <Document>
        <Page size="A4">
          <LeaseticLockup height={19.5} />
        </Page>
      </Document>,
    );
    const streamText = decompressPdfStreams(buffer);
    const bezierCount = countBezierOperators(streamText);
    expect(bezierCount).toBeGreaterThanOrEqual(16);
  });

  it('2. the wide ellipses are actually wide — real x-extent reaches near 0 and 200', async () => {
    const buffer = await renderTreeToBuffer(
      <Document>
        <Page size="A4">
          <LeaseticIcon size={200} />
        </Page>
      </Document>,
    );
    const streamText = decompressPdfStreams(buffer);
    const xs = extractXCoordinates(streamText);
    expect(xs.length).toBeGreaterThan(0);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(190);
    expect(Math.min(...xs)).toBeLessThanOrEqual(10);
  });

  it('3. records the rotate-transform verdict (evidence, not a gate)', async () => {
    // Control tree: the same four ellipses authored the *source* way — narrow
    // rx/ry plus a rotate(-90 cx cy) transform — instead of the pre-swapped
    // form the shipped components use.
    const controlBuffer = await renderTreeToBuffer(
      <Document>
        <Page size="A4">
          <Svg viewBox="0 0 200 200" width={200} height={200}>
            <Ellipse cx={80} cy={50} rx={20} ry={50} fill="#01CC72" />
            <Ellipse cx={120} cy={150} rx={20} ry={50} fill="#01CC72" />
            <Ellipse cx={150} cy={80} rx={20} ry={50} transform="rotate(-90 150 80)" fill="#01CC72" />
            <Ellipse cx={50} cy={120} rx={20} ry={50} transform="rotate(-90 50 120)" fill="#01CC72" />
          </Svg>
        </Page>
      </Document>,
    );
    const shippedBuffer = await renderTreeToBuffer(
      <Document>
        <Page size="A4">
          <LeaseticIcon size={200} />
        </Page>
      </Document>,
    );

    expect(controlBuffer.byteLength).toBeGreaterThan(0);
    expect(shippedBuffer.byteLength).toBeGreaterThan(0);

    const controlStream = decompressPdfStreams(controlBuffer);
    const shippedStream = decompressPdfStreams(shippedBuffer);
    const controlXs = extractXCoordinates(controlStream);
    const controlMax = controlXs.length > 0 ? Math.max(...controlXs) : -Infinity;
    const controlHonoursRotation = controlMax >= 190;

    console.log(
      controlHonoursRotation
        ? '[D-07] react-pdf HONOURS rotate(-90 cx cy)'
        : '[D-07] react-pdf DROPS rotate(-90 cx cy) — pre-applied swap was required',
    );

    expect(controlStream.length).toBeGreaterThan(0);
    expect(shippedStream.length).toBeGreaterThan(0);
  });

  it('4. the footer opacity path renders — 14% opacity is not a no-op', async () => {
    const withOpacityBuffer = await renderTreeToBuffer(
      <Document>
        <Page size="A4">
          <LeaseticIcon size={13.5} opacity={0.14} />
        </Page>
      </Document>,
    );
    const withoutOpacityBuffer = await renderTreeToBuffer(
      <Document>
        <Page size="A4">
          <LeaseticIcon size={13.5} />
        </Page>
      </Document>,
    );

    const withOpacityStream = decompressPdfStreams(withOpacityBuffer);
    const withoutOpacityStream = decompressPdfStreams(withoutOpacityBuffer);

    expect(withOpacityStream).not.toBe(withoutOpacityStream);
  });
});
