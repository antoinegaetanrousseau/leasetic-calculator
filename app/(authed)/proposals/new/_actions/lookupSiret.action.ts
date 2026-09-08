'use server';
/**
 * Phase 42 Plan 08 (FIELD-01 / D-01 / D-03) — lookupSiretAction.
 *
 * Bound to the wizard step-1 SIREN field's blur handler
 * (ParametresFormCard.tsx). Reads the siège SIRET off the same registry
 * lookup already wired for the CRM (`lookupCompanyBySiren`) — a second
 * READER of that result, never a second writer of `companies.*`
 * (42-CONTEXT.md's scoping note on `RegistryIdentity.siret`).
 *
 * Contract:
 *   - requireUser() FIRST — before the argument is inspected and before any
 *     outbound call, same discipline as saveAsDraft.action.ts (PITFALLS §7.3
 *     / T-42-08-A). A Next.js server action is a public endpoint; without
 *     this an unauthenticated caller could use the app as a registry proxy.
 *   - The return shape is deliberately narrow (D-03 / T-42-08-B): every
 *     failure — a malformed SIREN, "not found", a registry timeout, an
 *     upstream error, or a siège with no SIRET — collapses to `{ ok: false }`
 *     with no reason, no message, no partial identity. The wizard UI must
 *     treat all three identically: leave the field empty and editable,
 *     render nothing. DO NOT "improve" this action later by surfacing the
 *     failure reason — that would both violate D-03's silent fallback and
 *     reopen an oracle for probing which SIRENs the registry knows.
 */
import { requireUser } from '@/lib/auth/require';
import { normalizeSiren } from '@/lib/crm/siren';
import { lookupCompanyBySiren } from '@/lib/registry/recherche-entreprises';

export async function lookupSiretAction(
  rawSiren: string,
): Promise<{ ok: true; siret: string } | { ok: false }> {
  // requireUser() FIRST — before the argument is inspected, before any
  // outbound call (T-42-08-A).
  await requireUser();

  // Malformed input short-circuits before any network call — no reason to
  // spend a request on a value we already know the registry cannot answer.
  const siren = normalizeSiren(rawSiren);
  if (siren === undefined) return { ok: false };

  const result = await lookupCompanyBySiren(siren);
  if (result.ok && result.data.siret) {
    return { ok: true, siret: result.data.siret };
  }

  // Every other outcome — not_found, timeout, upstream_error, malformed,
  // or a resolved company with no siège SIRET — is indistinguishable here
  // on purpose (D-03).
  return { ok: false };
}
