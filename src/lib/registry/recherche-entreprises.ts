import { normalizeSiren } from '@/lib/crm/siren';
import {
  registrySearchResponseSchema,
  toRegistryIdentity,
  type RegistryIdentity,
} from './schema';

/**
 * Phase 34 Plan 02 — the single outbound call to the public company registry
 * (FICHE-01, D-04..D-10).
 *
 * WHAT IT IS. `GET https://recherche-entreprises.api.gouv.fr/search?q=<siren>&per_page=1`,
 * measured live on 2026-09-03: HTTP 200 in 0.58s, no key, no credential header
 * of any kind. It is the only server-side outbound request in this codebase, so
 * the shape below was written from the measurement rather than copied from a
 * neighbour; the FAILURE discipline is copied, from `src/lib/health.ts`.
 *
 * IT IS A SEARCH ENDPOINT, NOT A LOOKUP BY KEY (D-05). There is no
 * `/siren/{siren}` route. The query is free-text matching that happens to hit
 * the SIREN, so the first result is NOT guaranteed to be the company asked for.
 * `results[0].siren` is therefore compared against the normalized SIREN we
 * requested, and any mismatch — like an empty result set — is `not_found`.
 * Trusting the first result blindly attaches a company to the wrong legal
 * identity, which is the single worst failure this phase can produce.
 *
 * ONLY THE SIREN LEAVES THE APP (D-07). No partner id, no user id, no company
 * name, no session material, no identifying User-Agent. The endpoint is public
 * and needs no credential, so sending one would leak identity for nothing. The
 * URL is assembled with `searchParams`, never string-concatenated.
 *
 * IT RETURNS ITS FAILURES, IT DOES NOT RAISE THEM (D-09). A registry outage
 * must never block client creation: `createClientRelationshipAction` writes
 * `registry_status = 'pending'` and carries on. So every path — network error,
 * timeout, bad status, unparseable body — resolves to a bounded reason, and the
 * raw error is logged server-side only, never returned. Same discipline as
 * `health.ts`: the classification crosses the boundary, the error does not.
 */

/** The ten registry-tier fields; defined with the parser, re-exported here. */
export type { RegistryIdentity };

export type RegistryLookupResult =
  | { ok: true; data: RegistryIdentity }
  | { ok: false; reason: 'not_found' | 'timeout' | 'upstream_error' | 'malformed' };

const REGISTRY_BASE_URL = 'https://recherche-entreprises.api.gouv.fr/search';

/**
 * 3 s. The endpoint answered in 0.58s when measured (D-04), so this is roughly
 * five times the observed latency — long enough that a slow-but-alive registry
 * still enriches the company, short enough that D-08's "client creation never
 * waits on an outage" holds even when the registry is dark.
 */
const REGISTRY_TIMEOUT_MS = 3_000;

/**
 * Map an unknown caught value to a bounded reason, modelled on `classifyError`
 * in `src/lib/health.ts`. An aborted request is a timeout; everything else is
 * an upstream failure. Nothing about the value itself is returned.
 */
function classifyFailure(e: unknown): 'timeout' | 'upstream_error' {
  if (e instanceof Error) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') return 'timeout';
  }
  if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
    return 'timeout';
  }
  return 'upstream_error';
}

/**
 * Look one company up by SIREN. Resolves on every path, including failure.
 */
export async function lookupCompanyBySiren(rawSiren: string): Promise<RegistryLookupResult> {
  // One SIREN normalisation rule exists in this codebase (D-23) and this is a
  // call site, not a second implementation. A value `normalizeSiren` refuses is
  // not an upstream failure — it is a SIREN we should never have asked about,
  // so no request is made at all.
  const siren = normalizeSiren(rawSiren);
  if (siren === undefined) return { ok: false, reason: 'not_found' };

  const url = new URL(REGISTRY_BASE_URL);
  url.searchParams.set('q', siren);
  url.searchParams.set('per_page', '1');

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[lookupCompanyBySiren] upstream status', res.status);
      return { ok: false, reason: 'upstream_error' };
    }

    const parsed = registrySearchResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
      console.error('[lookupCompanyBySiren] unparseable payload:', parsed.error.issues);
      return { ok: false, reason: 'malformed' };
    }

    // D-05, THE line of this module. The endpoint SEARCHES: `results[0]` is
    // whatever best matched the query, not a guaranteed match on the SIREN. An
    // empty array and a mismatched siren are the same outcome — we did not find
    // the company we asked for. Removing this comparison would silently attach
    // one partner's client to another company's legal identity, address and
    // administrative state. Do not "simplify" it away.
    const first = parsed.data.results[0];
    if (!first || first.siren !== siren) return { ok: false, reason: 'not_found' };

    const data = toRegistryIdentity(first, siren);
    if (data === null) return { ok: false, reason: 'not_found' };

    return { ok: true, data };
  } catch (e) {
    console.error('[lookupCompanyBySiren] failed:', e); // server-side only
    return { ok: false, reason: classifyFailure(e) };
  }
}
