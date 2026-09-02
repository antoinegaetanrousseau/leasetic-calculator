import { describe, expect, it } from 'vitest';
import { normalizeSiren } from './siren';

describe('normalizeSiren', () => {
  it('strips spaces from a formatted siren', () => {
    expect(normalizeSiren('123 456 789')).toBe('123456789');
  });

  it('strips hyphens from a formatted siren', () => {
    expect(normalizeSiren('123-456-789')).toBe('123456789');
  });

  it('returns undefined for an 8-digit (too short) value', () => {
    expect(normalizeSiren('12345678')).toBeUndefined();
  });

  it('returns undefined for a 10-digit (too long) value', () => {
    expect(normalizeSiren('1234567890')).toBeUndefined();
  });

  it('returns undefined for a non-numeric value', () => {
    expect(normalizeSiren('abc')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(normalizeSiren('')).toBeUndefined();
  });

  it('returns undefined for a whitespace-only string', () => {
    expect(normalizeSiren('   ')).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(normalizeSiren(undefined)).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(normalizeSiren(null)).toBeUndefined();
  });

  it('returns undefined for a non-string (number) input', () => {
    expect(normalizeSiren(42)).toBeUndefined();
  });

  it('accepts an already-clean 9-digit string', () => {
    expect(normalizeSiren('123456789')).toBe('123456789');
  });

  it('is pure — the same input twice returns the identical string', () => {
    expect(normalizeSiren('123 456 789')).toBe(normalizeSiren('123 456 789'));
  });
});
