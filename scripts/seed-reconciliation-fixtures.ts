/**
 * Phase 31 — Development-only fixture seeder for the reconciliation engine.
 *
 * WHY THIS EXISTS
 * The `development` Neon branch holds 4 eligible proposals (status active|deleted),
 * and every one of them carries a well-formed 9-digit SIREN and an unambiguous
 * company name. That is precisely the condition under which the reconciliation
 * engine has nothing to reconcile, so ROADMAP Phase 31 success criteria 3, 4 and 5
 * pass VACUOUSLY against it:
 *
 *   - criterion 3 (cross-partner SIREN auto-merge) — the only shared SIREN in the
 *     branch belongs to two proposals with the SAME owner, which is same-partner
 *     dedup, not the cross-partner merge the criterion describes.
 *   - criterion 4 (name-only match is FLAGGED, never silently merged) — impossible,
 *     because no two eligible rows match on name while diverging on SIREN.
 *   - criterion 5 (a human resolves a flagged pair) — follows from 4: with nothing
 *     flagged, the review queue renders its empty state and there is nothing to
 *     resolve.
 *
 * A green dry run against that data proves the engine did not crash. It does not
 * prove the engine is correct. This script inserts the minimum set of proposals
 * that force each untested path to actually execute.
 *
 * WHAT IT IS NOT
 * This is NOT a migration and NOT a production tool. It writes fixture rows to a
 * development database so a human can perform the Phase 31 verification checkpoint.
 * It hard-refuses the production and preview Neon branches with no override flag —
 * a fixture seeder has no legitimate reason to run against either.
 *
 * Run:
 *   npm run db:seed:reconciliation-fixtures -- --dry-run   # print, write nothing
 *   npm run db:seed:reconciliation-fixtures                # insert (idempotent)
 *   npm run db:seed:reconciliation-fixtures -- --remove    # delete the fixtures
 *
 * Idempotency:
 *   Every fixture carries an `idempotency_key` prefixed with FIXTURE_PREFIX. Insert
 *   skips rows already present; remove deletes exactly and only those rows. Both are
 *   safe to re-run.
 *
 * Design notes:
 *   - `params_snapshot` and `computed` are COPIED from an existing finalized
 *     proposal rather than hand-written. The table's
 *     `proposals_finalized_completeness_check` requires both to be NOT NULL on any
 *     non-draft row, and inventing a snapshot risks drifting from the real shape.
 *   - Company names were chosen against the LIVE
 *     `leasetic_normalize_company_name()` output, not against assumption. Note that
 *     the function strips (sarl|sasu|sas|sa|eurl|sci|snc|scop) and dots, but does
 *     NOT treat '&' and 'et' as equivalent: "Atelier Bois & Cie" normalizes to
 *     "atelier bois cie" while "Atelier Bois et Cie" normalizes to
 *     "atelier bois et cie". The pairs below are verified to collide.
 */
import './_load-env';
import { neon } from '@neondatabase/serverless';

/** Marks every row this script owns. Insert skips these; --remove deletes these. */
const FIXTURE_PREFIX = 'seed-recon-';

/**
 * Neon endpoints this script must never touch, from
 * docs/operations/neon-branch-routing.md § Lifecycle. There is deliberately no
 * override env var: a fixture seeder running against production is never correct.
 */
const FORBIDDEN_ENDPOINTS: ReadonlyArray<{ prefix: string; scope: string }> = [
  { prefix: 'ep-icy-boat-alx5o1tz', scope: 'PRODUCTION (Neon branch `main`)' },
  { prefix: 'ep-delicate-night-als4ogpc', scope: 'PREVIEW (Neon branch `preview`)' },
];

type Fixture = {
  key: string;
  /** Which seeded user owns it. Resolved to a real user id at run time. */
  owner: 'partnerA' | 'partnerB';
  status: 'active' | 'deleted';
  language: 'fr' | 'en';
  /** Raw clientCo exactly as a historical proposal would carry it. */
  clientCo: string;
  /** Raw clientSiren. Empty string means the field is absent. */
  clientSiren: string;
  clientName: string;
  clientEmail: string;
  clientTel: string;
  /** What this row is here to prove. Printed by --dry-run. */
  proves: string;
};

/**
 * Ten fixtures. Owners are two DISTINCT partner accounts so the cross-partner
 * cases are real rather than simulated.
 */
const FIXTURES: readonly Fixture[] = [
  {
    key: '01',
    owner: 'partnerA',
    status: 'active',
    language: 'fr',
    clientCo: 'MENUISERIE DURAND SAS',
    clientSiren: '552100554',
    clientName: 'Claire Durand',
    clientEmail: 'claire.durand@example.test',
    clientTel: '0102030405',
    proves: 'C3 side A — shared SIREN across partners must auto-merge to ONE company',
  },
  {
    key: '02',
    owner: 'partnerB',
    status: 'active',
    language: 'fr',
    clientCo: 'Menuiserie Durand',
    clientSiren: '552100554',
    clientName: 'Paul Durand',
    clientEmail: 'paul.durand@example.test',
    clientTel: '0102030406',
    proves: 'C3 side B — different owner, same SIREN, differently spelled name',
  },
  {
    key: '03',
    owner: 'partnerA',
    status: 'active',
    language: 'fr',
    clientCo: 'ATELIER BOIS ET CIE',
    clientSiren: '444555666',
    clientName: 'Marc Vidal',
    clientEmail: 'marc.vidal@example.test',
    clientTel: '0102030407',
    proves: 'C4/D-04 side A — same partner, same normalized name, SIREN 444555666',
  },
  {
    key: '04',
    owner: 'partnerA',
    status: 'active',
    language: 'fr',
    clientCo: 'Atelier Bois et Cie',
    clientSiren: '777888999',
    clientName: 'Sophie Vidal',
    clientEmail: 'sophie.vidal@example.test',
    clientTel: '0102030408',
    proves: 'C4/D-04 side B — DIFFERENT SIREN on an identical name: must FLAG, never merge',
  },
  {
    key: '05',
    owner: 'partnerB',
    status: 'active',
    language: 'fr',
    clientCo: 'GARAGE MARTIN',
    clientSiren: '',
    clientName: 'Luc Martin',
    clientEmail: 'luc.martin@example.test',
    clientTel: '0102030409',
    proves: 'C4 side A (absent-SIREN branch) — name match with NO siren on either side',
  },
  {
    key: '06',
    owner: 'partnerA',
    status: 'deleted',
    language: 'fr',
    clientCo: 'Garage Martin SARL',
    clientSiren: '',
    clientName: 'Anne Martin',
    clientEmail: 'anne.martin@example.test',
    clientTel: '0102030410',
    proves: 'C4 side B + D-01 — a SOFT-DELETED proposal still evidences a real client',
  },
  {
    key: '07',
    owner: 'partnerA',
    status: 'active',
    language: 'fr',
    clientCo: 'PLOMBERIE LEROY',
    clientSiren: '12 34',
    clientName: 'Yves Leroy',
    clientEmail: 'yves.leroy@example.test',
    clientTel: '0102030411',
    proves: 'D-03 side A — MALFORMED siren (4 digits) must be treated as ABSENT',
  },
  {
    key: '08',
    owner: 'partnerB',
    status: 'active',
    language: 'fr',
    clientCo: 'Plomberie Leroy S.A.R.L.',
    clientSiren: '',
    clientName: 'Rene Leroy',
    clientEmail: 'rene.leroy@example.test',
    clientTel: '0102030412',
    proves: 'D-03 side B — the malformed SIREN must degrade to a FLAG, not an auto-merge',
  },
  {
    key: '09',
    owner: 'partnerA',
    status: 'active',
    language: 'fr',
    clientCo: '   ',
    clientSiren: '',
    clientName: 'Inconnu',
    clientEmail: '',
    clientTel: '',
    proves: 'D-02 — blank clientCo must be SKIPPED and LISTED in the report, not ignored',
  },
  {
    key: '10',
    owner: 'partnerB',
    status: 'active',
    language: 'fr',
    clientCo: 'TOITURE BERNARD',
    clientSiren: '812345678',
    clientName: '',
    clientEmail: '',
    clientTel: '0102030413',
    proves: 'D-07 — phone but NO name: company+relationship import, contact skipped+reported',
  },
];

function fail(message: string): never {
  console.error('[seed-fixtures] FATAL: ' + message);
  process.exit(2);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const remove = process.argv.includes('--remove');
  if (dryRun && remove) {
    fail('--dry-run and --remove are mutually exclusive.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    fail('DATABASE_URL is not set.');
  }

  // bug_011 discipline (see scripts/backfill-partner-type.ts): use URL.hostname,
  // NOT URL.host — `host` includes the port, so a connection string carrying an
  // explicit :5432 would not match a bare endpoint prefix and would slip the gate.
  let hostname: string;
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    fail('DATABASE_URL is malformed.');
  }

  const forbidden = FORBIDDEN_ENDPOINTS.find((e) => hostname.startsWith(e.prefix));
  if (forbidden) {
    fail(
      'refusing to seed fixtures into ' +
        forbidden.scope +
        ' (' +
        hostname +
        '). This script is development-only and has no override flag.',
    );
  }
  console.log('[seed-fixtures] target host: ' + hostname);

  const sql = neon(databaseUrl);

  if (remove) {
    const deleted = await sql`
      delete from proposals
      where idempotency_key like ${FIXTURE_PREFIX + '%'}
      returning id`;
    console.log('[seed-fixtures] removed ' + String(deleted.length) + ' fixture proposal(s).');
    return;
  }

  // Two DISTINCT partner accounts — the cross-partner cases are meaningless without them.
  const partners = (await sql`
    select id, email from users where role = 'partner' order by email limit 2`) as Array<{
    id: string;
    email: string;
  }>;
  if (partners.length < 2) {
    fail(
      'need at least 2 users with role=partner to build the cross-partner fixtures; found ' +
        String(partners.length) +
        '.',
    );
  }
  const ownerIds = { partnerA: partners[0].id, partnerB: partners[1].id };
  console.log('[seed-fixtures] partnerA = ' + partners[0].email);
  console.log('[seed-fixtures] partnerB = ' + partners[1].email);

  // The finalized-completeness CHECK requires lc_ref, idempotency_key,
  // params_snapshot and computed to be NOT NULL on any non-draft row. Borrow the
  // two jsonb blobs from a real finalized proposal rather than inventing a shape.
  const donor = (await sql`
    select params_snapshot, computed from proposals
    where status <> 'draft' and params_snapshot is not null and computed is not null
    limit 1`) as Array<{ params_snapshot: unknown; computed: unknown }>;
  if (donor.length === 0) {
    fail('no finalized proposal available to copy params_snapshot/computed from.');
  }
  const paramsSnapshot = donor[0].params_snapshot;
  const computed = donor[0].computed;

  const existing = (await sql`
    select idempotency_key from proposals
    where idempotency_key like ${FIXTURE_PREFIX + '%'}`) as Array<{ idempotency_key: string }>;
  const present = new Set(existing.map((r) => r.idempotency_key));

  if (dryRun) {
    console.log('[seed-fixtures] DRY RUN — no rows will be written.\n');
    for (const f of FIXTURES) {
      const idem = FIXTURE_PREFIX + f.key;
      const norm = (await sql`
        select leasetic_normalize_company_name(${f.clientCo}) as n`) as Array<{ n: string }>;
      const state = present.has(idem) ? 'ALREADY PRESENT' : 'would INSERT';
      console.log('  [' + f.key + '] ' + state + ' | ' + f.owner + ' | ' + f.status);
      console.log('       clientCo=' + JSON.stringify(f.clientCo));
      console.log('       normalized=' + JSON.stringify(norm[0].n));
      console.log('       siren=' + JSON.stringify(f.clientSiren));
      console.log('       proves: ' + f.proves);
    }
    console.log('\n[seed-fixtures] dry run complete. Re-run without --dry-run to insert.');
    return;
  }

  let inserted = 0;
  let skipped = 0;
  for (const f of FIXTURES) {
    const idem = FIXTURE_PREFIX + f.key;
    if (present.has(idem)) {
      skipped += 1;
      continue;
    }
    const inputs: Record<string, string> = { clientCo: f.clientCo };
    if (f.clientSiren !== '') inputs.clientSiren = f.clientSiren;
    if (f.clientName !== '') inputs.clientName = f.clientName;
    if (f.clientEmail !== '') inputs.clientEmail = f.clientEmail;
    if (f.clientTel !== '') inputs.clientTel = f.clientTel;

    await sql`
      insert into proposals
        (user_id, status, language, lc_ref, idempotency_key, schema_version,
         inputs, params_snapshot, computed, deleted_at)
      values
        (${ownerIds[f.owner]}, ${f.status}, ${f.language},
         ${'LC-SEED-' + f.key}, ${idem}, '1.0.0',
         ${JSON.stringify(inputs)}::jsonb,
         ${JSON.stringify(paramsSnapshot)}::jsonb,
         ${JSON.stringify(computed)}::jsonb,
         ${f.status === 'deleted' ? new Date().toISOString() : null})`;
    inserted += 1;
  }

  console.log(
    '[seed-fixtures] inserted ' +
      String(inserted) +
      ', skipped ' +
      String(skipped) +
      ' already-present.',
  );
  console.log('[seed-fixtures] remove them again with: npm run db:seed:reconciliation-fixtures -- --remove');
}

main().catch((err) => {
  console.error('[seed-fixtures] FATAL:', err instanceof Error ? err.message : err);
  process.exit(1);
});
