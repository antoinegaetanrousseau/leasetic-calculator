import { describe, it, expect } from 'vitest';
import { dictionaries, t, type DictKey } from './dictionaries';

describe('i18n dictionary parity', () => {
  const frKeys = Object.keys(dictionaries.fr);
  const enKeys = Object.keys(dictionaries.en);

  it('has at least 981 keys per language (raised in Phase 34 for the fiche-client / timeline / à-relancer namespaces)', () => {
    expect(frKeys.length).toBeGreaterThanOrEqual(981);
    expect(enKeys.length).toBeGreaterThanOrEqual(981);
  });

  it('every FR key exists in EN', () => {
    const missingInEn = frKeys.filter((k) => !enKeys.includes(k));
    expect(missingInEn).toEqual([]);
  });

  it('every EN key exists in FR', () => {
    const missingInFr = enKeys.filter((k) => !frKeys.includes(k));
    expect(missingInFr).toEqual([]);
  });

  it('preserves the 5 legacy camelCase keys (Phase 6-06 backward-compat)', () => {
    expect(dictionaries.fr.welcomeHeading).toBe('Bienvenue sur Leasétic Matrice');
    expect(dictionaries.fr.welcomeSubtext).toBe('Application en cours de déploiement.');
    expect(dictionaries.fr.themeLight).toBe('Clair');
    expect(dictionaries.fr.themeDark).toBe('Sombre');
    expect(dictionaries.fr.themeSystem).toBe('Système');
  });

  it('has the Phase 6 auth keys with the exact UI-SPEC FR/EN strings', () => {
    // Use bracket access because dot-notation keys aren't valid identifiers.
    const fr = dictionaries.fr as Record<string, string>;
    const en = dictionaries.en as Record<string, string>;
    expect(fr['auth.signin.title']).toBe('Connexion');
    expect(en['auth.signin.title']).toBe('Sign in');
    expect(fr['auth.error.invalid.credentials']).toBe('Email ou mot de passe incorrect.');
    expect(en['auth.error.invalid.credentials']).toBe('Incorrect email or password.');
    expect(fr['error.404.title']).toBe('Page introuvable');
    expect(en['error.404.title']).toBe('Page not found');
    expect(fr['shell.user.menu.logout']).toBe('Se déconnecter');
    expect(en['shell.user.menu.logout']).toBe('Log out');
    expect(fr['shell.topbar.admin.badge']).toBe('ADMIN');
    expect(en['shell.topbar.admin.badge']).toBe('ADMIN');
  });

  it('has at least one key from each major v10 category', () => {
    const fr = dictionaries.fr as Record<string, string>;
    const hasPrefix = (prefix: string) => frKeys.some((k) => k.startsWith(prefix));
    expect(hasPrefix('admin.')).toBe(true);
    expect(hasPrefix('form.')).toBe(true);
    expect(hasPrefix('proposal.')).toBe(true);
    expect(hasPrefix('result.')).toBe(true);
    expect(hasPrefix('error.')).toBe(true);
    // Spot-check 'error.required.fields' is present (per UI-SPEC §i18n category note)
    expect(typeof fr['error.required.fields']).toBe('string');
  });
});

describe('Phase 7 i18n keys (UI-SPEC §8 + §9)', () => {
  const phase7Keys: DictKey[] = [
    // Home page (07-03)
    'dashboard.greeting',
    'dashboard.subtext',
    'dashboard.cta.new.proposal',
    'dashboard.recent.title',
    'dashboard.empty.title',
    'dashboard.empty.body',
    'header.proposals.new',
    // Live preview (07-05)
    'proposal.section.preview',
    'proposal.validity.label',
    'proposal.validity.suffix',
    'proposal.validity.computed.label',
    // Toasts (07-04 / 07-05)
    'proposal.toast.copy.success',
    'proposal.toast.copy.error',
    'proposal.toast.validation.errors',
    'proposal.toast.phase8.placeholder',
    'proposal.confirm.reset',
    // Copy button (07-05) — button.copy.ref already covered by v10 dict tests
    'button.copy.ref',
    'button.copy.ref.copied',
    // Inline errors (07-04 RHF resolver messages)
    'error.field.required',
    'error.field.client.co.required',
    'error.field.amount.required',
    'error.field.amount.too.small',
    'error.field.amount.too.large',
    'error.field.duration.required',
    'error.field.email.invalid',
    'error.field.phone.invalid',
    'error.field.siren.invalid',
    // Tranche labels (Plan 07-01 tLabel contract)
    'form.tranche.t1',
    'form.tranche.t2',
    'form.tranche.t3',
    'form.tranche.t4',
  ];

  for (const key of phase7Keys) {
    it(`fr / ${key} resolves to a non-empty string`, () => {
      const v = t(key, 'fr');
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    });
    it(`en / ${key} resolves to a non-empty string`, () => {
      const v = t(key, 'en');
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    });
  }

  it('dashboard.greeting (fr/en) supports {0} interpolation contract — caller .replace() pattern', () => {
    // Phase 6 t() does NOT auto-interpolate; verify the placeholder is present
    // so the consumer's .replace('{0}', name) works.
    expect(t('dashboard.greeting', 'fr')).toContain('{0}');
    expect(t('dashboard.greeting', 'en')).toContain('{0}');
  });

  it('proposal.validity.computed.label has {0} placeholder (Plan 07-05 consumer)', () => {
    expect(t('proposal.validity.computed.label', 'fr')).toContain('{0}');
    expect(t('proposal.validity.computed.label', 'en')).toContain('{0}');
  });

  it('error.field.amount.too.small references the 25 000 € floor (matches v10 line 1196)', () => {
    expect(t('error.field.amount.too.small', 'fr')).toMatch(/25/);
    expect(t('error.field.amount.too.small', 'en')).toMatch(/25,?0?00/);
  });
});

// ── Phase 8 — Persistence + PDF Pipeline (Plan 08-02) ────────────────────────

// Every Phase 8 key MUST resolve non-empty in BOTH languages. Catches drift
// where someone adds a FR-only key (compile-time _EnHasAllFrKeys catches the
// missing-EN case; this runtime check catches empty-string regressions in
// either language).
const phase8Keys: DictKey[] = [
  // 7.1 List view (11)
  'proposal.search.placeholder',
  'proposal.search.aria',
  'proposal.search.clear',
  'proposal.search.empty.title',
  'proposal.search.empty.body',
  'proposal.list.toggle.active',
  'proposal.list.toggle.deleted',
  'proposal.list.load.more',
  'proposal.list.load.more.loading',
  'proposal.deleted.empty.title',
  'proposal.deleted.empty.body',
  // 7.2 Chips (6)
  'proposal.chip.active',
  'proposal.chip.expired',
  'proposal.chip.deleted',
  'proposal.chip.language.tooltip',
  'proposal.chip.tooltip.expires',
  'proposal.chip.tooltip.expired',
  // 7.3 Detail header + sections (7)
  'proposal.detail.title',
  'proposal.detail.created.line',
  'proposal.detail.section.inputs',
  'proposal.detail.section.computed',
  'proposal.detail.computed.expires.label',
  'proposal.detail.computed.expired.label',
  'proposal.detail.computed.loyer.suffix',
  // 7.4 Action buttons (4)
  'proposal.detail.action.download',
  'proposal.detail.action.duplicate',
  'proposal.detail.action.delete',
  'proposal.detail.action.restore',
  // 7.5 PDF preview UI (3)
  'proposal.detail.pdf.preview.title',
  'proposal.detail.pdf.preview.aria',
  'proposal.detail.pdf.fallback.link',
  // 7.6 Deleted-view banner + confirm (2)
  'proposal.detail.deleted.banner',
  'proposal.confirm.delete',
  // 7.7 Toasts (9)
  'proposal.toast.submit.loading',
  'proposal.toast.submit.success',
  'proposal.toast.submit.error',
  'proposal.toast.delete.success',
  'proposal.toast.delete.action.view.deleted',
  'proposal.toast.delete.error',
  'proposal.toast.restore.success',
  'proposal.toast.restore.error',
  'proposal.toast.duplicate.prefilled',
  // 7.8 PDF document copy (13)
  'pdf.tagline',
  'pdf.title',
  'pdf.ref.label',
  'pdf.section.project',
  'pdf.section.interests',
  'pdf.project.placeholder',
  'pdf.project.ref.prefix',
  'pdf.computed.coefficient.label',
  'pdf.loyer.label',
  'pdf.loyer.subtext',
  'pdf.loyer.on.demand',
  'pdf.validity.caption',
  'pdf.footer.left',
];

describe('Phase 8 i18n delta', () => {
  for (const key of phase8Keys) {
    it(`fr.${key} resolves non-empty`, () => {
      expect(t(key, 'fr')).not.toBe('');
      expect(t(key, 'fr').length).toBeGreaterThan(0);
    });
    it(`en.${key} resolves non-empty`, () => {
      expect(t(key, 'en')).not.toBe('');
      expect(t(key, 'en').length).toBeGreaterThan(0);
    });
  }

  // Interpolation contract: keys with {0} / {1} placeholders for caller-side
  // .replace() interpolation. The dictionary value MUST contain the placeholder
  // literal so consumers can substitute it. Catches accidental rewrites that
  // drop the placeholder.
  describe('interpolation contract', () => {
    const singleArgKeys: DictKey[] = [
      'proposal.chip.deleted',
      'proposal.chip.tooltip.expires',
      'proposal.chip.tooltip.expired',
      'proposal.detail.title',
      'proposal.detail.computed.expires.label',
      'proposal.detail.computed.expired.label',
      'proposal.detail.deleted.banner',
      'pdf.loyer.subtext',
    ];
    const twoArgKeys: DictKey[] = [
      'proposal.detail.created.line',
      'pdf.validity.caption',
      'pdf.footer.left',
    ];

    for (const key of singleArgKeys) {
      it(`${key} contains {0} in fr + en`, () => {
        expect(t(key, 'fr')).toContain('{0}');
        expect(t(key, 'en')).toContain('{0}');
      });
    }
    for (const key of twoArgKeys) {
      it(`${key} contains {0} and {1} in fr + en`, () => {
        expect(t(key, 'fr')).toContain('{0}');
        expect(t(key, 'fr')).toContain('{1}');
        expect(t(key, 'en')).toContain('{0}');
        expect(t(key, 'en')).toContain('{1}');
      });
    }
  });

  // Sanity: the Phase 8 reuse table — these v10 keys must still exist.
  // Plan 08-05 + 08-10 reference them in place of new Phase 8 aliases.
  describe('reuse table integrity (UI-SPEC §7.9)', () => {
    const reusedKeys: DictKey[] = [
      'proposal.duree.label',
      'proposal.duree.months',
      'proposal.interests.slb',
      'proposal.interests.eval',
      'proposal.montant.label',
    ];
    for (const key of reusedKeys) {
      it(`${key} (v10 reused for Phase 8) still resolves`, () => {
        expect(t(key, 'fr')).not.toBe('');
        expect(t(key, 'en')).not.toBe('');
      });
    }
  });
});

// ── Phase 13 — 3-Step Proposal Wizard (Plan 13-01) ───────────────────────────
//
// New `wizard.*` namespace consumed by the 4 route-private wizard components
// (WizardActionBar, PlusDeDetailsAccordion, PdfPreviewMock, RecapSection) and
// by the 3 wizard step routes (plans 13-03/04/05). The compile-time
// `_EnHasAllFrKeys` guard in dictionaries.ts catches FR↔EN drift; this suite
// adds runtime non-empty + exact-value assertions for the locked copy in
// 13-UI-SPEC.md §6.1–§6.8.

const phase13WizardKeys: DictKey[] = [
  // §6.1 Page titles + subtitles (6)
  'wizard.step1.title',
  'wizard.step1.subtitle',
  'wizard.step2.title',
  'wizard.step2.subtitle',
  'wizard.step3.title',
  'wizard.step3.subtitle',
  // §6.2 Section bullet headers (7)
  'wizard.section.informations.client',
  'wizard.section.details.projet',
  'wizard.section.parametres.saisis',
  'wizard.section.detail.calcul',
  'wizard.section.client',
  'wizard.section.projet',
  'wizard.section.calcul',
  // §6.3 Wizard field-label overrides (2)
  'wizard.field.client.co.label',
  'wizard.field.client.name.label',
  // §6.4 Accordion trigger (3)
  'wizard.accordion.trigger',
  'wizard.accordion.aria.label.open',
  'wizard.accordion.aria.label.close',
  // §6.5 Step-2 labels (10)
  'wizard.step2.hero.label',
  'wizard.step2.hero.sub',
  'wizard.step2.chip.tranche',
  'wizard.step2.row.amount',
  'wizard.step2.row.commission',
  'wizard.step2.row.commission.sublabel',
  'wizard.step2.row.coefficient',
  'wizard.step2.row.duration',
  'wizard.step2.row.loyer.calculated',
  'wizard.step2.error.incomplete',
  // §6.6 Step-3 labels (5)
  'wizard.step3.modifier.link',
  'wizard.step3.pdf.title',
  'wizard.step3.pdf.ref.line',
  'wizard.step3.pdf.preview.aria',
  'wizard.step3.pdf.loyer.label',
  // §6.7 Action bar (7)
  'wizard.action.previous',
  'wizard.action.previous.aria',
  'wizard.action.save.draft',
  'wizard.action.step1.continue',
  'wizard.action.step2.continue',
  'wizard.action.step3.confirm',
  'wizard.action.step3.confirm.spinner',
  // §6.8 Toast strings (4)
  'wizard.toast.save.draft.success',
  'wizard.toast.finalize.success',
  'wizard.toast.finalize.error',
  'wizard.toast.validation.errors',
  // Extra: save-draft error toast (added in Plan 13-01 Task 1 action to
  // support the WizardActionBar onSaveDraft catch branch in Task 2).
  'wizard.toast.draft.error',
];

describe('Phase 13 wizard i18n delta (Plan 13-01)', () => {
  for (const key of phase13WizardKeys) {
    it(`fr.${key} resolves non-empty`, () => {
      expect(t(key, 'fr')).not.toBe('');
      expect(t(key, 'fr').length).toBeGreaterThan(0);
    });
    it(`en.${key} resolves non-empty`, () => {
      expect(t(key, 'en')).not.toBe('');
      expect(t(key, 'en').length).toBeGreaterThan(0);
    });
  }

  describe('locked exact-copy assertions (13-UI-SPEC.md §6.1–§6.8)', () => {
    it('wizard.step1.title — FR exact', () => {
      expect(t('wizard.step1.title', 'fr')).toBe('Paramètres du projet');
    });
    it('wizard.step1.title — EN exact', () => {
      expect(t('wizard.step1.title', 'en')).toBe('Project parameters');
    });
    it('wizard.toast.save.draft.success — FR exact', () => {
      expect(t('wizard.toast.save.draft.success', 'fr')).toBe('Brouillon enregistré ✓');
    });
    it('wizard.toast.save.draft.success — EN exact', () => {
      expect(t('wizard.toast.save.draft.success', 'en')).toBe('Draft saved ✓');
    });
    it('wizard.step2.row.commission.sublabel — D-12 partner-facing parenthetical (FR)', () => {
      expect(t('wizard.step2.row.commission.sublabel', 'fr')).toBe('(non visible client)');
    });
    it('wizard.step3.pdf.ref.line — D-15 literal LC-2026-XXX (FR + EN)', () => {
      // D-15: the mock PDF reference MUST be the literal `LC-2026-XXX` (never
      // digits, never timestamps) so it never collides with real allocated
      // numeric lc_refs.
      expect(t('wizard.step3.pdf.ref.line', 'fr')).toContain('LC-2026-XXX');
      expect(t('wizard.step3.pdf.ref.line', 'en')).toContain('LC-2026-XXX');
    });
  });

  describe('interpolation contract (Phase 13 wizard placeholders)', () => {
    const phase13SingleArgKeys: DictKey[] = [
      'wizard.step2.hero.sub',         // {0} = durationMonths
      'wizard.step2.row.coefficient',  // {0} = tranche K€ band
      'wizard.step3.pdf.ref.line',     // {0} = validityDays
    ];
    const phase13TwoArgKeys: DictKey[] = [
      'wizard.step2.chip.tranche',     // {0} = tranche, {1} = coefficient%
    ];

    for (const key of phase13SingleArgKeys) {
      it(`${key} contains {0} in fr + en`, () => {
        expect(t(key, 'fr')).toContain('{0}');
        expect(t(key, 'en')).toContain('{0}');
      });
    }
    for (const key of phase13TwoArgKeys) {
      it(`${key} contains {0} and {1} in fr + en`, () => {
        expect(t(key, 'fr')).toContain('{0}');
        expect(t(key, 'fr')).toContain('{1}');
        expect(t(key, 'en')).toContain('{0}');
        expect(t(key, 'en')).toContain('{1}');
      });
    }
  });
});

// ── Phase 30 — Company & Contact Registry (Plan 30-02) ───────────────────────
//
// New `clients.*` / `admin.companies.*` namespaces per 30-UI-SPEC.md's
// Copywriting Contract + i18n Key Plan. The compile-time `_EnHasAllFrKeys`
// guard in dictionaries.ts catches FR↔EN drift; this suite adds runtime
// exact-value assertions for the locked copy plus the CRM-02 non-leakage
// requirement on the search-empty-state string.

describe('Phase 30 CRM registry i18n keys (Plan 30-02)', () => {
  it('clients.page.title — FR exact', () => {
    expect(t('clients.page.title', 'fr')).toBe('Clients');
  });
  it('clients.page.title — EN exact', () => {
    expect(t('clients.page.title', 'en')).toBe('Clients');
  });
  it('clients.empty.search.title — FR exact and does not leak that a matching record exists elsewhere (CRM-02)', () => {
    const fr = t('clients.empty.search.title', 'fr');
    expect(fr).toBe('Aucun résultat ne correspond à votre recherche.');
    expect(fr.toLowerCase()).not.toMatch(/autre partenaire|un autre|déjà|existe/);
  });
  it('clients.empty.search.title — EN exact', () => {
    expect(t('clients.empty.search.title', 'en')).toBe('No results match your search.');
  });
  it('admin.companies.relation.type.sales — FR exact', () => {
    expect(t('admin.companies.relation.type.sales', 'fr')).toBe('Interne');
  });
  it('admin.companies.relation.type.sales — EN exact', () => {
    expect(t('admin.companies.relation.type.sales', 'en')).toBe('In-house');
  });
  it('sidebar.nav.clients — FR exact', () => {
    expect(t('sidebar.nav.clients', 'fr')).toBe('Clients');
  });
  it('sidebar.nav.clients — EN exact', () => {
    expect(t('sidebar.nav.clients', 'en')).toBe('Clients');
  });

  it('no Phase 30 key duplicates the existing error.field.siren.invalid / error.field.email.invalid messages', () => {
    // Reuse discipline (UI-SPEC Copywriting Contract): Phase 30 must not mint
    // a second SIREN/email validation string — it reuses the existing keys.
    const fr = dictionaries.fr as Record<string, string>;
    const sirenInvalid = fr['error.field.siren.invalid'];
    const emailInvalid = fr['error.field.email.invalid'];
    const crmValues = Object.entries(fr)
      .filter(([k]) => k.startsWith('clients.') || k.startsWith('admin.companies.'))
      .map(([, v]) => v);
    expect(crmValues).not.toContain(sirenInvalid);
    expect(crmValues).not.toContain(emailInvalid);
  });
});

// ── Phase 34 — Fiche client (Plan 34-01) ─────────────────────────────────────
//
// The compile-time `_EnParityProof` in dictionaries.ts is the real gate for
// FR↔EN parity. This suite guards the two things it cannot see: an empty string
// in either language, and the loss of a positional placeholder that a call site
// depends on.

const phase34Keys: DictKey[] = [
  // Tabs + header (FICHE-05)
  'clients.detail.tab.informations',
  'clients.detail.tab.contacts',
  'clients.detail.tab.proposals',
  'clients.detail.tab.activity',
  'clients.detail.header.modify',
  'clients.detail.header.nextAction',
  'clients.detail.header.noNextAction',
  // Registry panel (FICHE-02)
  'clients.registry.title',
  'clients.registry.syncedAt',
  'clients.registry.neverSynced',
  'clients.registry.refresh',
  'clients.registry.refreshing',
  'clients.registry.toast.synced',
  'clients.registry.toast.notFound',
  'clients.registry.toast.error',
  'clients.registry.status.synced',
  'clients.registry.status.pending',
  'clients.registry.status.notFound',
  'clients.registry.status.error',
  'clients.registry.state.active',
  'clients.registry.state.ceased',
  'clients.registry.field.legalName',
  'clients.registry.field.address',
  'clients.registry.field.legalForm',
  'clients.registry.field.activity',
  'clients.registry.field.headcount',
  'clients.registry.field.foundedOn',
  'clients.registry.field.state',
  'clients.registry.empty',
  // Relation panel (FICHE-04)
  'clients.relation.title',
  'clients.relation.modify',
  'clients.relation.field.leadSource',
  'clients.relation.field.description',
  'clients.relation.field.nextActionAt',
  'clients.relation.field.nextActionNote',
  'clients.relation.source.recommandation',
  'clients.relation.source.prospection',
  'clients.relation.source.salon',
  'clients.relation.source.siteWeb',
  'clients.relation.source.autre',
  'clients.relation.source.placeholder',
  'clients.relation.empty',
  'clients.relation.dialog.title',
  'clients.relation.dialog.submit',
  'clients.relation.toast.updated',
  // Company (shared-display) dialog (FICHE-03)
  'clients.company.dialog.title',
  'clients.company.dialog.hint',
  'clients.company.field.name',
  'clients.company.field.website',
  'clients.company.field.phone',
  'clients.company.field.siren',
  'clients.company.field.sirenHelper',
  'clients.company.dialog.submit',
  'clients.company.toast.updated',
  // Timeline (ACTV-01/02/03)
  'clients.timeline.title',
  'clients.timeline.empty',
  'clients.timeline.filter.all',
  'clients.timeline.filter.notes',
  'clients.timeline.filter.system',
  'clients.timeline.actor.system',
  'clients.timeline.bucket.today',
  'clients.timeline.bucket.yesterday',
  'clients.timeline.bucket.earlier',
  'clients.timeline.kind.note',
  'clients.timeline.kind.stageChanged',
  'clients.timeline.kind.proposalFinalized',
  'clients.timeline.kind.outcomeSet',
  'clients.timeline.kind.registrySynced',
  'clients.timeline.kind.nextActionSet',
  'clients.timeline.note.label',
  'clients.timeline.note.placeholder',
  'clients.timeline.note.submit',
  'clients.timeline.note.toast.added',
  'clients.timeline.note.dateLabel',
  'clients.timeline.event.stageChanged',
  // Next action (ACTV-04)
  'clients.nextAction.dialog.title',
  'clients.nextAction.dialog.dateLabel',
  'clients.nextAction.dialog.noteLabel',
  'clients.nextAction.dialog.submit',
  'clients.nextAction.dialog.clear',
  'clients.nextAction.dialog.toast.set',
  'clients.nextAction.dialog.toast.cleared',
  // Bounded error key for src/lib/relationship/actions.ts
  'relationship.toast.error',
  // Website validation (FICHE-03)
  'error.field.url.invalid',
  // Home "à relancer" card (ACTV-05, D-20)
  'dashboard.relance.title',
  'dashboard.relance.empty',
  'dashboard.relance.viewAll',
  'dashboard.relance.due',
  'dashboard.relance.overdue',
  'dashboard.relance.stale',
];

describe('Phase 34 fiche-client i18n delta (Plan 34-01)', () => {
  for (const key of phase34Keys) {
    it(`${key} resolves non-empty in fr + en`, () => {
      expect(t(key, 'fr').length).toBeGreaterThan(0);
      expect(t(key, 'en').length).toBeGreaterThan(0);
    });
  }

  describe('interpolation contract', () => {
    const singleArgKeys: DictKey[] = [
      'clients.detail.header.nextAction', // {0} = the formatted date
      'clients.registry.syncedAt',        // {0} = the formatted timestamp
      'dashboard.relance.due',            // {0} = the formatted date
      'dashboard.relance.stale',          // {0} = days since last activity
    ];

    for (const key of singleArgKeys) {
      it(`${key} contains {0} in fr + en`, () => {
        expect(t(key, 'fr')).toContain('{0}');
        expect(t(key, 'en')).toContain('{0}');
      });
    }

    it('clients.timeline.event.stageChanged carries both {0} and {1} in fr + en', () => {
      // {0} = from stage, {1} = to stage. Both are substituted by the call site
      // with .replace() — never by a template literal in the dictionary value.
      for (const lang of ['fr', 'en'] as const) {
        expect(t('clients.timeline.event.stageChanged', lang)).toContain('{0}');
        expect(t('clients.timeline.event.stageChanged', lang)).toContain('{1}');
      }
    });
  });

  it('relationship.toast.error is its own key, not an alias of clients.toast.error', () => {
    // Namespaces in this file do not share keys, even when the copy is identical
    // (clients.toast.error and admin.reconciliation.toast.error already coexist
    // this way). Both keys must exist independently.
    const fr = dictionaries.fr as Record<string, string>;
    expect(typeof fr['relationship.toast.error']).toBe('string');
    expect(typeof fr['clients.toast.error']).toBe('string');
  });
});
