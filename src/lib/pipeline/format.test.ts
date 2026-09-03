import { describe, expect, it } from 'vitest';
import type { Lang } from '@/lib/i18n/dictionaries';
import { PIPELINE_STAGES } from '@/lib/pipeline/stages';
import { formatConversionRate, stageLabel } from './format';

const LANGS: Lang[] = ['fr', 'en'];

describe('formatConversionRate', () => {
  for (const lang of LANGS) {
    it(`renders an em dash for a zero-denominator rate (${lang})`, () => {
      const { value } = formatConversionRate({ won: 0, total: 0, pct: null }, lang);
      expect(value).toBe('—');
    });

    it(`renders the Copywriting Contract's exact percent form (${lang})`, () => {
      const { value } = formatConversionRate({ won: 1, total: 4, pct: 25 }, lang);
      expect(value).toBe(lang === 'fr' ? '25 %' : '25%');
    });

    it(`interpolates both sublabel placeholders and leaves no literal braces (${lang})`, () => {
      const { sublabel } = formatConversionRate({ won: 1, total: 4, pct: 25 }, lang);
      expect(sublabel).not.toContain('{won}');
      expect(sublabel).not.toContain('{total}');
      expect(sublabel).toContain('1');
      expect(sublabel).toContain('4');
    });

    it(`renders a literal zero sublabel beneath the em-dash value, never suppressed (${lang})`, () => {
      const { value, sublabel } = formatConversionRate({ won: 0, total: 0, pct: null }, lang);
      expect(value).toBe('—');
      const zeroCount = (sublabel.match(/0/g) ?? []).length;
      expect(zeroCount).toBe(2);
    });
  }
});

describe('stageLabel', () => {
  it("returns 'Perdu' in fr and 'Lost' in en", () => {
    expect(stageLabel('perdu', 'fr')).toBe('Perdu');
    expect(stageLabel('perdu', 'en')).toBe('Lost');
  });

  for (const lang of LANGS) {
    it(`resolves every PIPELINE_STAGES member to a non-empty string (${lang})`, () => {
      for (const stage of PIPELINE_STAGES) {
        const label = stageLabel(stage, lang);
        expect(label.length).toBeGreaterThan(0);
      }
    });
  }
});
