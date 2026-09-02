/**
 * Container-radius contract — Phase 31.1-04 (`31.1-04-PLAN.md`).
 *
 * Enforces ROADMAP criteria 4 and 5 and closes OPEN-A: every container
 * surface (cards, panels, dialogs) must render at the named
 * `--radius-container` token (16px), never a per-file px literal, and the
 * container and control radius tiers must stay structurally disjoint —
 * a container change can never propagate into Input/Button/Select/Badge,
 * and a control change can never propagate into a card/dialog/popover.
 *
 * Sibling gate: tests/radius-scale.test.ts (Plan 31.1-01) covers the
 * token-declaration layer in app/globals.css. This suite covers the
 * component layer — the classNames that actually consume those tokens.
 *
 * Source-assertion suite: reads files as text with node:fs and asserts
 * contracts on the text, after stripping comments. A docblock that merely
 * *mentions* a forbidden or required string (e.g. explaining Phase 31's
 * retired `rounded-[24px]` literal in past tense) must not satisfy or trip
 * a gate — only real className usage counts. No jsdom, no rendering, no
 * network.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

/** Strip `//` line comments and `/* ... *‍/` block comments so a comment
 * that merely mentions a forbidden or required string cannot satisfy or
 * trip an assertion below. */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

function readStripped(relativePath: string): string {
  return stripComments(readFileSync(path.join(ROOT, relativePath), 'utf-8'));
}

/** Recursively collect `.ts`/`.tsx` source files under a directory
 * (relative to repo root), skipping test files and any directory listed
 * in `excludeDirs`. Paths are returned POSIX-style (`a/b/c.tsx`) so string
 * comparisons against the allow-lists below work regardless of platform. */
function collectSourceFiles(relativeDir: string, excludeDirs: string[]): string[] {
  const absDir = path.join(ROOT, relativeDir);
  const out: string[] = [];
  for (const entry of readdirSync(absDir)) {
    const relPath = `${relativeDir}/${entry}`;
    if (excludeDirs.includes(relPath)) continue;
    const absPath = path.join(ROOT, relPath);
    const stat = statSync(absPath);
    if (stat.isDirectory()) {
      out.push(...collectSourceFiles(relPath, excludeDirs));
    } else if (
      /\.(ts|tsx)$/.test(entry) &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.test.tsx')
    ) {
      out.push(relPath);
    }
  }
  return out;
}

// ── Assertion 1 allow-list — the literal sweep ──────────────────────────
//
// Excluded directories: vendored ReUI reference blocks (never imported —
// 31.1-04-PLAN.md § Scope line).
const EXCLUDED_DIRS = ['src/components/blocks'];

// Named single-file exceptions, each with its own reason.
const NAMED_EXCEPTIONS = [
  // Frames the PDF page surface governed by the Phase 5/8 print invariant
  // (app/globals.css:214-218), not a shell container. 31.1-07 records this
  // as a named exception rather than a missed literal.
  'src/components/proposals/EmbeddedPdfPreview.tsx',
];

// Known sub-8px control-DETAIL literals — small decorative corners baked
// into primitive-internal chrome (a legend swatch, a tooltip arrow, a
// checkbox square, a flag-icon corner, a drag-handle diamond). None of
// these is a container surface; each is a fixed detail radius on a
// control, never read from a radius token.
const CONTROL_DETAIL_FILES = [
  'src/components/ui/chart.tsx', // legend swatches, 2px
  'src/components/ui/tooltip.tsx', // arrow diamond, 2px
  'src/components/ui/checkbox.tsx', // checkbox square, 6px
  'src/components/reui/phone-input.tsx', // flag-icon corner, 5px
  'src/components/reui/cascader/cascader-item.tsx', // checkbox square, 4px
];
const CONTROL_DETAIL_DIRS = [
  'src/components/reui/gantt', // drag-handle diamonds, 1-2px
];

// Discovered during Task 3 by grepping the full repo before writing this
// allow-list (same verify-before-excluding discipline the plan's Task 2
// constraint applied to the three retired literals) — NOT in
// 31.1-04-PLAN.md's original allow-list. `segmented.ts` is the shared
// chrome for DurationSegmented/YesNoToggle: a CONTROL (a segmented radio
// group), not a container. Its own header comment documents the 12px
// literal as deliberate and pre-dating this phase's radius-scale work —
// "the design system's radius-tile", explicitly decoupled from `--radius`
// so raising the base token would not silently restyle it. D-01/D-02
// (31.1-CONTEXT.md) scope this phase's back-application to container
// surfaces only (`.card`, `Card`, `Dialog`, `AlertDialog`, `Popover`, the
// three review-queue surfaces) — a segmented control is not one of those,
// so retiring this literal is out of scope here, not a missed sweep.
const CONTROL_LITERAL_ADDITIONS = ['src/components/proposal/segmented.ts'];

const ALLOWED_LITERAL_FILES = [...CONTROL_DETAIL_FILES, ...CONTROL_LITERAL_ADDITIONS];

function isAllowedLiteralFile(relPath: string): boolean {
  if (NAMED_EXCEPTIONS.includes(relPath)) return true;
  if (ALLOWED_LITERAL_FILES.includes(relPath)) return true;
  if (CONTROL_DETAIL_DIRS.some((dir) => relPath.startsWith(`${dir}/`))) return true;
  return false;
}

const PX_RADIUS_LITERAL_RX = /rounded-\[\d+px\]/;

describe('container radius — regression gate (Phase 31.1-04, closes OPEN-A)', () => {
  it('no container surface carries a px radius literal (outside the allow-list)', () => {
    const files = [
      ...collectSourceFiles('app', []),
      ...collectSourceFiles('src', EXCLUDED_DIRS),
    ];

    const offenders: string[] = [];
    for (const relPath of files) {
      if (isAllowedLiteralFile(relPath)) continue;
      const stripped = stripComments(readFileSync(path.join(ROOT, relPath), 'utf-8'));
      if (PX_RADIUS_LITERAL_RX.test(stripped)) {
        offenders.push(relPath);
      }
    }

    expect(
      offenders,
      `Unexpected px radius literal(s) outside the allow-list: ${offenders.join(', ')}. ` +
        'If this is a genuine new container surface, back-apply --radius-container ' +
        '(rounded-container). If it is a control-detail radius, add it to the allow-list ' +
        'above with a reason, the same way the existing entries are documented.',
    ).toEqual([]);
  });

  it('container primitives read the container token', () => {
    for (const relPath of [
      'src/components/ui/card.tsx',
      'src/components/ui/dialog.tsx',
      'src/components/ui/alert-dialog.tsx',
      'src/components/ui/popover.tsx',
    ]) {
      expect(
        readStripped(relPath),
        `${relPath} must read --radius-container via the rounded-container utility`,
      ).toContain('rounded-container');
    }
  });

  it("Phase 31's review card reads the container token", () => {
    const pairReviewCard = readStripped(
      'app/(admin)/[adminSegment]/companies/review/PairReviewCard.tsx',
    );
    expect(pairReviewCard).toContain('rounded-container');
  });

  it('the two dialogs no longer override the radius', () => {
    const mergeDialog = readStripped(
      'app/(admin)/[adminSegment]/companies/review/MergeDialog.tsx',
    );
    const keepSeparateDialog = readStripped(
      'app/(admin)/[adminSegment]/companies/review/KeepSeparateDialog.tsx',
    );

    const dialogContentTag = mergeDialog.match(/<DialogContent([^>]*)>/);
    expect(dialogContentTag, 'MergeDialog must render <DialogContent>').not.toBeNull();
    expect(dialogContentTag![1]).not.toMatch(/rounded-/);

    const alertDialogContentTag = keepSeparateDialog.match(/<AlertDialogContent([^>]*)>/);
    expect(
      alertDialogContentTag,
      'KeepSeparateDialog must render <AlertDialogContent>',
    ).not.toBeNull();
    expect(alertDialogContentTag![1]).not.toMatch(/rounded-/);
  });

  it('container and control tiers are disjoint', () => {
    for (const relPath of [
      'src/components/ui/input.tsx',
      'src/components/ui/button.tsx',
      'src/components/ui/select.tsx',
      'src/components/ui/badge.tsx',
    ]) {
      const stripped = readStripped(relPath);
      expect(stripped, `${relPath} must not reach the container token`).not.toMatch(
        /radius-container/,
      );
      expect(stripped, `${relPath} must still reach the control tier`).toContain('rounded-4xl');
    }
  });
});
