/**
 * Dark-mode invariant gate — Phase 31.1 Plan 05 (`31.1-05-PLAN.md`).
 *
 * ROADMAP.md "Phase 31.1" criterion 7 requires every dark-mode value to be
 * traceable to a measurement, never invented. Colibris's dark theme is JS
 * state applied inline (~438 elements against 2 stylesheets) and could not
 * be sampled live; the whole evidence base is one operator-supplied
 * screenshot (`31.1-UI-SPEC.md` § Dark Mode). This suite is the automated
 * copy of that constraint:
 *
 *   1. the print/PDF surface still forces white in dark mode
 *   2. the no-flash theme-restoration mechanism is untouched
 *   3. the dark selector mechanism (not its values) is unchanged
 *   4. the six sampled shell-surface roles carry their sampled values
 *   5. the three UNSAMPLED gap tokens (--popover, --input,
 *      --sidebar-accent) are still at their pre-Phase-31.1 values —
 *      deliberately an equality check on UNCHANGED values. Changing any of
 *      the three is allowed only alongside a new recorded measurement,
 *      which means editing this test consciously, not incidentally.
 *   6. the accent stays Leasétic's own in both themes; Colibris's teal
 *      never appears
 *
 * This is a source-assertion suite: it reads files as text with `node:fs`
 * and asserts contracts on the text. No jsdom, no rendering, no network —
 * same shape as `tests/radius-scale.test.ts` / `tests/admin-09-grep-contracts.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Strip CSS block comments so a comment merely mentioning a token cannot
 * satisfy (or invalidate) an assertion below. */
function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Strip `//`-style line comments so the same guarantee holds for .ts/.tsx
 * source-assertion checks. */
function stripLineComments(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

function readStripped(relativePath: string, kind: 'css' | 'ts'): string {
  const raw = readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
  return kind === 'css' ? stripCssComments(raw) : stripLineComments(raw);
}

const globalsCss = readStripped('app/globals.css', 'css');
const noFlashScript = readStripped('src/lib/theme/no-flash-script.ts', 'ts');
const layoutTsx = readStripped('app/layout.tsx', 'ts');

/** The dark-mode token block body only — scopes declaration assertions so a
 * light-mode value with the same name can never satisfy a dark-mode check. */
function extractDarkBlock(css: string): string {
  const match = css.match(/html\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
  if (!match) {
    throw new Error('Could not locate the html[data-theme="dark"] token block in app/globals.css');
  }
  return match[1];
}

const darkBlock = extractDarkBlock(globalsCss);

describe('dark palette — invariant gate (Phase 31.1 Plan 05, ROADMAP criterion 7)', () => {
  it('the print/PDF surface still forces white in dark mode (Phase 5 / Phase 8)', () => {
    const pdfRuleMatch = globalsCss.match(
      /html\[data-theme="dark"\]\s*\[data-pdf-surface\]\s*\{([\s\S]*?)\}/,
    );
    expect(pdfRuleMatch).not.toBeNull();
    const pdfRuleBody = pdfRuleMatch?.[1] ?? '';
    expect(pdfRuleBody).toMatch(/background:\s*#fff\s*!important/);
    expect(pdfRuleBody).toMatch(/color:\s*#1a2832\s*!important/);
  });

  it('no-flash restoration is untouched', () => {
    // The inline script still sets data-theme on the document element.
    expect(noFlashScript).toMatch(/document\.documentElement\.setAttribute\(\s*['"]data-theme['"]/);
    // app/layout.tsx still injects that script inside <head>, before <body>.
    const headIndex = layoutTsx.indexOf('<head>');
    const scriptIndex = layoutTsx.indexOf('dangerouslySetInnerHTML={inlineScript}');
    const bodyIndex = layoutTsx.indexOf('<body>');
    expect(layoutTsx).toContain("NO_FLASH_SCRIPT } from '@/lib/theme/no-flash-script'");
    expect(headIndex).toBeGreaterThan(-1);
    expect(scriptIndex).toBeGreaterThan(headIndex);
    expect(bodyIndex).toBeGreaterThan(scriptIndex);
  });

  it('the dark selector mechanism is unchanged', () => {
    expect(globalsCss).toMatch(/@custom-variant\s+dark\s*\(&:where\(\[data-theme=dark\]/);
    expect(globalsCss).toMatch(/html\[data-theme="dark"\]\s*\{/);
  });

  it('the six sampled shell-surface roles carry their sampled values', () => {
    expect(darkBlock).toMatch(/--background:\s*#161616;/);
    expect(darkBlock).toMatch(/--card:\s*#1e1e1e;/);
    expect(darkBlock).toMatch(/--sidebar:\s*#161616;/);
    expect(darkBlock).toMatch(/--border:\s*oklch\(1 0 0 \/ 8%\);/);
    expect(darkBlock).toMatch(/--sidebar-border:\s*oklch\(1 0 0 \/ 8%\);/);
    expect(darkBlock).toMatch(/--muted-foreground:\s*oklch\(0\.65 0 0\);/);
  });

  it('the unsampled gaps were not invented (DARK-GAP-01/02/03)', () => {
    // This is the criterion-7 gate — it fails if someone later fills a gap
    // without a recorded measurement. Filling one of these three
    // deliberately requires editing this assertion, not just the CSS.
    expect(darkBlock).toMatch(/--popover:\s*oklch\(0\.205 0 0\);/);
    expect(darkBlock).toMatch(/--input:\s*oklch\(1 0 0 \/ 15%\);/);
    expect(darkBlock).toMatch(/--sidebar-accent:\s*oklch\(0\.269 0 0\);/);
  });

  it("the accent is Leasétic's, in both themes", () => {
    expect(darkBlock).toMatch(/--primary:\s*var\(--brand-accent\);/);
    expect(darkBlock).toMatch(/--sidebar-primary:\s*var\(--brand-accent\);/);

    const teal = ['0', '0', '9', '9', '9', '9'].join(''); // avoid a self-tripping literal in this suite's own source
    expect(globalsCss).not.toContain(teal);
  });
});
