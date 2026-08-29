"use client"

import { type ReactNode } from "react"

import { AnthropicBlack } from "@/components/ui/svgs/anthropicBlack"
import { AnthropicWhite } from "@/components/ui/svgs/anthropicWhite"
import { Discord } from "@/components/ui/svgs/discord"
import { Neon } from "@/components/ui/svgs/neon"
import { Openai } from "@/components/ui/svgs/openai"
import { OpenaiDark } from "@/components/ui/svgs/openaiDark"
import { Planetscale } from "@/components/ui/svgs/planetscale"
import { PlanetscaleDark } from "@/components/ui/svgs/planetscaleDark"
import { Redis } from "@/components/ui/svgs/redis"
import { ResendIconBlack } from "@/components/ui/svgs/resendIconBlack"
import { ResendIconWhite } from "@/components/ui/svgs/resendIconWhite"
import { Stripe } from "@/components/ui/svgs/stripe"
import { Supabase } from "@/components/ui/svgs/supabase"

// ── Types ──

export type ServiceStatus = "easy" | "multi-step"

export interface IService {
  id: string
  name: string
  description: string
  logo: ReactNode
  status: ServiceStatus
}

// ── Logos ──

const OPENAI_LOGO = (
  <>
    <span aria-hidden className="dark:hidden">
      <Openai className="size-6" />
    </span>
    <span aria-hidden className="hidden dark:block">
      <OpenaiDark className="size-6" />
    </span>
  </>
)

const ANTHROPIC_LOGO = (
  <>
    <span aria-hidden className="dark:hidden">
      <AnthropicBlack className="size-6" />
    </span>
    <span aria-hidden className="hidden dark:block">
      <AnthropicWhite className="size-6" />
    </span>
  </>
)

const RESEND_LOGO = (
  <>
    <span aria-hidden className="dark:hidden">
      <ResendIconBlack className="size-6" />
    </span>
    <span aria-hidden className="hidden dark:block">
      <ResendIconWhite className="size-6" />
    </span>
  </>
)

const PLANETSCALE_LOGO = (
  <>
    <span aria-hidden className="dark:hidden">
      <Planetscale className="size-6" />
    </span>
    <span aria-hidden className="hidden dark:block">
      <PlanetscaleDark className="size-6" />
    </span>
  </>
)

// ── Data ──

export const SERVICES: IService[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Payment processing platform for online transactions.",
    logo: <Stripe className="size-6" aria-hidden="true" />,
    status: "easy",
  },
  {
    id: "supabase",
    name: "Supabase",
    description:
      "Open-source Firebase alternative with database and authentication.",
    logo: <Supabase className="size-6" aria-hidden="true" />,
    status: "easy",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "AI models and APIs for building intelligent applications.",
    logo: OPENAI_LOGO,
    status: "easy",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Communication platform for communities with chat and voice.",
    logo: <Discord className="size-6" aria-hidden="true" />,
    status: "easy",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description:
      "AI safety company building reliable and interpretable AI systems.",
    logo: ANTHROPIC_LOGO,
    status: "multi-step",
  },
  {
    id: "resend",
    name: "Resend",
    description:
      "Modern email API built for developers with great deliverability.",
    logo: RESEND_LOGO,
    status: "easy",
  },
  {
    id: "neon",
    name: "Neon",
    description:
      "Serverless Postgres database with branching and auto-scaling.",
    logo: <Neon className="size-6" aria-hidden="true" />,
    status: "multi-step",
  },
  {
    id: "planetscale",
    name: "PlanetScale",
    description:
      "MySQL-compatible serverless database with branching workflows.",
    logo: PLANETSCALE_LOGO,
    status: "multi-step",
  },
  {
    id: "redis",
    name: "Redis",
    description:
      "In-memory data store for caching, messaging, and real-time apps.",
    logo: <Redis className="size-6" aria-hidden="true" />,
    status: "easy",
  },
]