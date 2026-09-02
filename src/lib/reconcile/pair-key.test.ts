import { describe, expect, it } from 'vitest';
import { canonicalPair, deriveSideKey } from './pair-key';

describe('deriveSideKey', () => {
  it('keys on siren when present', () => {
    expect(deriveSideKey({ siren: '123456789', ownerId: 'u1', nameNormalized: 'acme' })).toBe(
      'siren:123456789',
    );
  });

  it('keys on owner + normalized name when siren is absent', () => {
    expect(deriveSideKey({ siren: undefined, ownerId: 'u1', nameNormalized: 'acme' })).toBe(
      'owner:u1|name:acme',
    );
  });

  it('is pure — the same input twice returns the identical string', () => {
    const input = { siren: undefined, ownerId: 'u1', nameNormalized: 'acme' };
    expect(deriveSideKey(input)).toBe(deriveSideKey(input));
  });

  it('siren wins even when ownerId/nameNormalized differ across calls', () => {
    expect(deriveSideKey({ siren: '111111111', ownerId: 'u1', nameNormalized: 'acme' })).toBe(
      deriveSideKey({ siren: '111111111', ownerId: 'u2', nameNormalized: 'other' }),
    );
  });
});

describe('canonicalPair', () => {
  it('orders (b, a) the same as (a, b) — lexicographic ascending', () => {
    expect(canonicalPair('b', 'a')).toEqual({ sideAKey: 'a', sideBKey: 'b' });
    expect(canonicalPair('a', 'b')).toEqual({ sideAKey: 'a', sideBKey: 'b' });
  });

  it('throws on a self-pair', () => {
    expect(() => canonicalPair('a', 'a')).toThrow();
  });

  it('is idempotent regardless of input order for realistic keys', () => {
    const k1 = 'siren:111111111';
    const k2 = 'owner:u1|name:acme';
    expect(canonicalPair(k1, k2)).toEqual(canonicalPair(k2, k1));
  });
});
