/**
 * Temp-dir fixture proof for `scripts/_env-precedence.ts` (OPS-05, D-02, D-06).
 *
 * Every case here is asserted against real files written to a throwaway
 * `mkdtemp` directory — never the repo's own `.env*` files, and never a
 * real credential. `processEnv` is always an explicit object constructed
 * per test, never the ambient runtime environment itself, so a
 * `DATABASE_URL` set in the developer's shell (or in this repo's own
 * `.env.test.local`) can never make a case pass or fail for the wrong
 * reason (D-06, D-08).
 *
 * The hostnames used below are the three real Neon endpoints documented in
 * docs/operations/neon-branch-routing.md — public DNS names, not secrets —
 * so the "which file wins" assertions read as the exact incident they
 * encode (OPS-05, 2026-09-06): `npm run check:local-db-branch` printed "OK:
 * development branch" while `npm run start` served the production endpoint,
 * because `.env.production.local` outranks `.env.local` and the guard only
 * ever looked at the latter.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { envFileOrder, resolveDatabaseUrl } from '../scripts/_env-precedence';

const PROD_HOST = 'postgres://fixture:fixture@ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech/db';
const DEV_HOST = 'postgres://fixture:fixture@ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech/db';

// Next.js augments NodeJS.ProcessEnv with a required NODE_ENV field; this
// fixture value is a type-satisfying placeholder only — resolveDatabaseUrl
// never reads NODE_ENV itself, only the explicit `nodeEnv` argument.
const BASE_PROCESS_ENV: NodeJS.ProcessEnv = { NODE_ENV: 'test' };

let rootDir: string;

afterEach(() => {
  if (rootDir) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

function makeRootDir(): string {
  rootDir = mkdtempSync(join(tmpdir(), 'env-precedence-'));
  return rootDir;
}

function writeEnvFile(dir: string, name: string, contents: string): void {
  writeFileSync(join(dir, name), contents, 'utf8');
}

describe('envFileOrder', () => {
  it('returns the development order: .env.development.local -> .env.local -> .env.development -> .env', () => {
    expect(envFileOrder('development')).toEqual([
      '.env.development.local',
      '.env.local',
      '.env.development',
      '.env',
    ]);
  });

  it('returns the production order: .env.production.local -> .env.local -> .env.production -> .env', () => {
    expect(envFileOrder('production')).toEqual(['.env.production.local', '.env.local', '.env.production', '.env']);
  });

  it('returns the test order WITHOUT .env.local: .env.test.local -> .env.test -> .env', () => {
    const order = envFileOrder('test');
    expect(order).toEqual(['.env.test.local', '.env.test', '.env']);
    expect(order).not.toContain('.env.local');
  });
});

describe('resolveDatabaseUrl — file precedence', () => {
  it('resolves from .env.local when it is the only file present (development)', () => {
    const dir = makeRootDir();
    writeEnvFile(dir, '.env.local', `DATABASE_URL=${DEV_HOST}`);

    const { resolution } = resolveDatabaseUrl({ cwd: dir, nodeEnv: 'development', processEnv: BASE_PROCESS_ENV });

    expect(resolution?.source).toBe('.env.local');
    expect(resolution?.url).toBe(DEV_HOST);
  });

  it('2026-09-06 incident: .env.production.local wins over .env.local under nodeEnv=production (OPS-05)', () => {
    const dir = makeRootDir();
    writeEnvFile(dir, '.env.production.local', `DATABASE_URL=${PROD_HOST}`);
    writeEnvFile(dir, '.env.local', `DATABASE_URL=${DEV_HOST}`);

    const { resolution } = resolveDatabaseUrl({ cwd: dir, nodeEnv: 'production', processEnv: BASE_PROCESS_ENV });

    expect(resolution?.source).toBe('.env.production.local');
    expect(resolution?.url).toBe(PROD_HOST);
  });

  it('the same directory resolves to .env.local under nodeEnv=development — .env.production.local is not consulted', () => {
    const dir = makeRootDir();
    writeEnvFile(dir, '.env.production.local', `DATABASE_URL=${PROD_HOST}`);
    writeEnvFile(dir, '.env.local', `DATABASE_URL=${DEV_HOST}`);

    const { resolution } = resolveDatabaseUrl({ cwd: dir, nodeEnv: 'development', processEnv: BASE_PROCESS_ENV });

    expect(resolution?.source).toBe('.env.local');
    expect(resolution?.url).toBe(DEV_HOST);
  });

  it('under nodeEnv=test, .env.test.local wins over .env.local — the latter never wins', () => {
    const dir = makeRootDir();
    writeEnvFile(dir, '.env.test.local', `DATABASE_URL=${DEV_HOST}`);
    writeEnvFile(dir, '.env.local', `DATABASE_URL=${PROD_HOST}`);

    const { resolution } = resolveDatabaseUrl({ cwd: dir, nodeEnv: 'test', processEnv: BASE_PROCESS_ENV });

    expect(resolution?.source).toBe('.env.test.local');
    expect(resolution?.url).toBe(DEV_HOST);
  });

  it('given only .env.local and nodeEnv=test, resolution is null and filesFound is empty', () => {
    const dir = makeRootDir();
    writeEnvFile(dir, '.env.local', `DATABASE_URL=${DEV_HOST}`);

    const { resolution, filesFound } = resolveDatabaseUrl({ cwd: dir, nodeEnv: 'test', processEnv: BASE_PROCESS_ENV });

    expect(resolution).toBeNull();
    expect(filesFound).toEqual([]);
  });

  it('an empty temp dir yields filesFound: [] and resolution: null', () => {
    const dir = makeRootDir();

    const { resolution, filesFound } = resolveDatabaseUrl({ cwd: dir, nodeEnv: 'development', processEnv: BASE_PROCESS_ENV });

    expect(resolution).toBeNull();
    expect(filesFound).toEqual([]);
  });

  it('a file present but with DATABASE_URL commented out does not win; the next file in order does, and the commented file still appears in filesFound', () => {
    const dir = makeRootDir();
    writeEnvFile(dir, '.env.local', `# DATABASE_URL=${PROD_HOST}`);
    writeEnvFile(dir, '.env', `DATABASE_URL=${DEV_HOST}`);

    const { resolution, filesFound } = resolveDatabaseUrl({ cwd: dir, nodeEnv: 'development', processEnv: BASE_PROCESS_ENV });

    expect(resolution?.source).toBe('.env');
    expect(resolution?.url).toBe(DEV_HOST);
    expect(filesFound).toEqual(['.env.local', '.env']);
  });
});

describe('resolveDatabaseUrl — quoting and whitespace forms all resolve to the same unquoted value', () => {
  it.each([
    ['export DATABASE_URL=...', `export DATABASE_URL=${DEV_HOST}`],
    ['double-quoted', `DATABASE_URL="${DEV_HOST}"`],
    ['single-quoted', `DATABASE_URL='${DEV_HOST}'`],
    ['leading whitespace', `   DATABASE_URL=${DEV_HOST}`],
  ])('%s', (_label, line) => {
    const dir = makeRootDir();
    writeEnvFile(dir, '.env.local', line);

    const { resolution } = resolveDatabaseUrl({ cwd: dir, nodeEnv: 'development', processEnv: BASE_PROCESS_ENV });

    expect(resolution?.url).toBe(DEV_HOST);
  });
});

describe('resolveDatabaseUrl — explicit processEnv precedence', () => {
  it('a non-empty processEnv.DATABASE_URL beats every file; the label reported is the sentinel value', () => {
    const dir = makeRootDir();
    writeEnvFile(dir, '.env.local', `DATABASE_URL=${DEV_HOST}`);

    const { resolution } = resolveDatabaseUrl({
      cwd: dir,
      nodeEnv: 'development',
      processEnv: { ...BASE_PROCESS_ENV, DATABASE_URL: PROD_HOST },
    });

    expect(resolution?.source).toBe('process.env');
    expect(resolution?.url).toBe(PROD_HOST);
  });

  it('an empty-string processEnv.DATABASE_URL does NOT win; file resolution proceeds', () => {
    const dir = makeRootDir();
    writeEnvFile(dir, '.env.local', `DATABASE_URL=${DEV_HOST}`);

    const { resolution } = resolveDatabaseUrl({
      cwd: dir,
      nodeEnv: 'development',
      processEnv: { ...BASE_PROCESS_ENV, DATABASE_URL: '' },
    });

    expect(resolution?.source).toBe('.env.local');
    expect(resolution?.url).toBe(DEV_HOST);
  });
});
