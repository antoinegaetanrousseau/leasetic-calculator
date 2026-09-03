import { describe, it, expect } from 'vitest';
import {
  HEADCOUNT_BAND_LABELS,
  NAF_SECTION_LABELS,
  headcountBandLabel,
  nafSectionLabel,
} from './labels';

/**
 * Phase 34 Plan 02 Task 1 — the two code→label tables (D-06).
 *
 * The registry returns codes and never labels, so the app owns the tables.
 * The fallback matters more than the table itself: INSEE has revised the
 * headcount list before, and a partner seeing "99" is a far smaller failure
 * than a client page that crashes or silently blanks the field.
 */
describe('headcountBandLabel (INSEE tranche_effectif_salarie)', () => {
  it('test 7: renders a known code as its INSEE band', () => {
    expect(headcountBandLabel('32')).toBe('250 à 499 salariés');
    // The design's illustrative example had this pair swapped; the published
    // list is what ships (see 34-02-PLAN decision record).
    expect(headcountBandLabel('42')).toBe('1 000 à 1 999 salariés');
    expect(headcountBandLabel('NN')).toBe('Unité non employeuse');
  });

  it('test 8: renders an unrecognised code as the raw code', () => {
    expect(headcountBandLabel('99')).toBe('99');
  });

  it('test 9: renders null, undefined and blank as null', () => {
    expect(headcountBandLabel(null)).toBeNull();
    expect(headcountBandLabel(undefined)).toBeNull();
    expect(headcountBandLabel('   ')).toBeNull();
  });
});

describe('nafSectionLabel (NAF rév. 2 sections A–U)', () => {
  it('test 10: renders a known section letter as its label', () => {
    expect(nafSectionLabel('M')).toBe('Activités spécialisées, scientifiques et techniques');
    expect(nafSectionLabel('A')).toBe('Agriculture, sylviculture et pêche');
    expect(nafSectionLabel('U')).toBe('Activités extra-territoriales');
  });

  it('test 11: renders an unrecognised section as the raw code', () => {
    expect(nafSectionLabel('Z')).toBe('Z');
  });

  it('renders null, undefined and blank as null', () => {
    expect(nafSectionLabel(null)).toBeNull();
    expect(nafSectionLabel(undefined)).toBeNull();
    expect(nafSectionLabel('')).toBeNull();
  });
});

describe('the tables themselves', () => {
  it('test 12: 16 headcount bands and 21 NAF sections, no more and no fewer', () => {
    expect(Object.keys(HEADCOUNT_BAND_LABELS)).toHaveLength(16);
    expect(Object.keys(NAF_SECTION_LABELS)).toHaveLength(21);
  });

  it('carries the exact INSEE headcount code set', () => {
    expect(Object.keys(HEADCOUNT_BAND_LABELS).sort()).toEqual(
      ['NN', '00', '01', '02', '03', '11', '12', '21', '22', '31', '32', '41', '42', '51', '52', '53'].sort(),
    );
  });

  it('carries sections A through U with no gap', () => {
    const expected = Array.from({ length: 21 }, (_, i) => String.fromCharCode(65 + i));
    expect(Object.keys(NAF_SECTION_LABELS).sort()).toEqual(expected);
  });
});
