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
// Phase 43 / D-05 amendment (2026-09-08): U+202F NARROW NO-BREAK SPACE and U+00CA LATIN
// CAPITAL LETTER E WITH CIRCUMFLEX are both retired from this required set. Their only
// source anywhere in the FR/EN dictionaries was the SAME literal escape — the deleted
// `pdf.section.interests` FR string, "POINTS D’INTÉRÊT IDENTIFIÉS :" — which
// carries the U+202F before the colon AND the Ê inside "INTÉRÊT". Phase 43 D-05 deletes
// this string wholesale (the interests block has no slot in the Claude Design layout and
// stops printing); the two codepoints' shared origin, and the fact both went missing
// together, is direct evidence for that root cause rather than two independent breaks.
// No other `pdf.*`/`proposal.*` string or `document.tsx` literal consumed by the
// happy-path fixtures contains either codepoint — confirmed empty via a direct grep of
// both files, not assumed. `sanitizePdfNumber` (src/lib/pdf/sanitize-number.ts) separately
// and intentionally strips U+202F from every formatted number before render. This is a
// direct, correct consequence of D-05's content deletion, not a font-coverage regression,
// so both entries are retired rather than left failing. See
// `.planning/phases/43-new-pdf-layout/43-06-SUMMARY.md` for the observed evidence this
// reconciliation is based on. (43-06 flagged only U+202F by name; U+00CA's identical fate
// was masked by array short-circuiting — the loop below throws on the first failing
// codepoint, so U+202F's failure hid U+00CA's until this task removed it.)
const REQUIRED_CODEPOINTS: Array<{ cp: number; label: string }> = [
  { cp: 0x20ac, label: 'U+20AC EURO SIGN' },
  { cp: 0x2019, label: 'U+2019 RIGHT SINGLE QUOTATION MARK' },
  { cp: 0x00b0, label: 'U+00B0 DEGREE SIGN' },
  { cp: 0x00c9, label: 'U+00C9 LATIN CAPITAL LETTER E WITH ACUTE' },
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

  /**
   * Phase 43 / DOC-01 amendment (2026-09-08): the Claude Design layout
   * (`document.tsx`, rebuilt across 43-05/43-06) uses only weights 400 (regular) and
   * 600 (semibold) — `pdfFontWeights.medium` (500) and `.bold` (700) are never
   * referenced anywhere in the rewritten render tree. The rewritten document therefore
   * embeds 2 distinct font subsets, not the 4 a Phase-41-era document embedded. That
   * drop is the correct consequence of the redesign, not a regression, and reintroducing
   * an unused weight purely to keep the old count green would be design drift dressed as
   * a passing test.
   *
   * The original Phase 41 D-10 proof asserted an exact count of 4 because that was the
   * true weight count of the document that existed then. The property Phase 41 actually
   * cared about — that all four Inter weights remain REGISTERED, so a future layout can
   * use any of them without a font-registration change — is a different proof, and it
   * still holds: see `tests/vendored-ui-integrity.test.ts` case 3 (asserts
   * `document.tsx` still registers `Inter-{400,500,600,700}.ttf`), left untouched by this
   * plan. This describe block is narrowed to what the current layout can actually prove:
   * every embedded face is a member of the four registered faces (no
   * substituted/unregistered face), no two differently-named faces share a subset stream
   * (the weight-collapse failure mode Phase 41 D-03 rejected the variable font over), and
   * the two weights this design actually uses — Regular and SemiBold — are both present.
   * See `.planning/REQUIREMENTS.md` DOC-09 for the requirement-level record.
   */
  describe('D-10: every embedded Inter face is registered, no weight collapse, Regular+SemiBold present', () => {
    const REGISTERED_FACE_NAMES = ['Inter-Regular', 'Inter-Medium', 'Inter-SemiBold', 'Inter-Bold'];

    it('FR fixture: every embedded face is a registered Inter face, no two share a stream, Regular+SemiBold both present', async () => {
      const result = await renderProposalPdf({ data: FR_FIXTURE.data });
      const faces = extractEmbeddedFontFaces(result.buffer);
      const names = faces.map((f) => f.fontName.split('+')[1]);

      for (const name of names) {
        expect(
          REGISTERED_FACE_NAMES.includes(name),
          `Embedded face '${name}' is not one of the four registered Inter faces ` +
            `(${REGISTERED_FACE_NAMES.join(', ')}). A substituted or unregistered face is the ` +
            'real regression this case exists to catch.',
        ).toBe(true);
      }

      expect(
        new Set(faces.map((f) => f.streamHash)).size,
        'Two differently-named embedded faces share a subset stream — the weight-collapse ' +
          'failure mode Phase 41 D-03 rejected the variable font over.',
      ).toBe(new Set(names).size);

      expect(names, 'Inter-Regular is missing from the embedded faces.').toContain('Inter-Regular');
      expect(names, 'Inter-SemiBold is missing from the embedded faces.').toContain('Inter-SemiBold');
    });

    it('EN fixture: every embedded face is a registered Inter face, no two share a stream, Regular+SemiBold both present', async () => {
      const result = await renderProposalPdf({ data: EN_FIXTURE.data });
      const faces = extractEmbeddedFontFaces(result.buffer);
      const names = faces.map((f) => f.fontName.split('+')[1]);

      for (const name of names) {
        expect(
          REGISTERED_FACE_NAMES.includes(name),
          `Embedded face '${name}' is not one of the four registered Inter faces ` +
            `(${REGISTERED_FACE_NAMES.join(', ')}). A substituted or unregistered face is the ` +
            'real regression this case exists to catch.',
        ).toBe(true);
      }

      expect(
        new Set(faces.map((f) => f.streamHash)).size,
        'Two differently-named embedded faces share a subset stream — the weight-collapse ' +
          'failure mode Phase 41 D-03 rejected the variable font over.',
      ).toBe(new Set(names).size);

      expect(names, 'Inter-Regular is missing from the embedded faces.').toContain('Inter-Regular');
      expect(names, 'Inter-SemiBold is missing from the embedded faces.').toContain('Inter-SemiBold');
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
