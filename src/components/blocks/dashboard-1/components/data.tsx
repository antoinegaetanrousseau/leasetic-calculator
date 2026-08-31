import { type ReactNode } from "react"
import { type BadgeProps } from "@/components/reui/badge"

import { type ChartConfig } from "@/components/ui/chart"
import { HugeiconsIcon } from "@hugeicons/react"
import { PackageIcon, TruckIcon, Alert02Icon, BotIcon } from "@hugeicons/core-free-icons"

export type FulfillmentStatus = "On Time" | "At Risk" | "Delayed" | "Blocked"
export type AutomationLevel = "Autopilot" | "Copilot" | "Manual"

export interface TeamMember {
  name: string
  initials: string
  avatar: string
  role: string
}

export interface FulfillmentException {
  id: string
  reference: string
  customer: string
  email: string
  avatar: string
  initials: string
  lane: string
  facility: string
  stage: string
  promise: string
  slaMinutes: number
  automation: AutomationLevel
  owner: string
  units: number
  value: number
  risk: string
  status: FulfillmentStatus
}

export const STATUS_ORDER: FulfillmentStatus[] = [
  "On Time",
  "At Risk",
  "Delayed",
  "Blocked",
]

export const STATUS_BADGE_VARIANT: Record<
  FulfillmentStatus,
  BadgeProps["variant"]
> = {
  "On Time": "success-outline",
  "At Risk": "warning-outline",
  Delayed: "info-outline",
  Blocked: "destructive-outline",
}

export const AUTOMATION_BADGE_VARIANT: Record<
  AutomationLevel,
  BadgeProps["variant"]
> = {
  Autopilot: "success-light",
  Copilot: "info-light",
  Manual: "warning-light",
}

export const NAV_MEMBERS: TeamMember[] = [
  {
    name: "Maya Singh",
    initials: "MS",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
    role: "Fulfillment lead",
  },
  {
    name: "Leo Martins",
    initials: "LM",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
    role: "Automation owner",
  },
  {
    name: "Nora Albright",
    initials: "NA",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&dpr=2&q=80",
    role: "Capacity planner",
  },
]

export const TEAM_MEMBERS = NAV_MEMBERS.map((member) => ({
  src: member.avatar,
  initials: member.initials,
  name: member.name,
}))

export const TEAM_EXTRA_COUNT = 11

export interface FulfillmentCardChange {
  positive: boolean
  percent: string
  amount: string
}

export interface FulfillmentCard {
  typeLabel: string
  title: string
  metricLabel: string
  balance: string
  change: FulfillmentCardChange
  icon: ReactNode
  iconBg: string
}

export const FULFILLMENT_CARDS: FulfillmentCard[] = [
  {
    typeLabel: "Outbound",
    title: "Orders Ready",
    metricLabel: "Ready Volume",
    balance: "18,420",
    change: {
      positive: true,
      percent: "+11.8%",
      amount: "1,946",
    },
    iconBg: "bg-neutral-950",
    icon: (
      <HugeiconsIcon icon={PackageIcon} strokeWidth={2} aria-hidden="true" />
    ),
  },
  {
    typeLabel: "Promise",
    title: "Same-Day SLA",
    metricLabel: "Service Level",
    balance: "94.8%",
    change: {
      positive: true,
      percent: "+1.2 pts",
      amount: "shift",
    },
    iconBg: "bg-indigo-600",
    icon: (
      <HugeiconsIcon icon={TruckIcon} strokeWidth={2} aria-hidden="true" />
    ),
  },
  {
    typeLabel: "Inventory",
    title: "Stock Risk",
    metricLabel: "Blocked SKUs",
    balance: "31",
    change: {
      positive: true,
      percent: "13 fewer",
      amount: "since 06:00",
    },
    iconBg: "bg-amber-400",
    icon: (
      <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} aria-hidden="true" />
    ),
  },
  {
    typeLabel: "Policy",
    title: "AI Autopilot",
    metricLabel: "Auto Resolved",
    balance: "71.6%",
    change: {
      positive: true,
      percent: "+8.4 pts",
      amount: "policy",
    },
    iconBg: "bg-cyan-600",
    icon: (
      <HugeiconsIcon icon={BotIcon} strokeWidth={2} aria-hidden="true" />
    ),
  },
]

export type AllocationPeriod = {
  value: "week" | "month" | "year"
  label: string
  allocation: string
  delta: string
  comparison: string
  exposure: string
  filledSegments: number
}

export type AllocationMember = {
  name: string
  initials: string
  avatar?: string
}

export const SEGMENT_COUNT = 56
export const allocationMemberCount = 6

export const allocationPeriods: AllocationPeriod[] = [
  {
    value: "week",
    label: "Week",
    allocation: "86%",
    delta: "+5.8%",
    comparison: "vs labor plan",
    exposure: "3,840 orders",
    filledSegments: 48,
  },
  {
    value: "month",
    label: "Month",
    allocation: "79%",
    delta: "+2.4%",
    comparison: "vs prior month",
    exposure: "18 priority lanes",
    filledSegments: 44,
  },
  {
    value: "year",
    label: "Year",
    allocation: "74%",
    delta: "+9.2%",
    comparison: "automation lift",
    exposure: "6 facilities",
    filledSegments: 41,
  },
]

export const allocationMembers: AllocationMember[] = TEAM_MEMBERS.map(
  (member) => ({
    name: member.name,
    initials: member.initials,
    avatar: member.src,
  })
)

export type PerformanceTrend = "positive" | "negative"
export type ActivityTone = "success" | "info" | "warning"

export interface PerformanceMetric {
  label: string
  value: string
  trend: PerformanceTrend
  delta: string
}

export interface ShiftActivity {
  id: string
  title: string
  time: string
  status: string
  tone: ActivityTone
}

export const PERFORMANCE_RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
]

export const SHIFT_PERFORMANCE: PerformanceMetric[] = [
  {
    label: "Orders Cleared",
    value: "18.4k",
    trend: "positive",
    delta: "+11.8%",
  },
  {
    label: "SLA Recovery",
    value: "94.8%",
    trend: "positive",
    delta: "+1.2 pts",
  },
  {
    label: "Risk Exposure",
    value: "$128k",
    trend: "negative",
    delta: "-9.4%",
  },
]

export const SHIFT_PIPELINE_PROGRESS = 76

export const SHIFT_ACTIVITY: ShiftActivity[] = [
  {
    id: "wave-release",
    title: "Released priority wave to dock B",
    time: "4 min ago",
    status: "Cleared",
    tone: "success",
  },
  {
    id: "carrier-reprice",
    title: "Carrier mix repriced for zone 6",
    time: "12 min ago",
    status: "Review",
    tone: "info",
  },
  {
    id: "inventory-hold",
    title: "Inventory hold isolated to 3 SKUs",
    time: "23 min ago",
    status: "Watch",
    tone: "warning",
  },
]

export type InflowFundKey = "autopilot" | "copilot" | "manual" | "reserve"

export interface InflowFund {
  key: Exclude<InflowFundKey, "reserve">
  name: string
  amount: string
  share: number
  color: string
  fill: string
}

export interface InflowPeriod {
  value: "week" | "month" | "year"
  label: string
  total: string
  headline: string
  description: string
  delta: string
  funds: InflowFund[]
}

const inflowAutopilotColor = "oklch(0.62 0.19 149)"
const inflowCopilotColor = "oklch(0.58 0.18 257)"
const inflowManualColor = "oklch(0.72 0.16 78)"

export const inflowChartConfig = {
  flow: {
    label: "Flow",
  },
  autopilot: {
    label: "Autopilot",
    color: inflowAutopilotColor,
  },
  copilot: {
    label: "Copilot",
    color: inflowCopilotColor,
  },
  manual: {
    label: "Manual",
    color: inflowManualColor,
  },
  reserve: {
    label: "Reserve",
    color: "oklch(0.7 0.04 260)",
  },
} satisfies ChartConfig

export const inflowPeriods: InflowPeriod[] = [
  {
    value: "week",
    label: "Week",
    total: "18.4k",
    headline: "Exception Flow",
    description: "Orders entering decision lanes",
    delta: "+6.2%",
    funds: [
      {
        key: "autopilot",
        name: "Autopilot",
        amount: "9.1k",
        share: 49.5,
        color: inflowAutopilotColor,
        fill: "var(--color-autopilot)",
      },
      {
        key: "copilot",
        name: "Copilot",
        amount: "5.2k",
        share: 28.3,
        color: inflowCopilotColor,
        fill: "var(--color-copilot)",
      },
      {
        key: "manual",
        name: "Manual",
        amount: "2.8k",
        share: 15.2,
        color: inflowManualColor,
        fill: "var(--color-manual)",
      },
    ],
  },
  {
    value: "month",
    label: "Month",
    total: "76.8k",
    headline: "Resolved Flow",
    description: "Completed decisions this month",
    delta: "+14.8%",
    funds: [
      {
        key: "autopilot",
        name: "Autopilot",
        amount: "41.6k",
        share: 54.2,
        color: inflowAutopilotColor,
        fill: "var(--color-autopilot)",
      },
      {
        key: "copilot",
        name: "Copilot",
        amount: "20.3k",
        share: 26.4,
        color: inflowCopilotColor,
        fill: "var(--color-copilot)",
      },
      {
        key: "manual",
        name: "Manual",
        amount: "9.8k",
        share: 12.8,
        color: inflowManualColor,
        fill: "var(--color-manual)",
      },
    ],
  },
  {
    value: "year",
    label: "Year",
    total: "812k",
    headline: "Network Flow",
    description: "Decisions across six facilities",
    delta: "+21.5%",
    funds: [
      {
        key: "autopilot",
        name: "Autopilot",
        amount: "428k",
        share: 52.7,
        color: inflowAutopilotColor,
        fill: "var(--color-autopilot)",
      },
      {
        key: "copilot",
        name: "Copilot",
        amount: "224k",
        share: 27.6,
        color: inflowCopilotColor,
        fill: "var(--color-copilot)",
      },
      {
        key: "manual",
        name: "Manual",
        amount: "103k",
        share: 12.7,
        color: inflowManualColor,
        fill: "var(--color-manual)",
      },
    ],
  },
]

export const FULFILLMENT_ROWS: FulfillmentException[] = [
  {
    id: "row-1001",
    reference: "NSC-84721",
    customer: "Avery Outdoor",
    email: "ops@averyoutdoor.example",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&dpr=2&q=80",
    initials: "AO",
    lane: "Chicago to Austin",
    facility: "ORD-2",
    stage: "Carrier tender",
    promise: "Today 18:00",
    slaMinutes: 42,
    automation: "Copilot",
    owner: "Maya Singh",
    units: 480,
    value: 38240,
    risk: "Carrier capacity is tight after midday cutoff",
    status: "At Risk",
  },
  {
    id: "row-1002",
    reference: "NSC-84734",
    customer: "Field & Frame",
    email: "priority@fieldframe.example",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=96&h=96&dpr=2&q=80",
    initials: "FF",
    lane: "Dallas to Phoenix",
    facility: "DFW-1",
    stage: "Pick wave",
    promise: "Today 16:30",
    slaMinutes: 88,
    automation: "Autopilot",
    owner: "Leo Martins",
    units: 310,
    value: 21480,
    risk: "Wave optimized by carton density",
    status: "On Time",
  },
  {
    id: "row-1003",
    reference: "NSC-84755",
    customer: "MetroFit Labs",
    email: "ops@metrofit.example",
    avatar:
      "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=96&h=96&dpr=2&q=80",
    initials: "ML",
    lane: "Newark to Boston",
    facility: "EWR-3",
    stage: "Inventory hold",
    promise: "Today 15:15",
    slaMinutes: -24,
    automation: "Manual",
    owner: "Nora Albright",
    units: 126,
    value: 18760,
    risk: "Lot trace requires human release",
    status: "Blocked",
  },
  {
    id: "row-1004",
    reference: "NSC-84763",
    customer: "Northline Studio",
    email: "returns@northline.example",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=96&h=96&dpr=2&q=80",
    initials: "NS",
    lane: "Los Angeles to Seattle",
    facility: "LAX-4",
    stage: "Packing",
    promise: "Today 19:45",
    slaMinutes: 114,
    automation: "Autopilot",
    owner: "Leo Martins",
    units: 840,
    value: 52210,
    risk: "Packing line is running above plan",
    status: "On Time",
  },
  {
    id: "row-1005",
    reference: "NSC-84801",
    customer: "Urban Pantry",
    email: "supply@urbanpantry.example",
    avatar:
      "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=96&h=96&dpr=2&q=80",
    initials: "UP",
    lane: "Atlanta to Miami",
    facility: "ATL-2",
    stage: "Cold chain",
    promise: "Today 17:00",
    slaMinutes: 9,
    automation: "Copilot",
    owner: "Maya Singh",
    units: 212,
    value: 30440,
    risk: "Reefer handoff needs confirmation",
    status: "Delayed",
  },
  {
    id: "row-1006",
    reference: "NSC-84819",
    customer: "Glow Market",
    email: "vip@glowmarket.example",
    avatar:
      "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=96&h=96&dpr=2&q=80",
    initials: "GM",
    lane: "Las Vegas to Denver",
    facility: "LAS-1",
    stage: "Labeling",
    promise: "Tomorrow 09:20",
    slaMinutes: 312,
    automation: "Autopilot",
    owner: "Nora Albright",
    units: 94,
    value: 10920,
    risk: "No current risk",
    status: "On Time",
  },
  {
    id: "row-1007",
    reference: "NSC-84827",
    customer: "Ridge Supply",
    email: "buyers@ridgesupply.example",
    avatar:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=96&h=96&dpr=2&q=80",
    initials: "RS",
    lane: "Portland to San Jose",
    facility: "PDX-1",
    stage: "Split shipment",
    promise: "Today 20:00",
    slaMinutes: 36,
    automation: "Copilot",
    owner: "Maya Singh",
    units: 176,
    value: 14680,
    risk: "Two SKUs short at primary node",
    status: "At Risk",
  },
  {
    id: "row-1008",
    reference: "NSC-84842",
    customer: "Casa Verde",
    email: "storeops@casaverde.example",
    avatar:
      "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=96&h=96&dpr=2&q=80",
    initials: "CV",
    lane: "Nashville to Charlotte",
    facility: "BNA-2",
    stage: "Dock queue",
    promise: "Today 14:30",
    slaMinutes: -51,
    automation: "Manual",
    owner: "Nora Albright",
    units: 265,
    value: 22750,
    risk: "Outbound door is constrained",
    status: "Delayed",
  },
  {
    id: "row-1009",
    reference: "NSC-84864",
    customer: "Beacon Cycle",
    email: "logistics@beaconcycle.example",
    avatar:
      "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=96&h=96&dpr=2&q=80",
    initials: "BC",
    lane: "Columbus to Pittsburgh",
    facility: "CMH-1",
    stage: "Fraud review",
    promise: "Tomorrow 11:45",
    slaMinutes: 510,
    automation: "Manual",
    owner: "Maya Singh",
    units: 58,
    value: 8920,
    risk: "Payment review blocks release",
    status: "Blocked",
  },
  {
    id: "row-1010",
    reference: "NSC-84888",
    customer: "Aster Goods",
    email: "ops@astergoods.example",
    avatar:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=96&h=96&dpr=2&q=80",
    initials: "AG",
    lane: "Reno to Salt Lake City",
    facility: "RNO-1",
    stage: "Manifest",
    promise: "Today 22:15",
    slaMinutes: 177,
    automation: "Autopilot",
    owner: "Leo Martins",
    units: 390,
    value: 19340,
    risk: "Manifest is ready for carrier scan",
    status: "On Time",
  },
]

export function fulfillmentSearchBlob(row: FulfillmentException): string {
  return [
    row.reference,
    row.customer,
    row.email,
    row.lane,
    row.facility,
    row.stage,
    row.promise,
    row.automation,
    row.owner,
    row.risk,
    row.status,
    String(row.units),
    String(row.value),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}