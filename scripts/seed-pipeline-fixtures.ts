/**
 * Phase 33 — Development-only fixture seeder for the pipeline acceptance walkthrough.
 *
 * WHY THIS EXISTS
 * Plan 33-09 task 3 asks the operator to walk fifteen acceptance steps "signed in
 * as a partner who holds at least two relationships and one finalized proposal".
 * The `development` Neon branch does not satisfy that precondition: it holds two
 * relationships total, one per partner, both pointing at the SAME company, and
 * neither partner owns a single finalized proposal. Against that data most of the
 * walkthrough is unreachable rather than passing —
 *
 *   - steps 2-5 (drag between lanes) have one card and no second lane occupant;
 *   - steps 9, 11, 12 and 14 (outcome capture, conversion tile, the derived
 *     `unanswered` badge) have no finalized proposal to act on at all;
 *   - step 10 (D-08, the inline SIREN gate) needs a company with NO siren, and
 *     since 2026-09-03 the create-client dialog REQUIRES one, so the state can no
 *     longer be produced through the UI. Only a seeded legacy row reaches it.
 *
 * This script inserts the minimum set of companies, relationships and proposals
 * that make each of those steps executable, and nothing else.
 *
 * WHAT IT IS NOT
 * Not a migration, not a production tool. It hard-refuses the production and
 * preview Neon branches with no override flag, exactly like
 * `scripts/seed-reconciliation-fixtures.ts`, whose structure this follows.
 *
 * Run:
 *   npm run db:seed:pipeline-fixtures -- --dry-run   # print, write nothing
 *   npm run db:seed:pipeline-fixtures                # insert (idempotent)
 *   npm run db:seed:pipeline-fixtures -- --remove --dry-run
 *   npm run db:seed:pipeline-fixtures -- --remove    # revert
 *
 * Idempotency and revert:
 *   `companies.source` has a CHECK that admits only NULL, 'proposal_extraction'
 *   and 'hubspot_import', so a fixture company CANNOT carry a bespoke source
 *   marker. Fixture companies are therefore identified by their exact SIREN (or,
 *   for the deliberately SIREN-less row, by its exact name), all listed in
 *   FIXTURES below. Proposals carry `idempotency_key` prefixed FIXTURE_PREFIX.
 *   --remove deletes proposals first, then the fixture relationships, then any
 *   fixture company left with no relationship — and refuses outright if a contact
 *   has been hand-added to a fixture relationship, since the contacts FK cascades
 *   and would take that real data with it.
 *
 * Design notes:
 *   - `params_snapshot`, `computed` and the `inputs` shape are COPIED from a real
 *     finalized proposal, then narrowly patched (validityDays, client identity).
 *     `proposals_finalized_completeness_check` requires the two jsonb blobs to be
 *     NOT NULL on any non-draft row and inventing a shape risks drifting from the
 *     real one.
 *   - No fixture is inserted with `outcome` already set. Recording outcomes is
 *     what the operator does BY HAND in steps 9-11; pre-setting them would both
 *     skip the test and trip `proposals_won_requires_siren` on the SIREN-less row.
 *   - No fixture uses stage 'signe' or 'debloque'. D-04 reserves both, and this
 *     script is not an exception to it.
 */
import './_load-env';
import { neon } from '@neondatabase/serverless';

/** Marks every proposal this script owns. Insert skips these; --remove deletes these. */
const FIXTURE_PREFIX = 'seed-pipe-';

/**
 * Neon endpoints this script must never touch, from
 * docs/operations/neon-branch-routing.md § Lifecycle. There is deliberately no
 * override env var: a fixture seeder running against production is never correct.
 */
const FORBIDDEN_ENDPOINTS: ReadonlyArray<{ prefix: string; scope: string }> = [
  { prefix: 'ep-icy-boat-alx5o1tz', scope: 'PRODUCTION (Neon branch `main`)' },
  { prefix: 'ep-delicate-night-als4ogpc', scope: 'PREVIEW (Neon branch `preview`)' },
];

/** The five partner-settable stages (D-04 keeps 'signe'/'debloque' out of reach). */
type SeedStage = 'prospect' | 'qualifie' | 'proposition_envoyee' | 'negociation' | 'perdu';

type SeedProposal = {
  /** Suffix for idempotency_key and lc_ref — unique across the file. */
  key: string;
  /** Patched into params_snapshot.validityDays, which is what the row's badge reads. */
  validityDays: number;
  /** created_at = now - ageDays. Past validity when ageDays > validityDays. */
  ageDays: number;
  /** What this row makes reachable in the walkthrough. Printed by --dry-run. */
  proves: string;
};

type SeedCompany = {
  key: string;
  name: string;
  /** null means a legacy company with NO siren — the only route to step 10. */
  siren: string | null;
  stage: SeedStage;
  /** Which seeded partner owns the relationship. */
  owner: 'partnerA' | 'partnerB';
  contactName: string;
  proposals: readonly SeedProposal[];
  proves: string;
};

const FIXTURES: readonly SeedCompany[] = [
  {
    key: '01',
    name: 'Atelier Verrier Lumière',
    siren: '823456781',
    stage: 'prospect',
    owner: 'partnerA',
    contactName: 'Hélène Verrier',
    proposals: [],
    proves: 'steps 2-5 — a card to drag out of Prospect, and onto the reserved lanes',
  },
  {
    key: '02',
    name: 'Boulangerie Petitpain',
    siren: '823456782',
    stage: 'prospect',
    owner: 'partnerA',
    contactName: 'Marc Petitpain',
    proposals: [],
    proves: 'steps 2-5 — a second Prospect card, so the lane is not emptied by one drag',
  },
  {
    key: '03',
    name: 'Transports Marchand',
    siren: '823456783',
    stage: 'qualifie',
    owner: 'partnerA',
    contactName: 'Sylvie Marchand',
    proposals: [],
    proves: 'step 2 — a destination lane that is already occupied before the drag',
  },
  {
    key: '04',
    name: 'Clinique Vétérinaire du Parc',
    siren: '823456784',
    stage: 'proposition_envoyee',
    owner: 'partnerA',
    contactName: 'Damien Roux',
    proposals: [
      {
        key: '04a',
        validityDays: 30,
        ageDays: 3,
        proves: 'step 9 — mark WON on a company that HAS a siren: no gate, badge replaces triggers',
      },
    ],
    proves: 'step 9 — the happy-path outcome capture',
  },
  {
    key: '05',
    name: 'Garage Central Mercier',
    siren: '823456785',
    stage: 'negociation',
    owner: 'partnerA',
    contactName: 'Yann Mercier',
    proposals: [
      {
        key: '05a',
        validityDays: 30,
        ageDays: 5,
        proves: 'step 13 (D-04) — mark WON and confirm the card does NOT move to Signé',
      },
      {
        key: '05b',
        validityDays: 30,
        ageDays: 2,
        proves: 'step 11 — mark LOST and confirm no siren is ever requested',
      },
    ],
    proves: 'steps 11 and 13 — outcome capture on a relationship parked in Négociation',
  },
  {
    key: '06',
    name: 'Pépinières Vaugelas',
    siren: null,
    stage: 'qualifie',
    owner: 'partnerA',
    contactName: 'Claire Vaugelas',
    proposals: [
      {
        key: '06a',
        validityDays: 30,
        ageDays: 4,
        proves: 'step 10 (D-08) — the ONLY route to the inline SIREN gate now that creation requires one',
      },
    ],
    proves: 'step 10 — a legacy company with no siren, unreachable through the UI',
  },
  {
    key: '07',
    name: 'Menuiserie Ancienne Vallée',
    siren: '823456787',
    stage: 'perdu',
    owner: 'partnerA',
    contactName: 'Bruno Vallée',
    proposals: [],
    proves: 'step 8 — content behind the collapsed Perdu section on mobile',
  },
  {
    key: '08',
    name: 'Cabinet Dentaire Sourire',
    siren: '823456788',
    stage: 'proposition_envoyee',
    owner: 'partnerA',
    contactName: 'Inès Sourire',
    proposals: [
      {
        key: '08a',
        validityDays: 15,
        ageDays: 40,
        proves: 'step 14 (D-06) — past validity, no outcome: "Sans réponse" AND both triggers still offered',
      },
    ],
    proves: 'step 14 — the derived unanswered state',
  },
  {
    key: '09',
    name: 'Serrurerie Delaunay',
    siren: '823456789',
    stage: 'negociation',
    owner: 'partnerB',
    contactName: 'Théo Delaunay',
    proposals: [
      {
        key: '09a',
        validityDays: 30,
        ageDays: 6,
        proves: 'step 6 — a SECOND partner holds a live relationship and proposal, which must never surface on partner A\'s board',
      },
    ],
    proves: 'step 6 — owner isolation is real rather than simulated',
  },
];

/** Fixture SIRENs, for identification on --remove. */
const FIXTURE_SIRENS = FIXTURES.map((f) => f.siren).filter((s): s is string => s !== null);
/** Names of fixture companies that carry no SIREN — identified by name instead. */
const FIXTURE_SIRENLESS_NAMES = FIXTURES.filter((f) => f.siren === null).map((f) => f.name);

function fail(message: string): never {
  console.error('[seed-pipeline] FATAL: ' + message);
  process.exit(2);
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const remove = process.argv.includes('--remove');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    fail('DATABASE_URL is not set.');
  }

  // bug_011 discipline: URL.hostname, never URL.host — `host` carries the port,
  // so a connection string with an explicit :5432 would slip a prefix match.
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
  console.log('[seed-pipeline] target host: ' + hostname);

  const sql = neon(databaseUrl);

  if (remove) {
    // Guard: the contacts FK cascades on relationship delete. A contact a
    // partner added by hand to a fixture relationship is real data and must not
    // vanish inside a fixture revert.
    const handEntered = (await sql`
      select count(*)::int as n from contacts c
      join client_relationships r on r.id = c.client_relationship_id
      join companies co on co.id = r.company_id
      where (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_SIRENLESS_NAMES}))
        and c.name <> any(${FIXTURES.map((f) => f.contactName)})`) as Array<{ n: number }>;
    if (handEntered[0].n > 0) {
      fail(
        String(handEntered[0].n) +
          ' hand-entered contact(s) live on fixture relationships and would be destroyed by the ' +
          'cascade. Refusing to revert. Move or delete them deliberately first.',
      );
    }

    if (dryRun) {
      const preview = (await sql`select
        (select count(*)::int from proposals where idempotency_key like ${FIXTURE_PREFIX + '%'}) as fixture_proposals,
        (select count(*)::int from client_relationships r join companies co on co.id = r.company_id
          where co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_SIRENLESS_NAMES})) as relationships,
        (select count(*)::int from contacts c join client_relationships r on r.id = c.client_relationship_id
          join companies co on co.id = r.company_id
          where co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_SIRENLESS_NAMES})) as contacts_cascaded,
        (select count(*)::int from companies
          where siren = any(${FIXTURE_SIRENS}) or name = any(${FIXTURE_SIRENLESS_NAMES})) as companies`) as Array<
        Record<string, number>
      >;
      console.log('[seed-pipeline] DRY RUN — would delete:');
      console.log('  ' + JSON.stringify(preview[0], null, 2).replace(/\n/g, '\n  '));
      return;
    }

    const props = await sql`
      delete from proposals where idempotency_key like ${FIXTURE_PREFIX + '%'} returning id`;
    const rels = await sql`
      delete from client_relationships r
      using companies co
      where co.id = r.company_id
        and (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_SIRENLESS_NAMES}))
      returning r.id`;
    // Only companies left with no relationship at all — never one another
    // partner has since attached to.
    const cos = await sql`
      delete from companies co
      where (co.siren = any(${FIXTURE_SIRENS}) or co.name = any(${FIXTURE_SIRENLESS_NAMES}))
        and not exists (select 1 from client_relationships r where r.company_id = co.id)
      returning co.id`;

    console.log('[seed-pipeline] revert complete:');
    console.log('  fixture proposals deleted: ' + String(props.length));
    console.log('  relationships deleted:     ' + String(rels.length) + ' (contacts cascaded)');
    console.log('  companies deleted:         ' + String(cos.length));
    return;
  }

  // Two DISTINCT partner accounts — step 6's isolation check is meaningless
  // without a second partner holding live rows.
  const partners = (await sql`
    select id, email from users where role = 'partner' order by email limit 2`) as Array<{
    id: string;
    email: string;
  }>;
  if (partners.length < 2) {
    fail(
      'need at least 2 users with role=partner to build the isolation fixture; found ' +
        String(partners.length) +
        '.',
    );
  }
  const ownerIds = { partnerA: partners[0].id, partnerB: partners[1].id };
  console.log('[seed-pipeline] partnerA (walkthrough account) = ' + partners[0].email);
  console.log('[seed-pipeline] partnerB (isolation only)      = ' + partners[1].email);

  // Borrow the two jsonb blobs and the inputs shape from a real finalized
  // proposal rather than inventing them.
  const donor = (await sql`
    select inputs, params_snapshot, computed from proposals
    where status <> 'draft' and params_snapshot is not null and computed is not null
    limit 1`) as Array<{ inputs: Record<string, unknown>; params_snapshot: Record<string, unknown>; computed: unknown }>;
  if (donor.length === 0) {
    fail('no finalized proposal available to copy inputs/params_snapshot/computed from.');
  }
  const donorInputs = donor[0].inputs;
  const donorSnapshot = donor[0].params_snapshot;
  const computed = donor[0].computed;

  if (dryRun) {
    console.log('[seed-pipeline] DRY RUN — no rows will be written.\n');
    for (const f of FIXTURES) {
      console.log(
        '  [' + f.key + '] ' + f.name + ' | siren=' + (f.siren ?? 'NONE') + ' | stage=' + f.stage + ' | ' + f.owner,
      );
      console.log('       proves: ' + f.proves);
      for (const p of f.proposals) {
        console.log(
          '       proposal ' + p.key + ' | validity=' + String(p.validityDays) + 'j | age=' + String(p.ageDays) + 'j',
        );
        console.log('         proves: ' + p.proves);
      }
    }
    console.log('\n[seed-pipeline] dry run complete. Re-run without --dry-run to insert.');
    return;
  }

  let companiesInserted = 0;
  let relationshipsInserted = 0;
  let proposalsInserted = 0;
  let skipped = 0;

  for (const f of FIXTURES) {
    const ownerId = ownerIds[f.owner];

    // ── company ────────────────────────────────────────────────────────────
    const existingCompany = (f.siren === null
      ? await sql`select id from companies where name = ${f.name} limit 1`
      : await sql`select id from companies where siren = ${f.siren} limit 1`) as Array<{ id: string }>;

    let companyId: string;
    if (existingCompany[0]) {
      companyId = existingCompany[0].id;
    } else {
      const insertedCompany = (await sql`
        insert into companies (name, siren) values (${f.name}, ${f.siren}) returning id`) as Array<{
        id: string;
      }>;
      companyId = insertedCompany[0].id;
      companiesInserted += 1;
    }

    // ── relationship (unique on company_id + owner_id) ─────────────────────
    const insertedRelationship = (await sql`
      insert into client_relationships (company_id, owner_id, stage)
      values (${companyId}, ${ownerId}, ${f.stage})
      on conflict (company_id, owner_id) do nothing
      returning id`) as Array<{ id: string }>;

    let relationshipId: string;
    if (insertedRelationship[0]) {
      relationshipId = insertedRelationship[0].id;
      relationshipsInserted += 1;
    } else {
      const reselected = (await sql`
        select id from client_relationships
        where company_id = ${companyId} and owner_id = ${ownerId} limit 1`) as Array<{ id: string }>;
      relationshipId = reselected[0].id;
    }

    // ── contact, so the client page is not empty ───────────────────────────
    await sql`
      insert into contacts (client_relationship_id, name, role)
      select ${relationshipId}, ${f.contactName}, 'Gérant'
      where not exists (
        select 1 from contacts where client_relationship_id = ${relationshipId} and name = ${f.contactName})`;

    // ── proposals ─────────────────────────────────────────────────────────
    for (const p of f.proposals) {
      const idem = FIXTURE_PREFIX + p.key;
      const present = (await sql`
        select 1 from proposals where user_id = ${ownerId} and idempotency_key = ${idem} limit 1`) as Array<unknown>;
      if (present.length > 0) {
        skipped += 1;
        continue;
      }

      const inputs = {
        ...donorInputs,
        clientCo: f.name,
        clientSiren: f.siren ?? '',
        clientName: f.contactName,
        validityDays: p.validityDays,
      };
      const snapshot = { ...donorSnapshot, validityDays: p.validityDays };

      await sql`
        insert into proposals
          (user_id, status, language, lc_ref, idempotency_key, schema_version,
           inputs, params_snapshot, computed, client_relationship_id, created_at)
        values
          (${ownerId}, 'active', 'fr',
           ${'LC-SEED-PIPE-' + p.key}, ${idem}, '1.0.0',
           ${JSON.stringify(inputs)}::jsonb,
           ${JSON.stringify(snapshot)}::jsonb,
           ${JSON.stringify(computed)}::jsonb,
           ${relationshipId}, ${daysAgo(p.ageDays)})`;
      proposalsInserted += 1;
    }
  }

  console.log(
    '[seed-pipeline] done — companies +' +
      String(companiesInserted) +
      ', relationships +' +
      String(relationshipsInserted) +
      ', proposals +' +
      String(proposalsInserted) +
      ' (' +
      String(skipped) +
      ' proposal(s) already present)',
  );
  console.log('[seed-pipeline] sign in as ' + partners[0].email + ' and open /pipeline.');
}

main().catch((e: unknown) => {
  console.error('[seed-pipeline] unexpected failure:', e);
  process.exit(1);
});
