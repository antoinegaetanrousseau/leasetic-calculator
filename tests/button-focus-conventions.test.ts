/**
 * GAP-04 gap-fill (Phase 38 Nyquist validation pass, status was MISSING) — the shared
 * legacy `.btn-*` button padding/focus-ring conventions, and their documentation gate
 * (UIC-11), get a permanent regression suite for the first time.
 *
 * This repo has a documented CSS-drift blind spot: a duplicate radius scale shipped
 * across five commits while 1213 Vitest tests stayed green (see
 * `tests/radius-scale.test.ts` / `tests/container-radius.test.ts`'s docblocks). GAP-04 is
 * the same class of risk — a shared base rule, edited once, silently regressing three
 * button classes across ~32 files and six focus selectors — and had no guard at all
 * before this file.
 *
 * Precedent: `tests/radius-scale.test.ts` (source-assertion suite, reads `app/globals.css`
 * as text with `node:fs`, strips comments before matching so a comment mentioning a token
 * cannot satisfy or invalidate a counting assertion). This file follows the same shape.
 *
 * Non-vacuousness: every parsing helper below is a pure function of an input string (not
 * hardwired to the real file), so each contract has a paired "self-check" test at the
 * bottom of this file that feeds the SAME helper a deliberately broken synthetic snippet
 * and asserts the contract's own logic would flag it. This is what proves the assertions
 * against the real file can actually fail, not just that the real file currently passes.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Strip CSS block comments so a comment merely mentioning a hardcoded colour or a
 * retired literal cannot satisfy (or invalidate) a counting/matching assertion below —
 * the exact trap `.planning/codebase/UI-CONVENTIONS.md`'s "Plan-authoring note" documents
 * (a comment explaining "this never uses rgba(45, 122, 140" would otherwise inflate a
 * naive `grep -c` style count). */
function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Extracts flat `selector { body }` rule blocks from (already comment-stripped) CSS text.
 * Deliberately simple — not a real CSS parser — and relies on this codebase's established
 * house style of flat, unnested rules (confirmed by direct read of every block this file
 * asserts on: none of the `:focus-visible`/`:focus-within` rules or the shared `.btn-*`
 * base rule nest another selector inside themselves). A block whose selector text spans
 * an `@layer` opener is not matched by this regex (its own body immediately contains a
 * nested `{`), which is what we want — we only care about the innermost flat rules.
 */
function extractFlatRuleBlocks(strippedCss: string): { selector: string; body: string }[] {
  const blocks: { selector: string; body: string }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(strippedCss)) !== null) {
    blocks.push({ selector: m[1].trim(), body: m[2] });
  }
  return blocks;
}

/** Every individual comma-separated selector across all rule blocks that is itself a
 * `:focus-visible` or `:focus-within` selector, paired with its rule's body. This is the
 * "enumerate the focus rules by parsing" step GAP-04 asks for — the count is DERIVED here,
 * not asserted from memory. */
function findFocusSelectors(strippedCss: string): { selector: string; body: string }[] {
  const blocks = extractFlatRuleBlocks(strippedCss);
  const found: { selector: string; body: string }[] = [];
  for (const block of blocks) {
    const subSelectors = block.selector.split(',').map((s) => s.trim());
    for (const sub of subSelectors) {
      if (sub.includes(':focus-visible') || sub.includes(':focus-within')) {
        found.push({ selector: sub, body: block.body });
      }
    }
  }
  return found;
}

const TWO_LAYER_INNER = '0 0 0 2px var(--ring)';
const TWO_LAYER_OUTER = '0 0 0 5px color-mix(in oklab, var(--ring) 50%, transparent)';

function bodyHasTwoLayerRing(body: string): boolean {
  return body.includes(TWO_LAYER_INNER) && body.includes(TWO_LAYER_OUTER);
}

/** A hardcoded colour literal in a box-shadow declaration — hex or rgba(), NOT inside a
 * `var(...)`/`color-mix(...)` reference. Scoped to the `box-shadow:` declaration line(s)
 * only, per the gap's own instruction: ".admin-nav-card:hover"'s decorative
 * `rgba(45, 122, 140, 0.12)` box-shadow must NOT trip this check (it has no
 * `:focus-visible`/`:focus-within` selector, so `findFocusSelectors` never hands it to
 * this function in the first place — the scoping happens at the selector-filter step, not
 * inside this function). */
function hasHardcodedColorLiteral(body: string): boolean {
  return /rgba\(|rgb\(|#[0-9a-fA-F]{3,8}\b/.test(body);
}

const globalsCssPath = path.resolve(__dirname, '..', 'app/globals.css');
const globalsCssRaw = readFileSync(globalsCssPath, 'utf-8');
const globalsCss = stripCssComments(globalsCssRaw);

describe('GAP-04 — shared .btn-* padding is on-grid at 0.5rem, on the SHARED rule only', () => {
  it('the shared `.btn-green, .btn-navy, .btn-out` base rule declares padding: 0.5rem 1.5rem', () => {
    // Pinned specifically to 0.5rem (not merely "not 0.6rem"): the pre-phase value was
    // 0.6rem = 9.6px vertical, off UIC-01's 4px grid and landing at neither button.tsx's
    // `default` (36px/h-9) nor `lg` (40px/h-10) step. 0.5rem = 8px is on-grid and, paired
    // with the shared rule's line-height, lands the three legacy classes on the 36px
    // `default` step — see the in-file arithmetic comment above the rule in
    // app/globals.css (F-38-02's correction).
    const blocks = extractFlatRuleBlocks(globalsCss);
    const sharedRule = blocks.find(
      (b) => b.selector.includes('.btn-green') && b.selector.includes('.btn-navy') && b.selector.includes('.btn-out')
        && !b.selector.includes(':'),
    );

    expect(
      sharedRule,
      'Could not find the shared ".btn-green, .btn-navy, .btn-out { ... }" base rule (a ' +
        'plain, non-pseudo-class selector combining all three classes) in app/globals.css. ' +
        'GAP-04\'s padding fix is declared once on this shared rule so it applies to all ' +
        'three legacy button classes across their ~32 measured call sites at once.',
    ).toBeDefined();

    expect(
      /padding:\s*0\.5rem\s+1\.5rem\s*;/.test(sharedRule!.body),
      'The shared .btn-green/.btn-navy/.btn-out rule does not declare ' +
        '"padding: 0.5rem 1.5rem;". Found body:\n' + sharedRule!.body,
    ).toBe(true);
  });

  it('none of .btn-green / .btn-navy / .btn-out has its OWN per-class padding override (the padding lives on the shared rule, not duplicated three times)', () => {
    const blocks = extractFlatRuleBlocks(globalsCss);
    const perClassBlocks = blocks.filter((b) =>
      /^\.btn-(green|navy|out)\s*$/.test(b.selector) || /^\.btn-(green|navy|out):hover\s*$/.test(b.selector),
    );

    expect(
      perClassBlocks.length,
      'Expected to find per-class .btn-green/.btn-navy/.btn-out (and their :hover) rules ' +
        'to check against — found none, which means this test\'s selector pattern has ' +
        'drifted from the real file shape.',
    ).toBeGreaterThan(0);

    const withOwnPadding = perClassBlocks.filter((b) => /padding\s*:/.test(b.body));
    expect(
      withOwnPadding,
      'A per-class .btn-* rule declares its own "padding:" — GAP-04\'s fix is meant to be a ' +
        'SINGLE shared declaration serving all three classes, not a per-class override that ' +
        'could drift independently. Offending block(s): ' + JSON.stringify(withOwnPadding),
    ).toEqual([]);
  });

  it('the pre-phase off-grid 0.6rem padding value is gone from app/globals.css entirely', () => {
    expect(
      /padding:\s*0\.6rem/.test(globalsCss),
      '"padding: 0.6rem" still appears in app/globals.css. This was the retired off-grid ' +
        'value (9.6px vertical, matching neither UIC-01\'s 4px grid nor button.tsx\'s 36px/' +
        '40px steps) that GAP-04 exists to remove.',
    ).toBe(false);
  });
});

describe('GAP-04 — every :focus-visible/:focus-within rule in globals.css uses the identical var(--ring) two-layer treatment', () => {
  const focusSelectors = findFocusSelectors(globalsCss);

  it('derives and pins the actual count of focus-ring selectors found by parsing (not a hardcoded guess)', () => {
    // Derived by direct enumeration at authoring time (confirmed by grep against the file
    // independently of this parser): four rule blocks —
    //   1. `.btn-green:focus-visible, .btn-navy:focus-visible, .btn-out:focus-visible` (3 selectors)
    //   2. `.search-bar:focus-within` (1 selector)
    //   3. `.admin-nav-card:focus-visible` (1 selector)
    //   4. `.stepper-circle:focus-visible` (1 selector)
    // = 6 selectors total, matching both 38-02-PLAN.md's "six selectors" and
    // UIC-11's "six focus-ring selectors" language. If a future edit adds, removes or
    // merges a focus selector, this count changes and this assertion goes red — that is
    // the point (see the self-check describe block below for proof this can fail).
    expect(
      focusSelectors.length,
      'Parsed ' + String(focusSelectors.length) + ' distinct :focus-visible/:focus-within ' +
        'selectors in app/globals.css; expected exactly 6 (three from the shared ' +
        '.btn-*:focus-visible block, plus .search-bar:focus-within, ' +
        '.admin-nav-card:focus-visible and .stepper-circle:focus-visible). Found: ' +
        JSON.stringify(focusSelectors.map((f) => f.selector)),
    ).toBe(6);
  });

  it('every one of the 6 focus selectors renders the exact two-layer var(--ring) box-shadow', () => {
    const nonConforming = focusSelectors.filter((f) => !bodyHasTwoLayerRing(f.body));
    expect(
      nonConforming,
      'One or more :focus-visible/:focus-within rules do not carry BOTH layers of the ' +
        'UIC-11 two-layer ring ("' + TWO_LAYER_INNER + '" and "' + TWO_LAYER_OUTER + '"). ' +
        'Non-conforming selector(s): ' + JSON.stringify(nonConforming.map((f) => f.selector)),
    ).toEqual([]);
  });

  it('none of the 6 focus selectors hardcodes a colour literal (hex/rgba) in its own rule body', () => {
    // Scoped to selectors that are THEMSELVES :focus-visible/:focus-within (via
    // findFocusSelectors' selector-level filter) — this deliberately does NOT flag
    // `.admin-nav-card:hover`'s decorative `box-shadow: 0 2px 8px rgba(45, 122, 140, 0.12)`
    // a few lines above `.admin-nav-card:focus-visible` in the same file, because that
    // selector is a :hover rule, not a focus rule, and this contract's whole point (per
    // the gap instructions) is to distinguish the two rather than fail on the hover shadow.
    const withHardcodedColor = focusSelectors.filter((f) => hasHardcodedColorLiteral(f.body));
    expect(
      withHardcodedColor,
      'One or more :focus-visible/:focus-within rules hardcode a colour literal (hex or ' +
        'rgba()) instead of routing through var(--ring)/color-mix(). UIC-11 states this is ' +
        'a violation, not a case-by-case styling choice. Offending selector(s): ' +
        JSON.stringify(withHardcodedColor.map((f) => f.selector)),
    ).toEqual([]);
  });

  it('exactly 3 non-focus rgba(45, 122, 140, …) literals survive in globals.css (the retired focus literals are gone; the decorative uses are untouched)', () => {
    // I have independently verified there is exactly one surviving hardcoded box-shadow —
    // rgba(45, 122, 140, 0.12) on .admin-nav-card:hover — plus two non-box-shadow uses
    // (a background tint and a chip background), all decorative, none a focus rule. This
    // assertion pins the RAW file count (comments included is fine here — there are no
    // comments in this file containing this exact literal string per 38-02-PLAN.md's own
    // instruction that one must not be added) rather than re-deriving it from the parsed
    // blocks, as an independent cross-check on the two assertions above.
    const matches = globalsCssRaw.match(/rgba\(45, 122, 140/g) ?? [];
    expect(
      matches.length,
      'Expected exactly 3 surviving "rgba(45, 122, 140" occurrences in app/globals.css ' +
        '(down from 7 pre-GAP-04 — the four focus-ring literals retired, three decorative ' +
        'non-focus uses remaining). Found ' + String(matches.length) + '.',
    ).toBe(3);
  });
});

describe('GAP-04 — --ring survives a theme switch (declared in both the light and dark token blocks)', () => {
  it('--ring is declared exactly twice in app/globals.css: once in the light :root block, once in the html[data-theme="dark"] block', () => {
    const ringDeclarations = [...globalsCss.matchAll(/^\s*--ring:\s*var\(--brand-accent\);?\s*$/gm)];
    expect(
      ringDeclarations.length,
      'Expected exactly 2 "--ring: var(--brand-accent);" declarations in app/globals.css ' +
        '(light + dark). Found ' + String(ringDeclarations.length) + '. If this is 1, the ' +
        'ring token does not survive a theme switch and every UIC-11 focus ring silently ' +
        'breaks in the theme missing the declaration; if it is >2, a stray duplicate ' +
        'declaration was introduced.',
    ).toBe(2);
  });

  it('the second --ring declaration sits inside (after) the html[data-theme="dark"] block opener', () => {
    const darkBlockOpenIdx = globalsCss.indexOf('html[data-theme="dark"] {');
    expect(darkBlockOpenIdx, 'Could not find the html[data-theme="dark"] { block opener.').toBeGreaterThan(-1);

    const ringIndices = [...globalsCss.matchAll(/--ring:\s*var\(--brand-accent\)/g)].map((m) => m.index ?? -1);
    expect(ringIndices.length).toBe(2);

    const [firstRingIdx, secondRingIdx] = ringIndices;
    expect(
      firstRingIdx < darkBlockOpenIdx,
      'The first --ring declaration is not BEFORE the html[data-theme="dark"] block opener ' +
        '— expected the light-theme declaration to precede the dark block.',
    ).toBe(true);
    expect(
      secondRingIdx > darkBlockOpenIdx,
      'The second --ring declaration is not AFTER the html[data-theme="dark"] block opener ' +
        '— expected the dark-theme declaration to live inside that block.',
    ).toBe(true);
  });
});

describe('GAP-04 — LoadMoreButton ("Charger plus") carries no static aria-label; visible text is its accessible name in both states', () => {
  const loadMoreButtonPath = path.resolve(__dirname, '..', 'src/components/proposals/LoadMoreButton.tsx');
  const loadMoreButtonSrc = readFileSync(loadMoreButtonPath, 'utf-8');

  it('renders no aria-label attribute anywhere in the file', () => {
    expect(
      /aria-label/.test(loadMoreButtonSrc),
      'src/components/proposals/LoadMoreButton.tsx still contains an "aria-label" ' +
        'attribute. GAP-04 requires this control\'s visible text to be its sole accessible ' +
        'name in both idle and loading states — a static aria-label would override that ' +
        'text for assistive technology (WCAG 2.5.3 Label in Name), which is the exact ' +
        'defect this task removes.',
    ).toBe(false);
  });

  it('both the idle and loading visible-text branches read from the i18n dictionary (not a hardcoded string)', () => {
    expect(
      /t\(\s*['"]proposal\.list\.load\.more['"]\s*,\s*lang\s*\)/.test(loadMoreButtonSrc),
      'LoadMoreButton.tsx no longer calls t(\'proposal.list.load.more\', lang) for its idle ' +
        'visible-text branch.',
    ).toBe(true);
    expect(
      /t\(\s*['"]proposal\.list\.load\.more\.loading['"]\s*,\s*lang\s*\)/.test(loadMoreButtonSrc),
      'LoadMoreButton.tsx no longer calls t(\'proposal.list.load.more.loading\', lang) for ' +
        'its loading visible-text branch.',
    ).toBe(true);
  });

  it('the ternary that switches between the idle and loading text is a genuinely conditional expression, not two branches that resolve to the same call (proves the "in both states" half of the contract)', () => {
    // A component that always rendered the SAME t(...) call regardless of `loading` would
    // still satisfy the two assertions above (both strings would appear in the file
    // somewhere) while failing the actual requirement — the visible text must genuinely
    // DIFFER between idle and loading. Assert the two dictionary keys used are distinct
    // and that both appear inside a single ternary keyed on `loading`.
    const ternaryMatch = /\{\s*loading\s*\?\s*t\(\s*['"]([^'"]+)['"]\s*,\s*lang\s*\)\s*:\s*t\(\s*['"]([^'"]+)['"]\s*,\s*lang\s*\)\s*\}/.exec(
      loadMoreButtonSrc,
    );
    expect(
      ternaryMatch,
      'Could not find a "{loading ? t(\'...\', lang) : t(\'...\', lang)}" ternary in ' +
        'LoadMoreButton.tsx. Without this shape, the two dictionary-key assertions above ' +
        'could both be trivially satisfied by two calls that never actually differ based ' +
        'on the `loading` state.',
    ).not.toBeNull();
    expect(ternaryMatch![1]).toBe('proposal.list.load.more.loading');
    expect(ternaryMatch![2]).toBe('proposal.list.load.more');
    expect(ternaryMatch![1]).not.toBe(ternaryMatch![2]);
  });
});

describe('GAP-04 — UI-CONVENTIONS.md carries UIC-11 (a fifth hardcoded ring is a violation, not an accident)', () => {
  const uiConventionsPath = path.resolve(__dirname, '..', '.planning/codebase/UI-CONVENTIONS.md');
  const uiConventions = readFileSync(uiConventionsPath, 'utf-8');

  it('UIC-11 exists as its own heading, quoting the exact two-layer var(--ring) box-shadow', () => {
    expect(
      /^## UIC-11 — /m.test(uiConventions),
      'UI-CONVENTIONS.md has no "## UIC-11 — ..." heading. GAP-04 requires this rule to be ' +
        'ratified in the canonical conventions document so a future hardcoded focus colour ' +
        'is a documented violation, not an undocumented accident.',
    ).toBe(true);

    expect(
      uiConventions.includes(TWO_LAYER_INNER) && uiConventions.includes(TWO_LAYER_OUTER),
      'UI-CONVENTIONS.md does not quote the exact two-layer box-shadow ("' + TWO_LAYER_INNER +
        '" / "' + TWO_LAYER_OUTER + '"). A future reader/executor needs the literal CSS, ' +
        'not a paraphrase, to check their own work against.',
    ).toBe(true);
  });

  it('UIC-11 states a hardcoded focus colour is a violation (not phrased as an optional/case-by-case choice)', () => {
    const uic11Idx = uiConventions.indexOf('## UIC-11');
    expect(uic11Idx, 'UIC-11 heading not found.').toBeGreaterThan(-1);
    const nextHeadingIdx = uiConventions.indexOf('\n## ', uic11Idx + 1);
    const uic11Section = nextHeadingIdx === -1 ? uiConventions.slice(uic11Idx) : uiConventions.slice(uic11Idx, nextHeadingIdx);

    expect(
      /violation/i.test(uic11Section),
      'The UIC-11 section does not say a hardcoded focus colour is a "violation" — without ' +
        'this, the rule reads as advisory rather than as an enforceable convention.',
    ).toBe(true);
  });
});

// ===========================================================================
// Self-check: prove the parsing/matching logic above is non-vacuous by feeding it
// deliberately BROKEN synthetic CSS and confirming the same contracts would fail.
// ===========================================================================

describe('self-check — the parsing helpers above genuinely fail on broken input (non-vacuousness proof)', () => {
  it('padding regex rejects the retired 0.6rem value', () => {
    const badCss = stripCssComments(`
      @layer components {
        .btn-green, .btn-navy, .btn-out { padding: 0.6rem 1.5rem; }
      }
    `);
    const blocks = extractFlatRuleBlocks(badCss);
    const sharedRule = blocks.find((b) => b.selector.includes('.btn-green') && !b.selector.includes(':'));
    expect(/padding:\s*0\.5rem\s+1\.5rem\s*;/.test(sharedRule!.body)).toBe(false);
  });

  it('focus-selector count catches a MISSING selector (5 instead of 6)', () => {
    const badCss = stripCssComments(`
      @layer components {
        .btn-green:focus-visible, .btn-navy:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--ring), 0 0 0 5px color-mix(in oklab, var(--ring) 50%, transparent);
        }
        .search-bar:focus-within {
          outline: none;
          box-shadow: 0 0 0 2px var(--ring), 0 0 0 5px color-mix(in oklab, var(--ring) 50%, transparent);
        }
        .admin-nav-card:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--ring), 0 0 0 5px color-mix(in oklab, var(--ring) 50%, transparent);
        }
        .stepper-circle:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--ring), 0 0 0 5px color-mix(in oklab, var(--ring) 50%, transparent);
        }
      }
    `);
    // Only 5 focus selectors here (`.btn-out:focus-visible` deliberately omitted).
    expect(findFocusSelectors(badCss).length).toBe(5);
    expect(findFocusSelectors(badCss).length).not.toBe(6);
  });

  it('two-layer ring check catches a rule missing the OUTER halo layer', () => {
    const oneLayerOnly = 'outline: none; box-shadow: 0 0 0 2px var(--ring);';
    expect(bodyHasTwoLayerRing(oneLayerOnly)).toBe(false);
  });

  it('hardcoded-colour check catches a retired flat teal literal, but does NOT flag a clean var(--ring) rule', () => {
    const retired = 'outline: none; box-shadow: 0 0 0 3px rgba(45, 122, 140, 0.18);';
    const clean = 'outline: none; box-shadow: 0 0 0 2px var(--ring), 0 0 0 5px color-mix(in oklab, var(--ring) 50%, transparent);';
    expect(hasHardcodedColorLiteral(retired)).toBe(true);
    expect(hasHardcodedColorLiteral(clean)).toBe(false);
  });

  it('the selector-level scoping does NOT let a :hover rule\'s hardcoded shadow leak into the focus-only check (the .admin-nav-card:hover exemption, proven mechanically)', () => {
    const badCss = stripCssComments(`
      @layer components {
        .admin-nav-card:hover {
          border-color: var(--teal);
          box-shadow: 0 2px 8px rgba(45, 122, 140, 0.12);
        }
        .admin-nav-card:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--ring), 0 0 0 5px color-mix(in oklab, var(--ring) 50%, transparent);
        }
      }
    `);
    const focusSelectors = findFocusSelectors(badCss);
    // Only the :focus-visible selector should be picked up — the :hover selector (and its
    // hardcoded rgba shadow) must not appear at all.
    expect(focusSelectors.length).toBe(1);
    expect(focusSelectors[0].selector).toBe('.admin-nav-card:focus-visible');
    expect(hasHardcodedColorLiteral(focusSelectors[0].body)).toBe(false);
  });

  it('the aria-label absence check catches a static aria-label if one is reintroduced', () => {
    const badSrc = '<button aria-label="Charger plus">{loading ? t(\'x\', lang) : t(\'y\', lang)}</button>';
    expect(/aria-label/.test(badSrc)).toBe(true);
  });
});
