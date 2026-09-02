import 'server-only';
import { and, inArray, isNull, or, sql } from 'drizzle-orm';
import { schema } from '@/lib/db';
import { normalizeSiren } from '@/lib/crm/siren';
import { canonicalPair, deriveSideKey } from './pair-key';
import type {
  DbHandle,
  PairReason,
  PlannedCompany,
  PlannedContact,
  PlannedPair,
  PlannedRelationship,
  ReconciliationPlan,
  ReconciliationSource,
  SkippedRow,
  SourceRow,
} from './types';

/**
 * Phase 31 Plan 02 — `planReconciliation`, the source-agnostic dedup/match
 * core (IMPORT-01/03/04).
 *
 * This module NEVER writes — every mutation lives in a later plan's
 * `src/lib/reconcile/apply.ts`. Keeping planning and writing in separate
 * modules is what makes success criterion 1 ("zero rows written in dry-run
 * mode") a testable assertion rather than a convention: the dry run simply
 * stops after this module returns.
 *
 * The engine reads its rows exclusively through the injected
 * `ReconciliationSource` — it contains no reference to any concrete source
 * implementation, so Phase 32 can add a second source (HubSpot) without
 * touching this file.
 */

interface EligibleRow extends Omit<SourceRow, 'companyName'> {
  companyName: string;
}

interface ExtendedRow {
  row: EligibleRow;
  nameNormalized: string;
  siren: string | undefined;
}

interface Candidate {
  ownerId: string;
  nameNormalized: string;
  siren: string | undefined;
  rows: ExtendedRow[];
}

interface UnitResolution {
  sideKey: string;
  siren: string | undefined;
  rows: ExtendedRow[];
  canonicalName: string;
  nameNormalized: string;
  existingCompanyId: string | null;
  resolvedViaMerge: boolean;
}

interface ContactAccumulator {
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  mergedFromSourceRowIds: string[];
}

function normalizeContactName(name: string): string {
  const diacritics = /[\u0300-\u036f]/g;
  return name.trim().normalize('NFD').replace(diacritics, '').toLowerCase();
}

/** OQ-2: most frequent raw spelling wins; ties break on earliest occurrence, then lexicographic ascending. */
function pickCanonicalName(entries: Array<{ raw: string; occurredAt: Date }>): string {
  const stats = new Map<string, { count: number; earliest: number }>();
  for (const entry of entries) {
    const t = entry.occurredAt.getTime();
    const existing = stats.get(entry.raw);
    if (existing) {
      existing.count += 1;
      if (t < existing.earliest) existing.earliest = t;
    } else {
      stats.set(entry.raw, { count: 1, earliest: t });
    }
  }
  const [winner] = [...stats.entries()].sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count;
    if (a[1].earliest !== b[1].earliest) return a[1].earliest - b[1].earliest;
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });
  return winner![0];
}

function contactsMatch(
  a: { email: string | null; name: string },
  b: { email: string | null; name: string },
): boolean {
  const emailA = a.email?.trim().toLowerCase() ?? null;
  const emailB = b.email?.trim().toLowerCase() ?? null;
  if (emailA && emailB) return emailA === emailB;
  return normalizeContactName(a.name) === normalizeContactName(b.name);
}

export async function planReconciliation(args: {
  dbi: DbHandle;
  source: ReconciliationSource;
  now: Date;
}): Promise<ReconciliationPlan> {
  const { dbi, source, now } = args;
  const rawRows = await source.loadRows(dbi);

  // ── Step: row-level partition (D-01 exclusion happens inside the source; D-02/OQ-1 here) ──
  const skipped: SkippedRow[] = [];
  const eligible: EligibleRow[] = [];
  for (const row of rawRows) {
    if (row.alreadyLinkedRelationshipId !== null) {
      skipped.push({ sourceRowId: row.sourceRowId, reason: 'already_linked' });
      continue;
    }
    const trimmedName = row.companyName?.trim() ?? '';
    if (trimmedName.length === 0) {
      skipped.push({ sourceRowId: row.sourceRowId, reason: 'blank_company_name' });
      continue;
    }
    eligible.push({ ...row, companyName: row.companyName as string });
  }

  // ── Batched company-name normalization through the versioned DB function (D-10) ──
  const distinctNames = [...new Set(eligible.map((r) => r.companyName))];
  const nameNormalizedMap = new Map<string, string>();
  if (distinctNames.length > 0) {
    const result = await dbi.execute(
      sql`SELECT DISTINCT v AS raw, leasetic_normalize_company_name(v) AS norm FROM unnest(${sql.param(distinctNames)}::text[]) AS v`,
    );
    const rows = (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as Array<{
      raw: string;
      norm: string;
    }>;
    for (const r of rows) nameNormalizedMap.set(r.raw, r.norm);
  }

  const extendedRows: ExtendedRow[] = eligible.map((row) => ({
    row,
    nameNormalized: nameNormalizedMap.get(row.companyName) ?? '',
    siren: normalizeSiren(row.rawSiren),
  }));

  // ── Step 1 — per-owner candidate derivation ──
  const ownerNameGroups = new Map<string, ExtendedRow[]>();
  for (const er of extendedRows) {
    const key = `${er.row.ownerId}|${er.nameNormalized}`;
    const arr = ownerNameGroups.get(key) ?? [];
    arr.push(er);
    ownerNameGroups.set(key, arr);
  }

  const candidates: Candidate[] = [];
  for (const groupRows of ownerNameGroups.values()) {
    const ownerId = groupRows[0]!.row.ownerId;
    const nameNormalized = groupRows[0]!.nameNormalized;
    const distinctSirens = [...new Set(groupRows.filter((r) => r.siren !== undefined).map((r) => r.siren as string))];
    if (distinctSirens.length <= 1) {
      candidates.push({ ownerId, nameNormalized, siren: distinctSirens[0], rows: groupRows });
      continue;
    }
    for (const siren of distinctSirens) {
      candidates.push({ ownerId, nameNormalized, siren, rows: groupRows.filter((r) => r.siren === siren) });
    }
    const sirenless = groupRows.filter((r) => r.siren === undefined);
    if (sirenless.length > 0) {
      candidates.push({ ownerId, nameNormalized, siren: undefined, rows: sirenless });
    }
  }

  // ── Step 2 — merge candidates that resolve to the same side identity key (cross-owner SIREN merge) ──
  const unitsBySideKey = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const sideKey = deriveSideKey({
      siren: candidate.siren,
      ownerId: candidate.ownerId,
      nameNormalized: candidate.nameNormalized,
    });
    const arr = unitsBySideKey.get(sideKey) ?? [];
    arr.push(candidate);
    unitsBySideKey.set(sideKey, arr);
  }

  // ── Bounded registry reads ──
  const sirenValues = [...unitsBySideKey.keys()]
    .filter((k) => k.startsWith('siren:'))
    .map((k) => k.slice('siren:'.length));

  const companyBySiren = new Map<string, string>();
  if (sirenValues.length > 0) {
    const rows = await dbi
      .select({ id: schema.companies.id, siren: schema.companies.siren })
      .from(schema.companies)
      .where(inArray(schema.companies.siren, sirenValues));
    for (const r of rows) if (r.siren) companyBySiren.set(r.siren, r.id);
  }

  const nameOwnerEntries = [...unitsBySideKey.entries()].filter(([k]) => k.startsWith('owner:'));
  const distinctNameNormalizedForOwners = [...new Set(nameOwnerEntries.map(([, cands]) => cands[0]!.nameNormalized))];
  const distinctOwnersForNames = [...new Set(nameOwnerEntries.map(([, cands]) => cands[0]!.ownerId))];

  const companiesByName = new Map<string, string>(); // companyId -> nameNormalized
  if (distinctNameNormalizedForOwners.length > 0) {
    const rows = await dbi
      .select({ id: schema.companies.id, nameNormalized: schema.companies.nameNormalized })
      .from(schema.companies)
      .where(and(
        inArray(schema.companies.nameNormalized, distinctNameNormalizedForOwners),
        isNull(schema.companies.siren),
      ));
    for (const r of rows) companiesByName.set(r.id, r.nameNormalized);
  }

  const nameCompanyIds = [...companiesByName.keys()];
  const relByCompanyOwner = new Map<string, string>(); // `${companyId}|${ownerId}` -> relationshipId
  const reuseByOwnerName = new Map<string, string>(); // `${ownerId}|${nameNormalized}` -> companyId

  const sirenCompanyIds = [...companyBySiren.values()];
  if (sirenCompanyIds.length > 0) {
    const rows = await dbi
      .select({
        relationshipId: schema.clientRelationships.id,
        companyId: schema.clientRelationships.companyId,
        ownerId: schema.clientRelationships.ownerId,
      })
      .from(schema.clientRelationships)
      .where(inArray(schema.clientRelationships.companyId, sirenCompanyIds));
    for (const r of rows) relByCompanyOwner.set(`${r.companyId}|${r.ownerId}`, r.relationshipId);
  }

  if (nameCompanyIds.length > 0 && distinctOwnersForNames.length > 0) {
    const rows = await dbi
      .select({
        relationshipId: schema.clientRelationships.id,
        companyId: schema.clientRelationships.companyId,
        ownerId: schema.clientRelationships.ownerId,
      })
      .from(schema.clientRelationships)
      .where(and(
        inArray(schema.clientRelationships.companyId, nameCompanyIds),
        inArray(schema.clientRelationships.ownerId, distinctOwnersForNames),
      ));
    for (const r of rows) {
      relByCompanyOwner.set(`${r.companyId}|${r.ownerId}`, r.relationshipId);
      const nameNormalized = companiesByName.get(r.companyId);
      if (nameNormalized !== undefined) {
        reuseByOwnerName.set(`${r.ownerId}|${nameNormalized}`, r.companyId);
      }
    }
  }

  const allRelationshipIds = [...new Set([...relByCompanyOwner.values()])];
  const contactsByRelationship = new Map<
    string,
    Array<{ id: string; name: string; role: string | null; phone: string | null; email: string | null; source: string | null }>
  >();
  if (allRelationshipIds.length > 0) {
    const rows = await dbi
      .select({
        id: schema.contacts.id,
        clientRelationshipId: schema.contacts.clientRelationshipId,
        name: schema.contacts.name,
        role: schema.contacts.role,
        phone: schema.contacts.phone,
        email: schema.contacts.email,
        source: schema.contacts.source,
      })
      .from(schema.contacts)
      .where(inArray(schema.contacts.clientRelationshipId, allRelationshipIds));
    for (const r of rows) {
      const arr = contactsByRelationship.get(r.clientRelationshipId) ?? [];
      arr.push(r);
      contactsByRelationship.set(r.clientRelationshipId, arr);
    }
  }

  const sideKeys = [...unitsBySideKey.keys()];
  const pairDecisionByCanonicalKey = new Map<
    string,
    { sideAKey: string; sideBKey: string; verdict: string | null; survivorCompanyId: string | null }
  >();
  const mergedSurvivorBySideKey = new Map<string, string>();
  if (sideKeys.length > 0) {
    const rows = await dbi
      .select({
        sideAKey: schema.companyPairDecisions.sideAKey,
        sideBKey: schema.companyPairDecisions.sideBKey,
        verdict: schema.companyPairDecisions.verdict,
        survivorCompanyId: schema.companyPairDecisions.survivorCompanyId,
      })
      .from(schema.companyPairDecisions)
      .where(or(
        inArray(schema.companyPairDecisions.sideAKey, sideKeys),
        inArray(schema.companyPairDecisions.sideBKey, sideKeys),
      ));
    for (const r of rows) {
      const canon = canonicalPair(r.sideAKey, r.sideBKey);
      pairDecisionByCanonicalKey.set(`${canon.sideAKey}|${canon.sideBKey}`, { ...canon, verdict: r.verdict, survivorCompanyId: r.survivorCompanyId });
      if (r.verdict === 'merged' && r.survivorCompanyId) {
        mergedSurvivorBySideKey.set(r.sideAKey, r.survivorCompanyId);
        mergedSurvivorBySideKey.set(r.sideBKey, r.survivorCompanyId);
      }
    }
  }

  // ── Resolve every unit to a company (new or existing) ──
  const unitResolutions: UnitResolution[] = [];
  for (const [sideKey, cands] of unitsBySideKey) {
    const allRows = cands.flatMap((c) => c.rows);
    const siren = cands[0]!.siren;
    const canonicalName = pickCanonicalName(allRows.map((r) => ({ raw: r.row.companyName, occurredAt: r.row.occurredAt })));
    const nameNormalized = nameNormalizedMap.get(canonicalName) ?? cands[0]!.nameNormalized;

    let existingCompanyId: string | null = null;
    if (siren !== undefined) {
      existingCompanyId = companyBySiren.get(siren) ?? null;
    } else {
      const ownerId = cands[0]!.ownerId;
      existingCompanyId = reuseByOwnerName.get(`${ownerId}|${nameNormalized}`) ?? null;
    }

    let resolvedViaMerge = false;
    const survivor = mergedSurvivorBySideKey.get(sideKey);
    if (survivor) {
      existingCompanyId = survivor;
      resolvedViaMerge = true;
    }

    unitResolutions.push({ sideKey, siren, rows: allRows, canonicalName, nameNormalized, existingCompanyId, resolvedViaMerge });
  }

  // ── Flag ambiguous name-only matches (D-04, criterion 4), suppress already-resolved pairs (criterion 5) ──
  const clusterable = unitResolutions.filter((u) => !u.resolvedViaMerge);
  const byNameNormalized = new Map<string, UnitResolution[]>();
  for (const u of clusterable) {
    const arr = byNameNormalized.get(u.nameNormalized) ?? [];
    arr.push(u);
    byNameNormalized.set(u.nameNormalized, arr);
  }

  const flaggedPairs: PlannedPair[] = [];
  const suppressedPairs: ReconciliationPlan['suppressedPairs'] = [];
  const seenPairs = new Set<string>();

  for (const [nameNormalized, units] of byNameNormalized) {
    if (units.length < 2) continue;
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const unitA = units[i]!;
        const unitB = units[j]!;
        const canon = canonicalPair(unitA.sideKey, unitB.sideKey);
        const pairMapKey = `${canon.sideAKey}|${canon.sideBKey}`;
        if (seenPairs.has(pairMapKey)) continue;
        seenPairs.add(pairMapKey);

        const decision = pairDecisionByCanonicalKey.get(pairMapKey);
        if (decision?.verdict === 'kept_separate') {
          suppressedPairs.push({ sideAKey: canon.sideAKey, sideBKey: canon.sideBKey, verdict: 'kept_separate' });
          continue;
        }
        if (decision?.verdict === 'merged') {
          suppressedPairs.push({ sideAKey: canon.sideAKey, sideBKey: canon.sideBKey, verdict: 'merged' });
          continue;
        }

        const reason: PairReason =
          unitA.siren !== undefined && unitB.siren !== undefined
            ? 'differing'
            : unitA.siren === undefined && unitB.siren === undefined
              ? 'both_missing'
              : 'one_missing';

        flaggedPairs.push({
          sideAKey: canon.sideAKey,
          sideBKey: canon.sideBKey,
          nameNormalized,
          reason,
          companyKeyA: unitA.sideKey,
          companyKeyB: unitB.sideKey,
          alreadyPending: decision !== undefined && decision.verdict === null,
        });
      }
    }
  }

  // ── Build planned companies, relationships, contacts, skip records ──
  const plannedCompanies: PlannedCompany[] = unitResolutions.map((u) => ({
    key: u.sideKey,
    canonicalName: u.canonicalName,
    nameNormalized: u.nameNormalized,
    siren: u.siren,
    existingCompanyId: u.existingCompanyId,
  }));

  const plannedRelationships: PlannedRelationship[] = [];
  const plannedContacts: PlannedContact[] = [];

  for (const u of unitResolutions) {
    const rowsByOwner = new Map<string, ExtendedRow[]>();
    for (const er of u.rows) {
      const arr = rowsByOwner.get(er.row.ownerId) ?? [];
      arr.push(er);
      rowsByOwner.set(er.row.ownerId, arr);
    }

    for (const [ownerId, ownerRows] of rowsByOwner) {
      const sourceRowIds = ownerRows.map((r) => r.row.sourceRowId);
      // Plan 05 fix: relationshipKey must disambiguate by owner, not just by
      // company side key — a cross-owner SIREN merge (criterion 3) can put
      // TWO owners' relationships under the SAME company, and a plain
      // sideKey would collide, misattributing one owner's contacts/proposal
      // links to another owner's relationship in apply.ts.
      const relationshipKey = `${u.sideKey}|${ownerId}`;
      const existingRelationshipId = u.existingCompanyId
        ? relByCompanyOwner.get(`${u.existingCompanyId}|${ownerId}`) ?? null
        : null;

      plannedRelationships.push({ companyKey: u.sideKey, ownerId, existingRelationshipId, sourceRowIds });

      // D-05/D-06/D-07: build contact accumulators from this owner's contributing rows.
      const accumulators: ContactAccumulator[] = [];
      for (const er of ownerRows) {
        const row = er.row;
        const hasName = row.contactName !== null && row.contactName.trim().length > 0;
        if (!hasName) {
          if (row.contactPhone !== null || row.contactEmail !== null || row.contactRole !== null) {
            skipped.push({ sourceRowId: row.sourceRowId, reason: 'contact_without_name' });
          }
          continue;
        }
        const match = accumulators.find((acc) => contactsMatch(acc, { email: row.contactEmail, name: row.contactName as string }));
        if (match) {
          match.role = match.role ?? row.contactRole;
          match.phone = match.phone ?? row.contactPhone;
          match.email = match.email ?? row.contactEmail;
          match.mergedFromSourceRowIds.push(row.sourceRowId);
        } else {
          accumulators.push({
            name: row.contactName as string,
            role: row.contactRole,
            phone: row.contactPhone,
            email: row.contactEmail,
            mergedFromSourceRowIds: [row.sourceRowId],
          });
        }
      }

      const existingContacts = existingRelationshipId ? contactsByRelationship.get(existingRelationshipId) ?? [] : [];
      for (const acc of accumulators) {
        const matchedExisting = existingContacts.find((ec) => contactsMatch(ec, acc));
        if (matchedExisting) {
          if (matchedExisting.source === null) {
            skipped.push({
              sourceRowId: acc.mergedFromSourceRowIds[0]!,
              reason: 'contact_conflicts_with_human_row',
              detail: matchedExisting.id,
            });
            continue;
          }
          plannedContacts.push({
            relationshipKey: relationshipKey,
            name: acc.name,
            role: acc.role,
            phone: acc.phone,
            email: acc.email,
            existingContactId: matchedExisting.id,
            mergedFromSourceRowIds: acc.mergedFromSourceRowIds,
          });
        } else {
          plannedContacts.push({
            relationshipKey: relationshipKey,
            name: acc.name,
            role: acc.role,
            phone: acc.phone,
            email: acc.email,
            existingContactId: null,
            mergedFromSourceRowIds: acc.mergedFromSourceRowIds,
          });
        }
      }
    }
  }

  const links = plannedRelationships
    .flatMap((r) => r.sourceRowIds.map((sourceRowId) => ({ sourceRowId, relationshipKey: `${r.companyKey}|${r.ownerId}` })))
    .sort((a, b) => a.sourceRowId.localeCompare(b.sourceRowId));

  plannedCompanies.sort((a, b) => a.key.localeCompare(b.key));
  plannedRelationships.sort((a, b) => `${a.companyKey}|${a.ownerId}`.localeCompare(`${b.companyKey}|${b.ownerId}`));
  plannedContacts.sort((a, b) => `${a.relationshipKey}|${a.name}`.localeCompare(`${b.relationshipKey}|${b.name}`));
  flaggedPairs.sort((a, b) => `${a.sideAKey}|${a.sideBKey}`.localeCompare(`${b.sideAKey}|${b.sideBKey}`));
  suppressedPairs.sort((a, b) => `${a.sideAKey}|${a.sideBKey}`.localeCompare(`${b.sideAKey}|${b.sideBKey}`));
  skipped.sort((a, b) => a.sourceRowId.localeCompare(b.sourceRowId));

  return {
    sourceId: source.id,
    generatedAt: now.toISOString(),
    companies: plannedCompanies,
    relationships: plannedRelationships,
    contacts: plannedContacts,
    proposalLinks: links,
    flaggedPairs,
    suppressedPairs,
    skipped,
  };
}
