import { type ReactNode } from "react"
import { type BadgeProps } from "@/components/reui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, InformationCircleIcon, SmartPhone01Icon, Key02Icon, Mail01Icon, ComputerIcon, LogoutSquare01Icon, Shield01Icon } from "@hugeicons/core-free-icons"

// ── Types ──

export interface SelectOption {
  value: string
  label: string
  description: string
}

export interface SummaryMetric {
  id: string
  label: string
  value: string
  detail?: string
  badge?: {
    label: string
    variant: BadgeProps["variant"]
  }
}

export interface MemberIdentity {
  name: string
  initials: string
  email: string
  avatar: string
  role: string
  status: string
  statusVariant: BadgeProps["variant"]
  memberId: string
  team: string
  joined: string
}

export interface AccessChip {
  label: string
  variant: BadgeProps["variant"]
}

export interface AuthFactor {
  id: string
  name: string
  detail: string
  badge: {
    label: string
    variant: BadgeProps["variant"]
  }
  icon: ReactNode
}

export interface MemberSession {
  id: string
  device: string
  city: string
  ip: string
  lastSeen: string
  current: boolean
  icon: ReactNode
}

export interface ActivityItem {
  id: number
  actor: string
  action: string
  target: string
  date: string
  dateTime: string
  avatar?: string
  detail?: string
  badge?: {
    label: string
    variant: BadgeProps["variant"]
  }
  icon: ReactNode
}

// ── Toast icons ──

export const TOAST_SUCCESS_ICON = (
  <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-[18px] text-green-600" aria-hidden="true" />
)

export const TOAST_INFO_ICON = (
  <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-[18px]" aria-hidden="true" />
)

// ── Identity ──

export const MEMBER_IDENTITY: MemberIdentity = {
  name: "Nora Vale",
  initials: "NV",
  email: "nora.vale@acmecloud.com",
  avatar:
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
  role: "Member",
  status: "Active",
  statusVariant: "success-light",
  memberId: "usr_a1b2c3d4",
  team: "Product, Design",
  joined: "Joined Mar 2024",
}

// ── Access & roles ──

export const ROLE_CHIPS: AccessChip[] = [
  { label: "Member", variant: "secondary" },
  { label: "Support Agent", variant: "primary-light" },
]

export const TEAM_CHIPS: AccessChip[] = [
  { label: "Product", variant: "info-light" },
  { label: "Design", variant: "info-light" },
]

export const SCOPE_CHIPS: AccessChip[] = [
  { label: "Members, Read", variant: "info-light" },
  { label: "Billing, None", variant: "destructive-light" },
  { label: "Audit log, Read", variant: "info-light" },
  { label: "Settings, Write", variant: "warning-light" },
]

export const ROLE_OPTIONS: SelectOption[] = [
  {
    value: "member",
    label: "Member",
    description: "Standard workspace access",
  },
  {
    value: "support-agent",
    label: "Support Agent",
    description: "Custom, scoped impersonation",
  },
  {
    value: "billing",
    label: "Billing",
    description: "Invoices and seat management",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Manage members and settings",
  },
]

export const TEAM_OPTIONS: SelectOption[] = [
  {
    value: "product",
    label: "Product",
    description: "14 members",
  },
  {
    value: "design",
    label: "Design",
    description: "8 members",
  },
  {
    value: "engineering",
    label: "Engineering",
    description: "22 members",
  },
]

// ── Authentication ──

export const AUTH_FACTORS: AuthFactor[] = [
  {
    id: "totp",
    name: "Authenticator (TOTP)",
    detail: "Verified Apr 12, 2026",
    badge: { label: "Enabled", variant: "success-light" },
    icon: (
      <HugeiconsIcon icon={SmartPhone01Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
    ),
  },
  {
    id: "passkey",
    name: "Passkey",
    detail: "MacBook Pro, Touch ID",
    badge: { label: "Enabled", variant: "success-light" },
    icon: (
      <HugeiconsIcon icon={Key02Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
    ),
  },
  {
    id: "sms",
    name: "SMS backup",
    detail: "Ends in 0188",
    badge: { label: "Off", variant: "secondary" },
    icon: (
      <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
    ),
  },
]

export const AUTH_SIGNALS: SummaryMetric[] = [
  {
    id: "password",
    label: "Password",
    value: "Set Mar 4, 2024",
    detail: "Last changed Apr 9, 2026, 67 days ago.",
    badge: { label: "Strong", variant: "success-light" },
  },
  {
    id: "sso",
    label: "SSO connection",
    value: "Okta",
    detail: "Provisioned via SCIM on the acmecloud.com directory.",
    badge: { label: "Connected", variant: "success-light" },
  },
  {
    id: "mfa",
    label: "Two-factor",
    value: "2 factors enrolled",
    detail: "Authenticator and passkey cover sign-in for this member.",
    badge: { label: "Enforced", variant: "info-light" },
  },
]

// ── Sessions ──

const desktopIcon = (
  <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} className="size-4" aria-hidden="true" />
)

const mobileIcon = (
  <HugeiconsIcon icon={SmartPhone01Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
)

export const MEMBER_SESSIONS: MemberSession[] = [
  {
    id: "sess_9f21",
    device: "Chrome on macOS",
    city: "San Francisco",
    ip: "192.0.2.14",
    lastSeen: "2h ago",
    current: true,
    icon: desktopIcon,
  },
  {
    id: "sess_7a04",
    device: "Safari on iPhone",
    city: "San Francisco",
    ip: "192.0.2.51",
    lastSeen: "Yesterday",
    current: false,
    icon: mobileIcon,
  },
  {
    id: "sess_3c88",
    device: "Firefox on Windows",
    city: "Austin",
    ip: "192.0.2.103",
    lastSeen: "4 days ago",
    current: false,
    icon: desktopIcon,
  },
]

// ── Activity ──

const loginIcon = (
  <HugeiconsIcon icon={LogoutSquare01Icon} strokeWidth={2} className="size-3" aria-hidden="true" />
)

const roleIcon = (
  <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} className="size-3" aria-hidden="true" />
)

const sessionIcon = (
  <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} className="size-3" aria-hidden="true" />
)

const mfaIcon = (
  <HugeiconsIcon icon={Key02Icon} strokeWidth={2} className="size-3" aria-hidden="true" />
)

export const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: 1,
    actor: "Nora Vale",
    action: "signed in from",
    target: "San Francisco",
    detail: "Chrome on macOS, 192.0.2.14",
    date: "Jun 17, 2026, 2:14 PM",
    dateTime: "2026-06-17T14:14:00-07:00",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
    badge: { label: "Login success", variant: "success-light" },
    icon: loginIcon,
  },
  {
    id: 2,
    actor: "Leo Grant",
    action: "changed role to",
    target: "Support Agent",
    detail: "Added the custom Support Agent role for scoped impersonation.",
    date: "Jun 14, 2026, 9:32 AM",
    dateTime: "2026-06-14T09:32:00-07:00",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
    badge: { label: "Role changed", variant: "info-light" },
    icon: roleIcon,
  },
  {
    id: 3,
    actor: "Nora Vale",
    action: "enrolled a",
    target: "Passkey",
    detail: "MacBook Pro, Touch ID",
    date: "Apr 12, 2026, 11:05 AM",
    dateTime: "2026-04-12T11:05:00-07:00",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
    badge: { label: "MFA reset", variant: "warning-light" },
    icon: mfaIcon,
  },
  {
    id: 4,
    actor: "Mira Stone",
    action: "revoked session on",
    target: "iPad",
    detail: "Stale session signed out after the policy review.",
    date: "Apr 2, 2026, 4:48 PM",
    dateTime: "2026-04-02T16:48:00-07:00",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
    badge: { label: "Session revoked", variant: "secondary" },
    icon: sessionIcon,
  },
  {
    id: 5,
    actor: "System",
    action: "provisioned via",
    target: "SCIM",
    detail: "Synced from Okta on the acmecloud.com directory.",
    date: "Mar 4, 2024, 8:00 AM",
    dateTime: "2024-03-04T08:00:00-08:00",
    badge: { label: "SCIM provision", variant: "primary-light" },
    icon: roleIcon,
  },
]