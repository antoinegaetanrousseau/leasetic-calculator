import { type ReactNode } from "react"

import { AnthropicBlack } from "@/components/ui/svgs/anthropicBlack"
import { AnthropicWhite } from "@/components/ui/svgs/anthropicWhite"
import { Dropbox } from "@/components/ui/svgs/dropbox"
import { GithubDark } from "@/components/ui/svgs/githubDark"
import { GithubLight } from "@/components/ui/svgs/githubLight"
import { Google } from "@/components/ui/svgs/google"
import { MicrosoftOneDrive } from "@/components/ui/svgs/microsoftOneDrive"
import { NvidiaIconDark } from "@/components/ui/svgs/nvidiaIconDark"
import { NvidiaIconLight } from "@/components/ui/svgs/nvidiaIconLight"
import { Openai } from "@/components/ui/svgs/openai"
import { OpenaiDark } from "@/components/ui/svgs/openaiDark"
import { Paypal } from "@/components/ui/svgs/paypal"
import { Slack } from "@/components/ui/svgs/slack"
import { Stripe } from "@/components/ui/svgs/stripe"
import { Supabase } from "@/components/ui/svgs/supabase"
import { Zoom } from "@/components/ui/svgs/zoom"

/**
 * CRM deal risk board data adapted from kanban-board-7.
 * Columns, owners, account logos, value, close dates, and confidence live here.
 * Customize: replace DEAL_COLUMNS and INITIAL_DEAL_COLUMNS for your CRM.
 */

export type DealColumnId =
  | "qualified"
  | "discovery"
  | "solutionFit"
  | "security"
  | "procurement"
  | "closedWon"

export type DealSignal = "Blocked" | "Risk" | "Clear"

export type DealPerson = {
  name: string
  title: string
  initials: string
  avatar: string
}

export type DealOpportunity = {
  id: string
  account: string
  productLine: string
  logo: ReactNode
  amount: number
  closeDate: string
  daysToClose: number
  confidence: number
  owner: DealPerson
  signal: DealSignal
}

export type DealColumn = {
  id: DealColumnId
  title: string
  description: string
  dotClassName: string
  addLabel: string
}

function ThemeLogo({ light, dark }: { light: ReactNode; dark: ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className="dark:hidden">
        {light}
      </span>
      <span aria-hidden="true" className="hidden dark:block">
        {dark}
      </span>
    </>
  )
}

export const BOARD_TITLE = "Deal Risk Board"

export const DEAL_COLUMNS: DealColumn[] = [
  {
    id: "qualified",
    title: "Qualified",
    description: "Inbound fit",
    dotClassName: "bg-sky-500 dark:bg-sky-400",
    addLabel: "Add qualified deal",
  },
  {
    id: "discovery",
    title: "Discovery",
    description: "Buyer map",
    dotClassName: "bg-violet-500 dark:bg-violet-400",
    addLabel: "Add discovery deal",
  },
  {
    id: "solutionFit",
    title: "Solution Fit",
    description: "Mutual plan",
    dotClassName: "bg-amber-500 dark:bg-amber-400",
    addLabel: "Add solution fit",
  },
  {
    id: "security",
    title: "Security",
    description: "DPA review",
    dotClassName: "bg-rose-500 dark:bg-rose-400",
    addLabel: "Add security review",
  },
  {
    id: "procurement",
    title: "Procurement",
    description: "Terms and PO",
    dotClassName: "bg-cyan-500 dark:bg-cyan-400",
    addLabel: "Add procurement item",
  },
  {
    id: "closedWon",
    title: "Closed-Won",
    description: "Closed this cycle",
    dotClassName: "bg-emerald-500 dark:bg-emerald-400",
    addLabel: "Add won deal",
  },
]

const PEOPLE = {
  mira: {
    name: "Mira Stone",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
    title: "Enterprise AE",
    initials: "MS",
  },
  leo: {
    name: "Leo Grant",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
    title: "Account Executive",
    initials: "LG",
  },
  nora: {
    name: "Nora Vale",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
    title: "Sales Manager",
    initials: "NV",
  },
  sana: {
    name: "Sana Qureshi",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&dpr=2&q=80",
    title: "Commercial AE",
    initials: "SQ",
  },
  alex: {
    name: "Alex Johnson",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80",
    title: "Solutions AE",
    initials: "AJ",
  },
} satisfies Record<string, DealPerson>

export const INITIAL_DEAL_COLUMNS: Record<DealColumnId, DealOpportunity[]> = {
  qualified: [
    {
      id: "deal-101",
      account: "Google",
      productLine: "Workspace Enterprise",
      logo: <Google aria-hidden="true" className="size-5" />,
      amount: 184000,
      closeDate: "2026-07-15",
      daysToClose: 15,
      confidence: 66,
      owner: PEOPLE.mira,
      signal: "Risk",
    },
    {
      id: "deal-102",
      account: "Zoom",
      productLine: "Contact Center",
      logo: <Zoom aria-hidden="true" className="size-5" />,
      amount: 126000,
      closeDate: "2026-07-21",
      daysToClose: 21,
      confidence: 74,
      owner: PEOPLE.leo,
      signal: "Clear",
    },
    {
      id: "deal-103",
      account: "Dropbox",
      productLine: "Business Advanced",
      logo: <Dropbox aria-hidden="true" className="h-5 w-6" />,
      amount: 158000,
      closeDate: "2026-08-03",
      daysToClose: 34,
      confidence: 71,
      owner: PEOPLE.sana,
      signal: "Clear",
    },
  ],
  discovery: [
    {
      id: "deal-201",
      account: "Slack",
      productLine: "Enterprise Grid",
      logo: <Slack aria-hidden="true" className="size-5" />,
      amount: 342000,
      closeDate: "2026-07-06",
      daysToClose: 6,
      confidence: 32,
      owner: PEOPLE.nora,
      signal: "Blocked",
    },
    {
      id: "deal-202",
      account: "Stripe",
      productLine: "Billing and Tax",
      logo: <Stripe aria-hidden="true" className="size-5" />,
      amount: 278000,
      closeDate: "2026-07-10",
      daysToClose: 10,
      confidence: 42,
      owner: PEOPLE.mira,
      signal: "Blocked",
    },
  ],
  solutionFit: [
    {
      id: "deal-301",
      account: "OpenAI",
      productLine: "Enterprise Workspace",
      logo: (
        <ThemeLogo
          light={<Openai aria-hidden="true" className="size-5" />}
          dark={<OpenaiDark aria-hidden="true" className="size-5" />}
        />
      ),
      amount: 515000,
      closeDate: "2026-07-13",
      daysToClose: 13,
      confidence: 59,
      owner: PEOPLE.alex,
      signal: "Risk",
    },
    {
      id: "deal-302",
      account: "Anthropic",
      productLine: "Claude for Work",
      logo: (
        <ThemeLogo
          light={<AnthropicBlack aria-hidden="true" className="size-5" />}
          dark={<AnthropicWhite aria-hidden="true" className="size-5" />}
        />
      ),
      amount: 228000,
      closeDate: "2026-07-22",
      daysToClose: 22,
      confidence: 64,
      owner: PEOPLE.sana,
      signal: "Risk",
    },
  ],
  security: [
    {
      id: "deal-401",
      account: "GitHub",
      productLine: "Enterprise Cloud",
      logo: (
        <ThemeLogo
          light={<GithubLight aria-hidden="true" className="size-5" />}
          dark={<GithubDark aria-hidden="true" className="size-5" />}
        />
      ),
      amount: 397000,
      closeDate: "2026-07-08",
      daysToClose: 8,
      confidence: 48,
      owner: PEOPLE.leo,
      signal: "Risk",
    },
    {
      id: "deal-402",
      account: "Supabase",
      productLine: "Team Platform",
      logo: <Supabase aria-hidden="true" className="size-5" />,
      amount: 448000,
      closeDate: "2026-07-18",
      daysToClose: 18,
      confidence: 57,
      owner: PEOPLE.nora,
      signal: "Risk",
    },
    {
      id: "deal-403",
      account: "NVIDIA",
      productLine: "AI Enterprise",
      logo: (
        <ThemeLogo
          light={<NvidiaIconLight aria-hidden="true" className="h-4 w-6" />}
          dark={<NvidiaIconDark aria-hidden="true" className="h-4 w-6" />}
        />
      ),
      amount: 302000,
      closeDate: "2026-07-27",
      daysToClose: 27,
      confidence: 72,
      owner: PEOPLE.alex,
      signal: "Clear",
    },
  ],
  procurement: [
    {
      id: "deal-501",
      account: "PayPal",
      productLine: "Payments Platform",
      logo: <Paypal aria-hidden="true" className="size-5" />,
      amount: 305000,
      closeDate: "2026-07-19",
      daysToClose: 19,
      confidence: 61,
      owner: PEOPLE.alex,
      signal: "Risk",
    },
    {
      id: "deal-502",
      account: "Microsoft OneDrive",
      productLine: "Microsoft 365 Storage",
      logo: <MicrosoftOneDrive aria-hidden="true" className="size-5" />,
      amount: 264000,
      closeDate: "2026-08-02",
      daysToClose: 33,
      confidence: 76,
      owner: PEOPLE.sana,
      signal: "Clear",
    },
  ],
  closedWon: [],
}