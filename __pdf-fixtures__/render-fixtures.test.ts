// @vitest-environment node
// Phase 11-01 — PDF byte-determinism (PROP-17/PDF-04) requires native node globals.
// jsdom polyfills (URL, Blob, crypto) shift @react-pdf/renderer output bytes by ~1KB
// per fixture, breaking the SHA-256 gate. Pin this file to node; component tests
// (Plans 11-02..11-04) run under jsdom per the global vitest.config.ts setting.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('server-only', () => ({}));

import { renderProposalPdf } from '@/lib/pdf';
import { pdfFixtures } from './fixtures';

const EXPECTED_PATH = join(process.cwd(), '__pdf-fixtures__', 'expected.sha256.txt');

function loadExpected(): Record<string, string> {
  const text = readFileSync(EXPECTED_PATH, 'utf8');
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx < 0) continue;
    const name = trimmed.slice(0, colonIdx);
    const sha = trimmed.slice(colonIdx + 1);
    if (name && sha) out[name] = sha;
  }
  return out;
}

describe('PDF byte-determinism gate (PROP-17)', () => {
  const expected = loadExpected();

  for (const fixture of pdfFixtures) {
    it(`fixture "${fixture.name}" contentHash matches committed expected.sha256.txt`, async () => {
      const expectedHash = expected[fixture.name];
      expect(expectedHash, `Missing expected hash for fixture "${fixture.name}". Run 'npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE' to regenerate.`).toBeDefined();

      const result = await renderProposalPdf({ data: fixture.data });
      expect(
        result.contentHash,
        `Byte-drift detected on fixture "${fixture.name}".\n  expected: ${expectedHash}\n  actual:   ${result.contentHash}\nIf this is an intentional layout change, re-run:\n  npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE\nthen commit the regenerated __pdf-fixtures__/expected.sha256.txt alongside the source change. See PROP-17 + UI-SPEC §3.3.15.`,
      ).toBe(expectedHash);
    });
  }

  it('expected.sha256.txt has one line per fixture', () => {
    const text = readFileSync(EXPECTED_PATH, 'utf8');
    const nonEmptyLines = text.split('\n').filter((l) => l.trim().length > 0);
    expect(nonEmptyLines.length).toBe(pdfFixtures.length);
  });
});
