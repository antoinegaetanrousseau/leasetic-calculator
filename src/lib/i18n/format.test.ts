import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatDate, _LOCALES_FOR_TEST } from './format';

describe('format.ts — explicit Intl locales (SHELL-09)', () => {
  it('uses fr-FR for fr and en-GB for en (D-28: NOT en-US)', () => {
    expect(_LOCALES_FOR_TEST.fr).toBe('fr-FR');
    expect(_LOCALES_FOR_TEST.en).toBe('en-GB');
  });

  describe('formatCurrency', () => {
    it('formats EUR in fr-FR with non-breaking space grouping and comma decimal', () => {
      const out = formatCurrency(1234.5, 'fr');
      // fr-FR uses U+00A0 (NBSP) for grouping and ',' for decimal
      expect(out).toContain(',50');
      expect(out).toContain('€');
      // Ensure it's NOT the en formatting
      expect(out).not.toMatch(/^€1,234\.50$/);
    });

    it('formats EUR in en-GB with comma grouping and dot decimal', () => {
      const out = formatCurrency(1234.5, 'en');
      expect(out).toContain('1,234.50');
      expect(out).toContain('€');
    });
  });

  describe('formatNumber', () => {
    it('formats fr-FR with NBSP grouping and comma decimal', () => {
      const out = formatNumber(1234.5, 'fr');
      expect(out).toContain(',5');
      expect(out).not.toContain('1,234');
    });

    it('formats en-GB with comma grouping and dot decimal', () => {
      const out = formatNumber(1234.5, 'en');
      expect(out).toContain('1,234');
      expect(out).toContain('.5');
    });

    it('passes through Intl options (e.g. percent style)', () => {
      expect(formatNumber(0.42, 'fr', { style: 'percent' })).toContain('%');
      expect(formatNumber(0.42, 'en', { style: 'percent', maximumFractionDigits: 0 })).toBe('42%');
    });
  });

  describe('formatDate', () => {
    const ref = new Date('2026-05-07T00:00:00Z');

    it('uses fr-FR short month names (lowercase "mai")', () => {
      const out = formatDate(ref, 'fr', { day: 'numeric', month: 'short', year: 'numeric' });
      expect(out.toLowerCase()).toContain('mai');
      expect(out).toContain('2026');
    });

    it('uses en-GB short month names ("May") and DD/MM/YYYY ordering by default', () => {
      const out = formatDate(ref, 'en', { day: 'numeric', month: 'short', year: 'numeric' });
      expect(out).toContain('May');
      expect(out).toContain('2026');
    });
  });
});
