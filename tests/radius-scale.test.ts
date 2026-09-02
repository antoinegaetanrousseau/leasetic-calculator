/**
 * Radius-regression gate — Phase 31.1 (`31.1-01-PLAN.md`).
 *
 * The incident this suite exists to prevent recurring is recorded at
 * `app/globals.css:66-90`: `--radius` was previously `1rem`, and because the
 * whole scale used to be derived from it via `calc(var(--radius) * n)`, that
 * single change inflated every step at once — `rounded-4xl` hit 41.6px and
 * every Input/InputGroup rendered as a pill. UIC-04 exists because of it.
 *
 * Phase 31.1 replaced the derived multiplier scale with explicit, standalone
 * px declarations and split container surfaces onto their own
 * `--radius-container*` namespace, so containers and controls now share no
 * variable. Assertion 3 below ("the control primitives still reach the
 * control tier") is the one that catches the pill regression directly — it
 * fails if a later phase re-points a control primitive onto the container
 * ladder.
 *
 * This is a source-assertion suite: it reads files as text with `node:fs`
 * and asserts contracts on the text. No jsdom, no rendering, no network.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Strip CSS block comments so a comment merely mentioning a token cannot
 * satisfy (or invalidate) a counting assertion below. */
function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Strip `//`-style line comments so the same guarantee holds for the .tsx
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
const inputTsx = readStripped('src/components/ui/input.tsx', 'ts');
const buttonTsx = readStripped('src/components/ui/button.tsx', 'ts');
const selectTsx = readStripped('src/components/ui/select.tsx', 'ts');
const badgeTsx = readStripped('src/components/ui/badge.tsx', 'ts');
const calendarTsx = readStripped('src/components/ui/calendar.tsx', 'ts');
const topbarTsx = readStripped('src/components/Topbar.tsx', 'ts');

describe('radius scale — regression gate (Phase 31.1)', () => {
  it('the radius scale is decoupled — no step derives from --radius', () => {
    expect(globalsCss).not.toMatch(/calc\(var\(--radius\)/);
  });

  it('the control tier is pinned at its pre-Phase-31.1 value', () => {
    expect(globalsCss).toMatch(/--radius-4xl:\s*26px/);
    expect(globalsCss).toMatch(/--radius-3xl:\s*22px/);
  });

  it('the control primitives still reach the control tier', () => {
    expect(inputTsx).toContain('rounded-4xl');
    expect(buttonTsx).toContain('rounded-4xl');
    expect(selectTsx).toContain('rounded-4xl');
    expect(badgeTsx).toContain('rounded-4xl');
  });

  it("the calendar's cell radius still resolves", () => {
    expect(calendarTsx).toContain('[--cell-radius:var(--radius-4xl)]');
    expect(globalsCss).toMatch(/--radius-4xl:\s*26px/);
  });

  it('the container ladder is explicit and separate', () => {
    expect(globalsCss).toMatch(/--radius-container-xs:\s*12px/);
    expect(globalsCss).toMatch(/--radius-container-sm:\s*16px/);
    expect(globalsCss).toMatch(/--radius-container-md:\s*24px/);
    expect(globalsCss).toMatch(/--radius-container-lg:\s*32px/);
    expect(globalsCss).toMatch(/--radius-container-xl:\s*40px/);
    expect(globalsCss).toMatch(/--radius-container:\s*var\(--radius-container-sm\)/);

    const containerDeclarations = globalsCss.match(/--radius-container[a-z-]*:\s*[^;]+;/g) ?? [];
    expect(containerDeclarations.length).toBeGreaterThan(0);
    for (const declaration of containerDeclarations) {
      expect(declaration).not.toMatch(/--radius-sm\b/);
      expect(declaration).not.toMatch(/--radius-md\b/);
      expect(declaration).not.toMatch(/--radius-lg\b/);
      expect(declaration).not.toMatch(/--radius-xl\b/);
      expect(declaration).not.toMatch(/--radius-2xl\b/);
    }
  });

  it('.card reads the container token', () => {
    expect(globalsCss).toMatch(/\.card\s*\{[^}]*border-radius:\s*var\(--radius-container\)/s);
  });

  it('the header height goes through the variable', () => {
    expect(globalsCss).toMatch(/--topbar-h:\s*52px/);
    expect(topbarTsx).toContain('h-[var(--topbar-h)]');
  });
});
