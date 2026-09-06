/**
 * Tests for the Neon endpoint list parser and its data-integrity net.
 *
 * `scripts/_neon-endpoints.list` is the single declarative source of Neon
 * endpoint identity (D-05, D-05a). This suite pins the parser's behaviour
 * against synthetic strings (comment/blank/malformed/CRLF handling) and
 * asserts the real file's contents are self-consistent and complete.
 */
import { describe, it, expect } from 'vitest';
import { parseNeonEndpointList, NEON_ENDPOINTS } from '../scripts/_neon-endpoints';

describe('parseNeonEndpointList', () => {
  it('ignores comment lines (# as first non-whitespace char)', () => {
    const records = parseNeonEndpointList('# a comment\nep-a|ep-a-pooler.neon.tech|main|PRODUCTION');
    expect(records).toHaveLength(1);
  });

  it('ignores whitespace-then-# comment lines', () => {
    const records = parseNeonEndpointList('   # indented comment\nep-a|ep-a-pooler.neon.tech|main|PRODUCTION');
    expect(records).toHaveLength(1);
  });

  it('ignores blank and whitespace-only lines', () => {
    const records = parseNeonEndpointList('\n   \nep-a|ep-a-pooler.neon.tech|main|PRODUCTION\n\n');
    expect(records).toHaveLength(1);
  });

  it('throws naming the line number when a record has fewer than 4 fields', () => {
    const contents = '# header\nep-a|ep-a-pooler.neon.tech|main\n';
    expect(() => parseNeonEndpointList(contents)).toThrow(/:2:/);
  });

  it('throws naming the line number when branch is not one of main/preview/development (fail closed)', () => {
    const contents = '# header\n\nep-a|ep-a-pooler.neon.tech|staging|SOME SCOPE\n';
    expect(() => parseNeonEndpointList(contents)).toThrow(/:3:/);
    expect(() => parseNeonEndpointList(contents)).toThrow(/branch/i);
  });

  it('does not leak a trailing \\r (CRLF) into the scope field', () => {
    const records = parseNeonEndpointList('ep-a|ep-a-pooler.neon.tech|main|PRODUCTION\r');
    expect(records[0].scope).toBe('PRODUCTION');
    expect(records[0].scope.endsWith('\r')).toBe(false);
  });

  /**
   * 39-REVIEW CR-02. `.list` is hand-edited by an operator whenever a branch is
   * recreated, and both TS consumers match with `hostname.startsWith(record.prefix)`
   * and take the FIRST `find()` hit. `''.startsWith` is true for EVERY string, so a
   * single record with an empty first field classifies every Neon host — production
   * included — as whatever branch that record names. These cases pin the parser as the
   * place those invariants fail closed, for every consumer at once, rather than being
   * asserted only of the currently-committed file (which cannot catch the bad edit).
   */
  describe('record invariants (fail closed)', () => {
    it('throws on an empty prefix rather than accepting a record that matches every host', () => {
      expect(() => parseNeonEndpointList('|ep-x-pooler.neon.tech|development|DEV\n')).toThrow(/:1:/);
      expect(() => parseNeonEndpointList('|ep-x-pooler.neon.tech|development|DEV\n')).toThrow(/empty/i);
    });

    it('throws on an empty hostname', () => {
      expect(() => parseNeonEndpointList('ep-x||development|DEV\n')).toThrow(/empty/i);
    });

    it('throws on an empty scope', () => {
      expect(() => parseNeonEndpointList('ep-x|ep-x-pooler.neon.tech|development|\n')).toThrow(/empty/i);
    });

    it('throws when the hostname does not start with its own prefix', () => {
      expect(() =>
        parseNeonEndpointList('ep-x|ep-y-pooler.neon.tech|development|DEV\n'),
      ).toThrow(/does not start with prefix/i);
    });

    it('throws when a prefix overlaps an earlier record, since first-find would shadow it', () => {
      const contents =
        'ep-a|ep-a-pooler.neon.tech|main|PRODUCTION\n' + 'ep-a-longer|ep-a-longer-pooler.neon.tech|development|DEV\n';
      expect(() => parseNeonEndpointList(contents)).toThrow(/:2:/);
      expect(() => parseNeonEndpointList(contents)).toThrow(/overlap/i);
    });

    it('accepts the well-formed shape these guards protect', () => {
      const records = parseNeonEndpointList(
        'ep-a|ep-a-pooler.neon.tech|main|PRODUCTION\nep-b|ep-b-pooler.neon.tech|development|DEV\n',
      );
      expect(records).toHaveLength(2);
    });
  });
});

describe('NEON_ENDPOINTS (real file)', () => {
  it('contains exactly 3 records', () => {
    expect(NEON_ENDPOINTS).toHaveLength(3);
  });

  it('returns records in file order: main, then preview, then development', () => {
    expect(NEON_ENDPOINTS[0].branch).toBe('main');
    expect(NEON_ENDPOINTS[1].branch).toBe('preview');
    expect(NEON_ENDPOINTS[2].branch).toBe('development');
  });

  it('every record hostname starts with its own prefix (self-consistency)', () => {
    for (const record of NEON_ENDPOINTS) {
      expect(record.hostname.startsWith(record.prefix)).toBe(true);
    }
  });

  it('maps the exact production hostname to branch main', () => {
    const prod = NEON_ENDPOINTS.find((e) => e.branch === 'main');
    expect(prod?.hostname).toBe('ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech');
  });
});
