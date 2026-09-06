/**
 * 39-REVIEW CR-03: the fixture seeders' write-target gate is an ALLOWLIST.
 *
 * The three seeders previously each carried their own copy of a DENYLIST
 * (`NEON_ENDPOINTS.filter((e) => e.branch !== 'development')`, refuse on a
 * `startsWith(prefix)` hit) and wrote to anything that missed it. This suite pins the
 * two bypasses that followed — an endpoint absent from `scripts/_neon-endpoints.list`,
 * and an uppercase spelling of the production hostname — plus a grep contract that all
 * three seeders route through the one shared helper rather than reintroducing a local
 * copy.
 *
 * The seeders themselves are not executed here: they import `./_load-env` and
 * `@neondatabase/serverless` at module scope, so importing one would run the shared
 * loader and open a client. The gate is tested through the pure helper the seeders
 * call, and the grep contract is what ties the helper to all three call sites.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDevelopmentTarget, developmentTargetRefusalMessage } from '../scripts/_development-target';

const PRODUCTION_HOST = 'ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech';
const PREVIEW_HOST = 'ep-delicate-night-als4ogpc-pooler.c-3.eu-central-1.aws.neon.tech';
const DEVELOPMENT_HOST = 'ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech';

const SEEDERS = [
  'scripts/seed-fiche-fixtures.ts',
  'scripts/seed-pipeline-fixtures.ts',
  'scripts/seed-reconciliation-fixtures.ts',
];

describe('isDevelopmentTarget (seeder write-target allowlist)', () => {
  it('permits the Neon development branch endpoint', () => {
    expect(isDevelopmentTarget(DEVELOPMENT_HOST)).toBe(true);
  });

  it('permits local Postgres', () => {
    expect(isDevelopmentTarget('localhost')).toBe(true);
    expect(isDevelopmentTarget('127.0.0.1')).toBe(true);
  });

  it('refuses the production endpoint', () => {
    expect(isDevelopmentTarget(PRODUCTION_HOST)).toBe(false);
  });

  it('refuses the preview endpoint', () => {
    expect(isDevelopmentTarget(PREVIEW_HOST)).toBe(false);
  });

  /**
   * BYPASS 1. Neon issues a new endpoint id whenever `main` is recreated. Under the old
   * denylist that host was simply "not forbidden" and the seeders wrote to it. The
   * `.list` header's stated contract is the opposite: absent means PRODUCTION.
   */
  it('FAIL-SAFE: refuses an endpoint id absent from _neon-endpoints.list', () => {
    expect(isDevelopmentTarget('ep-some-recreated-main-xyz789-pooler.c-3.eu-central-1.aws.neon.tech')).toBe(false);
  });

  it('FAIL-SAFE: refuses a non-Neon host entirely', () => {
    expect(isDevelopmentTarget('db.example.test')).toBe(false);
  });

  /**
   * BYPASS 2. `postgres:` is a non-special URL scheme, so `new URL()` does not lowercase
   * the host — an uppercase production hostname reached `startsWith('ep-icy-boat-...')`
   * as-is and missed. DNS is case-insensitive, so the connection still lands on
   * production.
   */
  it('BYPASS: refuses an UPPERCASE spelling of the production hostname', () => {
    expect(isDevelopmentTarget(PRODUCTION_HOST.toUpperCase())).toBe(false);
    expect(isDevelopmentTarget('EP-Icy-Boat-ALX5O1TZ-Pooler.c-3.eu-central-1.aws.neon.tech')).toBe(false);
  });

  it('accepts a mixed-case spelling of the development hostname (DNS is case-insensitive)', () => {
    expect(isDevelopmentTarget(DEVELOPMENT_HOST.toUpperCase())).toBe(true);
  });

  it('the refusal message names the host and leaks no connection string', () => {
    const message = developmentTargetRefusalMessage(PRODUCTION_HOST);
    expect(message).toContain(PRODUCTION_HOST);
    expect(message).not.toContain('postgres://');
    expect(message).toContain('PRODUCTION');
  });
});

describe('seeder call sites route through the shared allowlist', () => {
  for (const relativePath of SEEDERS) {
    it(`${relativePath} calls isDevelopmentTarget and declares no local denylist`, () => {
      const contents = readFileSync(join(process.cwd(), relativePath), 'utf8');

      expect(
        /isDevelopmentTarget\s*\(/.test(contents),
        `${relativePath} must gate its write target through isDevelopmentTarget from ` +
          'scripts/_development-target.ts, so a future fix lands once for all three seeders.',
      ).toBe(true);

      // A reintroduced local denylist. `branch !== 'development'` is the exact shape
      // that produced CR-03: everything not explicitly listed was permitted to be
      // written.
      expect(
        /branch\s*!==\s*'development'/.test(contents),
        `${relativePath} reintroduced a local denylist (branch !== 'development'). The gate ` +
          'must be an allowlist: an endpoint absent from scripts/_neon-endpoints.list is PRODUCTION.',
      ).toBe(false);
    });
  }
});
