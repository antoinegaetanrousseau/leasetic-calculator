# Phase 31: Reconciliation Engine & Proposal Extraction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-02
**Phase:** 31-reconciliation-engine-proposal-extraction
**Areas discussed:** Extraction scope, Contacts from inputs, Review-queue durability, Trigger and dry-run output

---

## Extraction scope

### Which proposal statuses feed the extraction?

| Option | Description | Selected |
|--------|-------------|----------|
| Active + deleted, skip drafts | A finalized proposal evidences a real client; a soft-deleted one still happened. Drafts INSERT with `inputs = '{}'` so many are abandoned or half-filled. | ✓ |
| Active only | Cleanest signal, but loses any client whose only proposal was later deleted. | |
| All three, including drafts | Maximum coverage; pulls in abandoned drafts that become skipped rows or thin junk companies. | |

**User's choice:** Active + deleted, skip drafts

### Rows with no usable company name

| Option | Description | Selected |
|--------|-------------|----------|
| Skip, and list them in the report | Reported as skipped with proposal ids — what the import declines to do is part of a full report. | ✓ |
| Skip silently | Quieter, but a silently ignored row is indistinguishable from one never seen, making the report unfalsifiable. | |
| Fail the whole run | Safest against silent data loss; one bad legacy draft blocks the entire import. | |

**User's choice:** Skip, and list them in the report

### Historical SIREN normalization

| Option | Description | Selected |
|--------|-------------|----------|
| Strip non-digits; if not exactly 9, treat as absent | Matches Phase 30's create path; a malformed SIREN falls through to name-matching instead of auto-merging. | ✓ |
| Strip, keep whatever remains | Preserves every typed value, but an 8- or 10-digit typo becomes a real identity under the UNIQUE constraint. | |
| Strip; route malformed to human review | Nothing discarded, nothing auto-merged; larger queue seeded with probable typos. | |

**User's choice:** Strip non-digits; if not exactly 9, treat as absent
**Notes:** Chosen for the safety property — bad data degrades into human review rather than into an automatic merge.

### Same partner, same normalized name, different SIRENs

| Option | Description | Selected |
|--------|-------------|----------|
| Flag for human review | IMPORT-04's ambiguity from a single source: typo, or two legal entities sharing a trading name — the engine cannot tell. | ✓ |
| First SIREN wins | Deterministic, but silently discards the second value if the first was the typo. | |
| Most recent proposal wins | Assumes self-correction over time; still silently overwrites. | |

**User's choice:** Flag for human review

---

## Contacts from inputs

### Should extraction create contacts?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, when a name is present | `inputs` already carries exactly the contacts shape; it is the partner's own asset per CRM-04. | ✓ |
| No — companies and relationships only | Exactly what IMPORT-01 promises; smallest engine and blast radius. | |
| Yes, behind a flag defaulting to off | Ships the capability but costs a second code path to test. | |

**User's choice:** Yes, when a name is present

### Contact dedup key within a relationship

| Option | Description | Selected |
|--------|-------------|----------|
| Email if present, else normalized name | Email is the closest thing to an identity key; name fallback catches repeated entry with no email. | ✓ |
| Normalized name only | Simple, but collapses two people sharing a name and splits a renamed person. | |
| Never dedup — one per source proposal | Lossless, but ten proposals produce ten near-identical contacts. | |

**User's choice:** Email if present, else normalized name

### Phone/email present but no name (`contacts.name` is NOT NULL)

| Option | Description | Selected |
|--------|-------------|----------|
| Skip the contact, keep the company | Avoids inventing data to satisfy a constraint; the number stays visible on the proposal. | ✓ |
| Use the company name as the contact name | Preserves coordinates but fabricates a person, contradicting CRM-04. | |
| Placeholder like "Contact sans nom" | Honestly labelled, but adds a magic string someone must clean up. | |

**User's choice:** Skip the contact, keep the company

### Provenance of extracted records

| Option | Description | Selected |
|--------|-------------|----------|
| Add a provenance column in this phase's migration | Without a marker a bad import cannot be surgically undone; follows CRM-08's cheap-column-now precedent. | ✓ |
| No — the audit log is enough | History exists in Phase 30's audit rows; reconstructing provenance means querying the log. | |
| Reuse the existing external-reference columns | No migration, but overloads columns meaning "came from that external system". | |

**User's choice:** Add a provenance column
**Notes:** Makes a migration part of this phase.

---

## Review-queue durability

### Where the pair decision lives

| Option | Description | Selected |
|--------|-------------|----------|
| New table of pair decisions | The only option that can store a keep-separate verdict, which otherwise leaves no trace because nothing was written. | ✓ |
| A column on companies | Handles merges without a new table, but cannot record "deliberately separate". | |
| Audit log only | No migration; engine would have to replay the log, and keep-separate is not a mutation to log. | |

**User's choice:** New table of pair decisions

### What identifies a pair across runs

| Option | Description | Selected |
|--------|-------------|----------|
| The normalized-name pair | Stable before anything is written (required for dry run) and survives a merge that removes a company id. | ✓ |
| The pair of company ids | Precise once rows exist; meaningless in a dry run and broken by the merge itself. | |
| A content hash | Compact, but opaque when debugging and silently invalidated by any change to its inputs. | |

**User's choice:** The normalized-name pair

### Who resolves the queue

| Option | Description | Selected |
|--------|-------------|----------|
| Admin only | Near-forced by CRM-02 — a flagged pair often spans two partners, and showing it to one would leak the other's relationship. | ✓ |
| Partners resolve their own, admin the rest | Needs a rule for the mixed case anyway, so it is admin-only plus an extra path. | |
| Anyone who can see both sides | Makes queue contents depend on the viewer; hard to reason about. | |

**User's choice:** Admin only
**Notes:** Treated as a derivation from the channel-conflict model rather than a preference.

### Merge semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Repoint everything to survivor, delete loser | Requires handling the UNIQUE (company_id, owner_id) collision when one partner holds both sides — those relationships must merge too. | ✓ |
| Keep loser as an alias row | Reversible, but every companies query must exclude aliases or duplicates reappear. | |
| Merge company fields only | Avoids the constraint problem but does not actually deduplicate. | |

**User's choice:** Repoint everything to the survivor, delete the loser

---

## Trigger and dry-run output

### How the import is run

| Option | Description | Selected |
|--------|-------------|----------|
| CLI script under `scripts/` | Follows the existing ~10-script pattern via `_load-env.ts`; keeps a bulk write off the request path. | ✓ |
| Admin page with a button | Discoverable, but timeouts, double-submits and progress become real problems for a batch job. | |
| Both — script now, admin trigger later | Two surfaces to keep in step; the second is speculative. | |

**User's choice:** CLI script under `scripts/`

### Dry-run report form

| Option | Description | Selected |
|--------|-------------|----------|
| Written file, human- and machine-readable | A document to review at real row counts, plus a form the real run can diff against. | ✓ |
| stdout only | Zero plumbing, but nothing persists to compare against. | |
| Persisted to the DB, viewed in admin UI | Reviewable anywhere; ironically the write-nothing run would have to write. | |

**User's choice:** Written file, human-readable plus machine-readable

### Recording the dry run for comparison

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — real run diffs against the last dry run and reports drift | Makes "never writes without a prior dry run" enforceable rather than conventional. | ✓ |
| No — each run stands alone | Simpler and truly side-effect-free; relies on the operator remembering to read the report. | |

**User's choice:** Yes — compare and report drift

### Where the review queue lives

| Option | Description | Selected |
|--------|-------------|----------|
| Its own admin route | A transient work list is a different job from browsing the registry, and it drains to empty. | ✓ |
| A section on the companies page | One less route, but puts a work queue permanently inside a reference surface. | |
| Inline banner on affected companies | Full context at the point of ambiguity, but no sense of how much is left. | |

**User's choice:** Its own admin route

---

## Claude's Discretion

- Report file format, schema and location (Markdown + JSON expected).
- Naming of the provenance column and the pair-decision table.
- Whether the engine's source abstraction is an interface, discriminated union, or parameter — only reusability by Phase 32 is locked.
- Batching, transaction boundaries and progress reporting inside the script.

## Deferred Ideas

- HubSpot-specific extraction and provenance-based idempotency — IMPORT-02 / IMPORT-07, Phase 32.
- A UI trigger for the import — considered and rejected for now.
- Normalising `clientRole` against a controlled vocabulary — imported verbatim for now.
- Extending the provenance column to `companies` and `client_relationships` — surfaced, left open.

## Open Questions Carried Forward

Offered during discussion and deliberately not answered; recorded in CONTEXT.md for the planner:

1. Re-run idempotency over proposals already linked.
2. Canonical name selection when spellings differ but normalize identically.
3. Whether the engine runs globally in one pass or per-partner.
4. Whether the provenance column belongs on `companies` and `client_relationships` too.
5. Whether an extracted contact colliding with a partner-entered one is merged or left alone.
