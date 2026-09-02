import { type ReactNode } from "react"
import { type BadgeProps } from "@/components/reui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, InformationCircleIcon, SmartPhone01Icon, Mail01Icon, Calendar04Icon, File02Icon, CheckmarkSquare02Icon } from "@hugeicons/core-free-icons"

// ── Toast icons ──
// Success toasts use a green check; info toasts use a muted icon. A destructive
// toast would use the same alert glyph with text-destructive.

export const TOAST_SUCCESS_ICON = (
  <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-[18px] text-green-600" aria-hidden="true" />
)

export const TOAST_INFO_ICON = (
  <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="text-muted-foreground size-[18px]" aria-hidden="true" />
)

// ── Activity types ───────────────────────────────────────────────────────────

export type ActivityType = "call" | "email" | "meeting" | "note" | "task"

export interface IOption {
  value: string
  label: string
}

// "all" sits first; the rest mirror ActivityType order.
export const TYPE_FILTER_OPTIONS: IOption[] = [
  { value: "all", label: "All" },
  { value: "call", label: "Calls" },
  { value: "email", label: "Emails" },
  { value: "meeting", label: "Meetings" },
  { value: "note", label: "Notes" },
  { value: "task", label: "Tasks" },
]

// Icon node per activity type (full IconPlaceholder mapping kept inline).
export const activityTypeIcon: Record<ActivityType, ReactNode> = {
  call: (
    <HugeiconsIcon icon={SmartPhone01Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
  ),
  email: (
    <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
  ),
  meeting: (
    <HugeiconsIcon icon={Calendar04Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
  ),
  note: (
    <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
  ),
  task: (
    <HugeiconsIcon icon={CheckmarkSquare02Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
  ),
}

export const activityTypeLabel: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  task: "Task",
}

// ── Outcome badges (semantic) ────────────────────────────────────────────────

export type ActivityOutcome =
  | "connected"
  | "voicemail"
  | "no-answer"
  | "replied"
  | "deal-won"
  | "stage-moved"
  | "scheduled"
  | "logged"

export const outcomeLabel: Record<ActivityOutcome, string> = {
  connected: "Connected",
  voicemail: "Voicemail",
  "no-answer": "No answer",
  replied: "Replied",
  "deal-won": "Won",
  "stage-moved": "Moved",
  scheduled: "Scheduled",
  logged: "Logged",
}

// One typed source of truth for outcome tone.
export const outcomeVariant: Record<ActivityOutcome, BadgeProps["variant"]> = {
  connected: "success-light",
  voicemail: "secondary",
  "no-answer": "warning-light",
  replied: "success-light",
  "deal-won": "success-light",
  "stage-moved": "primary-light",
  scheduled: "primary-light",
  logged: "secondary",
}

export const outcomeDotClass: Record<ActivityOutcome, string> = {
  connected: "bg-success",
  voicemail: "bg-muted-foreground/60",
  "no-answer": "bg-warning",
  replied: "bg-success",
  "deal-won": "bg-success",
  "stage-moved": "bg-primary",
  scheduled: "bg-primary",
  logged: "bg-muted-foreground/60",
}

// ── Day buckets ──────────────────────────────────────────────────────────────

export type BucketKey = "today" | "yesterday" | "this-week" | "earlier"

export const bucketLabel: Record<BucketKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "this-week": "This week",
  earlier: "Earlier",
}

export const BUCKET_ORDER: BucketKey[] = [
  "today",
  "yesterday",
  "this-week",
  "earlier",
]

// ── Owners (shared CRM world, sex-matched portraits) ─────────────────────────

export type Owner = {
  id: string
  name: string
  role: string
  avatar: string
}

export const OWNERS: Record<string, Owner> = {
  "mira-stone": {
    id: "mira-stone",
    name: "Mira Stone",
    role: "Account Executive",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
  },
  "leo-grant": {
    id: "leo-grant",
    name: "Leo Grant",
    role: "Account Executive",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
  },
  "nora-vale": {
    id: "nora-vale",
    name: "Nora Vale",
    role: "Sales Manager",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
  },
  "sana-qureshi": {
    id: "sana-qureshi",
    name: "Sana Qureshi",
    role: "Account Executive",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&dpr=2&q=80",
  },
  "emma-wilson": {
    id: "emma-wilson",
    name: "Emma Wilson",
    role: "Sales Development Rep",
    avatar:
      "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=96&h=96&dpr=2&q=80",
  },
}

export const OWNER_FILTER_OPTIONS: IOption[] = [
  { value: "all", label: "All owners" },
  { value: "mira-stone", label: "Mira Stone" },
  { value: "leo-grant", label: "Leo Grant" },
  { value: "nora-vale", label: "Nora Vale" },
  { value: "sana-qureshi", label: "Sana Qureshi" },
  { value: "emma-wilson", label: "Emma Wilson" },
]

// ── Activity model ───────────────────────────────────────────────────────────

export type Activity = {
  id: string
  bucket: BucketKey
  type: ActivityType
  outcome: ActivityOutcome
  title: string
  account: string
  deal: string
  time: string
  ref: string
  detail: string
  ownerId: string
}

export const ACTIVITIES: Activity[] = [
  {
    id: "act-2841",
    bucket: "today",
    type: "call",
    outcome: "connected",
    title: "Budget Call",
    account: "Brightwave Media",
    deal: "Pro Annual",
    time: "9:12 AM",
    ref: "ACT-2841",
    detail: "Budget approved and RevOps joined security review.",
    ownerId: "mira-stone",
  },
  {
    id: "act-2840",
    bucket: "today",
    type: "email",
    outcome: "replied",
    title: "Pricing Reply",
    account: "Apex Manufacturing",
    deal: "Growth Plan",
    time: "8:47 AM",
    ref: "ACT-2840",
    detail: "Apex requested net-45 and three seats.",
    ownerId: "leo-grant",
  },
  {
    id: "act-2839",
    bucket: "today",
    type: "task",
    outcome: "deal-won",
    title: "Closed Won",
    account: "Cobalt Logistics",
    deal: "Pro Annual",
    time: "8:05 AM",
    ref: "ACT-2839",
    detail: "Order signed. Onboarding starts Monday.",
    ownerId: "nora-vale",
  },
  {
    id: "act-2836",
    bucket: "yesterday",
    type: "meeting",
    outcome: "stage-moved",
    title: "Vertex Demo",
    account: "Vertex Health",
    deal: "Enterprise Plan",
    time: "4:30 PM",
    ref: "ACT-2836",
    detail: "Six stakeholders moved the deal to Proposal.",
    ownerId: "sana-qureshi",
  },
  {
    id: "act-2834",
    bucket: "yesterday",
    type: "call",
    outcome: "voicemail",
    title: "Voicemail Left",
    account: "Meridian Retail",
    deal: "Growth Plan",
    time: "2:18 PM",
    ref: "ACT-2834",
    detail: "VP Sales missed. Thursday follow-up queued.",
    ownerId: "emma-wilson",
  },
  {
    id: "act-2832",
    bucket: "today",
    type: "note",
    outcome: "logged",
    title: "Risk Note",
    account: "Cedar & Co",
    deal: "Pro Annual",
    time: "7:40 AM",
    ref: "ACT-2832",
    detail: "Finance needs a second contact this week.",
    ownerId: "mira-stone",
  },
  {
    id: "act-2828",
    bucket: "this-week",
    type: "email",
    outcome: "replied",
    title: "Quote Accepted",
    account: "Atlas Freight",
    deal: "Growth Plan",
    time: "Tue 5:02 PM",
    ref: "ACT-2828",
    detail: "Atlas accepted. Order form is ready.",
    ownerId: "leo-grant",
  },
  {
    id: "act-2825",
    bucket: "this-week",
    type: "task",
    outcome: "scheduled",
    title: "Renewal Review",
    account: "Orbit Software",
    deal: "Enterprise Plan",
    time: "Tue 10:15 AM",
    ref: "ACT-2825",
    detail: "Renewal review booked with usage growth data.",
    ownerId: "nora-vale",
  },
  {
    id: "act-2821",
    bucket: "this-week",
    type: "call",
    outcome: "no-answer",
    title: "Call Missed",
    account: "Quanta Devices",
    deal: "Growth Plan",
    time: "Mon 3:44 PM",
    ref: "ACT-2821",
    detail: "Third call missed. Email sequence starts today.",
    ownerId: "sana-qureshi",
  },
  {
    id: "act-2817",
    bucket: "earlier",
    type: "meeting",
    outcome: "stage-moved",
    title: "Procurement Call",
    account: "Ridgeline Energy",
    deal: "Enterprise Plan",
    time: "Jun 11",
    ref: "ACT-2817",
    detail: "Redlines reviewed. Close forecast moved to 75%.",
    ownerId: "mira-stone",
  },
  {
    id: "act-2814",
    bucket: "earlier",
    type: "email",
    outcome: "replied",
    title: "Intro Reply",
    account: "Summit Financial",
    deal: "Growth Plan",
    time: "Jun 10",
    ref: "ACT-2814",
    detail: "Discovery booked from a referral reply.",
    ownerId: "emma-wilson",
  },
  {
    id: "act-2809",
    bucket: "earlier",
    type: "note",
    outcome: "logged",
    title: "Discovery Note",
    account: "Harbor Labs",
    deal: "Pro Annual",
    time: "Jun 9",
    ref: "ACT-2809",
    detail: "SSO and audit logs are required.",
    ownerId: "leo-grant",
  },
]