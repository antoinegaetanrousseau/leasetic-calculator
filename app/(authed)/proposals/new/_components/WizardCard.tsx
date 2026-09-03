import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Stepper, type StepperProps } from '@/components/ui/Stepper';

export interface WizardCardProps extends StepperProps {
  children: ReactNode;
}

/**
 * The wizard shell from ReUI's `wizard-1` block: one Card whose header row is
 * the stepper nav, a hairline, then the step's content as flat
 * `.wizard-panel` sections, ending with the `WizardActionBar` footer. Server
 * component — the stepper is URL-driven, so no client state lives here.
 */
export function WizardCard({ children, ...stepper }: WizardCardProps) {
  return (
    <Card data-slot="wizard-card" className="gap-0 overflow-hidden py-0">
      <div className="px-7 py-4">
        <Stepper {...stepper} />
      </div>
      <Separator />
      {children}
    </Card>
  );
}
