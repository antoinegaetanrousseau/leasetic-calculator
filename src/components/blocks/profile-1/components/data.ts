import { type BadgeProps } from "@/components/reui/badge"

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

export interface BillingSpendCard {
  id: "spend" | "seats" | "invoice"
  title: string
  subtitle: string
  value: string
  detail: string
  badge: {
    label: string
    variant: BadgeProps["variant"]
  }
}

export interface TeamMember {
  id: string
  name: string
  role: string
  department: string
  email: string
  access: TeamMemberAccess
  status: TeamMemberStatus
  availability: TeamMemberAvailability
  location: string
  timezone: string
  joined: string
  lastActive: string
  src: string
  initials: string
}

export interface ProfileIdentity {
  name: string
  username: string
  email: string
  phone: string
  website: string
  bio: string
}

export interface WorkspaceIdentity {
  name: string
  subdomain: string
  domainSuffix: string
  supportEmail: string
  billingOwner: string
  invoiceEmail: string
  costCenter: string
}

export interface BrandColor {
  id: string
  label: string
  value: string
  active?: boolean
}

export interface TimezoneGroup {
  value: string
  items: string[]
}

export type TeamMemberStatus = "Active" | "Invited" | "Limited" | "Suspended"

export type TeamMemberAvailability = "online" | "away" | "busy" | "offline"

export type TeamMemberAccess = "Owner" | "Admin" | "Member"

// ── Data ──

export const PROFILE_IDENTITY: ProfileIdentity = {
  name: "Ava Chen",
  username: "avachen",
  email: "ava@atlashq.app",
  phone: "+17185550188",
  website: "ava.atlashq.app",
  bio: "Leading launch systems, product operations, and internal tooling across the Atlas workspace.",
}

export const WORKSPACE_IDENTITY: WorkspaceIdentity = {
  name: "Atlas",
  subdomain: "hq",
  domainSuffix: ".atlashq.app",
  supportEmail: "support@atlashq.app",
  billingOwner: "finance@atlashq.app",
  invoiceEmail: "ap@atlashq.app",
  costCenter: "RevOps / Growth",
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "ava",
    name: "Ava Chen",
    role: "Owner",
    department: "Product · Leadership",
    email: "ava@atlashq.app",
    access: "Owner",
    status: "Active",
    availability: "online",
    location: "Brooklyn, NY",
    timezone: "EST (UTC-5)",
    joined: "Jan 2024",
    lastActive: "Active now",
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&dpr=2&q=80",
    initials: "AC",
  },
  {
    id: "milo",
    name: "Milo Harper",
    role: "Growth Ops",
    department: "Revenue · Growth",
    email: "milo@atlashq.app",
    access: "Admin",
    status: "Active",
    availability: "away",
    location: "San Francisco, CA",
    timezone: "PST (UTC-8)",
    joined: "Mar 2024",
    lastActive: "10 min ago",
    src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&dpr=2&q=80",
    initials: "MH",
  },
  {
    id: "nina",
    name: "Nina Park",
    role: "Design Systems",
    department: "Design · Systems",
    email: "nina@atlashq.app",
    access: "Member",
    status: "Active",
    availability: "busy",
    location: "Toronto, CA",
    timezone: "EST (UTC-5)",
    joined: "Jun 2023",
    lastActive: "2 hours ago",
    src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&dpr=2&q=80",
    initials: "NP",
  },
  {
    id: "omar",
    name: "Omar Reyes",
    role: "Customer Success",
    department: "Support · Success",
    email: "omar@atlashq.app",
    access: "Member",
    status: "Limited",
    availability: "offline",
    location: "Austin, TX",
    timezone: "CST (UTC-6)",
    joined: "Sep 2024",
    lastActive: "Today",
    src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&dpr=2&q=80",
    initials: "OR",
  },
  {
    id: "maya",
    name: "Maya Singh",
    role: "Revenue Ops",
    department: "Finance · Ops",
    email: "maya@atlashq.app",
    access: "Admin",
    status: "Invited",
    availability: "away",
    location: "Chicago, IL",
    timezone: "CST (UTC-6)",
    joined: "Invited Apr 2026",
    lastActive: "Yesterday",
    src: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=80&h=80&dpr=2&q=80",
    initials: "MS",
  },
  {
    id: "leo",
    name: "Leo Grant",
    role: "Platform Engineer",
    department: "Engineering · Platform",
    email: "leo@atlashq.app",
    access: "Member",
    status: "Suspended",
    availability: "offline",
    location: "Seattle, WA",
    timezone: "PST (UTC-8)",
    joined: "Nov 2023",
    lastActive: "3 days ago",
    src: "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=80&h=80&dpr=2&q=80",
    initials: "LG",
  },
]

export const TEAM_STATUS_ORDER: TeamMemberStatus[] = [
  "Active",
  "Invited",
  "Limited",
  "Suspended",
]

export const WORKSPACE_SIGNALS: SummaryMetric[] = [
  {
    id: "domain",
    label: "Verified domain",
    value: "atlashq.app",
    detail: "Custom links, invites, and shared pages resolve here.",
    badge: {
      label: "Active",
      variant: "success-light",
    },
  },
  {
    id: "region",
    label: "Data region",
    value: "US East",
    detail: "Primary routing for customer and workspace data.",
  },
  {
    id: "theme",
    label: "Brand posture",
    value: "Teal accent",
    detail: "Applied to shared flows and workspace navigation.",
  },
]

export const BILLING_SPEND_CARDS: BillingSpendCard[] = [
  {
    id: "spend",
    title: "Monthly spend",
    subtitle: "Business plan",
    value: "$149",
    detail: "Base workspace plan before seat growth or annual billing changes.",
    badge: {
      label: "Current",
      variant: "success-light",
    },
  },
  {
    id: "seats",
    title: "Seat usage",
    subtitle: "12 of 24 seats",
    value: "12",
    detail: "Half of the available seats are assigned across the workspace.",
    badge: {
      label: "12 open",
      variant: "info-light",
    },
  },
  {
    id: "invoice",
    title: "Next invoice",
    subtitle: "May 28, 2026",
    value: "$149",
    detail: "Approvers, reminders, and the PO rule are already attached.",
    badge: {
      label: "PO ready",
      variant: "warning-light",
    },
  },
]

export const TIMEZONE_GROUPS: TimezoneGroup[] = [
  {
    value: "Americas",
    items: [
      "(GMT-5) New York",
      "(GMT-8) Los Angeles",
      "(GMT-6) Chicago",
      "(GMT-5) Toronto",
      "(GMT-8) Vancouver",
      "(GMT-3) Sao Paulo",
    ],
  },
  {
    value: "Europe",
    items: [
      "(GMT+0) London",
      "(GMT+1) Paris",
      "(GMT+1) Berlin",
      "(GMT+1) Rome",
      "(GMT+1) Madrid",
      "(GMT+1) Amsterdam",
    ],
  },
  {
    value: "Asia/Pacific",
    items: [
      "(GMT+9) Tokyo",
      "(GMT+8) Shanghai",
      "(GMT+8) Singapore",
      "(GMT+4) Dubai",
      "(GMT+11) Sydney",
      "(GMT+9) Seoul",
    ],
  },
]

export const ROLE_OPTIONS: SelectOption[] = [
  {
    value: "staff-product-lead",
    label: "Staff Product Lead",
    description: "Owns product operations",
  },
  {
    value: "product-manager",
    label: "Product Manager",
    description: "Drives roadmap execution",
  },
  {
    value: "design-lead",
    label: "Design Lead",
    description: "Owns system quality",
  },
]

export const LANGUAGE_OPTIONS: SelectOption[] = [
  {
    value: "en-us",
    label: "English (US)",
    description: "Default product language",
  },
  {
    value: "en-uk",
    label: "English (UK)",
    description: "Common team alternative",
  },
  {
    value: "de",
    label: "German",
    description: "For regional ops",
  },
]

export const LANDING_VIEW_OPTIONS: SelectOption[] = [
  {
    value: "home",
    label: "Home overview",
    description: "Recent activity first",
  },
  {
    value: "pipeline",
    label: "Pipeline board",
    description: "Jump into execution",
  },
  {
    value: "inbox",
    label: "Priority inbox",
    description: "Focus on approvals",
  },
]

export const DIGEST_OPTIONS: SelectOption[] = [
  {
    value: "weekday-am",
    label: "Weekday mornings",
    description: "Sent before standup",
  },
  {
    value: "daily-pm",
    label: "Daily evenings",
    description: "Wrap the workday",
  },
  {
    value: "weekly",
    label: "Weekly summary",
    description: "Monday planning recap",
  },
]

export const SEAT_LIMIT_OPTIONS: SelectOption[] = [
  {
    value: "16",
    label: "16 seats",
    description: "Best for your current team size and smooth growth",
  },
  {
    value: "24",
    label: "24 seats",
    description: "Gives your team room for future growth",
  },
  {
    value: "40",
    label: "40 seats",
    description: "Supports the next hiring cycle with 16 open seats",
  },
]

export const BRAND_COLORS: BrandColor[] = [
  { id: "graphite", label: "Graphite", value: "#5B6170" },
  { id: "cobalt", label: "Cobalt", value: "#5470F7" },
  { id: "teal", label: "Teal", value: "#159E9A", active: true },
  { id: "mint", label: "Mint", value: "#44BA84" },
  { id: "orange", label: "Orange", value: "#EA7B18" },
  { id: "rose", label: "Rose", value: "#E65A8B" },
]