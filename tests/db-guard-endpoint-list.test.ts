/**
 * 39-REVIEW WR-09: the bash guard VALIDATES `_neon-endpoints.list`, it does not merely
 * read it.
 *
 * `parseNeonEndpointList` throws at module load on a malformed record, naming the line.
 * The bash reader used to tolerate records the TS parser rejects — three fields, five
 * fields, an invalid branch name (which fell through to the `unrecognised` arm) — and
 * dropped the final record entirely when the file lost its trailing newline, because
 * `read` returns non-zero on a last partial line. A single mis-edit of a file that is
 * explicitly designed to be hand-edited therefore produced "TS crashes, bash quietly
 * runs with a different table": the divergence class this phase exists to eliminate.
 *
 * The guard reads its table from beside ITSELF (`$(dirname $0)/_neon-endpoints.list`),
 * deliberately not from `--root`, so exercising a malformed table means copying the
 * script into a temp dir next to a synthetic `.list`. That is what these cases do; the
 * repository's own `.list` is never read, written or moved.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL as NodeURL, fileURLToPath } from 'node:url';

const REAL_GUARD_PATH = fileURLToPath(new NodeURL('../scripts/check-local-db-branch.sh', import.meta.url));

const DEVELOPMENT_HOST = 'ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech';
const GOOD_RECORD = `ep-polished-band-alphc576|${DEVELOPMENT_HOST}|development|DEVELOPMENT (Neon branch \`development\`)`;

let dir: string | undefined;

afterEach(() => {
  if (dir) {
    rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  }
});

/**
 * Copies the real guard next to `listContents`, then runs it against an env fixture
 * naming the development host. Any non-zero exit therefore comes from the endpoint
 * table, never from the env file.
 */
function runWithList(listContents: string): { status: number; stdout: string } {
  dir = mkdtempSync(join(tmpdir(), 'db-guard-list-'));
  const scriptDir = join(dir, 'scripts');
  rmSync(scriptDir, { recursive: true, force: true });
  writeFileSync(join(dir, '.env.local'), `DATABASE_URL=postgres://fixture:fixture@${DEVELOPMENT_HOST}/db\n`);
  copyFileSync(REAL_GUARD_PATH, join(dir, 'check-local-db-branch.sh'));
  writeFileSync(join(dir, '_neon-endpoints.list'), listContents);

  try {
    const stdout = execFileSync('bash', [join(dir, 'check-local-db-branch.sh'), '--root', dir, '--node-env', 'development'], {
      encoding: 'utf8',
      env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '' },
    });
    return { status: 0, stdout };
  } catch (error) {
    const spawnError = error as { status?: number | null; stdout?: string };
    return { status: spawnError.status ?? 1, stdout: spawnError.stdout ?? '' };
  }
}

describe('bash reader of _neon-endpoints.list (WR-09)', () => {
  it('accepts a well-formed table', () => {
    const result = runWithList(`# a comment\n\n${GOOD_RECORD}\n`);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^OK:/);
  });

  it('reads the final record even with no trailing newline', () => {
    // Without the `|| [ -n "$field_1" ]` continuation, `read` returns non-zero on the
    // last partial line and the record is silently dropped — the development endpoint
    // would then be reported as an unrecognised host.
    const result = runWithList(`# a comment\n${GOOD_RECORD}`);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^OK:/);
  });

  it('rejects a record with three fields, naming the line number', () => {
    const result = runWithList(`ep-a|ep-a-pooler.neon.tech|main\n${GOOD_RECORD}\n`);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain(':1:');
  });

  it('rejects a record with five fields, naming the line number', () => {
    const result = runWithList(`# header\nep-a|ep-a-pooler.neon.tech|main|SCOPE|extra\n${GOOD_RECORD}\n`);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain(':2:');
  });

  it('rejects an invalid branch name instead of degrading it to "unrecognised"', () => {
    const result = runWithList(`ep-a|ep-a-pooler.neon.tech|staging|SOME SCOPE\n${GOOD_RECORD}\n`);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain(':1:');
    expect(result.stdout).toMatch(/branch/i);
  });

  it('rejects a hostname that does not start with its own prefix', () => {
    const result = runWithList(`ep-a|ep-b-pooler.neon.tech|main|SCOPE\n${GOOD_RECORD}\n`);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toMatch(/does not start with prefix/i);
  });

  it('rejects an empty field', () => {
    const result = runWithList(`ep-a|ep-a-pooler.neon.tech|main|\n${GOOD_RECORD}\n`);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain(':1:');
  });

  it('skips indented comment lines rather than treating them as records', () => {
    const result = runWithList(`   # indented comment\n${GOOD_RECORD}\n`);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^OK:/);
  });

  it('tolerates whitespace padding around separators, as the TS parser does', () => {
    const padded = `ep-polished-band-alphc576 | ${DEVELOPMENT_HOST} | development | DEVELOPMENT`;
    const result = runWithList(`${padded}\n`);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^OK:/);
  });
});
