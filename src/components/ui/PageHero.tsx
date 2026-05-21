/** PageHero — v1.3 hero primitive (Phase 16, D-01..D-05). Server component. Used on every authed page (one reference adopter in Phase 16: admin home). Phase 17/18 expand consumers. */
import React from 'react';

export interface PageHeroProps {
  title: string;                   // Required. The greeting or page title (e.g. "Bonjour, Antoine 👋", "Administration").
  subtitle?: string;               // Optional. Muted description line below the title.
  eyebrow?: string;                // Optional. Uppercase label above the title (e.g. "ADMIN", "ÉTAPE 1 SUR 3").
  actions?: React.ReactNode;       // Optional. Right-aligned page-level CTA slot.
  children?: React.ReactNode;      // Reserved for future composition; not consumed in Phase 16.
}

export function PageHero({ title, subtitle, eyebrow, actions }: PageHeroProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 32,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {eyebrow && (
          <div
            style={{
              fontSize: '11.8px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--gd)',
              marginBottom: 8,
            }}
          >
            {eyebrow}
          </div>
        )}
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'var(--ink)',
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: '14.5px',
              fontWeight: 400,
              lineHeight: 1.55,
              color: 'var(--muted)',
              marginTop: 8,
              marginBottom: 0,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}
