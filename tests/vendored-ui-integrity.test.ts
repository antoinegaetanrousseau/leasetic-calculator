/**
 * 34-03 — structural contract: a ReUI/shadcn install must not disturb either
 * of this repo's TWO font surfaces.
 *
 * WHY THIS FILE EXISTS
 *
 * `shadcn` writes directly into the source tree from outside the type system.
 * `shadcn init` in particular rewrites `app/layout.tsx`'s font import and
 * rewrites the `@theme inline` block in `app/globals.css`, where it has already
 * once emitted a self-referential `--font-sans: var(--font-sans)` — a circular
 * declaration that invalidates the property, so the whole UI silently falls back
 * to a system font. `npm run typecheck`, `npm run lint:check` and `npm run build`
 * ALL PASS on that broken state: it is valid TypeScript, valid CSS and a valid
 * build. Nothing else in this repo notices. Hence a structural test.
 *
 * THE TWO SURFACES ARE DIFFERENT FONTS. Conflating them is the trap:
 *
 *   1. THE UI USES INTER. `app/layout.tsx` registers it through
 *      `next/font/google` as `--font-inter`, and `app/globals.css` resolves
 *      `--font-sans` and `--font-heading` to it. Institutional memory says
 *      "shadcn init breaks the Plus Jakarta Sans font" — that sentence is now
 *      HISTORICAL. Plus Jakarta Sans has not been the UI typeface for a while.
 *      A guard that greps `app/layout.tsx` for Plus Jakarta Sans finds nothing,
 *      reports success, and protects nothing at all.
 *
 *   2. THE PDF USES PLUS JAKARTA SANS. `src/lib/pdf/document.tsx` registers it
 *      with `@react-pdf/renderer` from the four TTFs committed in
 *      `public/fonts/`. Those bytes are load-bearing: the PROP-17 byte
 *      determinism contract is defined against them, so changing, dropping or
 *      re-pathing a weight silently re-baselines it. A missing TTF does not
 *      fail the build either — it fails at PDF-generation time, in production.
 *
 * Case 5 guards a third, quieter failure: if `components.json` loses the `@reui`
 * registry entry, a future `shadcn add @reui/<block>` can fall back to the
 * public registry and vendor a DIFFERENT component under the same name.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LAYOUT = 'app/layout.tsx';
const GLOBALS = 'app/globals.css';
const PDF_DOCUMENT = 'src/lib/pdf/document.tsx';
const COMPONENTS_JSON = 'components.json';
const PDF_FONT_DIR = 'public/fonts';
const PDF_FONT_WEIGHTS = [400, 500, 600, 700] as const;

/**
 * Read a file that MUST exist and MUST have content. Copied in spirit from
 * `tests/server-action-error-contracts.test.ts`'s "the glob itself must not
 * silently go empty" guard: a gate that reads a moved or emptied file and finds
 * no offending pattern passes vacuously, which is the exact failure mode this
 * suite was written to replace.
 */
function readRequired(relPath: string): string {
  expect(existsSync(relPath), `${relPath} is missing — this gate cannot pass vacuously`).toBe(true);
  const src = readFileSync(relPath, 'utf-8');
  expect(src.length, `${relPath} is empty — this gate cannot pass vacuously`).toBeGreaterThan(0);
  return src;
}

function countMatches(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

/**
 * Strip CSS block comments before matching. `app/globals.css` documents the
 * self-referential `--font-sans: var(--font-sans)` defect in prose directly
 * above the declarations that fix it, so an unstripped regex matches the
 * WARNING rather than the bug and the gate fails on a healthy file.
 */
function stripCssComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('vendored UI integrity — the two font surfaces a shadcn install can break (34-03)', () => {
  it('1. the UI font variable is REGISTERED: app/layout.tsx declares Inter as --font-inter', () => {
    const layout = readRequired(LAYOUT);

    expect(layout, `${LAYOUT} no longer imports a font from next/font/google`).toContain(
      "from 'next/font/google'",
    );
    expect(
      layout,
      `${LAYOUT} no longer declares variable: '--font-inter' — app/globals.css resolves ` +
        '--font-sans to that variable, so without it every surface falls back to system-ui',
    ).toContain("variable: '--font-inter'");
    expect(
      layout,
      `${LAYOUT} no longer applies inter.variable to <html> — the CSS variable would be ` +
        'declared but never mounted on any element',
    ).toContain('inter.variable');
  });

  it('2. the UI font variable is CONSUMED: globals.css resolves --font-sans/--font-heading to it, never to itself', () => {
    const globals = stripCssComments(readRequired(GLOBALS));

    expect(
      countMatches(globals, /--font-sans:\s*var\(--font-inter\)/g),
      `${GLOBALS} must keep both --font-sans: var(--font-inter) declarations (the base one ` +
        'and the one inside @theme inline)',
    ).toBeGreaterThanOrEqual(2);

    expect(
      countMatches(globals, /--font-heading:\s*var\(--font-inter\)/g),
      `${GLOBALS} must keep --font-heading resolving to var(--font-inter) inside @theme inline`,
    ).toBeGreaterThanOrEqual(1);

    // The exact regression `shadcn init` produces. `--font-sans: var(--font-sans)` is
    // circular; CSS treats the declaration as invalid at computed-value time and the
    // font silently resolves to the browser default. Same for --font-heading.
    expect(
      countMatches(globals, /--font-sans:\s*var\(--font-sans\)/g),
      `${GLOBALS} contains a self-referential --font-sans: var(--font-sans). This is what ` +
        'shadcn init emits; it is circular, invalidates the property and drops the UI to a ' +
        'system font while typecheck, lint and build all still pass. Restore ' +
        "--font-sans: var(--font-inter), 'Inter', system-ui, sans-serif.",
    ).toBe(0);
    expect(
      countMatches(globals, /--font-heading:\s*var\(--font-heading\)/g),
      `${GLOBALS} contains a self-referential --font-heading: var(--font-heading) — same ` +
        'circular-declaration defect as --font-sans above.',
    ).toBe(0);
  });

  it('3. the PDF font registration is intact: document.tsx registers PlusJakartaSans at all four weights', () => {
    const doc = readRequired(PDF_DOCUMENT);

    expect(
      doc,
      `${PDF_DOCUMENT} no longer registers the PlusJakartaSans family. The PDF typeface is ` +
        'deliberately NOT Inter: changing it re-baselines the PROP-17 byte-determinism ' +
        'contract and touches the glyph-coverage tests.',
    ).toContain("family: 'PlusJakartaSans'");

    for (const weight of PDF_FONT_WEIGHTS) {
      expect(
        doc,
        `${PDF_DOCUMENT} no longer references PlusJakartaSans-${weight}.ttf — a dropped weight ` +
          'renders as a substituted face and changes the output bytes.',
      ).toContain(`PlusJakartaSans-${weight}.ttf`);
    }
  });

  it('4. the PDF font FILES exist on disk: all four TTFs are present in public/fonts/', () => {
    // Checked separately from case 3 because a missing TTF is invisible to the build:
    // @react-pdf/renderer resolves the path at render time, so the failure surfaces as a
    // broken proposal PDF in production, not as a red CI run.
    const missing = PDF_FONT_WEIGHTS.map((w) => join(PDF_FONT_DIR, `PlusJakartaSans-${w}.ttf`)).filter(
      (p) => !existsSync(p),
    );

    expect(
      missing,
      'PDF font files are missing. These exact binaries define the PROP-17 byte-determinism ' +
        'baseline — restore them from git rather than re-exporting the family.',
    ).toEqual([]);
  });

  it('5. components.json still declares the licensed @reui registry with its Bearer header', () => {
    const raw = readRequired(COMPONENTS_JSON);
    const config = JSON.parse(raw) as {
      style?: string;
      registries?: Record<string, { url?: string; headers?: Record<string, string> }>;
    };

    const reui = config.registries?.['@reui'];
    expect(
      reui,
      'components.json lost its @reui registry entry. Without it, `shadcn add @reui/<block>` ' +
        'can fall back to the public registry and vendor a DIFFERENT component under the ' +
        'same name.',
    ).toBeDefined();
    expect(reui?.url, 'the @reui registry url must interpolate {style} and {name}').toContain(
      'reui.io/r/{style}/{name}.json',
    );
    expect(
      reui?.headers?.Authorization,
      'the @reui registry must authenticate with the licence key from the environment',
    ).toBe('Bearer ${REUI_LICENSE_KEY}');
    expect(
      config.style,
      'components.json must keep style: base-maia — it selects the base-ui variant this repo ' +
        'is built on. Any other value vendors the radix-based components instead.',
    ).toBe('base-maia');
  });
});
