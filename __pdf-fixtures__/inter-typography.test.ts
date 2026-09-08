// @vitest-environment node
// jsdom polyfills (URL, Blob, crypto) shift @react-pdf/renderer output bytes,
// breaking any SHA-256/byte-level gate. Pin this file to node, same reason as
// render-fixtures.test.ts and commission-free-fixture.test.ts.
/**
 * Plan 41-03 Task 1 — Inter typography swap proof (D-09 glyph coverage + D-10
 * distinct embedded faces).
 *
 * D-09: renders the FR and EN happy-path fixtures, reconstructs the actually
 * visible text from the rendered PDF bytes (ToUnicode CMap + TJ/Tj operators
 * — never a hand-listed inventory, per CONTEXT.md), and asserts every derived
 * codepoint resolves in all four registered Inter faces via fontkit.
 *
 * D-10: parses the rendered PDF's embedded /FontDescriptor + /FontFile2
 * objects and asserts exactly four DISTINCT decompressed stream hashes — the
 * only guard against a collapsed variable-font registration silently
 * rendering every weight identically (valid, gate-green, subtly flat).
 *
 * See 41-RESEARCH.md Pattern 2 (extractEmbeddedFontFaces, empirically
 * verified against a real render) and Pattern 3 (glyph inventory derivation).
 */
import { describe, it, expect, vi } from 'vitest';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import * as fontkit from 'fontkit';

vi.mock('server-only', () => ({}));

import { renderProposalPdf } from '@/lib/pdf';
import { pdfFixtures } from './fixtures';

const FR_FIXTURE = pdfFixtures.find((f) => f.name === 'happy-path-fr')!;
const EN_FIXTURE = pdfFixtures.find((f) => f.name === 'happy-path-en')!;

const FONT_DIR = join(process.cwd(), 'public', 'fonts');
const INTER_WEIGHTS = [400, 500, 600, 700] as const;
const EXPECTED_POSTSCRIPT_NAMES: Record<(typeof INTER_WEIGHTS)[number], string> = {
  400: 'Inter-Regular',
  500: 'Inter-Medium',
  600: 'Inter-SemiBold',
  700: 'Inter-Bold',
};

// High-risk codepoints that MUST survive the reconstruction — if any of these
// is absent, the inventory-derivation pipeline is broken, not the font.
//
// Deviation from 41-03-PLAN.md's literal list (Rule 1 — auto-fix bug): the plan's
// required set also named U+00E0 (à). Empirically deriving the inventory from the
// real rendered happy-path-fr/happy-path-en fixtures (the only fixtures this task
// is permitted to use) shows à never appears — no `pdf.*`/`proposal.*` dictionary
// string or document.tsx literal consumed by these two fixtures contains it (verified
// by grep against src/lib/i18n/dictionaries.ts). É/Ê/è/é (the rest of the accented-vowel
// group) DO appear and are asserted below. 41-RESEARCH.md's Priority 3 already proved
// Inter has a glyph for à via a direct fontkit probe (font-capability, not
// render-content) — so this is a fixture-content gap, not a font-coverage gap, and is
// out of scope to fix here (fixture data is frozen per PROP-17; inventing new fixture
// content is explicitly forbidden by this task).
const REQUIRED_CODEPOINTS: Array<{ cp: number; label: string }> = [
  { cp: 0x202f, label: 'U+202F NARROW NO-BREAK SPACE' },
  { cp: 0x20ac, label: 'U+20AC EURO SIGN' },
  { cp: 0x2019, label: 'U+2019 RIGHT SINGLE QUOTATION MARK' },
  { cp: 0x00b0, label: 'U+00B0 DEGREE SIGN' },
  { cp: 0x00c9, label: 'U+00C9 LATIN CAPITAL LETTER E WITH ACUTE' },
  { cp: 0x00ca, label: 'U+00CA LATIN CAPITAL LETTER E WITH CIRCUMFLEX' },
  { cp: 0x00e9, label: 'U+00E9 LATIN SMALL LETTER E WITH ACUTE' },
  { cp: 0x00e8, label: 'U+00E8 LATIN SMALL LETTER E WITH GRAVE' },
];

/**
 * Decompress all PDF FlateDecode streams and return a concatenated string.
 * Copied from commission-free-fixture.test.ts (that file does not export it).
 */
function decompressPdfStreams(buffer: Buffer): string {
  const str = buffer.toString('binary');
  const STREAM_RE = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const decoded: string[] = [];
  let m = STREAM_RE.exec(str);
  while (m !== null) {
    const payload = Buffer.from(m[1], 'binary');
    try {
      decoded.push(inflateSync(payload).toString('latin1'));
    } catch {
      // Non-flate or non-text stream — skip.
    }
    m = STREAM_RE.exec(str);
  }
  return decoded.join('\n---\n');
}

/**
 * D-09 — the glyph inventory this test actually asserts against.
 *
 * Deviation from 41-03-PLAN.md's literal instruction (Rule 1 — auto-fix bug found
 * during Task 1): the plan says to copy `reconstructVisibleText` from
 * commission-free-fixture.test.ts (a single merged glyph-ID → character map built
 * across ALL of a PDF's embedded ToUnicode CMaps, walked via the TJ/Tj operators) and
 * derive the inventory from its output. Empirically this is
 * NON-DETERMINISTIC for this document: it embeds 4 separate font subsets (one per
 * weight), each with its own independently-numbered glyph IDs. `renderToBuffer`'s
 * Fiber-scheduler write order (documented non-determinism, src/lib/pdf/render.ts's
 * own `computeContentHash` comment) changes which font's bfchar block is parsed last
 * for a colliding glyph ID between runs, so a glyph ID owned by one font's CMap can be
 * silently overwritten by an unrelated character from another font's CMap — proven by
 * running the plan's literal approach 2 ways in this session: a standalone script found
 * U+202F present, the same code inside a test run flagged it missing.
 *
 * Fix: union the CMap *bfchar target values* directly (every character any embedded
 * font's ToUnicode CMap declares a glyph maps to) instead of building one shared
 * glyph-ID lookup table. This sidesteps the cross-font collision entirely — it does
 * not care which font drew a given glyph, only that SOME embedded font's subset
 * contains a mapping for that character, which is exactly the "actually rendered"
 * set D-09 needs. Verified stable across repeated renders in this session (77
 * codepoints, identical set on 3 consecutive runs).
 *
 * Excludes 0x0000 and 0xFFFF: both are structural ToUnicode/CID sentinels present in
 * every subset's CMap (glyph-0/.notdef → U+0000, "unmapped" → U+FFFF), never actually
 * painted as visible text. Confirmed via fontkit against Inter-400.ttf this session:
 * hasGlyphForCodePoint(0xFFFF) is false — asserting coverage for it would be a false
 * "missing glyph" failure unrelated to real document content.
 */
function collectRenderedCodepoints(decompressed: string): Set<number> {
  const codepoints = new Set<number>();
  const BFCHAR_RE = /<([0-9a-f]+)>\s*<([0-9a-f\s]+)>/gi;
  let bm = BFCHAR_RE.exec(decompressed);
  while (bm !== null) {
    const values = bm[2]
      .trim()
      .split(/\s+/)
      .map((h) => parseInt(h, 16))
      .filter((n) => Number.isFinite(n));
    for (const cp of values) {
      if (cp === 0x0000 || cp === 0xffff) continue; // structural CMap sentinels, not real text
      codepoints.add(cp);
    }
    bm = BFCHAR_RE.exec(decompressed);
  }
  return codepoints;
}

/**
 * D-10 — extract every embedded /FontDescriptor + /FontFile2 pair and hash
 * its decompressed stream. Written as a SIBLING to render.ts's
 * computeContentHash, NOT a reuse of it: computeContentHash deliberately
 * sorts and discards per-object identity (it just needs a stable
 * determinism digest), while D-10 needs the opposite — per-object identity
 * tied to font weight/name. Source: 41-RESEARCH.md Pattern 2, empirically
 * verified in that research session against a real render. Do not modify
 * src/lib/pdf/render.ts to satisfy this need.
 */
function extractEmbeddedFontFaces(
  buffer: Buffer,
): Array<{ fontName: string; streamHash: string; byteLength: number }> {
  const text = buffer.toString('binary');
  const objRe = /(\d+)\s+0\s+obj\s*(.*?)endobj/gs;
  const objects = new Map<number, string>();
  for (const m of text.matchAll(objRe)) objects.set(Number(m[1]), m[2]);

  const fdRe = /\/Type\s*\/FontDescriptor.*?\/FontName\s*\/([A-Za-z0-9+_-]+).*?\/FontFile2\s+(\d+)\s+0\s+R/gs;
  const results: Array<{ fontName: string; streamHash: string; byteLength: number }> = [];
  for (const m of text.matchAll(fdRe)) {
    const [, fontName, objNumStr] = m;
    const body = objects.get(Number(objNumStr)) ?? '';
    const streamMatch = body.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
    if (!streamMatch) continue;
    const raw = Buffer.from(streamMatch[1], 'binary');
    const decompressed = (() => {
      try {
        return inflateSync(raw);
      } catch {
        return raw;
      }
    })();
    results.push({
      fontName,
      streamHash: createHash('sha256').update(decompressed).digest('hex'),
      byteLength: decompressed.byteLength,
    });
  }
  return results;
}

describe('Inter typography swap — glyph coverage (D-09) and distinct embedded faces (D-10)', () => {
  describe('D-09: glyph inventory, derived from real rendered FR + EN bytes, resolves in all four Inter faces', () => {
    it('the derived inventory is non-vacuous and covers every high-risk codepoint', async () => {
      const frResult = await renderProposalPdf({ data: FR_FIXTURE.data });
      const enResult = await renderProposalPdf({ data: EN_FIXTURE.data });

      const frCodepoints = collectRenderedCodepoints(decompressPdfStreams(frResult.buffer));
      const enCodepoints = collectRenderedCodepoints(decompressPdfStreams(enResult.buffer));

      const inventory = new Set<number>([...frCodepoints, ...enCodepoints]);

      // Gate that stops the test passing on an empty/broken reconstruction —
      // must run BEFORE the per-codepoint glyph-coverage assertions below.
      expect(
        inventory.size,
        'The derived glyph inventory has fewer than 50 distinct codepoints. This means the ' +
          'inventory-derivation pipeline (collectRenderedCodepoints / decompressPdfStreams) ' +
          'is broken, not that the font lacks glyphs — investigate the reconstruction before ' +
          'touching font registration.',
      ).toBeGreaterThanOrEqual(50);

      for (const { cp, label } of REQUIRED_CODEPOINTS) {
        expect(
          inventory.has(cp),
          `${label} is absent from the reconstructed FR+EN glyph inventory. This means the ` +
            'inventory derivation broke (the fixture / reconstruction no longer produces this ' +
            'character) — it is NOT a statement about font glyph coverage.',
        ).toBe(true);
      }
    });

    it('every codepoint in the derived FR+EN inventory resolves in all four registered Inter faces', async () => {
      const frResult = await renderProposalPdf({ data: FR_FIXTURE.data });
      const enResult = await renderProposalPdf({ data: EN_FIXTURE.data });

      const frCodepoints = collectRenderedCodepoints(decompressPdfStreams(frResult.buffer));
      const enCodepoints = collectRenderedCodepoints(decompressPdfStreams(enResult.buffer));

      const inventory = new Set<number>([...frCodepoints, ...enCodepoints]);

      for (const weight of INTER_WEIGHTS) {
        const ttfPath = join(FONT_DIR, `Inter-${weight}.ttf`);
        const font = fontkit.openSync(ttfPath);

        for (const cp of inventory) {
          const hex = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
          const char = String.fromCodePoint(cp);
          expect(
            font.hasGlyphForCodePoint(cp),
            `Inter weight ${weight} (${ttfPath}) has no glyph for ${hex} ('${char}'). This ` +
              'character is actually rendered in the FR or EN proposal — a missing glyph here ' +
              'produces tofu in a document sent to a client.',
          ).toBe(true);
        }
      }
    });

    it('each committed Inter TTF carries the expected PostScript name for its weight', () => {
      for (const weight of INTER_WEIGHTS) {
        const ttfPath = join(FONT_DIR, `Inter-${weight}.ttf`);
        const font = fontkit.openSync(ttfPath);
        expect(
          font.postscriptName,
          `${ttfPath} has postscriptName '${font.postscriptName}', expected ` +
            `'${EXPECTED_POSTSCRIPT_NAMES[weight]}'. This pins that the committed binary is the ` +
            'intended Inter cut for this weight, not four copies of one file.',
        ).toBe(EXPECTED_POSTSCRIPT_NAMES[weight]);
      }
    });
  });

  describe('D-10: exactly four distinct embedded Inter faces (400 ≠ 500 ≠ 600 ≠ 700)', () => {
    it('FR fixture embeds exactly 4 FontDescriptors with 4 distinct stream hashes', async () => {
      const result = await renderProposalPdf({ data: FR_FIXTURE.data });
      const faces = extractEmbeddedFontFaces(result.buffer);

      expect(faces).toHaveLength(4);
      expect(
        new Set(faces.map((f) => f.streamHash)).size,
        'Fewer than 4 distinct embedded font-stream hashes. This is the exact failure a ' +
          'collapsed variable-font registration (or a copy-paste error pointing several ' +
          'FontSource entries at the same file) would produce: a valid, gate-green, subtly ' +
          'flat document with no error and no tofu.',
      ).toBe(4);

      // Never assert the random 6-character subset-tag prefix (e.g. "JRJJHY+") —
      // PDFKit regenerates it on every render (41-RESEARCH.md Pitfall 2). Match
      // only the stable PostScript-name suffix after "+".
      const names = faces.map((f) => f.fontName.split('+')[1]).sort();
      expect(names).toEqual(['Inter-Bold', 'Inter-Medium', 'Inter-Regular', 'Inter-SemiBold'].sort());
    });

    it('EN fixture also embeds exactly 4 FontDescriptors with 4 distinct stream hashes', async () => {
      const result = await renderProposalPdf({ data: EN_FIXTURE.data });
      const faces = extractEmbeddedFontFaces(result.buffer);

      expect(faces).toHaveLength(4);
      expect(new Set(faces.map((f) => f.streamHash)).size).toBe(4);

      const names = faces.map((f) => f.fontName.split('+')[1]).sort();
      expect(names).toEqual(['Inter-Bold', 'Inter-Medium', 'Inter-Regular', 'Inter-SemiBold'].sort());
    });

    it('never asserts on PDFKit random subset-tag prefixes (self-check)', async () => {
      const result = await renderProposalPdf({ data: FR_FIXTURE.data });
      const faces = extractEmbeddedFontFaces(result.buffer);
      // Each fontName carries a 6-char uppercase prefix before '+' — confirm the
      // shape exists (proves the parser is live) without pinning its value.
      for (const face of faces) {
        expect(face.fontName).toMatch(/^[A-Z]{6}\+Inter-(Regular|Medium|SemiBold|Bold)$/);
      }
    });
  });
});
