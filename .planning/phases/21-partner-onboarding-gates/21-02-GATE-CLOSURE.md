---
plan_id: 21-02
plan_name: gate-closure-rotation-and-privacy
phase: 21
plan: 2
type: execute
wave: 2
depends_on:
  - 21-01
files_modified:
  - docs/legal/privacy-coverage-confirmation.md
  - docs/operations/phase-21-gate-evidence.md
autonomous: false
requirements:
  - GATE-01
  - GATE-02
must_haves:
  truths:
    - "docs/operations/phase-21-gate-evidence.md exists, committed to the repo, with the GATE-01 table containing two rows (Antoine + Emmanuel) — each row populated with rotation date + ticked 'old password rejected' + ticked 'new password authenticates'."
    - "docs/legal/privacy-coverage-confirmation.md is rewritten per D-01 — the 'Question on record' + 'Response' framing is replaced with a 'Publication' section containing the public URL + publication date + visible-additions confirmation line of the updated leasetic.fr privacy notice."
    - "docs/operations/phase-21-gate-evidence.md GATE-02 section is populated with the same public URL + publication date + visible-additions confirmation, cross-linking the legal-side document."
    - "Both admin accounts (antoine.rousseau@leasetic.com + emmanuel.rousseau@leasetic.com) authenticate successfully with their NEW individual strong passwords after rotation."
    - "The shared launch-day password `leasetic2026` is REJECTED (HTTP 401 / INVALID_EMAIL_OR_PASSWORD) when attempted against either admin account."
    - "Closure checklist in docs/operations/phase-21-gate-evidence.md has both boxes ticked: (a) GATE-01 table fully populated, (b) GATE-02 publication record complete."
  artifacts:
    - path: "docs/operations/phase-21-gate-evidence.md"
      provides: "Auditable evidence record for both v1.3 partner-onboarding gates"
      contains: "GATE-01"
    - path: "docs/legal/privacy-coverage-confirmation.md"
      provides: "Legal-side paper trail confirming the leasetic.fr privacy-notice update covers Vercel/Neon EU hosting + 10-year PDF retention"
      contains: "Publication"
  key_links:
    - from: "docs/operations/phase-21-gate-evidence.md"
      to: "docs/legal/privacy-coverage-confirmation.md"
      via: "cross-reference link in GATE-02 section"
      pattern: "privacy-coverage-confirmation"
    - from: "docs/operations/phase-21-gate-evidence.md"
      to: ".planning/STATE.md"
      via: "sources footnote (Phase 6 follow-ups #1 + Open questions #3)"
      pattern: "STATE\\.md"
verification:
  - "Manual: both admins sign in successfully with new passwords."
  - "Manual: `leasetic2026` is rejected for both admin accounts."
  - "Manual: visit the public URL recorded in docs/legal/privacy-coverage-confirmation.md → both additions (Vercel/Neon EU + 10-year retention) are visible on the page."
  - "Both ticked closure-checklist boxes committed to git."
---

<objective>
Execute the operational closure of both v1.3 partner-onboarding gates using the infrastructure shipped by Plan 21-01 (in-app /parametres flow) and the out-of-band Leasétic-website-project session for the privacy-notice publication. Produce the two evidence-bearing markdown artifacts that gate any future non-`@test.leasetic.com` partner invite.

This plan is operator-driven (NOT autonomous). Tasks 1 and 2 are manual rotation procedures executed by Antoine in production. Task 3 is the out-of-band Leasétic-website-project session executed by Antoine (the planner provides the verbatim prompt). Task 4 is the post-publication documentation pass — Antoine populates the two evidence docs and commits.

Purpose: Permanently close GATE-01 (admin password rotation) and GATE-02 (privacy notice published) so the v1.3 milestone can ship and the first real (`not @test.leasetic.com`) partner can be invited via `/[adminSegment]/partners/new`. Implements D-01, D-04, D-05 from 21-CONTEXT.md.

Output: Two committed markdown files — `docs/operations/phase-21-gate-evidence.md` (NEW, audit record) and `docs/legal/privacy-coverage-confirmation.md` (REWRITTEN per D-01).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/21-partner-onboarding-gates/21-CONTEXT.md
@.planning/phases/21-partner-onboarding-gates/21-RESEARCH.md
@.planning/phases/21-partner-onboarding-gates/21-DISCUSSION-LOG.md
@.planning/phases/21-partner-onboarding-gates/21-01-PARAMETRES.md

# Existing docs the executor reads before writing (pattern + content sources)
@docs/legal/privacy-coverage-confirmation.md
@docs/operations/neon-branch-routing.md
@docs/operations/phase-20-rollout-checklist.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create docs/operations/phase-21-gate-evidence.md skeleton (committed empty-state, populated by operator in later tasks)</name>
  <files>docs/operations/phase-21-gate-evidence.md</files>

  <read_first>
    - `docs/operations/neon-branch-routing.md` (lines 1–40 — the canonical operations-doc tone + structure: plain `#`-heading title, 1–3 paragraphs of orientation prose, markdown checkboxes for operator steps, tables for structured data, final sources/footnotes section, NO YAML frontmatter).
    - `docs/operations/phase-20-rollout-checklist.md` (lines 1–40 — sibling pattern, ticked boxes committed on the day of action as the audit trail).
    - `docs/legal/privacy-coverage-confirmation.md` (CURRENT state — Phase 10 stub, the doc Plan 21-02 Task 4 rewrites).
    - `.planning/phases/21-partner-onboarding-gates/21-RESEARCH.md` §9b (the verbatim skeleton this task transcribes — the planner's RESEARCH.md is the source of truth for the file content).
    - `.planning/phases/21-partner-onboarding-gates/21-CONTEXT.md` D-04 + D-05 (binding for this task).
    - `.planning/STATE.md` §"Phase 6 follow-ups" #1 (origin of GATE-01 + the rotation imperative) + §"Open questions" #3 (origin of GATE-02 + DATA-11 sign-off).
  </read_first>

  <action>
    Create `docs/operations/phase-21-gate-evidence.md` with the EXACT content from RESEARCH §9b. Reproducing the skeleton here so the executor has it inline (use this as the canonical text — verify against RESEARCH §9b for any drift):

    ```markdown
    # Phase 21 — Partner-Onboarding Gates: Evidence

    Created: 2026-05-29 (Phase 21 plan).
    Closed: _pending — fill on rotation day._

    This file is the auditable record that both v1.3 partner-onboarding
    gates (GATE-01 password rotation + GATE-02 privacy notice update)
    were closed before any non-`@test.leasetic.com` partner account is
    invited via the admin `/partners/new` flow. Process discipline only
    (D-04) — no code-level guard.

    ## GATE-01 — Admin password rotation (in-app flow)

    Both admin accounts rotated from the shared launch-day password
    `leasetic2026` to individual strong passwords via the new
    `/parametres` self-service flow (shipped by Phase 21 Plan 21-01).

    | Admin | Account email | Rotation date | Old password tested + rejected | New password authenticates |
    |-------|---------------|---------------|-------------------------------|----------------------------|
    | Antoine Rousseau | `antoine.rousseau@leasetic.com` | _pending_ | _pending_ | _pending_ |
    | Emmanuel Rousseau | `emmanuel.rousseau@leasetic.com` | _pending_ | _pending_ | _pending_ |

    **Verification procedure (per admin):**

    1. Open production app → user menu → "Paramètres".
    2. Change password via the in-app flow. Confirm the success toast.
    3. Sign out. Attempt sign-in with `leasetic2026` — must FAIL.
    4. Sign in with the new password — must SUCCEED.
    5. Tick the row above.

    ## GATE-02 — Public privacy notice update (leasetic.fr)

    Privacy notice on `leasetic.fr` updated by Antoine (D-01) to cover
    (a) Vercel + Neon EU hosting as data processors and (b) 10-year PDF
    retention as a new processing activity tied to French Commercial Code
    L123-22 / L110-4.

    - **Public URL:** _pending — paste once published._
    - **Publication date:** _pending._
    - **Both additions visible on the public page:** _pending — one-line
      confirmation after visual check._

    ## Closure checklist

    No non-`@test.leasetic.com` partner account may be invited via the
    admin `/partners/new` flow until:

    - [ ] Both rows in the GATE-01 table above are ticked + dated.
    - [ ] GATE-02 URL + publication date + visible-confirmation line
          above are filled.

    ---

    *Sources:*
    - `.planning/phases/21-partner-onboarding-gates/21-CONTEXT.md` D-04, D-05
    - `.planning/STATE.md` Phase 6 follow-ups #1 (origin of GATE-01)
    - `.planning/STATE.md` Open questions #3 (origin of GATE-02)
    - `docs/legal/privacy-coverage-confirmation.md` (Phase 21 rewrite —
      publication record + cross-link)
    ```

    Commit the file to git with message `docs(21): add Phase 21 gate-evidence skeleton (GATE-01 + GATE-02 pending)`.

    Do NOT yet tick any boxes. Do NOT yet fill any `_pending_` cells. Those are populated by Task 4 once the rotations + publication have happened.
  </action>

  <verify>
    <automated>test -f docs/operations/phase-21-gate-evidence.md && grep -c "_pending_" docs/operations/phase-21-gate-evidence.md</automated>
  </verify>

  <done>
    - `docs/operations/phase-21-gate-evidence.md` exists with the exact RESEARCH §9b content.
    - File is committed to git (separate commit, message above).
    - `_pending_` placeholders are present in 7 places (2 admin rows × 3 columns + 1 GATE-02 URL stub — adjust grep expectation to whatever the file actually shows; the point is the placeholders are LITERALLY present so the operator can find them).
    - Closure-checklist boxes are unticked.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 2: Antoine rotates antoine.rousseau@leasetic.com via /parametres</name>

  <what-built>
    Plan 21-01 shipped /parametres in production. This task is the operator-only execution of the rotation procedure for the first admin account, recorded into `docs/operations/phase-21-gate-evidence.md`.

    No code is changed. This is a pure operational checkpoint.
  </what-built>

  <how-to-verify>
    Before executing this task, Plan 21-01 MUST be deployed to production (the production URL https://leasetic-matrice.vercel.app must show the "Paramètres" entry in the user-menu dropdown after signing in).

    **Rotation procedure for `antoine.rousseau@leasetic.com`:**

    1. Pick a new strong password (Antoine's choice, NEVER committed anywhere). Suggested entropy: 16+ characters, mixed case + digits + symbols. Store in a password manager (1Password / Bitwarden / Apple Keychain) — NOT in the codebase, NOT in any GSD planning doc, NOT in chat transcript.

    2. Open https://leasetic-matrice.vercel.app/login in a private/incognito window. Sign in with `antoine.rousseau@leasetic.com` + the current shared password `leasetic2026`.

    3. Open the topbar user menu (click "Antoine Rousseau ▾"). Click "Paramètres".

    4. Confirm /parametres renders correctly (hero + Account card).

    5. In the password row (rev 2 — TWO fields only, no confirm):
       - Ancien mot de passe: `leasetic2026`
       - Nouveau mot de passe: <the new strong password from step 1>

    6. Click "Enregistrer les modifications". Confirm the success toast `parametres.toast.password.saved` ("Mot de passe mis à jour.").

    7. Sign out (user menu → "Se déconnecter").

    8. **Negative test (CRITICAL):** Attempt to sign in with `antoine.rousseau@leasetic.com` + `leasetic2026`. The sign-in MUST FAIL with "Adresse e-mail ou mot de passe incorrect" (or the EN equivalent). If it succeeds, STOP — the rotation did not commit; investigate before proceeding.

    9. **Positive test:** Sign in with `antoine.rousseau@leasetic.com` + the new strong password. Sign-in MUST SUCCEED. You land on the partner home dashboard.

    10. Open `docs/operations/phase-21-gate-evidence.md`. In the GATE-01 table, edit the Antoine Rousseau row:
        - Replace the first `_pending_` (Rotation date) with the actual ISO date (e.g. `2026-06-01`).
        - Replace the second `_pending_` (Old password tested + rejected) with `✓` or the text `tested ✓ — step 8 confirmed rejection`.
        - Replace the third `_pending_` (New password authenticates) with `✓` or `verified ✓ — step 9 confirmed success`.

    11. Commit the change to git with message `docs(21): tick GATE-01 row — antoine.rousseau@leasetic.com rotated`.

    **Important non-tasks:**
    - Do NOT record the new password in the evidence doc or any other tracked file.
    - Do NOT use a public/shared computer for step 1's password generation or step 6's input.
    - Do NOT close the browser tab between steps 6 and 7 without first verifying the success toast.
  </how-to-verify>

  <resume-signal>Type "approved — antoine row ticked" once steps 1–11 are complete and the commit is pushed. Type "blocked — <reason>" if any step failed.</resume-signal>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 3: Emmanuel rotates emmanuel.rousseau@leasetic.com via /parametres</name>

  <what-built>
    Same rotation procedure as Task 2, applied to the second admin account. Independent execution (no dependency on Task 2's outcome, but Antoine typically coordinates with Emmanuel to schedule this — see Plr-1 dependency in execution sequence below).
  </what-built>

  <how-to-verify>
    Either Antoine or Emmanuel executes this task. If Antoine executes on Emmanuel's behalf (e.g. shared device, screen-share), he MUST coordinate password selection with Emmanuel so Emmanuel knows the new credential.

    **Rotation procedure for `emmanuel.rousseau@leasetic.com`:**

    1. Emmanuel picks (or Antoine coordinates) a new strong password for Emmanuel's account. Stored in Emmanuel's password manager — NOT in the codebase, NOT in any GSD planning doc, NOT in chat transcript.

    2. Open https://leasetic-matrice.vercel.app/login (Emmanuel's device, ideally). Sign in with `emmanuel.rousseau@leasetic.com` + the current shared password `leasetic2026`.

    3. Open the topbar user menu → "Paramètres".

    4. Confirm /parametres renders.

    5. In the password row (rev 2 — TWO fields only, no confirm):
       - Ancien mot de passe: `leasetic2026`
       - Nouveau mot de passe: <the new strong password from step 1>

    6. Click "Enregistrer les modifications". Confirm the success toast.

    7. Sign out.

    8. **Negative test:** Attempt to sign in with `emmanuel.rousseau@leasetic.com` + `leasetic2026`. MUST FAIL.

    9. **Positive test:** Sign in with the new password. MUST SUCCEED.

    10. Antoine (the planning operator) opens `docs/operations/phase-21-gate-evidence.md` and ticks the Emmanuel Rousseau row in the GATE-01 table:
        - Rotation date: <ISO date>
        - Old password tested + rejected: `✓ — verified by Emmanuel <date>`
        - New password authenticates: `✓ — verified by Emmanuel <date>`

    11. Commit to git with message `docs(21): tick GATE-01 row — emmanuel.rousseau@leasetic.com rotated`.

    **Coordination notes:**
    - If Emmanuel is unavailable on Antoine's rotation day, this task BLOCKS Plan 21-02 (and therefore the broader gate closure). Antoine schedules with Emmanuel via the team's standard channel (per the working-preferences contract).
    - Out of scope per D-04: code-level enforcement. The rule "no real partner until both rows ticked" is process-only.
  </how-to-verify>

  <resume-signal>Type "approved — emmanuel row ticked" once steps 1–11 are complete and the commit is pushed. Type "blocked — emmanuel unavailable until <date>" if scheduling is the blocker.</resume-signal>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 4: Antoine runs the out-of-band privacy-notice edit session on the Leasétic website project</name>

  <what-built>
    Privacy-notice publication is OUT-OF-BAND per D-01 — Antoine runs the edit in a separate fresh chat session on the Leasétic website project (NOT in this Matrice Commerciale repo). Phase 21 plans only verify the result + log the URL.

    The prompt below was drafted during /gsd-discuss-phase and captured verbatim in `21-DISCUSSION-LOG.md` lines 68–161 (also reproduced in `21-RESEARCH.md` §10). Antoine pastes it into a fresh session on the leasetic.fr Claude/Cursor/IDE workspace.
  </what-built>

  <how-to-verify>
    **Step 1 — Paste the prompt below into a fresh session on the Leasétic website project.**

    Verbatim prompt (do NOT modify; the wording was reviewed during /gsd-discuss-phase):

    ```
    Je dois mettre à jour la page "Politique de confidentialité" (ou
    "Mentions légales / Données personnelles" selon la structure du site)
    de leasetic.fr pour couvrir deux nouvelles activités de traitement
    introduites par l'application Leasétic Matrice (l'outil de devis
    commercial distribué aux partenaires intégrateurs).

    ## Contexte

    L'application Leasétic Matrice est hébergée sur Vercel + Neon Postgres
    (régions EU) et conserve les propositions PDF générées par les
    partenaires pendant 10 ans. La politique de confidentialité actuelle du
    site a été rédigée avant la mise en ligne de cette app et doit être
    étendue pour rester conforme RGPD.

    ## Tâches à accomplir

    1. **Lis d'abord la page de politique de confidentialité actuelle**
       sur le site (probablement à `/politique-de-confidentialite`,
       `/mentions-legales`, `/donnees-personnelles` ou similaire).
       Identifie la structure des sections existantes.

    2. **Identifie les deux sections à modifier** :
       - La section "Sous-traitants" / "Hébergeurs" / "Destinataires
         des données" (où sont listés les prestataires techniques).
       - La section "Durée de conservation" / "Conservation des données"
         (où sont listées les durées par catégorie de donnée).

    3. **Propose les ajouts suivants** (à adapter au ton et à la mise en
       forme de la politique existante) :

       ### Ajout #1 — Sous-traitants / Hébergement EU

       Ajouter dans la liste des sous-traitants / destinataires :

       - **Vercel Inc.** — hébergement de l'interface applicative
         (Leasétic Matrice). Données traitées dans l'Union européenne
         (région Frankfurt / Paris selon configuration). DPA signé
         conformément à l'article 28 RGPD. Site : vercel.com.
       - **Neon Inc.** — hébergement de la base de données Postgres de
         l'application Leasétic Matrice. Données stockées dans l'Union
         européenne (région EU Central / EU West). DPA signé. Site :
         neon.tech.

       Mentionner que ces sous-traitants n'ont pas accès aux données
       au-delà de ce qui est strictement nécessaire à la prestation
       technique (hébergement, stockage, sauvegardes).

       ### Ajout #2 — Conservation 10 ans des propositions PDF

       Ajouter dans la section "Durée de conservation" une ligne pour la
       catégorie "Propositions commerciales (PDF générés via Leasétic
       Matrice)" :

       - **Durée** : 10 ans à compter de la date de génération du
         document.
       - **Base légale** : obligation légale de conservation des
         documents commerciaux (Code de commerce français, articles
         L123-22 et L110-4 — conservation des pièces commerciales et
         prescription des actions commerciales).
       - **Catégorie de données** : informations relatives à l'opération
         de leasing proposée (raison sociale du client, SIREN, montant
         HT du projet, durée du financement, coefficient appliqué) +
         identité du partenaire émetteur.

    4. **Affiche-moi les modifications proposées en diff** (texte
       actuel → texte proposé) avant toute publication. Je validerai
       chaque section avant qu'elle ne parte en ligne.

    5. **Ne publie rien sans ma confirmation explicite.** Une fois validé,
       pousse les changements et donne-moi l'URL publique de la page mise
       à jour ainsi que la date de publication.

    ## Ton et style

    - Garde le ton juridique-mais-accessible de la politique existante.
    - Pas d'avis juridique de ta part — tu proposes du texte standard
      RGPD-conforme que j'adapterai.
    - Préserve la mise en forme (titres, listes, gras) de la page actuelle.
    - Si la politique actuelle n'existe pas encore ou est très lacunaire,
      signale-le et propose une structure complète RGPD-conforme à
      valider ensemble.

    ## À retourner à la fin

    - L'URL publique de la page de politique de confidentialité mise à
      jour.
    - La date de mise en ligne.
    - Une courte phrase confirmant que les deux ajouts (Vercel/Neon EU
      + conservation 10 ans des PDF) sont visibles sur la page publiée.

    Je vais reporter ces trois éléments dans un document interne pour
    clore la conformité de l'app.
    ```

    **Step 2 — Run the session to completion.** The session may take 30–120 minutes (reading the existing policy, proposing diffs, you validating each section, publishing). The prompt explicitly instructs the agent in that session to NOT publish without your confirmation.

    **Step 3 — Once the page is live, record three pieces of information:**
    - Public URL (e.g. `https://leasetic.fr/politique-de-confidentialite`).
    - Publication date (ISO).
    - A one-line confirmation: "Both additions (Vercel/Neon EU hosting + 10-year PDF retention) are visible on the published page."

    **Step 4 — Visit the public URL in an incognito window.** Confirm with your own eyes that both additions are present. This is the gate's empirical verification.

    Bring these three values back to this Matrice repo for Task 5 to record.
  </how-to-verify>

  <resume-signal>Type "approved — privacy notice published at <URL> on <ISO date>" once the page is live and visually verified. Type "blocked — <reason>" if the website session hit an issue (e.g. policy structure required full rewrite vs. simple addendum).</resume-signal>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Rewrite docs/legal/privacy-coverage-confirmation.md + populate GATE-02 section of evidence doc + tick closure checklist</name>
  <files>docs/legal/privacy-coverage-confirmation.md, docs/operations/phase-21-gate-evidence.md</files>

  <read_first>
    - `docs/legal/privacy-coverage-confirmation.md` (FULL — current Phase 10 stub, the doc this task overwrites).
    - `docs/operations/phase-21-gate-evidence.md` (current state — has the Antoine + Emmanuel rows ticked from Tasks 2–3; the GATE-02 section is still `_pending_`).
    - `.planning/phases/21-partner-onboarding-gates/21-RESEARCH.md` §9c (the verbatim rewrite skeleton for the legal doc).
    - `.planning/phases/21-partner-onboarding-gates/21-CONTEXT.md` D-01 (binding for this task — the publication-record framing replaces the question-on-record framing).
    - The three values from Task 4: public URL, publication date, visible-additions confirmation line.
  </read_first>

  <action>
    Step A — Rewrite `docs/legal/privacy-coverage-confirmation.md` using the skeleton from RESEARCH §9c. Reproducing the canonical text here so the executor has it inline (verify against RESEARCH §9c for any drift):

    ```markdown
    # Privacy Coverage Confirmation — v1.3 Launch

    **Created:** 2026-05-10 (stub) — **Updated:** <YYYY-MM-DD of Task 5 commit> (Phase 21
    publication record per D-01).
    **Status:** Closed.

    This document is the legal-side paper trail for the v1.3 partner-
    onboarding gates. It confirms that Leasétic's public privacy notice
    on `leasetic.fr` was updated to cover (a) Vercel + Neon EU hosting
    and (b) 10-year PDF retention as a new processing activity tied to
    French Commercial Code L123-22 / L110-4.

    **Phase 21 reframe (D-01):** Antoine owns the leasetic.fr website
    directly. Phase 10's "ask Thomas Heufke for written confirmation"
    framing is **superseded** — the publication itself (a self-edit on
    the leasetic.fr project) is the artifact; no third-party
    confirmation is required. The prompt Antoine used for the self-edit
    session is captured verbatim in
    `.planning/phases/21-partner-onboarding-gates/21-DISCUSSION-LOG.md`
    under "Prompt drafted for the leasetic.fr edit session."

    ## Publication

    - **Public URL of the updated privacy notice:** <PASTE the URL from Task 4>
    - **Publication date:** <PASTE the ISO date from Task 4>
    - **Visible additions confirmed:** <PASTE the one-line confirmation from Task 4 — e.g. "Both Vercel/Neon EU hosting and 10-year PDF retention sections are visible on the published page (incognito visual check, <date>).">

    ## Resolution

    - [x] Privacy notice published with both additions (`## Publication`
          above filled).

    ---

    *Document context: D-10-17 (privacy URLs via env vars),
    D-01 (this phase's reframe of D-10-18).*

    *Cross-references:*
    - `docs/operations/phase-21-gate-evidence.md` GATE-02 section (the
      evidence-log home — see that file for the rotation closure
      checklist).
    - `.planning/phases/21-partner-onboarding-gates/21-DISCUSSION-LOG.md`
      ("Prompt drafted for the leasetic.fr edit session" — verbatim prompt
      Antoine used).
    ```

    Replace the entire current file content. The Phase 10 stub's "Question on record" + "Response" sections are intentionally NOT preserved — they are superseded by D-01.

    Step B — Edit `docs/operations/phase-21-gate-evidence.md` GATE-02 section. Replace the three `_pending_` lines with:

    - `**Public URL:** <PASTE the URL from Task 4>`
    - `**Publication date:** <PASTE the ISO date from Task 4>`
    - `**Both additions visible on the public page:** <PASTE the one-line confirmation from Task 4>`

    Step C — Tick the closure checklist boxes at the bottom of `docs/operations/phase-21-gate-evidence.md`. Replace `- [ ]` with `- [x]` for both lines:

    - `- [x] Both rows in the GATE-01 table above are ticked + dated.`
    - `- [x] GATE-02 URL + publication date + visible-confirmation line above are filled.`

    Step D — Update the file header line "Closed: _pending — fill on rotation day._" to "Closed: <ISO date of this commit>.".

    Step E — Commit both files in one commit. Message: `docs(21): close GATE-01 + GATE-02 — privacy notice published, both admins rotated`.

    Step F — Update `.planning/ROADMAP.md` Phase 21 entry from `[ ]` to `[x]` with the completion date, AND update `.planning/STATE.md` (the progress line + the Phase 6 follow-ups #1 entry to mark it resolved + the Open questions #3 entry to mark it resolved). Match the convention used in prior phase closures (see Phase 20's entry as the closest analog — the ROADMAP shows `- [x] **Phase 20: Infra Hardening** — ... (completed 2026-05-27)`). Commit message: `docs(21): mark Phase 21 complete in ROADMAP + STATE`.

    NOTE: ROADMAP.md Phase 21 success criterion #1 currently mentions `antoine.rousseau@memento.eco` (stale per RESEARCH §7b). Per the planning_context "Do NOT edit ROADMAP.md", LEAVE that stale reference alone — the evidence doc uses `@leasetic.com` consistently and is the authoritative record. The ROADMAP success-criterion text is descriptive history, not load-bearing.

    Edit the planning_context exception clarification: the directive "Do NOT edit ROADMAP.md" applied to plan-generation time (don't add planned plans into the ROADMAP). After phase completion, marking the phase complete in ROADMAP.md is the standard closure step and IS in scope. The stale `@memento.eco` reference remains untouched.
  </action>

  <verify>
    <automated>grep -c "_pending_" docs/operations/phase-21-gate-evidence.md && grep -c "^- \[x\] " docs/operations/phase-21-gate-evidence.md && grep -c "Closed: " docs/operations/phase-21-gate-evidence.md && grep -c "## Publication" docs/legal/privacy-coverage-confirmation.md</automated>
  </verify>

  <done>
    - `docs/legal/privacy-coverage-confirmation.md` is rewritten per RESEARCH §9c; the "Question on record" + "Response" sections are removed; the "Publication" section has all three values populated.
    - `docs/operations/phase-21-gate-evidence.md` has zero `_pending_` placeholders remaining (verify with the grep above — should be 0).
    - Both closure-checklist boxes are ticked (`- [x]`).
    - File header "Closed: ..." line shows an ISO date, not "_pending_".
    - Two commits exist in git history: (a) the gate-closure commit, (b) the ROADMAP/STATE update commit.
    - Phase 21 row in ROADMAP.md shows `[x]` with a completion date.
  </done>
</task>

</tasks>

<verification>
- All five `_pending_` slots in the GATE-01 table (3 cells × 2 rows = 6, plus the file-header "Closed:" line) are filled with real values.
- All three `_pending_` slots in the GATE-02 section are filled.
- Both closure-checklist boxes are ticked.
- `docs/legal/privacy-coverage-confirmation.md` has a populated `## Publication` section with URL + date + one-line confirmation.
- Manual: signing in with `leasetic2026` against either admin account fails in production.
- Manual: signing in with the new password for each admin succeeds.
- Manual: visiting the public URL recorded in the privacy-coverage doc shows both additions visible.
- `.planning/ROADMAP.md` Phase 21 entry shows `[x]` with completion date.
</verification>

<success_criteria>
- Phase 21 is closed in ROADMAP.md + STATE.md.
- Both admin accounts no longer authenticate with `leasetic2026`.
- The leasetic.fr public privacy notice carries the two new additions (Vercel/Neon EU + 10-year PDF retention) and the URL is recorded in two committed markdown files.
- The first real (`not @test.leasetic.com`) partner can now be invited via `/[adminSegment]/partners/new` without violating the process-only gate from D-04.
- v1.3 is shippable.
</success_criteria>

<output>
Create `.planning/phases/21-partner-onboarding-gates/21-02-SUMMARY.md` when done, summarizing:
- Rotation dates for both admins (per Tasks 2 + 3).
- Privacy-notice public URL + publication date (per Task 4).
- Any deviations from the verbatim prompt in Task 4 (e.g. the website's policy structure required a different framing than the prompt assumed — record what changed and why).
- Whether the rotations exposed any production bug in the /parametres flow (regression feedback to Plan 21-01).
- Confirmation that v1.3 is ready to ship to the first real partner.
</output>
