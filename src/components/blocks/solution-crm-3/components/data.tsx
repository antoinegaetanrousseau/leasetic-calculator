import { type ComponentType, type ReactNode, type SVGProps } from "react"

import { Box } from "@/components/ui/svgs/box"
import { Docker } from "@/components/ui/svgs/docker"
import { Dropbox } from "@/components/ui/svgs/dropbox"
import { GoogleDrive } from "@/components/ui/svgs/googleDrive"
import { Openai } from "@/components/ui/svgs/openai"
import { Prisma } from "@/components/ui/svgs/prisma"
import { Redis } from "@/components/ui/svgs/redis"
import { Slack } from "@/components/ui/svgs/slack"
import { Spotify } from "@/components/ui/svgs/spotify"
import { Stripe } from "@/components/ui/svgs/stripe"
import { Zoom } from "@/components/ui/svgs/zoom"
import { HugeiconsIcon } from "@hugeicons/react"
import { CustomerSupportIcon, Mail01Icon, Calendar04Icon, File02Icon, SparklesIcon, Building02Icon } from "@hugeicons/core-free-icons"

// ── Types ──

export type Lifecycle = "Lead" | "MQL" | "SQL" | "Opportunity" | "Customer"
export type ActivityType = "Call" | "Email" | "Meeting" | "Note" | "Demo"

export interface IOwner {
  name: string
  avatar: string
  initials: string
}

export interface IContact {
  id: string
  name: string
  avatar: string
  initials: string
  email: string
  company: string
  owner: IOwner
  lifecycle: Lifecycle
  lastActivityType: ActivityType
  lastActivityLabel: string
  openDeals: number
  openDealsValue: number
}

// ── Lifecycle stage badge (dot + outline, semantic tone) ──

export const lifecycleToneClass: Record<Lifecycle, string> = {
  Lead: "bg-muted-foreground",
  MQL: "bg-sky-500",
  SQL: "bg-violet-500",
  Opportunity: "bg-amber-500",
  Customer: "bg-emerald-500",
}

export const LIFECYCLE_OPTIONS: { value: Lifecycle; label: string }[] = [
  { value: "Lead", label: "Lead" },
  { value: "MQL", label: "MQL" },
  { value: "SQL", label: "SQL" },
  { value: "Opportunity", label: "Opportunity" },
  { value: "Customer", label: "Customer" },
]

// ── Activity type icons (last touch) ──

export const activityIcon: Record<ActivityType, ReactNode> = {
  Call: (
    <HugeiconsIcon icon={CustomerSupportIcon} strokeWidth={2} className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
  ),
  Email: (
    <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
  ),
  Meeting: (
    <HugeiconsIcon icon={Calendar04Icon} strokeWidth={2} className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
  ),
  Note: (
    <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
  ),
  Demo: (
    <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
  ),
}

type AccountLogoComponent = ComponentType<SVGProps<SVGSVGElement>>

const ACCOUNT_LOGO_COMPONENTS: Record<string, AccountLogoComponent> = {
  "Brightwave Media": Slack,
  "Apex Manufacturing": Docker,
  "Cobalt Logistics": Dropbox,
  "Vertex Health": GoogleDrive,
  "Meridian Retail": Stripe,
  "Cedar & Co": Box,
  "Atlas Freight": Zoom,
  "Orbit Software": Openai,
  "Quanta Devices": Prisma,
  "Ridgeline Energy": Redis,
  "Summit Financial": Spotify,
}

export function AccountLogo({
  company,
  className = "size-4",
}: {
  company: string
  className?: string
}) {
  const Logo = ACCOUNT_LOGO_COMPONENTS[company]

  if (!Logo) {
    return (
      <HugeiconsIcon icon={Building02Icon} strokeWidth={2} className={className} aria-hidden="true" />
    )
  }

  return (
    <Logo
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    />
  )
}

// ── Owners (shared CRM world, sex-matched portraits, stable per person) ──

const MIRA: IOwner = {
  name: "Mira Stone",
  avatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
  initials: "MS",
}
const LEO: IOwner = {
  name: "Leo Grant",
  avatar:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
  initials: "LG",
}
const NORA: IOwner = {
  name: "Nora Vale",
  avatar:
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
  initials: "NV",
}
const SANA: IOwner = {
  name: "Sana Qureshi",
  avatar:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&dpr=2&q=80",
  initials: "SQ",
}
const ALEX: IOwner = {
  name: "Alex Johnson",
  avatar:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80",
  initials: "AJ",
}
const SARAH: IOwner = {
  name: "Sarah Chen",
  avatar:
    "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80",
  initials: "SC",
}

export const OWNERS: IOwner[] = [MIRA, LEO, NORA, SANA, ALEX, SARAH]

// ── Contacts (11 across the shared accounts, sex-matched portraits) ──

export const CONTACTS: IContact[] = [
  {
    id: "1",
    name: "Priya Raman",
    avatar:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=96&h=96&dpr=2&q=80",
    initials: "PR",
    email: "priya.raman@brightwave.media",
    company: "Brightwave Media",
    owner: MIRA,
    lifecycle: "Opportunity",
    lastActivityType: "Demo",
    lastActivityLabel: "2 hours ago",
    openDeals: 2,
    openDealsValue: 84000,
  },
  {
    id: "2",
    name: "Marcus Hale",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=96&h=96&dpr=2&q=80",
    initials: "MH",
    email: "marcus.hale@apexmfg.com",
    company: "Apex Manufacturing",
    owner: LEO,
    lifecycle: "Customer",
    lastActivityType: "Meeting",
    lastActivityLabel: "Yesterday",
    openDeals: 1,
    openDealsValue: 42000,
  },
  {
    id: "3",
    name: "Elena Sokolova",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&dpr=2&q=80",
    initials: "ES",
    email: "elena.s@cobaltlogistics.com",
    company: "Cobalt Logistics",
    owner: SANA,
    lifecycle: "SQL",
    lastActivityType: "Call",
    lastActivityLabel: "3 days ago",
    openDeals: 1,
    openDealsValue: 28000,
  },
  {
    id: "4",
    name: "David Okafor",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&dpr=2&q=80",
    initials: "DO",
    email: "d.okafor@vertexhealth.io",
    company: "Vertex Health",
    owner: ALEX,
    lifecycle: "MQL",
    lastActivityType: "Email",
    lastActivityLabel: "5 days ago",
    openDeals: 0,
    openDealsValue: 0,
  },
  {
    id: "5",
    name: "Hana Kim",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=96&h=96&dpr=2&q=80",
    initials: "HK",
    email: "hana.kim@meridianretail.com",
    company: "Meridian Retail",
    owner: MIRA,
    lifecycle: "Opportunity",
    lastActivityType: "Meeting",
    lastActivityLabel: "1 day ago",
    openDeals: 2,
    openDealsValue: 56000,
  },
  {
    id: "6",
    name: "Tom Whitfield",
    avatar:
      "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=96&h=96&dpr=2&q=80",
    initials: "TW",
    email: "tom@cedarandco.com",
    company: "Cedar & Co",
    owner: NORA,
    lifecycle: "Lead",
    lastActivityType: "Note",
    lastActivityLabel: "1 week ago",
    openDeals: 0,
    openDealsValue: 0,
  },
  {
    id: "7",
    name: "Aisha Bello",
    avatar:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=96&h=96&dpr=2&q=80",
    initials: "AB",
    email: "aisha.bello@atlasfreight.com",
    company: "Atlas Freight",
    owner: SANA,
    lifecycle: "Customer",
    lastActivityType: "Call",
    lastActivityLabel: "4 hours ago",
    openDeals: 1,
    openDealsValue: 38000,
  },
  {
    id: "8",
    name: "Ryan Mercer",
    avatar:
      "https://images.unsplash.com/photo-1463453091185-61582044d556?w=96&h=96&dpr=2&q=80",
    initials: "RM",
    email: "ryan.mercer@orbitsoftware.dev",
    company: "Orbit Software",
    owner: LEO,
    lifecycle: "SQL",
    lastActivityType: "Demo",
    lastActivityLabel: "6 hours ago",
    openDeals: 1,
    openDealsValue: 31000,
  },
  {
    id: "9",
    name: "Carla Ferreira",
    avatar:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=96&h=96&dpr=2&q=80",
    initials: "CF",
    email: "carla.f@quantadevices.com",
    company: "Quanta Devices",
    owner: ALEX,
    lifecycle: "MQL",
    lastActivityType: "Email",
    lastActivityLabel: "2 days ago",
    openDeals: 0,
    openDealsValue: 0,
  },
  {
    id: "10",
    name: "Ben Travers",
    avatar:
      "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=96&h=96&dpr=2&q=80",
    initials: "BT",
    email: "ben.travers@ridgelineenergy.com",
    company: "Ridgeline Energy",
    owner: SARAH,
    lifecycle: "Opportunity",
    lastActivityType: "Meeting",
    lastActivityLabel: "Yesterday",
    openDeals: 1,
    openDealsValue: 67000,
  },
  {
    id: "11",
    name: "Sofia Marchetti",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=96&h=96&dpr=2&q=80",
    initials: "SM",
    email: "sofia.m@summitfinancial.com",
    company: "Summit Financial",
    owner: NORA,
    lifecycle: "Lead",
    lastActivityType: "Note",
    lastActivityLabel: "9 days ago",
    openDeals: 0,
    openDealsValue: 0,
  },
]

export const ACCOUNT_COUNT = new Set(CONTACTS.map((contact) => contact.company))
  .size