import { describe, expect, it } from 'vitest';
import { getRouteMeta } from './route-meta';

describe('getRouteMeta — partner tree (no adminSegment)', () => {
  it('returns home for /', () => {
    expect(getRouteMeta('/')).toEqual({ titleKey: 'header.home', activeNav: 'home' });
  });

  it('returns proposals for /proposals (list)', () => {
    expect(getRouteMeta('/proposals')).toEqual({
      titleKey: 'sidebar.nav.proposals',
      activeNav: 'proposals',
    });
  });

  it('returns proposals for /proposals/[id] (detail)', () => {
    expect(getRouteMeta('/proposals/abc-123')).toEqual({
      titleKey: 'sidebar.nav.proposals',
      activeNav: 'proposals',
    });
  });

  it('returns proposals.new for /proposals/new and every wizard sub-step', () => {
    const wizardSteps = [
      '/proposals/new',
      '/proposals/new/parametres',
      '/proposals/new/calcul',
      '/proposals/new/verification',
    ];
    for (const p of wizardSteps) {
      expect(getRouteMeta(p)).toEqual({
        titleKey: 'header.proposals.new',
        activeNav: 'proposals-new',
      });
    }
  });

  it('returns help for /aide and /aide/commencer-ici', () => {
    expect(getRouteMeta('/aide')).toEqual({
      titleKey: 'sidebar.nav.help',
      activeNav: 'help',
    });
    expect(getRouteMeta('/aide/commencer-ici')).toEqual({
      titleKey: 'sidebar.nav.help',
      activeNav: 'help',
    });
  });

  it('falls back to home for unmatched partner paths', () => {
    expect(getRouteMeta('/something-unknown')).toEqual({
      titleKey: 'header.home',
      activeNav: 'home',
    });
  });
});

describe('getRouteMeta — admin tree (with adminSegment)', () => {
  const seg = 'secret-admin-9f3a';

  it('returns admin-home for /<seg>', () => {
    expect(getRouteMeta(`/${seg}`, seg)).toEqual({
      titleKey: 'sidebar.nav.home',
      activeNav: 'admin-home',
    });
  });

  it('returns admin-coefficients for /<seg>/coefficients', () => {
    expect(getRouteMeta(`/${seg}/coefficients`, seg)).toEqual({
      titleKey: 'sidebar.nav.adminCoefficients',
      activeNav: 'admin-coefficients',
    });
  });

  it('returns admin-partners for /<seg>/partners and /<seg>/partners/new', () => {
    expect(getRouteMeta(`/${seg}/partners`, seg)).toEqual({
      titleKey: 'sidebar.nav.adminPartners',
      activeNav: 'admin-partners',
    });
    expect(getRouteMeta(`/${seg}/partners/new`, seg)).toEqual({
      titleKey: 'sidebar.nav.adminPartners',
      activeNav: 'admin-partners',
    });
  });

  it('returns admin-history for /<seg>/history', () => {
    expect(getRouteMeta(`/${seg}/history`, seg)).toEqual({
      titleKey: 'sidebar.nav.adminHistory',
      activeNav: 'admin-history',
    });
  });

  it('does NOT misclassify a partner path that happens to share a prefix without the / separator', () => {
    // adminSegment='admin' must not match '/administrators' (no slash boundary).
    expect(getRouteMeta('/administrators', 'admin')).toEqual({
      titleKey: 'header.home',
      activeNav: 'home',
    });
  });

  it('still routes partner paths correctly when adminSegment is provided', () => {
    expect(getRouteMeta('/proposals/new/calcul', seg)).toEqual({
      titleKey: 'header.proposals.new',
      activeNav: 'proposals-new',
    });
  });
});
