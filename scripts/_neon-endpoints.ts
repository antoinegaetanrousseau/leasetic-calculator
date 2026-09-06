/**
 * Typed accessor over `scripts/_neon-endpoints.list`, the single declarative
 * source of Neon endpoint identity (D-05, D-05a).
 *
 * This module is DATA-ONLY: it reads the `.list` file as text and parses it
 * with plain string operations only (`split`, `trim`). It never executes the
 * file's contents through any dynamic-code or subprocess mechanism — a
 * malformed or tampered `.list` file can at worst throw at parse time,
 * never execute (D-08).
 *
 * The `.list` file's own header documents the bug_011 hostname-not-host
 * discipline and the fail-safe direction (an unrecognised endpoint id is
 * PRODUCTION). This module does not restate that policy — see the file.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';

export interface NeonEndpointRecord {
  /** The endpoint id without the `-pooler...` suffix, for startsWith matching. */
  prefix: string;
  /** The full pooled DNS name, for exact-equality matching. */
  hostname: string;
  branch: 'main' | 'preview' | 'development';
  /** Human-readable label, e.g. "PRODUCTION (Neon branch `main`)". */
  scope: string;
}

const VALID_BRANCHES = new Set(['main', 'preview', 'development']);

/**
 * Parse the `.list` file format into typed records. Pure — takes file
 * contents as a string, exported for direct test access.
 *
 * Fails closed: a malformed record (wrong field count, unrecognised branch)
 * throws rather than being silently dropped, naming the 1-based line number.
 */
export function parseNeonEndpointList(contents: string): NeonEndpointRecord[] {
  const lines = contents.split('\n');
  const records: NeonEndpointRecord[] = [];

  for (let i = 0; i < lines.length; i++) {
    // Trailing \r (CRLF) must never leak into the last field.
    const rawLine = lines[i].endsWith('\r') ? lines[i].slice(0, -1) : lines[i];
    const lineNumber = i + 1;
    const trimmed = rawLine.trim();

    if (trimmed === '') continue;
    if (trimmed.startsWith('#')) continue;

    const fields = rawLine.split('|');
    if (fields.length !== 4) {
      throw new Error(
        `scripts/_neon-endpoints.list:${String(lineNumber)}: expected 4 |-separated fields, got ${String(fields.length)}`,
      );
    }

    const [prefix, hostname, branch, scope] = fields;
    if (!VALID_BRANCHES.has(branch)) {
      throw new Error(
        `scripts/_neon-endpoints.list:${String(lineNumber)}: invalid branch "${branch}" (must be one of main, preview, development)`,
      );
    }

    records.push({
      prefix,
      hostname,
      branch: branch as NeonEndpointRecord['branch'],
      scope,
    });
  }

  return records;
}

// `new URL(..., import.meta.url)` then resolved to a filesystem path — NOT a
// `process.cwd()`-relative path, because `tests/` and `scripts/` run from
// different working directories. Explicitly `node:url`'s `URL` class (not the
// global `URL`): under the test environment's jsdom global, the shimmed
// `URL` constructor resolves a relative ref against jsdom's fake
// `http://localhost:3000/` document location rather than the `file:` base
// passed in, which would silently point this at the wrong "file".
const LIST_PATH = fileURLToPath(new NodeURL('./_neon-endpoints.list', import.meta.url));
const LIST_CONTENTS = readFileSync(LIST_PATH, 'utf8');

/** The parsed contents of `scripts/_neon-endpoints.list`. */
export const NEON_ENDPOINTS: ReadonlyArray<NeonEndpointRecord> = parseNeonEndpointList(LIST_CONTENTS);
