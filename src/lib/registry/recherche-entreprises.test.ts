import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { lookupCompanyBySiren } from './recherche-entreprises';
import fixture from './__fixtures__/search-response.json';

/**
 * Phase 34 Plan 02 Task 2 — the outbound registry call.
 *
 * EVERY test stubs global fetch. No test performs a live call and no test
 * needs the network (design § 2). `console.error` is silenced per test and
 * asserted where the module is required to log server-side.
 */
const SIREN = '552100554';

/** Minimal stand-in for the fields the module reads off a Response. */
function httpResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function stubFetch(impl: (...args: unknown[]) => unknown) {
  const mock = vi.fn(impl);
  vi.stubGlobal('fetch', mock);
  return mock;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('lookupCompanyBySiren — the happy path', () => {
  it('test 1: HTTP 200 whose first result carries the requested siren returns the mapped identity', async () => {
    stubFetch(async () => httpResponse(fixture));

    const result = await lookupCompanyBySiren(SIREN);

    expect(result).toEqual({
      ok: true,
      data: {
        legalName: 'ELECTRICITE DE FRANCE',
        addressLine: '22 AVENUE DE WAGRAM 75008 PARIS 8',
        postalCode: '75008',
        city: 'PARIS 8',
        legalForm: '5599',
        nafCode: '35.11Z',
        nafSection: 'D',
        headcountBand: '52',
        foundedOn: '1955-01-01',
        registryState: 'A',
      },
    });
  });
});

describe('lookupCompanyBySiren — the identity assertion (D-05)', () => {
  it('test 2: a result carrying a DIFFERENT siren is not_found, and nothing from it escapes', async () => {
    const impostor = {
      results: [
        {
          ...fixture.results[0],
          siren: '999888777',
          nom_raison_sociale: 'SOCIETE HOMONYME',
          nom_complet: 'SOCIETE HOMONYME',
        },
      ],
    };
    stubFetch(async () => httpResponse(impostor));

    const result = await lookupCompanyBySiren(SIREN);

    expect(result).toEqual({ ok: false, reason: 'not_found' });
    expect(result).not.toHaveProperty('data');
    // Not one byte of the mismatched company may cross the boundary: a
    // regression here attaches a company to the wrong legal identity.
    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain('999888777');
    expect(serialised).not.toContain('SOCIETE HOMONYME');
    expect(serialised).not.toContain('WAGRAM');
  });

  it('test 3: an empty results array is not_found', async () => {
    stubFetch(async () => httpResponse({ results: [] }));

    await expect(lookupCompanyBySiren(SIREN)).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    });
  });
});

describe('lookupCompanyBySiren — the failure classification', () => {
  it('test 4: an abort timeout classifies as timeout', async () => {
    stubFetch(async () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    });

    await expect(lookupCompanyBySiren(SIREN)).resolves.toEqual({
      ok: false,
      reason: 'timeout',
    });
    expect(console.error).toHaveBeenCalled();
  });

  it('test 4b: a plain AbortError also classifies as timeout', async () => {
    stubFetch(async () => {
      throw new DOMException('Aborted', 'AbortError');
    });

    await expect(lookupCompanyBySiren(SIREN)).resolves.toEqual({
      ok: false,
      reason: 'timeout',
    });
  });

  it('test 5: HTTP 503 and HTTP 429 both classify as upstream_error', async () => {
    stubFetch(async () => httpResponse({}, 503));
    await expect(lookupCompanyBySiren(SIREN)).resolves.toEqual({
      ok: false,
      reason: 'upstream_error',
    });

    vi.unstubAllGlobals();
    stubFetch(async () => httpResponse({}, 429));
    await expect(lookupCompanyBySiren(SIREN)).resolves.toEqual({
      ok: false,
      reason: 'upstream_error',
    });
  });

  it('test 6: a body that fails the parse classifies as malformed', async () => {
    stubFetch(async () => httpResponse({ results: 'nope' }));

    await expect(lookupCompanyBySiren(SIREN)).resolves.toEqual({
      ok: false,
      reason: 'malformed',
    });
    expect(console.error).toHaveBeenCalled();
  });

  it('test 10: every failure branch RESOLVES — the exported boundary never rejects (D-09)', async () => {
    const branches: Array<() => unknown> = [
      () =>
        stubFetch(async () => {
          throw new DOMException('timed out', 'TimeoutError');
        }),
      () =>
        stubFetch(async () => {
          throw new TypeError('fetch failed');
        }),
      () => stubFetch(async () => httpResponse({}, 500)),
      () => stubFetch(async () => httpResponse({ results: 'nope' })),
      () => stubFetch(async () => httpResponse({ results: [] })),
      () =>
        stubFetch(async () => {
          // A non-Error thrown value — the classifier must still bound it.
          throw 'string failure';
        }),
    ];

    for (const arrange of branches) {
      vi.unstubAllGlobals();
      arrange();
      await expect(lookupCompanyBySiren(SIREN)).resolves.toMatchObject({ ok: false });
    }
  });

  it('test 11: the raw upstream error text never reaches the returned value', async () => {
    const raw = 'ECONNREFUSED 10.0.0.1:443';
    stubFetch(async () => {
      throw new Error(raw);
    });

    const result = await lookupCompanyBySiren(SIREN);

    expect(result).toEqual({ ok: false, reason: 'upstream_error' });
    expect(JSON.stringify(result)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(result)).not.toContain('10.0.0.1');
    // It IS logged, server-side only.
    expect(console.error).toHaveBeenCalled();
  });

  it('the upstream status code is logged, not returned', async () => {
    stubFetch(async () => httpResponse({}, 503));

    const result = await lookupCompanyBySiren(SIREN);

    expect(JSON.stringify(result)).not.toContain('503');
    expect(console.error).toHaveBeenCalled();
  });
});

describe('lookupCompanyBySiren — what leaves the app (D-07)', () => {
  it('test 7: the request carries the SIREN and nothing else that identifies us', async () => {
    const mock = stubFetch(async () => httpResponse(fixture));

    await lookupCompanyBySiren(SIREN);

    expect(mock).toHaveBeenCalledTimes(1);
    const [input, init] = mock.mock.calls[0] as [URL | string, RequestInit | undefined];
    const url = String(input);

    expect(url).toContain('552100554');
    expect(url).toContain('per_page=1');
    expect(url.startsWith('https://recherche-entreprises.api.gouv.fr/search?')).toBe(true);

    // Nothing identifying the caller, the partner or the company.
    for (const forbidden of [
      'partner',
      'user',
      'session',
      'token',
      'cookie',
      'ELECTRICITE',
      'relationship',
    ]) {
      expect(url.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }

    // Only an Accept header — no credential and no identity header.
    const headerNames = Object.keys((init?.headers ?? {}) as Record<string, string>).map((h) =>
      h.toLowerCase(),
    );
    expect(headerNames).toEqual(['accept']);
    expect(headerNames).not.toContain('authorization');
    expect(headerNames).not.toContain('cookie');
    expect(headerNames).not.toContain('x-api-key');
    expect(init?.credentials).toBeUndefined();
  });

  it('test 8: formatting spaces are normalised away before the URL is built', async () => {
    const mock = stubFetch(async () => httpResponse(fixture));

    await lookupCompanyBySiren('552 100 554');

    const spaced = String((mock.mock.calls[0] as [URL | string])[0]);

    vi.unstubAllGlobals();
    const mock2 = stubFetch(async () => httpResponse(fixture));
    await lookupCompanyBySiren('552100554');
    const plain = String((mock2.mock.calls[0] as [URL | string])[0]);

    expect(spaced).toBe(plain);
    expect(spaced).toContain('q=552100554');
  });

  it('test 9: a malformed SIREN is not_found WITHOUT any outbound call', async () => {
    const mock = stubFetch(async () => httpResponse(fixture));

    // Fewer than nine digits, more than nine digits, none at all: a SIREN we
    // should never have asked about is not an upstream failure, and we spend
    // no request on it.
    await expect(lookupCompanyBySiren('1a2b3')).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    });
    await expect(lookupCompanyBySiren('')).resolves.toEqual({ ok: false, reason: 'not_found' });
    await expect(lookupCompanyBySiren('55210055')).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    });
    await expect(lookupCompanyBySiren('5521005541')).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    });

    expect(mock).not.toHaveBeenCalled();
  });

  it('applies normalizeSiren’s rule exactly — interleaved junk around nine digits is stripped, not refused', async () => {
    // `normalizeSiren` keeps the digits and refuses anything that is not
    // exactly nine of them. This module is a CALL SITE of that rule, not a
    // second opinion on it: `1a2b3c4d5e6f7g8h9` carries nine digits, so it
    // becomes 123456789 here exactly as it does in `createClientSchema` and in
    // the reconciliation engine. A module-local stricter rule is precisely the
    // drift `src/lib/crm/siren.ts` exists to prevent.
    const mock = stubFetch(async () => httpResponse({ results: [] }));

    await lookupCompanyBySiren('1a2b3c4d5e6f7g8h9');

    expect(mock).toHaveBeenCalledTimes(1);
    expect(String((mock.mock.calls[0] as [URL | string])[0])).toContain('q=123456789');
  });
});
