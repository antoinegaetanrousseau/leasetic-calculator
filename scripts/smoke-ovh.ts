#!/usr/bin/env tsx
/**
 * OVH-portability smoke test — full proposal lifecycle (CUT-09 / D-10-02).
 *
 * Proves that the same git ref deploys against ANY portable backend (Node +
 * Postgres + S3-compatible) with only env-var changes — no code touch. The
 * script speaks HTTP to a live deployment (APP_URL); it does NOT import
 * src/lib/db or src/lib/storage directly. That's the point: the test exercises
 * the full server stack as a black-box client, the same way a real partner does.
 *
 * Lifecycle (each step exits non-zero on failure):
 *   1. Healthcheck            — GET {APP_URL}/healthz                    → { db: ok, blob: ok }
 *   2. Login                  — POST /api/auth/sign-in/email             → 200 + Set-Cookie
 *   3. Create proposal        — POST /api/proposals                      → { id, pdfUrl, idempotent }
 *   4. PDF SHA-256 assertion  — GET /api/proposals/{id}/pdf X-Content-SHA256
 *                                must equal the committed expected hash for
 *                                happy-path-fr (PROP-17 invariant)
 *   5. Soft-delete            — POST /api/proposals/{id}/delete          → { ok: true }
 *   6. Restore                — POST /api/proposals/{id}/restore         → { ok: true }
 *   7. Cleanup soft-delete    — POST /api/proposals/{id}/delete          → { ok: true }
 *      (idempotency — leaves the target DB in the same state on every run)
 *
 * D-10-03: runnable against the CURRENT Vercel deployment today as a sanity check.
 * Same script with APP_URL=<ovh-url> in September proves portability at zero code cost.
 *
 * PDF SHA-256 note: The assertion compares the X-Content-SHA256 header returned
 * by GET /api/proposals/{id}/pdf against the committed happy-path-fr hash in
 * __pdf-fixtures__/expected.sha256.txt. This assertion passes when global_params
 * are at seed values (matching the fixture coefficients). If coefficients have
 * been customised, step 4 will fail — this is intentional: it signals that the
 * fixture baseline needs rotation (npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE).
 *
 * Confirmation gate (Phase 5/6/8 typed-confirmation precedent):
 *   - default invocation = dry-run (validates env + lists planned steps; NO HTTP calls)
 *   - --confirm SMOKE-OVH OR env CONFIRM=SMOKE-OVH = apply (executes lifecycle)
 *
 * Required env (apply mode):
 *   APP_URL          — e.g. https://leasetic-matrice.vercel.app or future OVH URL
 *   ADMIN_EMAIL      — admin-seeded credential
 *   ADMIN_PASSWORD   — admin-seeded credential (NEVER logged; passed only to fetch body)
 *
 * Optional env:
 *   DATABASE_URL     — informational; printed (masked) in banner so operator
 *                       can confirm which env they're targeting
 *   STORAGE_DRIVER   — informational; printed in banner
 *
 * Usage:
 *   APP_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run smoke:ovh
 *     → dry-run (lists planned steps, no HTTP)
 *   APP_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... CONFIRM=SMOKE-OVH npm run smoke:ovh
 *     → apply (executes 7-step lifecycle; exits 0 on success, 1 on any step failure)
 *
 * Note: invoked via `tsx -r ./scripts/_preload-mock-server-only.cjs`
 * (preload registered in package.json smoke:ovh script).
 */
import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  const env = process.env.CONFIRM === 'SMOKE-OVH';
  const argIdx = process.argv.indexOf('--confirm');
  const arg = argIdx >= 0 && process.argv[argIdx + 1] === 'SMOKE-OVH';
  return env || arg;
}

function fail(stepNum: number, reason: string): never {
  console.error('');
  console.error(`[FAIL] step ${stepNum}: ${reason}`);
  console.error('');
  process.exit(1);
}

/**
 * Extract the better-auth session cookie from a fetch Response.
 * Better Auth sets `better-auth.session_token=...; Path=/; ...`.
 * Multiple Set-Cookie headers may arrive joined as a comma list in undici.
 */
function extractSessionCookie(res: Response): string | null {
  const raw = res.headers.get('set-cookie');
  if (!raw) return null;
  const m = raw.match(/(better-auth\.session_token=[^;]+)/);
  return m ? m[1] : null;
}

// ── Fixture inputs (matching __pdf-fixtures__/fixtures.ts happy-path-fr) ─────
//
// These inputs are hardcoded to match the committed fixture exactly so the
// PDF SHA-256 assertion can compare against expected.sha256.txt.
// When the fixture is rotated (npm run pdf:update-fixture), update these
// values to stay in sync with __pdf-fixtures__/fixtures.ts SHARED_BASE.
// Named fixtureInputs to match grep-gate in acceptance criteria (CUT-09).
const fixtureInputs = {
  partnerCo: 'Memento IT',
  partnerName: 'Antoine Rousseau',
  clientCo: 'Société Cliente Alpha',
  clientName: 'M. Jean Dupont',
  clientRole: "Directeur des Systèmes d'Information",
  clientTel: '01 23 45 67 89',
  clientEmail: 'jean.dupont@alpha.example',
  clientSiren: '123456789',
  slb: true,
  evalParc: false,
  amountHT: '75000',
  durationMonths: 48 as 36 | 48 | 60,
  validityDays: 30 as 15 | 30 | 60,
  projectDesc: 'Renouvellement postes commerciaux 2026',
  partnerRef: 'DEVIS-2026-042',
};

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const apply = getConfirmFlag();
  const mode = apply ? 'APPLY (full lifecycle WILL execute)' : 'DRY-RUN (no HTTP calls)';

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Phase 10 — OVH-portability smoke test (full proposal lifecycle)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode:           ${mode}`);
  console.log(`  APP_URL:        ${maskUrl(process.env.APP_URL)}`);
  console.log(`  ADMIN_EMAIL:    ${process.env.ADMIN_EMAIL ?? '<unset>'}`);
  console.log(`  ADMIN_PASSWORD: ${process.env.ADMIN_PASSWORD ? '<set, redacted>' : '<unset>'}`);
  console.log(`  DATABASE_URL:   ${maskUrl(process.env.DATABASE_URL)}`);
  console.log(`  STORAGE_DRIVER: ${process.env.STORAGE_DRIVER ?? '<unset>'}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // ── Env guards (always run; dry-run still validates env so operator gets
  //    full pre-flight feedback before a real lifecycle run) ──────────────────
  if (!process.env.APP_URL) {
    console.error('ERROR: APP_URL is not set. Aborting.');
    process.exit(2);
  }
  if (!process.env.ADMIN_EMAIL) {
    console.error('ERROR: ADMIN_EMAIL is not set. Aborting.');
    process.exit(2);
  }
  if (!process.env.ADMIN_PASSWORD) {
    console.error('ERROR: ADMIN_PASSWORD is not set. Aborting.');
    process.exit(2);
  }

  const APP_URL = process.env.APP_URL.replace(/\/$/, ''); // strip trailing slash
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  // ── Read expected SHA-256 from disk (single source of truth) ──────────────
  // Fixture: __pdf-fixtures__/expected.sha256.txt
  // Format: name:sha256hex per line (e.g. "happy-path-fr:6189c125...")
  const fixtureRoot = resolve(__dirname, '../__pdf-fixtures__');
  let expectedSha256: string;
  try {
    const raw = await readFile(`${fixtureRoot}/expected.sha256.txt`, 'utf8');
    // Extract the happy-path-fr hash (the lang used by the API when the admin
    // session is established — Better Auth defaults to 'fr' for this deployment).
    const lines = raw.trim().split('\n');
    const frLine = lines.find((l) => l.startsWith('happy-path-fr:'));
    if (!frLine) {
      console.error('ERROR: expected.sha256.txt does not contain a happy-path-fr entry.');
      process.exit(2);
    }
    expectedSha256 = frLine.split(':')[1].trim().toLowerCase();
  } catch (err) {
    console.error('ERROR: failed to read __pdf-fixtures__/expected.sha256.txt.');
    console.error(`  Looked under: ${fixtureRoot}`);
    console.error(`  ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }

  if (!apply) {
    // Dry-run: list planned steps + exit clean.
    console.log('Planned steps (dry-run; no HTTP calls):');
    console.log(`  1. GET  ${APP_URL}/healthz                        → expect { db: ok, blob: ok }`);
    console.log(`  2. POST ${APP_URL}/api/auth/sign-in/email         → expect 200 + Set-Cookie`);
    console.log(`  3. POST ${APP_URL}/api/proposals                  → expect { id, pdfUrl, idempotent }`);
    console.log(`  4. GET  ${APP_URL}/api/proposals/<id>/pdf         → assert X-Content-SHA256 === ${expectedSha256.slice(0, 16)}...`);
    console.log(`  5. POST ${APP_URL}/api/proposals/<id>/delete      → expect { ok: true }`);
    console.log(`  6. POST ${APP_URL}/api/proposals/<id>/restore     → expect { ok: true }`);
    console.log(`  7. POST ${APP_URL}/api/proposals/<id>/delete      → expect { ok: true }  (cleanup)`);
    console.log('');
    console.log('Dry-run complete. To apply, re-run with:');
    console.log('  CONFIRM=SMOKE-OVH npm run smoke:ovh');
    return;
  }

  // ── Step 1: Healthcheck ──────────────────────────────────────────────────
  console.log('[step 1] GET /healthz ...');
  const healthRes = await fetch(`${APP_URL}/healthz`);
  if (healthRes.status !== 200) {
    fail(1, `healthz returned ${healthRes.status} (expected 200)`);
  }
  const health = await healthRes.json() as { db?: string; blob?: string };
  if (health.db !== 'ok' || health.blob !== 'ok') {
    fail(1, `healthz reported unhealthy: ${JSON.stringify(health)}`);
  }
  console.log('  [ok]');

  // ── Step 2: Login ────────────────────────────────────────────────────────
  console.log('[step 2] POST /api/auth/sign-in/email ...');
  const loginRes = await fetch(`${APP_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL.toLowerCase(),
      password: ADMIN_PASSWORD,
      callbackURL: '/',
    }),
  });
  if (loginRes.status !== 200) {
    fail(2, `sign-in returned ${loginRes.status} (expected 200) — check ADMIN_EMAIL/ADMIN_PASSWORD`);
  }
  const sessionCookie = extractSessionCookie(loginRes);
  if (!sessionCookie) {
    fail(2, 'sign-in returned 200 but no better-auth session cookie was set');
  }
  console.log('  [ok] (session cookie captured)');

  // ── Step 3: Create proposal ──────────────────────────────────────────────
  // Requires Idempotency-Key header (UUID v4) per submit.ts Step 1.
  // Response shape: { id: string, pdfUrl: string, idempotent: boolean }
  console.log('[step 3] POST /api/proposals ...');
  const idempotencyKey = randomUUID();
  const createRes = await fetch(`${APP_URL}/api/proposals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      Cookie: sessionCookie!,
    },
    body: JSON.stringify(fixtureInputs),
  });
  if (createRes.status !== 200) {
    const body = await createRes.text();
    fail(3, `create returned ${createRes.status} (expected 200): ${body.slice(0, 200)}`);
  }
  const created = await createRes.json() as { id?: string; pdfUrl?: string; idempotent?: boolean };
  if (!created.id) {
    fail(3, `create response missing id: ${JSON.stringify(created)}`);
  }
  console.log(`  [ok] id=${created.id} pdfUrl=${created.pdfUrl ?? '<missing>'} idempotent=${created.idempotent}`);

  // ── Step 4: PDF SHA-256 assertion (PROP-17 invariant) ────────────────────
  // GET /api/proposals/{id}/pdf returns X-Content-SHA256 header with the stored
  // sha256 of the PDF bytes. We compare against the committed fixture hash.
  // Note: this assertion passes when global_params coefficients are at seed values.
  // If coefficients have been customised, this step will fail (expected behaviour —
  // rotate the fixture with: npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE).
  console.log(`[step 4] GET /api/proposals/${created.id}/pdf (SHA-256 assertion) ...`);
  const pdfRes = await fetch(`${APP_URL}/api/proposals/${created.id}/pdf`, {
    headers: { Cookie: sessionCookie! },
  });
  if (pdfRes.status !== 200) {
    fail(4, `pdf fetch returned ${pdfRes.status} (expected 200)`);
  }
  // Prefer X-Content-SHA256 header (avoids downloading the full PDF body).
  const pdfSha256Header = pdfRes.headers.get('X-Content-SHA256');
  let actualSha256: string;
  if (pdfSha256Header) {
    actualSha256 = pdfSha256Header.toLowerCase().trim();
    // Consume the body to avoid connection leaks.
    await pdfRes.body?.cancel();
  } else {
    // Fallback: compute SHA-256 from the PDF bytes directly.
    const pdfBytes = await pdfRes.arrayBuffer();
    actualSha256 = createHash('sha256').update(Buffer.from(pdfBytes)).digest('hex');
  }
  if (actualSha256 !== expectedSha256) {
    fail(
      4,
      `PDF SHA-256 drift detected (PROP-17)!\n` +
      `  expected: ${expectedSha256}\n` +
      `  got:      ${actualSha256}\n` +
      `  If global_params coefficients have been customised, rotate the fixture:\n` +
      `    npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE\n` +
      `  Then re-commit expected.sha256.txt. Investigate before September cutover.`,
    );
  }
  console.log('  [ok] byte-deterministic match');

  // ── Step 5: Soft-delete ──────────────────────────────────────────────────
  console.log(`[step 5] POST /api/proposals/${created.id}/delete ...`);
  const delRes = await fetch(`${APP_URL}/api/proposals/${created.id}/delete`, {
    method: 'POST',
    headers: { Cookie: sessionCookie! },
  });
  if (delRes.status !== 200) {
    fail(5, `delete returned ${delRes.status} (expected 200)`);
  }
  console.log('  [ok]');

  // ── Step 6: Restore ──────────────────────────────────────────────────────
  console.log(`[step 6] POST /api/proposals/${created.id}/restore ...`);
  const restoreRes = await fetch(`${APP_URL}/api/proposals/${created.id}/restore`, {
    method: 'POST',
    headers: { Cookie: sessionCookie! },
  });
  if (restoreRes.status !== 200) {
    fail(6, `restore returned ${restoreRes.status} (expected 200)`);
  }
  console.log('  [ok]');

  // ── Step 7: Cleanup soft-delete (idempotency invariant) ──────────────────
  // Leaves the target DB in the same state every run: proposal is soft-deleted,
  // ready for the next cron purge (DATA-10 / CUT-08).
  console.log(`[step 7] POST /api/proposals/${created.id}/delete (cleanup) ...`);
  const cleanupRes = await fetch(`${APP_URL}/api/proposals/${created.id}/delete`, {
    method: 'POST',
    headers: { Cookie: sessionCookie! },
  });
  if (cleanupRes.status !== 200) {
    fail(7, `cleanup delete returned ${cleanupRes.status} (expected 200)`);
  }
  console.log('  [ok]');

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Smoke complete. Proposal ${created.id} created, verified, soft-deleted.`);
  console.log('  PDF SHA-256 byte-determinism: OK');
  console.log('  OVH-portability: PROVEN against this APP_URL.');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('');
  console.error('[FATAL] unhandled error during smoke run:');
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
