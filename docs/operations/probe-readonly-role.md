# `probe_readonly` — the read-only Neon role for the write-isolation probe

One-time operator setup for `scripts/probe-write-isolation.ts`. It creates a role on the
Neon **`main`** branch that physically cannot write to production, and that role's connection
string is what goes in the probe's `PROBE_MAIN_URL` slot.

Run this once. After that the role is permanent and only its password ever changes.

> **Related:** [`neon-branch-routing.md`](./neon-branch-routing.md) (branch/endpoint map),
> `scripts/probe-write-isolation.ts` (the header explains the whole probe),
> `.planning/phases/36-gate-repair-planning-record-hygiene/36-PROBE-TRANSCRIPT.md` (the runs that
> produced this requirement).

---

## Why this role exists

The probe reads production. Its stated contract is that it reads production with a session that
*could not have written to it* — so that a future edit adding a write to the `main`-side client
is stopped by the server rather than by a naming convention in the source.

The first attempt at that floor was the `default_transaction_read_only` **startup parameter**,
sent by the client on connect. Measured on 2026-09-05 against the real `main` branch:

| Endpoint | `transaction_read_only` |
|----------|-------------------------|
| `ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech` (pooled) | `off` |
| `ep-icy-boat-alx5o1tz.c-3.eu-central-1.aws.neon.tech` (direct)        | `off` |

Neon drops it on **both**, so it is not a pooler artifact and switching endpoint type does not
help. The inference — not documented Neon behaviour, and not independently confirmed — is that
Neon's proxy fronts both endpoint types and forwards only an allowlist of startup parameters.

A **role default** does not travel that path. `ALTER ROLE ... SET default_transaction_read_only`
is stored in `pg_db_role_setting` and applied by Postgres itself at session start; the proxy
never sees it, so there is nothing for it to drop. That is the whole reason this role works
where the parameter did not.

The role carries the floor in two independent places, and the probe's gate 5 measures both:

1. `default_transaction_read_only = true` as a role default → every transaction starts read-only.
2. `SELECT` on `schema_meta` and nothing else → a write is refused on privilege even if (1) were
   ever lost.

---

## Do **not** create this role in the Neon Console

Roles created through the Neon Console or the Neon API are granted membership in
`neon_superuser`, which can write to everything. Such a role would fail the probe's gate 5, and
worse, would look correct while doing so.

Create it with the SQL below, as `neondb_owner`. The Console's **SQL Editor** is a fine place to
*run* that SQL — just not its "Roles" tab.

---

## Create the role

1. Generate a password locally and keep it somewhere you can paste from twice:

   ```bash
   openssl rand -base64 32 | tr -d '/+=' | cut -c1-32
   ```

2. Open the [Neon Console](https://console.neon.tech) → project `leasetic-matrice` → **SQL
   Editor**. Select branch **`main`** and database **`neondb`**. Check the branch selector twice;
   this is production.

3. Paste the following, replacing `__PASTE_PASSWORD_HERE__` with the value from step 1. It is
   idempotent — safe to re-run, and re-running is how you rotate the password.

   ```sql
   -- probe_readonly: the PROBE_MAIN_URL role for scripts/probe-write-isolation.ts.
   -- Run on the `main` branch, as neondb_owner. Not a migration: never add this to
   -- drizzle/ and never fan it out through db-migrate.yml.
   DO $$
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'probe_readonly') THEN
       CREATE ROLE probe_readonly LOGIN;
     END IF;
   END
   $$;

   ALTER ROLE probe_readonly PASSWORD '__PASTE_PASSWORD_HERE__';

   -- The floor, part 1: applied by the server at session start, so Neon's proxy
   -- never gets the chance to drop it the way it drops the startup parameter.
   ALTER ROLE probe_readonly SET default_transaction_read_only = true;

   -- The floor, part 2: least privilege. SELECT on exactly the one table the probe
   -- reads, and no write privilege anywhere.
   REVOKE ALL ON ALL TABLES IN SCHEMA public FROM probe_readonly;
   REVOKE ALL ON SCHEMA public FROM probe_readonly;
   GRANT CONNECT ON DATABASE neondb TO probe_readonly;
   GRANT USAGE ON SCHEMA public TO probe_readonly;
   GRANT SELECT ON TABLE public.schema_meta TO probe_readonly;

   -- Future tables must not silently become readable by this role.
   ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM probe_readonly;
   ```

4. Verify, in the same editor:

   ```sql
   SELECT rolname, rolcanlogin, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'probe_readonly';
   SELECT setconfig FROM pg_db_role_setting s
     JOIN pg_roles r ON r.oid = s.setrole WHERE r.rolname = 'probe_readonly';
   SELECT table_name, privilege_type FROM information_schema.table_privileges
     WHERE grantee = 'probe_readonly' ORDER BY table_name, privilege_type;
   ```

   Expect: `rolcanlogin = t`, `rolsuper = f`, `rolbypassrls = f`;
   `setconfig = {default_transaction_read_only=true}`; and exactly one privilege row —
   `schema_meta | SELECT`. Anything else, especially an INSERT/UPDATE/DELETE row or a
   `neon_superuser` membership, means the role was created the wrong way. Drop it
   (`DROP ROLE probe_readonly;`) and redo it from step 2.

---

## Build the connection string

Compose it by hand — the Console's connection widget only knows about Console-created roles:

```
postgresql://probe_readonly:<password>@ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Either endpoint form is accepted by the probe's allow-list; the pooled one above is the default.
If the pooled endpoint ever reports `transaction_read_only = off` for this role, try the direct
host (`ep-icy-boat-alx5o1tz.c-3.eu-central-1.aws.neon.tech`) and record what you saw — that would
be new information about how Neon's pooler handles role defaults, and the probe's header should
be corrected to match.

**Do not store this string in any `.env` file.** The probe deliberately reads no env file
(see its header, "THE `_load-env` DIVERGENCE"). Keep the password in the password manager and
paste it into a hidden prompt at run time:

```bash
read -rs -p 'dev  URL: ' PROBE_DEV_URL;  echo
read -rs -p 'main URL (probe_readonly): ' PROBE_MAIN_URL; echo
PROBE_DEV_URL="$PROBE_DEV_URL" PROBE_MAIN_URL="$PROBE_MAIN_URL" npm run probe:write-isolation
unset PROBE_DEV_URL PROBE_MAIN_URL
```

A run with the role in place prints no gate-5 line at all — the gate is silent when it passes.
A run with the **owner** role instead now prints `ERROR: ... is able to write to production —
refusing to certify this run` and exits non-zero. That refusal is the gate working, not a
regression.

---

## Rotation and revocation

- **Rotate:** re-run step 3 with a new password. `ALTER ROLE ... PASSWORD` is idempotent, and the
  grants below it are unchanged by a re-run.
- **Revoke:** `DROP ROLE probe_readonly;` on `main`. The probe then refuses every run until the
  role is recreated, which is the intended failure — it never silently falls back to the owner.
- **Branch inheritance:** Neon branches are copy-on-write, so any branch forked from `main` after
  this role exists inherits it, including CI's ephemeral `db-smoke` branches (`ci.yml` creates
  them with `parent: main`). Harmless — the role is `SELECT`-only on one table there too — but
  worth knowing, and note that rotating the password on `main` does not reach branches already
  forked.
- **This is not a migration.** It creates no schema objects and must never enter `drizzle/` or
  `db-migrate.yml`; Phase 20 locked rule 3 governs schema, not roles, and a role carrying a
  password has no business in a committed migration file.
