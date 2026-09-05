# Phase 21: Partner-Onboarding Gates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `21-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 21-partner-onboarding-gates
**Areas discussed:** GATE-02 outreach state, Rotation mechanics & order, Evidence + verification recipe, "No real partner" enforcement

---

## GATE-02 — Outreach state (then full reframing)

### Initial question: current state of the email to Thomas

| Option | Description | Selected |
|--------|-------------|----------|
| Not yet sent | Stub committed but message hasn't gone out — Phase 21 includes draft + send + log | ✓ |
| Sent, awaiting reply | Already in Thomas's inbox, Phase 21 captures the reply | |
| Reply received, doc not updated | Thomas replied, doc stub still pending update | |

**User's choice:** Not yet sent.

### Follow-up question: send channel

| Option | Description | Selected |
|--------|-------------|----------|
| Email to Thomas's Leasétic address | Standard email + record `**Sent:**` line in doc | |
| Email + Slack/WhatsApp nudge | Formal email + informal ping to reduce latency | |
| Quick call → written follow-up | 15-min call + Antoine writes up reply + Thomas counter-signs | |

**User's response:** Free-text — "what is this qustion and email to Thomas for? What should I be asking him?"

**Notes:** User did not understand the purpose of the outreach. Claude responded with a contextual explanation of GATE-02 (privacy-coverage check covering Vercel/Neon EU hosting + 10-year PDF retention, paper trail before exposing real client data to a new processor) and re-asked the channel question.

### Second follow-up: re-asked send channel after explanation

| Option | Description | Selected |
|--------|-------------|----------|
| Email to Thomas's Leasétic address | Same as before | |
| Email + Slack/WhatsApp nudge | Same as before | |
| Quick call → written follow-up | Same as before | |

**User's response:** Free-text — "Let's forget that task. I don't understand the purpose of it."

**Notes:** User pushed back on the outreach framing entirely. Claude responded with a balanced analysis: explained the stake (paper-trail gap for future audit), the counter-argument (Thomas already knows, small-pool partner onboarding doesn't warrant enterprise compliance discipline), and asked for an explicit descoping decision.

### Third follow-up: how to handle GATE-02

| Option | Description | Selected |
|--------|-------------|----------|
| Drop entirely from v1.3 | Move requirement to Out of scope or v1.4 | |
| Keep but lightweight | WhatsApp/Slack 3-line ping to Thomas, paste reply, done | |
| Defer to v1.4 explicitly | Honest deferral; Phase 21 ships GATE-01 only | |

**User's response:** Free-text — "I handle our website for Leasetic, I can edit the data policy page. Create a prompt I can put into a new chat session to edit the current one to add the necessary new details."

**Notes:** **Major reframing.** Antoine owns the leasetic.fr website directly. The original "ask Thomas for confirmation" framing was based on the architect's (Claude's, in Phase 10) incorrect assumption that the privacy notice was managed by Leasétic / Thomas. The actual primitive is "publish the policy update" — a single-operator self-edit. The "ask Thomas" loop is unnecessary friction.

**Captured as decision D-01 in CONTEXT.md.**

### Prompt drafted for the leasetic.fr edit session (verbatim, for record)

The following prompt was generated during this discussion for Antoine to paste
into a fresh chat session on the Leasétic website project. It is reproduced
here verbatim so future audits can reconstruct exactly what was instructed.

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

---

## Rotation mechanics & order (GATE-01)

### Question asked (paraphrased)

Antoine resets Emmanuel first then Emmanuel resets Antoine in a coordinated
live session — or do both rotate independently via the admin-reset URL flow?
Including: secure handoff for Emmanuel's new password, and password storage.

**User's response:** Free-text — "rotations of the passwords should be allowed to the user with a in-app flow. I can provide that in Figma."

**Notes:** **Significant scope expansion.** User chose neither presented option — instead proposed a new capability: in-app self-service password change available to logged-in users. This fills a permanent gap (no current self-service password-change path) AND solves the rotation logistics in one stroke.

Claude flagged the scope expansion explicitly, accepted it as a valid founder-call, and asked two clarifying questions to lock the planner brief: (a) who can use the new flow (admin-only vs. admin + partner), (b) where the Figma comes from.

**Captured as decisions D-02 (scope) and D-03 (design source) in CONTEXT.md.**

### Follow-up: scope of the new password-change flow

| Option | Description | Selected |
|--------|-------------|----------|
| Admin + partner (all logged-in users) | Role-agnostic flow, closes structural gap | ✓ |
| Admin only for now | Smaller surface, partner self-service deferred | |

**User's choice:** Admin + partner.

### Follow-up: Figma availability

| Option | Description | Selected |
|--------|-------------|----------|
| Will paste URL before planning | Antoine provides URL when invoking `/gsd-plan-phase 21` | ✓ |
| Design freshly during planning | Sketch during planning via `/gsd-ui-phase` or `/gsd-sketch` | |
| Skip Figma — implement to convention | Build to existing component vocabulary | |

**User's choice:** Will paste URL before planning.

---

## Evidence + verification recipe

### Question asked (after re-explanation following "I do not understand")

For both gates, what proof artifacts prove they closed?

| Option | Description | Selected |
|--------|-------------|----------|
| Lightweight — commits only | Commit message + privacy-doc commit are the evidence | |
| Lightweight + STATE.md note | Same + single line in STATE.md | |
| Formal — dedicated evidence doc | New `docs/operations/phase-21-gate-evidence.md` | ✓ |

**User's choice:** Formal — dedicated evidence doc.

**Notes:** Pattern matches Phase 20 operational docs. Captured as decision D-05 in CONTEXT.md.

---

## "No real partner" enforcement

### Question asked (after re-explanation following "I do not understand")

The success criterion forbids inviting non-`@test.leasetic.com` partner
accounts until both gates close. Does the rule live in your head, or
does the rule live in code?

| Option | Description | Selected |
|--------|-------------|----------|
| Trust yourself — process only | No code change, rule in evidence doc closure checklist | ✓ |
| Hardcoded constant + flip PR | 5-line server-action check + later removal PR | |
| Env-var flag | `PARTNER_GATES_OPEN` flag toggled in Vercel after gates close | |

**User's choice:** Trust yourself — process only.

**Notes:** Captured as decision D-04 in CONTEXT.md. Rationale: temporary
gate, single operator, small blast radius. Consistent with Phase 10
"Antoine owns partner cutover comms directly" pattern.

---

## Claude's Discretion

- **Plan shape and ordering:** suggested 2-plan shape (Plan 1 = ship
  in-app password-change flow, Plan 2 = operational gate closure +
  evidence doc population). Planner final call.
- **Password-change UX details outside Figma scope:** session-invalidation
  behavior defaults to "revoke other sessions, keep current active"
  if Figma doesn't specify.
- **Better Auth built-in `changePassword` vs. custom server action:**
  planner verifies which path Better Auth 1.6.9 exposes and chooses
  accordingly. No preference enforced.

## Deferred Ideas

- **SMTP-driven forgotten-password reset for partners** — v1.4+.
- **Multi-factor authentication on admin accounts** — separate future
  phase (admin auth hardening), post-v1.3.
- **Code-level "gates closed" guard on `/partners/new`** — rejected
  for Phase 21; revisit if operational-freeze capability is ever
  needed (different shape than the temporary gate).
- **Thomas's verbatim privacy-coverage confirmation** — original
  D-10-18 framing, superseded by D-01 (Antoine self-edits public
  policy). If Leasétic legal posture changes later, capture in a
  future phase.
