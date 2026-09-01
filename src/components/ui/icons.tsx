/**
 * The app's icon vocabulary, in one place.
 *
 * Sourced from Iconly (licensed), style Outline / type regular. The components
 * in ../icons are generated from the Iconly SVGs and normalised: black fills
 * become `currentColor`, `<title>` elements are stripped, internal ids are
 * namespaced per icon so two on one page cannot collide, and the intrinsic
 * viewBox is preserved while width/height come from the `size` prop.
 *
 * Why this file exists rather than importing the components directly: glyph
 * choice is a design decision and gets revised. Changing what "Propositions"
 * looks like is one edit here, not a hunt through 100+ call sites. That has
 * already paid off twice — this vocabulary was lucide, then Hugeicons, and the
 * call sites did not move either time.
 *
 * The ReUI/shadcn primitives in ./ still draw Hugeicons, and deliberately so:
 * they are vendored and the shadcn CLI regenerates them, so local edits there
 * would be lost. Their icons are chrome — dropdown chevrons, select carets,
 * the sidebar rail toggle.
 *
 * Usage:
 *   import { HomeIcon } from '@/components/ui/icons';
 *   <HomeIcon size={17} />
 *   <HomeIcon size={17} style={{ color: 'var(--gd)' }} />   // colour via CSS
 */
import * as React from 'react';
import { MoreHorizontalIcon } from '../icons/MoreHorizontalIcon';

export type { HomeIconProps as IconProps } from '../icons/HomeIcon';

export { HomeIcon } from '../icons/HomeIcon';
export { ProposalIcon } from '../icons/ProposalIcon';
export { HelpIcon } from '../icons/HelpIcon';
export { UsersIcon } from '../icons/UsersIcon';
export { SlidersIcon } from '../icons/SlidersIcon';
export { HistoryIcon } from '../icons/HistoryIcon';
export { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
export { ChevronRightIcon } from '../icons/ChevronRightIcon';
export { ArrowRightIcon } from '../icons/ArrowRightIcon';
export { PlusIcon } from '../icons/PlusIcon';
export { XIcon } from '../icons/XIcon';
export { TrashIcon } from '../icons/TrashIcon';
export { CopyIcon } from '../icons/CopyIcon';
export { DownloadIcon } from '../icons/DownloadIcon';
export { SaveIcon } from '../icons/SaveIcon';
export { PencilIcon } from '../icons/PencilIcon';
export { RefreshIcon } from '../icons/RefreshIcon';
export { RotateCcwIcon } from '../icons/RotateCcwIcon';
export { UndoIcon } from '../icons/UndoIcon';
export { ArchiveIcon } from '../icons/ArchiveIcon';
export { SendIcon } from '../icons/SendIcon';
export { LogOutIcon } from '../icons/LogOutIcon';
export { UserPlusIcon } from '../icons/UserPlusIcon';
export { SearchIcon } from '../icons/SearchIcon';
export { SettingsIcon } from '../icons/SettingsIcon';
export { MoreHorizontalIcon } from '../icons/MoreHorizontalIcon';
export { AlertTriangleIcon } from '../icons/AlertTriangleIcon';
export { CheckCircleIcon } from '../icons/CheckCircleIcon';
export { InfoIcon } from '../icons/InfoIcon';
export { BanIcon } from '../icons/BanIcon';
export { LoaderIcon } from '../icons/LoaderIcon';
export { FileTextIcon } from '../icons/FileTextIcon';
export { BookOpenIcon } from '../icons/BookOpenIcon';
export { BarChartIcon } from '../icons/BarChartIcon';
export { HashIcon } from '../icons/HashIcon';
export { MailIcon } from '../icons/MailIcon';
export { EyeIcon } from '../icons/EyeIcon';
export { EyeOffIcon } from '../icons/EyeOffIcon';
export { SunIcon } from '../icons/SunIcon';
export { MoonIcon } from '../icons/MoonIcon';
export { MonitorIcon } from '../icons/MonitorIcon';
export { ExternalLinkIcon } from '../icons/ExternalLinkIcon';
export { BuildingIcon } from '../icons/BuildingIcon';
export { PhoneIcon } from '../icons/PhoneIcon';

/**
 * A bare tick. Iconly's Essential set only ships it inside a square, which is
 * also what CheckCircleIcon uses — the two are deliberately the same glyph
 * rather than two near-identical ticks that would read as an inconsistency.
 */
export { CheckCircleIcon as CheckIcon } from '../icons/CheckCircleIcon';

/**
 * Iconly has no vertical three-dot glyph. Rotating the horizontal one keeps the
 * overflow menus in the same family instead of importing a stranger for one
 * icon. `rotate-90` is appended so a caller's own className still wins.
 */
export function MoreVerticalIcon({
  className,
  ...props
}: React.ComponentProps<typeof MoreHorizontalIcon>) {
  return (
    <MoreHorizontalIcon
      className={className ? `${className} rotate-90` : 'rotate-90'}
      {...props}
    />
  );
}
