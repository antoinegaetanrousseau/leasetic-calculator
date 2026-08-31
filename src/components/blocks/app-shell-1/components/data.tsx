import { type ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Home03Icon, FlashIcon, Layers01Icon, Pulse01Icon, Shield01Icon, SettingsIcon, UserMultiple02Icon, BookOpen01Icon, LinkSquare01Icon, Copy01Icon, StarIcon, Delete02Icon } from "@hugeicons/core-free-icons"

// ── Types ──

export type NavChild = {
  id: string
  label: string
  isActive?: boolean
}

export type NavItem = {
  id: string
  label: string
  icon: ReactNode
  badge?: string | number
  isActive?: boolean
  children?: NavChild[]
}

export type PinnedResource = {
  id: string
  name: string
  color: string
  env?: string
}

export type SecondaryItem = {
  id: string
  label: string
  icon: ReactNode
}

export type Workspace = {
  id: string
  name: string
  tier?: string
  imageUrl?: string
  /** Tailwind class for avatar/fallback background (e.g. bg-primary, bg-violet-500) */
  avatarClassName?: string
}

export type ItemAction = {
  id: string
  label: string
  icon: ReactNode
  destructive: boolean
}

// ── Workspaces ──

export const WORKSPACES: Workspace[] = [
  {
    id: "reui",
    name: "ReUI",
    tier: "Pro",
    avatarClassName: "bg-primary text-primary-foreground",
  },
  {
    id: "keenthemes",
    name: "Keenthemes",
    avatarClassName: "bg-blue-500 text-white",
  },
  {
    id: "metronic",
    name: "Metronic",
    avatarClassName: "bg-red-500 text-white",
  },
]

// ── Nav Main ──

export const NAV_MAIN: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <HugeiconsIcon icon={Home03Icon} strokeWidth={2} aria-hidden="true" />
    ),
    isActive: true,
  },
  {
    id: "pipelines",
    label: "Pipelines",
    icon: (
      <HugeiconsIcon icon={FlashIcon} strokeWidth={2} aria-hidden="true" />
    ),
    children: [
      { id: "builds", label: "Build Runs" },
      { id: "deployments", label: "Deployments", isActive: true },
      { id: "releases", label: "Release Gates" },
    ],
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    icon: (
      <HugeiconsIcon icon={Layers01Icon} strokeWidth={2} aria-hidden="true" />
    ),
    children: [
      { id: "clusters", label: "Clusters" },
      { id: "namespaces", label: "Namespaces" },
      { id: "storage", label: "Storage Volumes" },
    ],
  },
  {
    id: "observability",
    label: "Observability",
    icon: (
      <HugeiconsIcon icon={Pulse01Icon} strokeWidth={2} aria-hidden="true" />
    ),
    badge: "14",
  },
  {
    id: "security",
    label: "Security",
    icon: (
      <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} aria-hidden="true" />
    ),
  },
]

// ── Pinned Resources ──

export const PINNED_RESOURCES: PinnedResource[] = [
  { id: "api", name: "API Gateway", color: "bg-emerald-500", env: "Prod" },
  { id: "ml", name: "ML Pipeline", color: "bg-violet-500" },
  { id: "db", name: "Database", color: "bg-blue-500", env: "US-East" },
  { id: "cdn", name: "CDN", color: "bg-amber-500" },
  { id: "auth", name: "Authentication", color: "bg-rose-500" },
]

// ── Nav Secondary ──

export const NAV_SECONDARY: SecondaryItem[] = [
  {
    id: "settings",
    label: "Settings",
    icon: (
      <HugeiconsIcon icon={SettingsIcon} strokeWidth={2} aria-hidden="true" />
    ),
  },
  {
    id: "invite",
    label: "Invite Team",
    icon: (
      <HugeiconsIcon icon={UserMultiple02Icon} strokeWidth={2} aria-hidden="true" />
    ),
  },
  {
    id: "docs",
    label: "Documentation",
    icon: (
      <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} aria-hidden="true" />
    ),
  },
]

// ── Item Actions ──

export const ITEM_ACTIONS: ItemAction[] = [
  {
    id: "open",
    label: "Details",
    icon: (
      <HugeiconsIcon icon={LinkSquare01Icon} strokeWidth={2} aria-hidden="true" />
    ),
    destructive: false,
  },
  {
    id: "copy",
    label: "Copy Link",
    icon: (
      <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} aria-hidden="true" />
    ),
    destructive: false,
  },
  {
    id: "pin",
    label: "Pin to Favorites",
    icon: (
      <HugeiconsIcon icon={StarIcon} strokeWidth={2} aria-hidden="true" />
    ),
    destructive: false,
  },
  {
    id: "remove",
    label: "Remove",
    icon: (
      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} aria-hidden="true" />
    ),
    destructive: true,
  },
]