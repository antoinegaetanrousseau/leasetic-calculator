#!/usr/bin/env tsx
/**
 * Regenerate __pdf-fixtures__/expected.sha256.txt by re-rendering every
 * fixture via renderProposalPdf and writing the sorted name:contentHash list.
 *
 * Uses contentHash (PROP-17 deterministic hash) not the raw sha256 — see
 * render.ts for why raw sha256 varies per-render.
 *
 * Defence-in-depth gate: requires `--confirm UPDATE-FIXTURE` to actually
 * write. Without it, the script is dry-run only — prints the diff and exits.
 *
 * Usage:
 *   npm run pdf:update-fixture                                   → dry-run / preview
 *   npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE       → write
 *
 * Note: run via npm script which invokes:
 *   node -r ./scripts/_preload-mock-server-only.cjs <tsx> scripts/update-pdf-fixture.ts
 * The preload mocks 'server-only' so the script can run outside Next.js context.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pdfFixtures } from '../__pdf-fixtures__/fixtures';
import { renderProposalPdf } from '../src/lib/pdf';

const TARGET = join(process.cwd(), '__pdf-fixtures__', 'expected.sha256.txt');

async function main() {
  const confirmIdx = process.argv.indexOf('--confirm');
  const confirm = confirmIdx >= 0 ? process.argv[confirmIdx + 1] : null;
  const apply = confirm === 'UPDATE-FIXTURE';

  console.log(`[update-pdf-fixture] ${apply ? 'APPLY mode (writing file)' : 'DRY-RUN mode (no writes)'}`);

  const lines: string[] = [];
  for (const fixture of pdfFixtures) {
    const { contentHash } = await renderProposalPdf({ data: fixture.data });
    lines.push(`${fixture.name}:${contentHash}`);
    console.log(`[update-pdf-fixture] ${fixture.name}: ${contentHash}`);
  }
  lines.sort();
  const next = lines.join('\n') + '\n';

  const prev = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : '';
  if (prev === next) {
    console.log(`[update-pdf-fixture] No drift; expected.sha256.txt is up to date.`);
    return;
  }

  console.log(`[update-pdf-fixture] DIFF detected:`);
  console.log(`--- prev ---`);
  console.log(prev);
  console.log(`--- next ---`);
  console.log(next);

  if (!apply) {
    console.error(`[update-pdf-fixture] DRY-RUN. To apply, re-run with: --confirm UPDATE-FIXTURE`);
    process.exit(1);
  }

  writeFileSync(TARGET, next, 'utf8');
  console.log(`[update-pdf-fixture] WROTE ${TARGET}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
