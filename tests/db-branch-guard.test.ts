/**
 * Behavioural + fail-safe + SKIP-rule proof for `scripts/_db-branch-guard.ts` (OPS-05,
 * Phase 39 Plan 03 Task 1).
 *
 * Fixtures use `postgres://fixture:fixture@` placeholders and a distinctive query string
 * (`?sslmode=require&secretmarker=MUSTNOTAPPEAR`) so the "the refusal message contains no
 * credential" assertion is provable rather than merely asserted. `processEnv` is passed
 * explicitly per case — never `{ ...process.env }` — and no path here is
 * `process.cwd()`-relative or a real repo `.env*` file; every fixture lives under a
 * `mkdtempSync` temp directory that is removed in `afterEach`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assertSafeDatabaseTarget, classifyDatabaseTarget } from '../scripts/_db-branch-guard';

const PRODUCTION_HOST = 'ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech';
const PREVIEW_HOST = 'ep-delicate-night-als4ogpc-pooler.c-3.eu-central-1.aws.neon.tech';
const DEVELOPMENT_HOST = 'ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech';

const FIXTURE_QUERY = 'sslmode=require&secretmarker=MUSTNOTAPPEAR';

function urlFor(host: string, port?: number): string {
  const hostPart = port === undefined ? host : `${host}:${String(port)}`;
  return `postgres://fixture:fixture@${hostPart}/db?${FIXTURE_QUERY}`;
}

let tempDir: string;

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  tempDir = mkdtempSync(join(tmpdir(), 'db-branch-guard-'));
  return tempDir;
}

describe('classifyDatabaseTarget', () => {
  it('classifies the production endpoint as refuse-production', () => {
    const result = classifyDatabaseTarget(urlFor(PRODUCTION_HOST));
    expect(result.verdict).toBe('refuse-production');
    expect(result.hostname).toBe(PRODUCTION_HOST);
  });

  it('classifies the production endpoint as refuse-production even with an explicit :5432 port (bug_011)', () => {
    // URL.host would carry ":5432" and could slip a naive prefix match checking `host`
    // instead of `hostname`. `new URL(url).hostname` strips the port entirely.
    const result = classifyDatabaseTarget(urlFor(PRODUCTION_HOST, 5432));
    expect(result.verdict).toBe('refuse-production');
    expect(result.hostname).toBe(PRODUCTION_HOST);
  });

  it('classifies the preview endpoint as warn-preview', () => {
    const result = classifyDatabaseTarget(urlFor(PREVIEW_HOST));
    expect(result.verdict).toBe('warn-preview');
    expect(result.hostname).toBe(PREVIEW_HOST);
  });

  it('classifies the development endpoint as ok-development', () => {
    const result = classifyDatabaseTarget(urlFor(DEVELOPMENT_HOST));
    expect(result.verdict).toBe('ok-development');
    expect(result.hostname).toBe(DEVELOPMENT_HOST);
  });

  it('classifies localhost as ok-local-postgres', () => {
    const result = classifyDatabaseTarget('postgres://u:p@localhost:5432/db');
    expect(result.verdict).toBe('ok-local-postgres');
    expect(result.hostname).toBe('localhost');
  });

  it('classifies 127.0.0.1 as ok-local-postgres', () => {
    const result = classifyDatabaseTarget('postgres://u:p@127.0.0.1:5432/db');
    expect(result.verdict).toBe('ok-local-postgres');
    expect(result.hostname).toBe('127.0.0.1');
  });

  it('FAIL-SAFE: an unrecognised Neon host refuses rather than passing', () => {
    const result = classifyDatabaseTarget(
      urlFor('ep-some-future-branch-abc123-pooler.c-3.eu-central-1.aws.neon.tech'),
    );
    expect(result.verdict).toBe('refuse-unrecognised');
    expect(result.verdict).not.toBe('ok-development');
    expect(result.verdict).not.toBe('ok-local-postgres');
  });

  it('FAIL-SAFE: a lookalike domain refuses as unrecognised, never as production or ok', () => {
    const result = classifyDatabaseTarget(
      urlFor('ep-icy-boat-alx5o1tz-pooler.c-3.neon.tech.evil.test'),
    );
    expect(result.verdict).toBe('refuse-unrecognised');
    expect(result.verdict).not.toBe('refuse-production');
    expect(result.verdict).not.toBe('ok-development');
    expect(result.verdict).not.toBe('ok-local-postgres');
  });

  it('returns refuse-malformed with hostname \'\' for a non-URL string', () => {
    const result = classifyDatabaseTarget('not-a-url-at-all');
    expect(result.verdict).toBe('refuse-malformed');
    expect(result.hostname).toBe('');
  });
});

describe('assertSafeDatabaseTarget', () => {
  it('SKIP rule: returns without calling onRefuse when no env file exists on disk, even with a production DATABASE_URL in processEnv', () => {
    const dir = makeTempDir();
    let refuseCalls = 0;
    assertSafeDatabaseTarget({
      cwd: dir,
      nodeEnv: 'production',
      processEnv: { NODE_ENV: 'production', DATABASE_URL: urlFor(PRODUCTION_HOST) },
      onRefuse: (): never => {
        refuseCalls += 1;
        throw new Error('onRefuse should not have been called');
      },
    });
    expect(refuseCalls).toBe(0);
  });

  /**
   * 39-REVIEW WR-07. The SKIP rule is computed per-node-env, not per-machine.
   * `envFileOrder('test')` excludes `.env.local` outright, so a machine holding ONLY
   * `.env.local` has an empty candidate set under `NODE_ENV=test` and the guard returns
   * silently — even with a production DATABASE_URL in the ambient environment, and even
   * though a production env file may well be sitting right next to it on disk.
   *
   * This test does not endorse that; it PINS it, so the behaviour is a known position
   * rather than something rediscovered during an incident. `scripts/_db-branch-guard.ts`
   * carries the analysis: what the safe broadening looks like, and why the obvious one
   * (skip only when no `.env*` exists at all) would break the MIGRATE PROD workflow,
   * since `.env.example` is committed. If a future change makes this refuse, that is an
   * IMPROVEMENT — update this test to expect the refusal.
   */
  it('KNOWN GAP (pinned): nodeEnv test with .env.local on disk skips, even with a production DATABASE_URL in processEnv', () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, '.env.local'), `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`);
    writeFileSync(join(dir, '.env.production.local'), `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`);

    let refuseCalls = 0;
    assertSafeDatabaseTarget({
      cwd: dir,
      nodeEnv: 'test',
      processEnv: { NODE_ENV: 'test', DATABASE_URL: urlFor(PRODUCTION_HOST) },
      onRefuse: (): never => {
        refuseCalls += 1;
        throw new Error('refused');
      },
    });

    expect(
      refuseCalls,
      'The NODE_ENV=test SKIP gap has changed behaviour. If the guard now refuses here, that is ' +
        'the WR-07 hardening landing — update this expectation and the analysis in ' +
        'scripts/_db-branch-guard.ts together.',
    ).toBe(0);
  });

  it('refuses exactly once when .env.production.local (production host) is present and nodeEnv is production', () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, '.env.production.local'), `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`);

    let refuseCalls = 0;
    let capturedMessage = '';
    expect(() => {
      assertSafeDatabaseTarget({
        cwd: dir,
        nodeEnv: 'production',
        processEnv: { NODE_ENV: 'production' },
        onRefuse: (message: string): never => {
          refuseCalls += 1;
          capturedMessage = message;
          throw new Error('refused');
        },
      });
    }).toThrow('refused');

    expect(refuseCalls).toBe(1);
    expect(capturedMessage).toContain(PRODUCTION_HOST);
    expect(capturedMessage).toContain('.env.production.local');
  });

  it('the refusal message contains the hostname and source filename, and none of the fixture credential material', () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, '.env.production.local'), `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`);

    let capturedMessage = '';
    expect(() => {
      assertSafeDatabaseTarget({
        cwd: dir,
        nodeEnv: 'production',
        processEnv: { NODE_ENV: 'production' },
        onRefuse: (message: string): never => {
          capturedMessage = message;
          throw new Error('refused');
        },
      });
    }).toThrow('refused');

    expect(capturedMessage).toContain(PRODUCTION_HOST);
    expect(capturedMessage).toContain('.env.production.local');
    expect(capturedMessage).not.toContain('MUSTNOTAPPEAR');
    expect(capturedMessage).not.toContain('fixture:fixture');
    expect(capturedMessage).not.toContain('postgres://');
  });

  it('does NOT refuse when nodeEnv is development — .env.local (development host) wins over .env.production.local (production host)', () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, '.env.production.local'), `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`);
    writeFileSync(join(dir, '.env.local'), `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`);

    let refuseCalls = 0;
    assertSafeDatabaseTarget({
      cwd: dir,
      nodeEnv: 'development',
      processEnv: { NODE_ENV: 'development' },
      onRefuse: (): never => {
        refuseCalls += 1;
        throw new Error('should not refuse');
      },
    });

    expect(refuseCalls).toBe(0);
  });

  /**
   * 39-REVIEW WR-08. `tests/load-env-contracts.test.ts` Contract 5 filters to lines
   * matching `console.*(` and then tests THAT SAME LINE for an interpolated credential.
   * `defaultOnRefuse` is `console.error(message)`, and the message is assembled in
   * `buildRefusalMessage` several lines away — so any future edit that folds
   * `resolution.url` into that helper is invisible to the grep, which would keep
   * reporting D-07/D-08 as enforced. The comment "the guard's output is expected to be
   * pasted into a transcript" makes that false assurance load-bearing.
   *
   * These cases assert the OUTPUT instead of the source text, for every refuse verdict
   * reached through a file rather than only the production one. The grep stays as a
   * coarse backstop.
   */
  describe('D-07/D-08 behavioural: no refusal or warning output carries credential material', () => {
    const REFUSAL_CASES = [
      {
        verdict: 'refuse-production',
        contents: `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`,
        expectInMessage: PRODUCTION_HOST,
      },
      {
        verdict: 'refuse-unrecognised',
        contents: `DATABASE_URL=${urlFor('ep-some-future-branch-abc123-pooler.c-3.eu-central-1.aws.neon.tech')}\n`,
        expectInMessage: 'ep-some-future-branch-abc123-pooler.c-3.eu-central-1.aws.neon.tech',
      },
      {
        // refuse-malformed reached THROUGH A FILE — the path a real operator hits, and
        // the one where classifyDatabaseTarget returns hostname '' so the message is
        // assembled down a different branch of buildRefusalMessage. The value must have
        // no parseable scheme at all: `postgres-fixture:` WOULD parse (a scheme may
        // contain '-'), yielding refuse-unrecognised rather than refuse-malformed.
        verdict: 'refuse-malformed',
        contents: 'DATABASE_URL=not-a-url-MUSTNOTAPPEAR\n',
        expectInMessage: 'malformed',
      },
    ];

    for (const testCase of REFUSAL_CASES) {
      it(`${testCase.verdict}: the message names the target and leaks no credential`, () => {
        const dir = makeTempDir();
        writeFileSync(join(dir, '.env.local'), testCase.contents);

        let capturedMessage = '';
        expect(() => {
          assertSafeDatabaseTarget({
            cwd: dir,
            nodeEnv: 'development',
            processEnv: { NODE_ENV: 'development' },
            onRefuse: (message: string): never => {
              capturedMessage = message;
              throw new Error('refused');
            },
          });
        }).toThrow('refused');

        expect(capturedMessage).toContain(testCase.expectInMessage);
        expect(capturedMessage).toContain('.env.local');
        expect(capturedMessage).not.toContain('MUSTNOTAPPEAR');
        expect(capturedMessage).not.toContain('fixture:fixture');
        expect(capturedMessage).not.toContain('postgres://');
      });
    }

    it('warn-preview: warns without refusing, naming the host and no credential', () => {
      const dir = makeTempDir();
      writeFileSync(join(dir, '.env.local'), `DATABASE_URL=${urlFor(PREVIEW_HOST)}\n`);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      let refuseCalls = 0;
      // Snapshot the recorded calls BEFORE restoring: mockRestore() also resets the
      // mock's state, so reading warnSpy.mock.calls afterwards always sees an empty array
      // and the assertion would pass or fail for the wrong reason.
      let warnCalls: unknown[][] = [];
      try {
        assertSafeDatabaseTarget({
          cwd: dir,
          nodeEnv: 'development',
          processEnv: { NODE_ENV: 'development' },
          onRefuse: (): never => {
            refuseCalls += 1;
            throw new Error('should not refuse');
          },
        });
      } finally {
        warnCalls = warnSpy.mock.calls.map((call) => [...call]);
        warnSpy.mockRestore();
      }

      expect(refuseCalls).toBe(0);
      expect(warnCalls).toHaveLength(1);
      const warning = warnCalls[0].join(' ');
      expect(warning).toContain(PREVIEW_HOST);
      expect(warning).toContain('.env.local');
      expect(warning).not.toContain('MUSTNOTAPPEAR');
      expect(warning).not.toContain('fixture:fixture');
      expect(warning).not.toContain('postgres://');
    });
  });

  it('does not refuse a temp dir with only .env.local (development host) and nodeEnv development', () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, '.env.local'), `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`);

    let refuseCalls = 0;
    assertSafeDatabaseTarget({
      cwd: dir,
      nodeEnv: 'development',
      processEnv: { NODE_ENV: 'development' },
      onRefuse: (): never => {
        refuseCalls += 1;
        throw new Error('should not refuse');
      },
    });

    expect(refuseCalls).toBe(0);
  });
});
