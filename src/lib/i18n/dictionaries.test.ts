import { describe, it, expect } from 'vitest';
import { dictionaries, t, type DictKey } from './dictionaries';

describe('i18n dictionary parity', () => {
  const frKeys = Object.keys(dictionaries.fr);
  const enKeys = Object.keys(dictionaries.en);

  it('has at least 220 keys per language (5 legacy + 166 v10 + 60 Phase 6, with ±5 v10 dedup tolerance)', () => {
    expect(frKeys.length).toBeGreaterThanOrEqual(220);
    expect(enKeys.length).toBeGreaterThanOrEqual(220);
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
