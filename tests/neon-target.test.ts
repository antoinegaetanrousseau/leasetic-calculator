/**
 * Tests for the Neon branch resolver.
 *
 * The bug this module fixes was a *wording* bug with a safety consequence:
 * three scripts gated on `hostname.endsWith('.neon.tech')` — true of every
 * branch — and then logged "Production Neon DB detected". An operator writing
 * to `development` saw the identical warning they would see before writing to
 * `main`, which is how a warning stops being read.
 *
 * The two properties worth pinning down here are (1) each known endpoint
 * resolves to its own branch, and (2) an endpoint we do NOT recognise is
 * treated as production rather than waved through — the fail-safe direction.
 */
import { describe, it, expect } from 'vitest';
import { resolveNeonTarget } from '../scripts/_neon-target';

const SUFFIX = 'c-3.eu-central-1.aws.neon.tech';

describe('resolveNeonTarget', () => {
  it('resolves the production endpoint to `main` at production severity', () => {
    const t = resolveNeonTarget(`ep-icy-boat-alx5o1tz-pooler.${SUFFIX}`);
    expect(t.isNeon).toBe(true);
    expect(t.branch).toBe('main');
    expect(t.isProductionSeverity).toBe(true);
    expect(t.label).toContain('PRODUCTION');
  });

  it('resolves the preview endpoint to `preview`, NOT production severity', () => {
    const t = resolveNeonTarget(`ep-delicate-night-als4ogpc-pooler.${SUFFIX}`);
    expect(t.branch).toBe('preview');
    expect(t.isProductionSeverity).toBe(false);
    expect(t.label).not.toContain('PRODUCTION');
  });

  it('resolves the development endpoint to `development`, NOT production severity', () => {
    const t = resolveNeonTarget(`ep-polished-band-alphc576-pooler.${SUFFIX}`);
    expect(t.branch).toBe('development');
    expect(t.isProductionSeverity).toBe(false);
    // The whole point of the fix: a development run must not claim to be production.
    expect(t.label).not.toContain('PRODUCTION');
  });

  it('still reports isNeon for every branch, so the write gate stays as broad as before', () => {
    for (const ep of [
      'ep-icy-boat-alx5o1tz-pooler',
      'ep-delicate-night-als4ogpc-pooler',
      'ep-polished-band-alphc576-pooler',
    ]) {
      expect(resolveNeonTarget(`${ep}.${SUFFIX}`).isNeon).toBe(true);
    }
  });

  it('FAIL-SAFE: an unrecognised Neon endpoint is treated as production', () => {
    const t = resolveNeonTarget(`ep-some-future-branch-abc123-pooler.${SUFFIX}`);
    expect(t.isNeon).toBe(true);
    expect(t.branch).toBe('unknown');
    expect(t.isProductionSeverity).toBe(true);
    expect(t.label).toContain('PRODUCTION');
  });

  it('treats a non-Neon host as non-Neon and not production severity', () => {
    const t = resolveNeonTarget('localhost');
    expect(t.isNeon).toBe(false);
    expect(t.isProductionSeverity).toBe(false);
    expect(t.label).toBe('non-Neon database');
  });

  it('matches on the bare hostname, so a lookalike domain cannot impersonate a branch', () => {
    // `.neon.tech.evil.test` must not satisfy endsWith('.neon.tech').
    const t = resolveNeonTarget('ep-icy-boat-alx5o1tz-pooler.c-3.neon.tech.evil.test');
    expect(t.isNeon).toBe(false);
  });
});
