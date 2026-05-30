// @vitest-environment node
/**
 * Plan 23-03 Task 1 — Agent/Commercial commission-free byte-determinism fixture test.
 *
 * SCOPE: byte-determinism FIXTURE layer (`__pdf-fixtures__/fixtures.ts`).
 * This is distinct from:
 *   - calc.golden.test.ts (calc arithmetic layer)
 *   - no-commission.test.ts (structural + binary layer via finalizeWizard pipeline)
 *
 * This file fills the GAP: proving the real rendered PDF for the agent-commission-free
 * fixture carries the correct commission-free loyer AND contains no commission wording.
 *
 * Assertions:
 *   (a) loyerHT == round2(amountHT * coeff / 100)
 *   (b) loyerHT < Partenaire loyer for same inputs (commission factor dropped)
 *   (c) Rendered PDF (visible text + raw latin1 buffer) contains no 'commission' substring
 */
import { describe, it, expect, vi } from 'vitest';
import { inflateSync } from 'node:zlib';

vi.mock('server-only', () => ({}));

import { renderProposalPdf } from '@/lib/pdf';
import { pdfFixtures } from './fixtures';

const AGENT_FIXTURE = pdfFixtures.find((f) => f.name === 'agent-commission-free')!;

/** round2: same formula as expectedLoyerFree in calc.golden.test.ts */
function round2(n: number): string {
  return (+n.toFixed(2)).toFixed(2);
}

// Fixture constants (frozen — no Date.now/Math.random)
const FIXTURE_AMOUNT_HT = 75000;
const FIXTURE_COEFF = 2.25;
const FIXTURE_COMMISSION_PCT = 5;

/**
 * Decompress all PDF FlateDecode streams and return a concatenated string.
 * Reuses the inflate strategy from no-commission.test.ts.
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
 * Reconstruct visible text from ToUnicode CMap bfchar mappings + TJ/Tj operators.
 * Reuses the glyph-map strategy from no-commission.test.ts.
 */
function reconstructVisibleText(decompressed: string): string {
  const glyphMap: Record<string, string> = {};
  const BFCHAR_RE = /<([0-9a-f]+)>\s*<([0-9a-f\s]+)>/gi;
  let bm = BFCHAR_RE.exec(decompressed);
  while (bm !== null) {
    const src = bm[1].toLowerCase();
    const codepoints = bm[2]
      .trim()
      .split(/\s+/)
      .map((h) => parseInt(h, 16))
      .filter((n) => Number.isFinite(n));
    glyphMap[src] = String.fromCodePoint(...codepoints);
    bm = BFCHAR_RE.exec(decompressed);
  }

  const out: string[] = [];
  const TJ_RE = /\[([^\]]*)\]\s*TJ|<([0-9a-f\s]+)>\s*Tj/gi;
  let sm = TJ_RE.exec(decompressed);
  while (sm !== null) {
    const body = sm[1] ?? sm[2] ?? '';
    const hexTokens = body.match(/<([0-9a-f\s]+)>/gi) ?? [];
    for (const token of hexTokens) {
      const hex = token.replace(/[<>]/g, '').replace(/\s+/g, '').toLowerCase();
      for (let i = 0; i + 4 <= hex.length; i += 4) {
        const glyphId = hex.substr(i, 4);
        out.push(glyphMap[glyphId] ?? '');
      }
    }
    sm = TJ_RE.exec(decompressed);
  }

  return out.join('');
}

describe('Agent/Commercial commission-free byte-determinism fixture (PDF-03 / PTYPE-06)', () => {
  it('fixture "agent-commission-free" is present in pdfFixtures', () => {
    expect(AGENT_FIXTURE).toBeDefined();
    expect(AGENT_FIXTURE.name).toBe('agent-commission-free');
  });

  it('(a) loyerHT equals round2(amountHT * coeff / 100) — commission-free formula', () => {
    // Computed inside the fixture: loyerHT = round2(75000 * 2.2500 / 100) = 1687.50
    const expected = round2((FIXTURE_AMOUNT_HT * FIXTURE_COEFF) / 100);
    if (AGENT_FIXTURE.data.computed.state !== 'computed') {
      throw new Error('Expected computed state for agent-commission-free fixture');
    }
    expect(AGENT_FIXTURE.data.computed.loyerHT).toBe(expected);
  });

  it('(b) loyerHT is strictly less than Partenaire loyer for the same inputs (commission factor dropped)', () => {
    // Partenaire loyer = round2(amountHT * (1 + commissionPct/100) * coeff / 100)
    const partenaireLoyer = +(
      (FIXTURE_AMOUNT_HT * (1 + FIXTURE_COMMISSION_PCT / 100) * FIXTURE_COEFF) /
      100
    ).toFixed(2);

    if (AGENT_FIXTURE.data.computed.state !== 'computed') {
      throw new Error('Expected computed state for agent-commission-free fixture');
    }
    const agentLoyer = Number(AGENT_FIXTURE.data.computed.loyerHT);

    // 1687.50 < 1771.88 — proves the 5% commission addend is absent
    expect(agentLoyer).toBeLessThan(partenaireLoyer);
  });

  it('(c) rendered PDF visible text + raw buffer contain no "commission" substring', async () => {
    const result = await renderProposalPdf({ data: AGENT_FIXTURE.data });
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.sizeBytes).toBeGreaterThan(4000);

    // Raw binary scan: PDF metadata fields are uncompressed plain text.
    const rawLatin1 = result.buffer.toString('latin1');
    expect(rawLatin1.toLowerCase()).not.toContain('commission');

    // Decompressed streams + reconstructed visible text scan.
    const decompressed = decompressPdfStreams(result.buffer);
    const visibleText = reconstructVisibleText(decompressed);
    expect(visibleText.toLowerCase()).not.toContain('commission');

    // Positive control: lcRef appears in PDF metadata (proves inspection is live).
    expect(rawLatin1.includes('LC-12345'), 'positive control: lcRef must appear in PDF metadata').toBe(true);
  });

  it('fixture uses only frozen constants (determinism guard)', () => {
    // Verify the fixture data shape is fully frozen (no runtime-variable values).
    const { data } = AGENT_FIXTURE;
    // createdAt must be the frozen date literal used throughout the fixture corpus
    expect(data.createdAt.toISOString()).toBe('2026-05-09T10:00:00.000Z');
    // amountHT must be the frozen string literal
    expect(data.inputs.amountHT).toBe('75000');
    if (data.computed.state === 'computed') {
      expect(data.computed.loyerHT).toBe('1687.50');
      expect(data.computed.coeff).toBe('2.2500');
    }
  });
});
