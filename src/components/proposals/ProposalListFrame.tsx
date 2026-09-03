import type { ReactNode } from 'react';
import { Frame, FramePanel } from '@/components/reui/frame';
import { cn } from '@/lib/utils';

export interface ProposalListFrameProps {
  /** Optional header row (title on the left, `action` on the right). */
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The list shell from ReUI's `list-2` block: a dense, stacked `Frame` with an
 * optional header panel and one content panel holding the rows. Rows are
 * `ProposalRow`s (or the home page's `Link` rows) which draw their own
 * hairline separators.
 */
export function ProposalListFrame({ title, action, children, className }: ProposalListFrameProps) {
  return (
    <Frame dense stacked spacing="sm" className={cn('w-full', className)}>
      {(title || action) && (
        <FramePanel className="flex items-center justify-between gap-3 p-3!">
          {title ? <h2 className="m-0 text-base font-medium text-foreground">{title}</h2> : <span />}
          {action}
        </FramePanel>
      )}
      <FramePanel className="p-1.5!">{children}</FramePanel>
    </Frame>
  );
}
