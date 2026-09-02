/**
 * Resolve a DATABASE_URL hostname to the Neon branch it actually points at.
 *
 * WHY THIS EXISTS
 * Three scripts (reconcile-proposals, backfill-partner-type,
 * backfill-coefficient-history) independently gated on
 * `hostname.endsWith('.neon.tech')` and then logged "Production Neon DB
 * detected". That predicate is true of EVERY Neon branch, so an operator saw
 * the identical production-flavoured warning whether they were about to write
 * to `development` or to `main`.
 *
 * The gate was correct; the message was not. Wording that cries production on
 * a development run is worse than no wording at all — it trains the operator to
 * dismiss the one warning that matters. This module keeps the gate exactly as
 * broad (any Neon host still requires confirmation for a write) while making
 * the message name the branch.
 *
 * Endpoint IDs come from docs/operations/neon-branch-routing.md § Lifecycle.
 * They are stable per Neon branch and change only if a branch is recreated —
 * in which case update the table below and the routing doc together.
 *
 * FAIL-SAFE: an unrecognised *.neon.tech host resolves to branch 'unknown' and
 * is reported with production severity. If we cannot prove which branch we are
 * pointed at, the only safe assumption is the most dangerous one.
 */

export type NeonBranch = 'main' | 'preview' | 'development' | 'unknown';

export interface NeonTarget {
  /** The bare DNS name, never the port-inclusive form (bug_011). */
  hostname: string;
  /** True for any *.neon.tech host — this is what write gates key on. */
  isNeon: boolean;
  /** Which Neon branch, resolved by endpoint id. */
  branch: NeonBranch;
  /**
   * True for `main`, and ALSO true for an unrecognised Neon host. Callers that
   * want to escalate wording or refuse outright should use this rather than
   * comparing `branch` themselves, so the fail-safe cannot be forgotten.
   */
  isProductionSeverity: boolean;
  /** Ready-to-log description, e.g. "Neon branch `development`". */
  label: string;
}

const ENDPOINTS: ReadonlyArray<{ prefix: string; branch: Exclude<NeonBranch, 'unknown'> }> = [
  { prefix: 'ep-icy-boat-alx5o1tz', branch: 'main' },
  { prefix: 'ep-delicate-night-als4ogpc', branch: 'preview' },
  { prefix: 'ep-polished-band-alphc576', branch: 'development' },
];

export function resolveNeonTarget(hostname: string): NeonTarget {
  const isNeon = hostname.endsWith('.neon.tech');
  if (!isNeon) {
    return {
      hostname,
      isNeon: false,
      branch: 'unknown',
      isProductionSeverity: false,
      label: 'non-Neon database',
    };
  }

  const match = ENDPOINTS.find((e) => hostname.startsWith(e.prefix));
  if (!match) {
    return {
      hostname,
      isNeon: true,
      branch: 'unknown',
      isProductionSeverity: true,
      label: 'UNRECOGNISED Neon endpoint (treated as PRODUCTION)',
    };
  }

  if (match.branch === 'main') {
    return {
      hostname,
      isNeon: true,
      branch: 'main',
      isProductionSeverity: true,
      label: 'PRODUCTION — Neon branch `main`',
    };
  }

  return {
    hostname,
    isNeon: true,
    branch: match.branch,
    isProductionSeverity: false,
    label: 'Neon branch `' + match.branch + '`',
  };
}
