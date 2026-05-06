# Features Research — Leasétic Matrice v1.1

> **Quality note (orchestrator-added):** This research was produced under degraded tool access — the agent could not read project files or run web searches. Specific implementation API names (Firebase / Firestore) were assumed by the agent and are **wrong for our chosen stack** (Next.js + Postgres + NextAuth + Vercel Blob). Treat all framework-specific references as **conceptually correct, technically wrong** — the synthesizer must translate them. Feature scoping (table-stakes / differentiators / anti-features) is stack-agnostic and remains valid.

---

**Domain:** B2B internal tool for IT-leasing channel partners (EU/FR jurisdiction)
**Milestone:** v1.1 — hosted web app foundation (auth + persistence + admin)
**Researched:** 2026-05-05
**Overall confidence:** MEDIUM — recommendations grounded in well-established B2B SaaS patterns and EU/GDPR conventions; no live verification was possible (Read/Bash/WebSearch were denied), so version-specific API details and current French CNIL guidance are flagged where relevant. Decisions about scope (what is over-built vs. table-stakes) are HIGH confidence given the explicit constraints in the briefing (small partner pool, single admin, single product owner).

**Tooling note:** This run was unable to read project files or perform web research; findings rely on the comprehensive milestone context provided and on durable B2B SaaS / EU compliance patterns. Items I would normally verify are marked LOW confidence and flagged.

---

## Reading the categories

- **Table-stakes** = if missing at launch, the product is broken or unprofessional. MUST ship in v1.1.
- **Differentiator** = improves UX over v10, reasonable to add if cheap, but defer if it adds a week.
- **Anti-feature** = looks obvious, often requested, but explicitly OUT of scope for v1.1. Each one has a justification.

Complexity: **S** = <1 day, **M** = 1–3 days, **L** = >3 days (rough, single-dev calibration).

---

## 1. Authentication & Account Management

### Table-stakes

| Feature | Complexity | Depends on | Notes |
|---|---|---|---|
| Email + password login | S | NextAuth Credentials provider | Required by the brief. |
| Logout | S | session | Visible from topbar/sidebar. Clears session + any client cache. |
| Password reset (self-serve, email-based) | S | Auth + transactional email | Customize the email template in FR + EN, with Leasétic branding. Reduces support load — without this, every forgotten password is an admin ticket. |
| Session persistence across reloads | S | Auth | Default: persistent until logout or token expiry. No "remember me" checkbox. |
| Session timeout / token refresh | S | Auth | Sensible default (e.g., 24h+refresh). Acceptable for this tool. |
| Login error states (wrong password, unknown user, network) | S | i18n | Generic "incorrect email or password" message — do not leak whether the email exists (anti-enumeration). Localized FR/EN. |
| Auth-gated routing (unauth users → login; authed users on /login → home) | S | Router/middleware | Standard guarded-route pattern. |
| Required: legal mentions on login page | S | — | Link to Mentions légales / Politique de confidentialité (CNIL/GDPR requirement for any EU-facing service collecting credentials). |

### Differentiators

| Feature | Complexity | Worth it? |
|---|---|---|
| Force password change on first login | S | **YES — recommend including in table-stakes if you go with the "admin-generates-password" onboarding flow.** Without it, partners run on whatever the admin typed forever. |
| Account lockout after N failed attempts (e.g., 10/15min) | S–M | **NO for v1.1.** Adds DoS vector (attacker locks out a real partner). Skip until a security incident proves it's needed. |
| Login activity / "last login" displayed to user | S | Nice-to-have. Cheap to surface on home page. Defer unless trivial. |
| 2FA / MFA | M–L | **NO for v1.1.** This is an internal tool with a curated partner pool, not a banking app. Add later only if a partner asks or a security review demands it. |
| Audit log of logins (admin-visible) | M | **DEFER.** Useful for incident response but pure overhead for a small partner pool. |
| SSO / Google login | M | **NO.** Explicitly out per brief. |

### Anti-features (DO NOT BUILD)

| Anti-feature | Why over-scoped |
|---|---|
| Self-signup / "Create an account" page | Explicitly excluded by brief — partners are curated. Removing this from the UI also removes attack surface. |
| Social SSO | Adds OAuth setup, identity-merging edge cases, and partners would still need to be pre-authorized. No value. |
| "Remember me" checkbox | Default persistence handles this. |
| Email verification on signup | No signup → no flow needed. The admin verifies the email when they create the account. |
| CAPTCHA on login | Overkill for ~tens of users. |
| Username (separate from email) | One identifier is enough. |

### Onboarding flow — recommendation

Three real-world patterns for "admin creates account, partner gets credentials":

1. **Admin sets a password, sends verbally / out-of-band, partner logs in then forced to change.** Worst of both worlds.
2. **Admin creates the account with a random password, partner gets a "set your password" email link.** Clean, no shared-secret-in-the-clear.
3. **Magic-link first login, then prompt to set a password.** Slightly fancier; partners might find it unfamiliar.

**Recommendation: Pattern 2 (set-your-password invite email).** Mechanics:

- Admin creates the user via server action with a randomly generated password they never see/share.
- Server triggers a one-time set-password email (using NextAuth's verification-token primitive or a custom signed-token route).
- Send a customized "Welcome to Leasétic Matrice — set your password" email to the partner with that link.
- Partner clicks → sets password → lands on home page logged in.

This:
- Avoids any shared-secret-in-channel risk.
- Reuses the same password-reset infrastructure you already need.
- Gives the partner a first-touch UX that says "this is yours."
- Means your admin UI just needs an "Invite partner" button that takes email + role + display name.

*Confidence: MEDIUM.* The exact NextAuth credentials-provider + verification-token API should be re-verified during planning.

---

## 2. Home Page (Post-Login)

### Table-stakes

| Feature | Complexity | Depends on | Notes |
|---|---|---|---|
| "Create new proposal" CTA | S | router | Primary action — visually dominant button. |
| List of recent proposals (current user's only, for partners) | S | DB query | Sorted by `created_at` desc. |
| Pagination or "load more" | S | DB cursor | **Show last 20** by default. Use cursor-based pagination for "load more." |
| Each row shows: client name (or LC reference), date, amount, status indicator (validity expired vs. active) | S | data model | These are the columns a partner actually scans for. |
| Empty state — for brand-new partners with zero proposals | S | i18n | "No proposals yet — create your first one." Localized. |
| Click row → view proposal detail / re-download PDF | S | router | See section 3. |
| Greeting / partner name in topbar | S | auth | Standard "Bonjour, {name}". Already exists in v10 shell — extend with auth context. |

### Differentiators

| Feature | Complexity | Worth it? |
|---|---|---|
| Search by client name or LC reference | S–M | **YES, recommend including** — once a partner has 50+ proposals, the recent list isn't enough. Cheap with a `WHERE` clause + ILIKE. |
| Filter by date range | M | **DEFER.** |
| Filter by client | M | **DEFER.** Search by name covers most of the same need. |
| Sort toggle (date / amount / client) | S | Defer. Default `created_at desc` covers 95% of need. |
| Duplicate-from-existing | M | **STRONG DIFFERENTIATOR — recommend including in v1.1 if scope allows.** Real workflow: a partner makes proposal A for a client at a given amount, then needs proposal B for the same client at a different amount. Saves real time. **Do NOT carry forward immutability — the duplicate is a brand-new proposal that, when generated, snapshots whatever the current global coefficients are.** |
| Archive / unarchive | S–M | **DEFER.** |
| Tag / categorize proposals | M | **NO.** Folksonomy with no consumer = dead feature. |
| Bulk actions (multi-select + delete/archive) | M | **NO** for v1.1. |

### Anti-features (DO NOT BUILD)

| Anti-feature | Why over-scoped |
|---|---|
| Dashboard with charts (proposals/month, total amount, conversion funnel) | Partners are operating, not analyzing. |
| Team collaboration / shared workspace | Each partner is a single seat. |
| Comments / threads on proposals | The proposal is a static financial document. |
| "Share with another partner" / "Forward proposal" | Partners are siloed by design. |
| Notifications / activity feed | No multi-user workspace inside a partner account. |
| In-app messaging / chat with Leasétic admin | Email exists. |
| Favorites / pinned proposals | Use search instead. |

---

## 3. Proposal Management

### Table-stakes

| Feature | Complexity | Depends on | Notes |
|---|---|---|---|
| Save proposal on PDF generation (atomic with PDF creation) | M | DB + Blob | Each generation writes (a) a DB row with input data + metadata + URL to PDF, and (b) a binary PDF in Blob. Both writes succeed or neither does (use a transaction or compensating action). |
| View saved proposal: see input fields (read-only) + download PDF button | S | blob URL | Partners need both — the inputs (to remember what they sent) and the PDF (to re-send to the client). |
| Re-download PDF (from immutable storage) | S | blob | Same byte-for-byte file. Critical: never regenerate from inputs at view-time. **Show the stored PDF.** |
| LC reference saved per proposal | S | data model | Auto-generated in v10 — carry forward. Display prominently on detail view and in the home-page list. |
| Client-name field captured at proposal creation | S | form | This is the human-readable identifier partners scan for. **Required on save**, even if v10 makes it optional. |
| Created-at timestamp | S | data model | Server timestamp, not client clock. |
| Validity expiry indicator on detail view ("Valid until DD/MM/YYYY" or "Expired") | S | created-at + validity field | v10 already has the validity selector; surface its consequence visibly. |
| Snapshot of the coefficients used | S | data model | Store the coefficient/commission/threshold values used for this proposal. **Critical for audit and for the immutability invariant.** |
| Snapshot of bilingual content (which language the PDF is in) | S | data model | Saved PDF was generated in FR or EN; record which. |

### Differentiators

| Feature | Complexity | Worth it? |
|---|---|---|
| Rename proposal (internal note field, not the LC reference or client name) | S | **CONDITIONAL.** Allow editing an "internal notes" string visible only to them. Recommend defer to v1.2. |
| Delete proposal (soft delete) | S | data model | **YES — table-stakes if you take GDPR seriously.** Soft delete: row gets `deleted_at`, hidden from default list, PDF stays in storage. Allows partner cleanup, gives admin a 30-day window before hard-purge. |
| Hard delete (purge PDF + DB record) | S | scheduled job | Triggered automatically 30 days after soft delete, or by admin on GDPR request. Required for GDPR. |
| Duplicate proposal | S–M | See Home Page section above. |
| Export list as CSV (partner's own proposals) | S | — | Defer. Useful for end-of-quarter accounting. |
| Send PDF directly via email from the app | M | mail provider | **NO for v1.1.** Adds transactional email dependency, deliverability concerns. |
| PDF preview in-browser (without download) | S | `<embed>` or PDF.js | **YES, recommend.** Trivial. Confirms the partner is looking at the right file before re-sending. |

### Anti-features (DO NOT BUILD)

| Anti-feature | Why over-scoped |
|---|---|
| Edit a saved proposal's inputs and regenerate PDF | **Violates the immutability invariant.** Partners who want a corrected version create a new proposal (use Duplicate). |
| Versioning ("v1, v2, v3 of this proposal") | Same — proposals are atomic, immutable financial offers. |
| Sharing a proposal with another partner | Partner data is siloed. |
| Public share link | Don't introduce a hosted-URL surface that has its own access-control complications. |
| Comments / annotations on a saved proposal | Mutable layer on an immutable object. |
| E-signature integration | Not in scope. |
| Status workflow ("draft → sent → accepted → declined") | CRM territory. |

### GDPR / French data protection — open question, with recommendation

- **Right to erasure (RGPD article 17 / GDPR Art. 17):** Applies to personal data of *natural persons*. Corporate names are not personal data. **However:** if a proposal includes a contact person's name, email, or phone, that's personal data of a natural person, and erasure rights apply.
- **Conflicting obligation — accounting / commercial retention:** French commercial code (Code de commerce L.123-22) requires retention of commercial documents for **10 years**. Lease proposals are pre-contractual but if a contract follows, the proposal is part of the file.
- **Reconciliation:** Standard pattern — "retain for legal-obligation period, then delete; allow erasure of identifying personal data within the document if technically feasible, OR refuse erasure citing legal obligation under GDPR Art. 17(3)(b)."

**Recommendation for v1.1:**

1. **Soft-delete capability for partners** (their own proposals) — surfaces as "delete" but is recoverable for 30 days. Table-stakes.
2. **Hard-delete by admin on GDPR request** — admin-only action, logged, irreversible. Table-stakes.
3. **No automatic purge based on age** for v1.1 — keep all proposals indefinitely; revisit retention policy in a later milestone with legal counsel.
4. **Privacy notice on the login page and in proposal-creation flow:** state retention period, data controller, contact for access/deletion. Required for CNIL compliance regardless.
5. **Don't store unnecessary personal data.** If the v10 form captures the end-client contact's email/phone, evaluate whether that's needed at all — minimization is the cheapest GDPR strategy.

*Confidence: MEDIUM.* Flag for legal review before writing into a privacy notice.

---

## 4. Admin Surface (Leasétic admin only)

### Table-stakes

| Feature | Complexity | Depends on | Notes |
|---|---|---|---|
| Edit global coefficients, commission rate, max threshold | S | DB | Single row in a `global_settings` table (or `coefficients` history table — see ARCHITECTURE). Admin-only write enforced by middleware + role check. New proposals read this at generation time. |
| List partners (email, name, status, last login, created date) | S | DB | Simple table view. |
| Create partner account (invite flow) | S–M | server action | Form with email, display name, role. Triggers the password-setup email flow described in Section 1. |
| Reset partner password (admin-triggered) | S | server action | Admin clicks "Send password reset" → triggers same set-password-link flow. |
| Disable / re-enable partner account | S | DB flag | `disabled: true` flag. Disabled users can't log in but data is preserved. **Prefer disable over delete.** |
| Delete partner account (rare, GDPR-driven) | S | server action | Hard-delete the user + cascade-delete or anonymize their proposals per GDPR. Confirm with destructive-action modal. |
| Role-gating — admin URL hidden, role checked server-side | S | role column + middleware | Use a `role` column on user table. Both client-side route guard AND server-side enforcement. **Server-side enforcement is non-negotiable.** |
| Coefficient change confirmation modal | S | — | "This will affect all NEW proposals from now on. Existing proposals are unchanged. Confirm?" — protects against fat-fingered changes. |

### Differentiators

| Feature | Complexity | Worth it? |
|---|---|---|
| Coefficient change history / audit log | M | **YES, recommend including in v1.1.** Cheap (append-only table of `{field, old_value, new_value, changed_by, changed_at}`), high value: when a future dispute arises ("what was the coefficient on March 15?") you have an answer. Surface as a simple table on the admin page. |
| See all proposals across all partners (admin view) | S | DB query | Useful for support and for sanity checks. Read-only. Worth including. |
| Partner activity log (logins, proposals created) | M | **DEFER.** |
| Admin "impersonate" / "view as partner" | M–L | **NO for v1.1.** Significant security complexity. |
| Bulk import partners (CSV) | M | **NO.** Manual create-one-at-a-time is fine for <50 partners. |
| Email templates editor | M | **NO.** Customize them in code/config. |

### Anti-features (DO NOT BUILD)

| Anti-feature | Why over-scoped |
|---|---|
| Full RBAC (roles + permissions matrix) | You have two roles: admin and partner. A two-row matrix is just a `role` field. |
| Multi-admin with different permission tiers | Single admin per the brief. |
| Settings UI for every config value | Only mutate-in-prod settings need a UI. |
| Feature flags / experimentation framework | Premature for <100 users. |
| Per-partner customization of coefficients | **Explicitly removed in v1.1.** |
| Partner-management dashboard with revenue/usage charts | Single admin who knows every partner personally. |
| Webhooks / API for external systems | No external system asked for one. |

---

## 5. Migration / Cutover (v10 → v1.1)

### What "hard cutover" means in practice

| Step | When | Owner | Notes |
|---|---|---|---|
| Internal alpha (Antoine + Thomas) | T-3 weeks | Antoine | Auth + create-proposal end-to-end. Validate that PDF output is byte-identical to v10. |
| Closed beta with 1–2 friendly partners | T-1 to T-2 weeks | Thomas | Real-world test on real client data. |
| Cutover communication email to all partners | T-7 days | Thomas | Announces (a) the new URL, (b) that v10 will be retired on date X, (c) credentials will arrive separately, (d) past v10 proposals are NOT migrated. |
| Send invite emails (set-your-password) | T-2 days | Antoine via admin UI | Each partner gets a personalized "set your password" link. |
| v10 access revoked / page replaced with redirect notice | T-day | Antoine | Replace v10 HTML with a single-page "Leasétic Matrice has moved → [new URL]." |
| Day-of support window | T-day to T+3 days | Thomas + Antoine | Pre-write FAQ. |

### Table-stakes for cutover

- A **dated, written email** to all partners 1 week before, explaining the change.
- A **redirect or notice page** at the old v10 URL on cutover day.
- A **support contact** explicitly named in the email.
- A **pre-written FAQ** covering: "I lost my password," "where are my old proposals?", etc.
- **No localStorage migration** — communicate clearly: "Past proposals from v10 are not transferred; please save any you need before [date]."

### Anti-features for cutover

| Anti-feature | Why |
|---|---|
| Backward-compatibility with v10 (run both for a month) | Doubles support surface; partners avoid the new app. |
| Automated migration of v10 localStorage proposals | localStorage is per-device; data quality is unknown. |
| Phased rollout by partner cohort | Adds operational complexity at no real benefit for ~tens of partners. |
| In-app onboarding tour | The UI is similar enough to v10 that partners will recognize it. |
| Telemetry on v10 to measure who has migrated | You'll know from logins to v1.1. |

---

## 6. Open features the brief didn't ask about

### Probably worth including (table-stakes I'd add)

| Feature | Complexity | Why |
|---|---|---|
| **Server-side error logging / observability** (Sentry, or platform logs) | S | First time something breaks for a partner, you'll wish you had this. |
| **Privacy policy + terms of use pages** (FR + EN) | S–M (mostly content) | Required by EU/CNIL for any service collecting credentials. |
| **No analytics in v1.1** = no cookie consent banner needed | S | **Easier path: don't set non-essential cookies.** |
| **Backup / export strategy for the DB** | S | Set up scheduled DB exports to a Storage bucket. |
| **Monitoring for the PDF generation** | S | If a coefficient change ever produces malformed PDFs, you want to know within minutes. |
| **Health check / status page** (even if just an internal one) | S | "Is the app up?" answerable without logging in. |

### Probably worth deferring

| Feature | Why |
|---|---|
| Analytics (Mixpanel / PostHog / GA4) | Adds GDPR cookie-consent obligations. |
| Email notifications for partners | Notification fatigue and email-deliverability headache. |
| Partner self-serve profile editing | Low-value feature that can wait. |
| Custom branding per partner (white-label PDF) | Big lift, no signal from the brief. |
| Webhooks / Zapier / API surface | No consumer. |
| Mobile app | Web app is responsive enough for occasional mobile use. |

### Things that often show up in B2B SaaS but are wrong here

- **"Workspaces" abstraction** — implies multi-tenant inside a partner. You don't have that.
- **Pricing/billing UI** — partners don't pay.
- **Support widget (Intercom, Zendesk)** — email is fine for this scale.
- **In-app changelog / "what's new"** — release notes can be in the welcome email or a static page.
- **Multi-currency** — the brief implies EUR-only.

---

## Summary — recommendation snapshot for REQUIREMENTS.md

**Must ship in v1.1 (table-stakes only):**
- Email/password auth, password reset, force password change on first login, session persistence, auth-gated routes
- Set-your-password invite email flow (Pattern 2 above)
- Home page: create-new CTA + recent-proposals list (last 20, paginated, sorted by date desc, with client name + LC ref + amount + date columns)
- Save proposal on PDF generation: input snapshot + coefficient snapshot + binary PDF in Blob + LC ref + client name + lang
- View saved proposal: read-only inputs + re-download PDF + (recommended) PDF preview embed
- Soft-delete proposal (partner) + hard-delete (admin, GDPR-driven)
- Admin: edit global coefficients/commission/threshold (with confirmation modal + change log)
- Admin: list partners, invite partner, reset partner password, disable partner
- Admin: cross-partner proposal read view (support tool)
- Server-side role enforcement in middleware + DB constraints
- Privacy policy + legal mentions in FR/EN
- Server-side error logging (Sentry or equivalent)
- Cutover plan: comm email, v10 redirect page, FAQ, support window

**Recommend including as differentiators (cheap, high-leverage):**
- Search proposals by client name / LC ref
- Duplicate-proposal-from-existing
- Coefficient change audit log
- PDF in-browser preview

**Explicitly defer to v1.2+:**
- Filters (date, client), archive, rename/notes, CSV export
- Analytics, charts, dashboards
- 2FA, account lockout, login activity feed
- Bulk operations
- Email-the-PDF-from-app
- Full audit log UI

**Anti-features called out by category** — see each section above.

---

## Confidence assessment

| Area | Confidence | Reason |
|---|---|---|
| Auth table-stakes / anti-features | HIGH | Standard B2B internal-tool patterns; constraint of "no self-signup" makes the scope obvious. |
| Onboarding flow recommendation (Pattern 2) | MEDIUM | Pattern is well-established; specific NextAuth API names should be re-verified. |
| Home page scope | HIGH | Strongly bounded by the brief's "small partner pool, single admin" constraints. |
| Proposal management / immutability | HIGH | Brief is explicit on immutability invariant. |
| GDPR / retention | MEDIUM | Outline is correct; **specific retention periods and the conflict with French commercial-code retention should be reviewed by legal counsel.** |
| Admin surface | HIGH | Single-admin scope eliminates most ambiguity. |
| Cutover plan | MEDIUM | Generic best-practice; the actual partner-communication wording is Thomas's call. |
| "Other features" section | HIGH | Confidence in the *scope* call (skip vs. include); some specific tool recommendations are MEDIUM. |

---

## Open question for the orchestrator

**One thing the agent could not verify: whether the v10 form already collects a structured "client name" field, or whether the LC reference is the only client-identifier present.** If client name is *not* already in the v10 form, adding it is a small but non-zero v1.1 change worth flagging in REQUIREMENTS.md as "form schema delta."
