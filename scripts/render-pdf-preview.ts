#!/usr/bin/env tsx
/**
 * Render every committed byte-determinism fixture to a real PDF file under
 * `.preview/` — for a human (D-15) to open beside the reference PNGs at
 * `.planning/assets/v1.9-quote-design/reference/`.
 *
 * Reads ONLY `__pdf-fixtures__/fixtures.ts` and calls `renderProposalPdf`
 * from `src/lib/pdf` — the exact same fixtures and render path the
 * byte-determinism gate (`__pdf-fixtures__/render-fixtures.test.ts`) already
 * exercises. It performs no `db()` call and no `storage()` call.
 *
 * DO NOT extend this script to read a real proposal row. `.env.local` in
 * this repo points at the production Neon branch (T-43-08-01) — a local run
 * that reached a real proposal would read production data. If a future need
 * arises to preview a real proposal, build a *separate* script that is
 * explicit about the production-data risk; do not widen this one.
 *
 * No confirmation gate: this script writes only local files under
 * `.preview/` (git-ignored, T-43-08-02) and never mutates a database or
 * blob store.
 *
 * Usage:
 *   npm run pdf:preview                          → renders all fixtures
 *   npm run pdf:preview -- --only <fixture-name>  → renders a single fixture
 *
 * Note: run via npm script which invokes:
 *   tsx -r ./scripts/_preload-mock-server-only.cjs scripts/render-pdf-preview.ts
 * The preload mocks 'server-only' so the script can run outside Next.js context.
 */
import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pdfFixtures } from '../__pdf-fixtures__/fixtures';
import { renderProposalPdf } from '../src/lib/pdf';

const PREVIEW_DIR = join(process.cwd(), '.preview');

async function main() {
  const onlyIdx = process.argv.indexOf('--only');
  const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

  const fixtures = only ? pdfFixtures.filter((f) => f.name === only) : pdfFixtures;

  if (only && fixtures.length === 0) {
    console.error(
      `[render-pdf-preview] No fixture named "${only}". Known fixtures: ${pdfFixtures
        .map((f) => f.name)
        .join(', ')}`
    );
    process.exit(1);
  }

  if (!existsSync(PREVIEW_DIR)) {
    mkdirSync(PREVIEW_DIR, { recursive: true });
  }

  for (const fixture of fixtures) {
    const { buffer } = await renderProposalPdf({ data: fixture.data });
    const outPath = join(PREVIEW_DIR, `${fixture.name}.pdf`);
    writeFileSync(outPath, buffer);
    const { size } = statSync(outPath);
    console.log(`[render-pdf-preview] wrote ${outPath} (${size} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
