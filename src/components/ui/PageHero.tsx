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
  // data-slot follows the shadcn convention already used across this codebase
  // (see select.tsx, sidebar.tsx). It gives tests and consumers a stable hook
  // that survives restyling — the previous suite identified the eyebrow by
  // searching for an inline `text-transform: uppercase` style, which stopped
  // existing the moment this moved to Tailwind utilities.
  return (
    <div data-slot="page-hero" className="flex justify-between items-start mb-8">
      <div data-slot="page-hero-main" className="flex flex-col">
        {eyebrow && (
          <div
            data-slot="page-hero-eyebrow"
            className="text-[11.8px] font-bold tracking-[0.06em] uppercase text-primary mb-2"
          >
            {eyebrow}
          </div>
        )}
        <h1
          data-slot="page-hero-title"
          className="text-3xl font-bold leading-tight text-foreground m-0"
        >
          {title}
        </h1>
        {subtitle && (
          <p
            data-slot="page-hero-subtitle"
            className="text-[14.5px] font-normal leading-relaxed text-muted-foreground mt-2 mb-0"
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div data-slot="page-hero-actions">{actions}</div>}
    </div>
  );
}
