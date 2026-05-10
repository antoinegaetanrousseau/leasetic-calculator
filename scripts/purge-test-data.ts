#!/usr/bin/env tsx
/**
 * Pre-launch hard-purge of test partner accounts (CUT-04 / D-10-09 / D-10-11).
 *
 * What it does:
 *   1. List rows from `users` where `email LIKE '%@test.leasetic.com'`.
 *   2. For each test user, cascade-delete in this order:
 *        a. proposals' PDF blobs (storage().delete(pdfBlobKey))
 *        b. proposals rows (hard delete — bypasses soft-delete invariant on purpose)
 *        c. password_resets rows
 *        d. sessions rows
 *        e. accounts rows
 *        f. users row
 *   3. After each user is purged, writeAuditLog({
 *        actorId: null,
 *        action: 'user.purge',
 *        targetType: 'user',
 *        targetId: <id>,
 *        payload: { email, reason: 'pre_launch_test_data_cleanup',
 *                   proposalsPurged: <n>, blobsDeleted: <n> }
 *      }).
 *   4. Best-effort: log + continue past per-user failures.
 *
 * D-10-09: discriminator is the email pattern @test.leasetic.com — there is NO
 * schema column for this flag (no DB column). The pattern is the contract;
 * scripts/seed-partner-launch.ts enforces the same pattern at seed time so the
 * discriminator stays consistent.
 *
 * Confirmation gate (Phase 5/6 + scripts/purge-soft-deleted.ts precedent):
 *   - default invocation = dry-run (lists candidates + counts, no writes)
 *   - --confirm PURGE-TEST-DATA OR env CONFIRM=PURGE-TEST-DATA = apply
 *
 * Required env: DATABASE_URL + STORAGE_DRIVER + (BLOB_READ_WRITE_TOKEN | AWS_*).
 *
 * Usage:
 *   npm run purge:test-data                                   → dry-run
 *   CONFIRM=PURGE-TEST-DATA npm run purge:test-data           → apply (env)
 *   npm run purge:test-data -- --confirm PURGE-TEST-DATA      → apply (flag)
 *
 * Note: invoked via `tsx -r ./scripts/_preload-mock-server-only.cjs`
 * (see package.json scripts section registered in 10-01).
 */
import 'dotenv/config';
import { writeAuditLog } from '../src/lib/db/queries';
import { storage } from '../src/lib/storage';

function maskUrl(raw: string | undefined): string {
  if (!raw) return '<unset>';
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.username || '?'}@${u.hostname}${u.pathname}`;
  } catch {
    return '<invalid URL>';
  }
}

function getConfirmFlag(): boolean {
  const env = process.env.CONFIRM === 'PURGE-TEST-DATA';
  const argIdx = process.argv.indexOf('--confirm');
  const arg = argIdx >= 0 && process.argv[argIdx + 1] === 'PURGE-TEST-DATA';
  return env || arg;
}

async function main() {
  const apply = getConfirmFlag();
  const mode = apply ? 'APPLY (writes WILL happen)' : 'DRY-RUN (no writes)';

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Phase 10 — Pre-launch purge of test partner accounts (CUT-04)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode:           ${mode}`);
  console.log(`  DATABASE_URL:   ${maskUrl(process.env.DATABASE_URL)}`);
  console.log(`  STORAGE_DRIVER: ${process.env.STORAGE_DRIVER ?? '<unset>'}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set. Aborting.');
    process.exit(2);
  }
  if (!process.env.STORAGE_DRIVER) {
    console.error('ERROR: STORAGE_DRIVER is not set. Aborting.');
    process.exit(2);
  }

  // Lazy imports so env-var validation runs before db init.
  const { db } = await import('../src/lib/db/index');
  const { users, accounts, sessions, passwordResets, proposals } = await import('../src/db/schema');
  const { eq, like, inArray } = await import('drizzle-orm');

  const TEST_EMAIL_PATTERN = '%@test.leasetic.com';
  const candidates = await db()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(like(users.email, TEST_EMAIL_PATTERN));

  console.log(`Found ${candidates.length} candidate(s) matching ${TEST_EMAIL_PATTERN}.`);

  if (candidates.length === 0) {
    console.log('Nothing to do. Exit 0.');
    return;
  }

  // Dry-run: print candidates + exit.
  if (!apply) {
    console.log('');
    for (const row of candidates.slice(0, 20)) {
      console.log(`  - id=${row.id} email=${row.email} displayName=${row.displayName ?? '<null>'}`);
    }
    if (candidates.length > 20) {
      console.log(`  ... ${candidates.length - 20} more (truncated at 20)`);
    }
    console.log('');
    console.log('Dry-run complete. To apply, re-run with:');
    console.log('  CONFIRM=PURGE-TEST-DATA npm run purge:test-data');
    console.log('  OR: npm run purge:test-data -- --confirm PURGE-TEST-DATA');
    return;
  }

  // Apply mode: cascade-delete each test user.
  let usersPurged = 0;
  let usersFailed = 0;
  let totalProposalsPurged = 0;
  let totalBlobsDeleted = 0;

  for (const u of candidates) {
    // Declared outside try so audit-log block (below) can reference them.
    let purgedProposalCount = 0;
    let purgedBlobCount = 0;

    try {
      // ── 1. Find user's proposals (need the blob keys before we delete the rows) ──
      const userProposals = await db()
        .select({ id: proposals.id, pdfBlobKey: proposals.pdfBlobKey })
        .from(proposals)
        .where(eq(proposals.userId, u.id));

      // ── 2. Delete each proposal's PDF blob (idempotent — 404 = no-op) ──
      for (const p of userProposals) {
        if (p.pdfBlobKey) {
          try {
            await storage().delete(p.pdfBlobKey);
            purgedBlobCount += 1;
          } catch (blobErr) {
            // Best-effort: log and continue; the row delete still proceeds.
            console.error(
              `  [warn] blob delete failed for proposal ${p.id}: ${blobErr instanceof Error ? blobErr.message : String(blobErr)}`,
            );
          }
        }
      }

      // ── 3. Hard-delete proposals rows ──
      const proposalIds = userProposals.map((p) => p.id);
      purgedProposalCount = proposalIds.length;
      if (proposalIds.length > 0) {
        await db().delete(proposals).where(inArray(proposals.id, proposalIds));
      }

      // ── 4. Delete password_resets rows ──
      await db().delete(passwordResets).where(eq(passwordResets.userId, u.id));

      // ── 5. Delete sessions rows ──
      await db().delete(sessions).where(eq(sessions.userId, u.id));

      // ── 6. Delete accounts rows ──
      await db().delete(accounts).where(eq(accounts.userId, u.id));

      // ── 7. Hard-delete users row ──
      // D-23 (Phase 6) said users are NEVER hard-deleted in production —
      // this script is the EXPLICIT EXCEPTION (D-10 / 06-CONTEXT D-23). Audit log
      // captures the deletion for forensics; audit_log.actorId FK is ON DELETE
      // SET NULL so historical actor references survive the user purge.
      await db().delete(users).where(eq(users.id, u.id));

      // Count the purge BEFORE the audit write — the row is gone regardless of audit outcome.
      console.log(
        `  [ok]   id=${u.id} email=${u.email} (${purgedProposalCount} proposals, ${purgedBlobCount} blobs)`,
      );
      usersPurged += 1;
      totalProposalsPurged += purgedProposalCount;
      totalBlobsDeleted += purgedBlobCount;
    } catch (err) {
      console.error(
        `  [fail] id=${u.id} email=${u.email}: ${err instanceof Error ? err.message : String(err)}`,
      );
      usersFailed += 1;
      // best-effort: continue with next user
      continue;
    }

    // ── 8. Audit log entry — best-effort, does NOT undo the purge. ──
    try {
      await writeAuditLog({
        actorId: null,
        action: 'user.purge',
        targetType: 'user',
        targetId: u.id,
        payload: {
          email: u.email,
          reason: 'pre_launch_test_data_cleanup',
          proposalsPurged: purgedProposalCount,
          blobsDeleted: purgedBlobCount,
        },
      });
    } catch (auditErr) {
      console.error(
        `  [warn] audit log write failed for user ${u.id}:`,
        auditErr instanceof Error ? auditErr.message : String(auditErr),
      );
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Done. ${usersPurged} users purged, ${usersFailed} failed.`);
  console.log(`         ${totalProposalsPurged} proposals + ${totalBlobsDeleted} blobs cascade-deleted.`);
  if (usersFailed > 0) {
    console.log(`  Re-run to retry failed users (they remain as purge candidates).`);
  }
  console.log('═══════════════════════════════════════════════════════════════');

  if (usersFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
