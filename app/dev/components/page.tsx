import { notFound } from 'next/navigation';
import { Sliders, Users, History } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Stepper } from '@/components/ui/Stepper';
import { StatusChip } from '@/components/ui/StatusChip';
import { MetricTile } from '@/components/ui/MetricTile';
import { AdminNavCard } from '@/components/ui/AdminNavCard';

/**
 * Dev-only smoke route per CONTEXT D-11.
 *
 * Renders every component variant on one page for manual verification of:
 *   - light/dark theme behavior (toggle via the sidebar bottom theme pill on /)
 *   - prop-driven DOM differences (3 Stepper states × 3 step positions; 4 StatusChip variants; etc.)
 *   - regression smoke for the .chip-expired rewrite (gold → muted-gray per Plan 11-01)
 *
 * Returns notFound() in production builds — the route is never reachable on prod.
 * Cross-reference: app/(admin)/[adminSegment]/layout.tsx (notFound() idiom).
 *
 * Note: this page lives at `app/dev/components/page.tsx` — OUTSIDE both (authed)
 * and (admin) route groups, so it does NOT inherit the Shell wrapper. That's
 * intentional: the smoke route focuses on the 5 OTHER primitives. The
 * RetractableSidebar is verified visually on the authed home (which uses Shell).
 */
export default function DevComponentsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const section: React.CSSProperties = {
    marginBottom: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--ink)',
    marginBottom: 4,
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>
        Dev components smoke
      </h1>
      <p style={{ fontSize: '14.5px', color: 'var(--muted)', marginBottom: 32 }}>
        Phase 11 design system. Toggle theme in the sidebar bottom on the authed home (/) to
        verify light/dark variants. This route is gated by NODE_ENV; in production it 404s.
      </p>

      {/* BrandLogo */}
      <section style={section}>
        <h2 style={sectionTitle}>BrandLogo</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <BrandLogo width={190} height={32} alt="Leasétic" />
          <BrandLogo width={120} height={20} alt="Leasétic" />
          {/* eslint-disable-next-line @next/next/no-img-element -- intentional: mark-only static asset, no theme switch needed */}
          <img src="/logo-mark.svg" width={36} height={36} alt="" />
        </div>
      </section>

      {/* Stepper — 3 states × 3 step positions */}
      <section style={section}>
        <h2 style={sectionTitle}>Stepper (currentStep=1 / 2 / 3)</h2>
        <Stepper currentStep={1} completedSteps={[]} lang="fr" />
        <Stepper currentStep={2} completedSteps={[1]} lang="fr" />
        <Stepper currentStep={3} completedSteps={[1, 2]} lang="fr" />
      </section>

      {/* MetricTile — 3 variants */}
      <section style={section}>
        <h2 style={sectionTitle}>MetricTile (month / total / drafts)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <MetricTile variant="month" label="Ce mois-ci" value="12" sublabel="propositions" />
          <MetricTile variant="total" label="Total" value="248" />
          <MetricTile variant="drafts" label="Brouillons" value="3" sublabel="à compléter" />
        </div>
      </section>

      {/* AdminNavCard — 3 variants */}
      <section style={section}>
        <h2 style={sectionTitle}>AdminNavCard (coefficients / partners / history)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <AdminNavCard
            variant="coefficients"
            title="Coefficients"
            description="Gérer les paramètres financiers globaux : tranches, marges, durées."
            href="#"
            icon={Sliders}
            openLabel="Ouvrir →"
          />
          <AdminNavCard
            variant="partners"
            title="Partenaires"
            description="Liste, invitation et désactivation des comptes partenaires."
            href="#"
            icon={Users}
            openLabel="Ouvrir →"
          />
          <AdminNavCard
            variant="history"
            title="Historique"
            description="Journal des modifications de coefficients avec différentiel."
            href="#"
            icon={History}
            openLabel="Ouvrir →"
          />
        </div>
      </section>

      {/* StatusChip — 4 variants */}
      <section style={section}>
        <h2 style={sectionTitle}>StatusChip (active / draft / expired / disabled)</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <StatusChip variant="active" label="Active" />
          <StatusChip variant="draft" label="Brouillon" />
          <StatusChip variant="expired" label="Expirée" />
          <StatusChip variant="disabled" label="Désactivé" />
        </div>
        <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
          Note: expired chip should render <strong>muted-gray</strong> (post Plan 11-01 rewrite),
          NOT gold as in v1.1. Manual regression checkpoint in Task 5 / SUMMARY.md.
        </p>
      </section>
    </div>
  );
}
