/**
 * Dialog/sheet close-button accessible name — GAP-02 (`38-01-PLAN.md`, D-38-11).
 *
 * `src/components/ui/dialog.tsx` and `src/components/ui/sheet.tsx` are
 * vendored ReUI/shadcn primitives, and `src/components/ui/**` is EXCLUDED
 * from ESLint (`eslint.config.*`) because the directory is re-imported
 * wholesale on upgrade. That means the `no-restricted-syntax` guard that
 * flags a hardcoded JSXText string never sees this file — which is exactly
 * how both primitives shipped a hardcoded English `Close` as the icon-only
 * close button's accessible name in a French-default product.
 *
 * D-38-11: documentation alone is demonstrably insufficient — the two
 * existing rows in `.planning/codebase/UI-CONVENTIONS.md`'s re-import table
 * each record being MEASURED TO RECUR after `npx shadcn add -o`. This suite
 * is the pinning test that closes that gap: a re-import that restores the
 * literal fails `npm run test`, not just a documentation review.
 *
 * Source-assertion suite: reads files as text with node:fs and asserts
 * contracts on the text, after stripping comments. No jsdom, no React
 * rendering, no network. Modelled on `tests/container-radius.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

const DIALOG = 'src/components/ui/dialog.tsx';
const SHEET = 'src/components/ui/sheet.tsx';
const DICTIONARIES = 'src/lib/i18n/dictionaries.ts';

/** Strip `//` line comments and `/* ... *‍/` block comments so a comment that
 * merely mentions a forbidden or required string cannot satisfy or trip an
 * assertion below (per UI-CONVENTIONS.md's "grep-based acceptance criteria
 * measure prose too" note). */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

/**
 * Read a file that MUST exist and MUST have content. A gate that reads a
 * moved or emptied file and finds no offending pattern passes vacuously —
 * this guard (copied in spirit from `tests/vendored-ui-integrity.test.ts`)
 * makes that failure mode loud instead of silent.
 */
function readStripped(relativePath: string): string {
  const absPath = path.join(ROOT, relativePath);
  expect(existsSync(absPath), `${relativePath} is missing — this gate cannot pass vacuously`).toBe(
    true,
  );
  const src = readFileSync(absPath, 'utf-8');
  expect(src.length, `${relativePath} is empty — this gate cannot pass vacuously`).toBeGreaterThan(
    0,
  );
  return stripComments(src);
}

// Anchor on the code shape `className="sr-only">Close<`, not the bare word
// `Close` — both files legitimately contain `DialogClose`, `SheetClose`,
// `showCloseButton` and `data-slot="dialog-close"`/`"sheet-close"`, so a
// bare-token match would be permanently red.
const HARDCODED_CLOSE_SPAN_RX = /className="sr-only">Close</;

describe('dialog/sheet close-button accessible name (GAP-02, D-38-11)', () => {
  it.each([
    ['dialog.tsx', DIALOG],
    ['sheet.tsx', SHEET],
  ])('%s does not hardcode the English "Close" sr-only span', (_label, relPath) => {
    const stripped = readStripped(relPath);
    expect(
      stripped,
      `${relPath} carries a hardcoded 'className="sr-only">Close<' span again. ` +
        're-apply the row for this file from .planning/codebase/UI-CONVENTIONS.md\'s ' +
        '"Vendored ReUI modifications to re-apply after any re-import" table.',
    ).not.toMatch(HARDCODED_CLOSE_SPAN_RX);
  });

  it.each([
    ['dialog.tsx', DIALOG],
    ['sheet.tsx', SHEET],
  ])('%s reads the close label from the FR/EN dictionary via resolveDomLang()', (_label, relPath) => {
    const stripped = readStripped(relPath);
    expect(
      stripped,
      `${relPath} must call t('common.close.aria', resolveDomLang()) for its sr-only close ` +
        'label. re-apply the row for this file from .planning/codebase/UI-CONVENTIONS.md\'s ' +
        '"Vendored ReUI modifications to re-apply after any re-import" table.',
    ).toContain("t('common.close.aria', resolveDomLang())");
  });

  it('dictionaries.ts carries both FR and EN values for common.close.aria', () => {
    const stripped = readStripped(DICTIONARIES);
    expect(
      stripped,
      "src/lib/i18n/dictionaries.ts is missing the FR 'common.close.aria': 'Fermer' entry " +
        '— a half-applied dictionary edit would silently fall back to the EN string in FR.',
    ).toContain("'common.close.aria': 'Fermer'");
    expect(
      stripped,
      "src/lib/i18n/dictionaries.ts is missing the EN 'common.close.aria': 'Close' entry " +
        '— FR/EN parity is compile-enforced by _EnHasAllFrKeys, but this pins the actual value.',
    ).toContain("'common.close.aria': 'Close'");
  });
});
