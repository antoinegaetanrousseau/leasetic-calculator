/**
 * Phase 43 Plan 04 Task 1 — the single DOC-11 absence formatter.
 *
 * `emDash` is the one helper every optional field in the rendered document
 * passes through (D-01, D-09, D-13). These tests pin its two failure modes
 * a future reader could silently reintroduce:
 *   - swallowing `0` as if it were absent (it is a real value)
 *   - substituting a hyphen or an en dash for the em dash (wrong codepoint)
 */
import { describe, expect, it } from 'vitest';

import { emDash, EM_DASH } from './em-dash';

describe('emDash', () => {
  it('returns EM_DASH for null', () => {
    expect(emDash(null)).toBe(EM_DASH);
  });

  it('returns EM_DASH for undefined', () => {
    expect(emDash(undefined)).toBe(EM_DASH);
  });

  it('returns EM_DASH for an empty string', () => {
    expect(emDash('')).toBe(EM_DASH);
  });

  it('returns EM_DASH for a whitespace-only string', () => {
    expect(emDash('   ')).toBe(EM_DASH);
  });

  it('returns a padded string untrimmed — never silently reshaped', () => {
    expect(emDash('  Paris  ')).toBe('  Paris  ');
  });

  it('does NOT swallow the number 0 — it is a real value', () => {
    expect(emDash(0)).toBe('0');
  });

  it('does NOT swallow the string "0" — it is a real value', () => {
    expect(emDash('0')).toBe('0');
  });

  it('pins EM_DASH to a single U+2014 codepoint — catches a hyphen or en dash substitution', () => {
    expect(EM_DASH.length).toBe(1);
    expect(EM_DASH.codePointAt(0)).toBe(0x2014);
  });
});
