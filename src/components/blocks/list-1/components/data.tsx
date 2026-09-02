"use client"

import { type ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ShoppingCart01Icon, Wallet01Icon, Invoice01Icon, Analytics01Icon } from "@hugeicons/core-free-icons"

export type MetricTrendDirection = "up" | "down"

export interface OrderMetric {
  label: string
  value: string
  suffix?: string
  trend: string
  trendDirection: MetricTrendDirection
  icon: ReactNode
}

export const orderMetrics: OrderMetric[] = [
  {
    label: "Total Orders",
    value: "1,246",
    trend: "23.08%",
    trendDirection: "up",
    icon: (
      <HugeiconsIcon icon={ShoppingCart01Icon} strokeWidth={2} aria-hidden="true" />
    ),
  },
  {
    label: "Net Spend",
    value: "$89.3",
    suffix: "k",
    trend: "3.82%",
    trendDirection: "up",
    icon: (
      <HugeiconsIcon icon={Wallet01Icon} strokeWidth={2} aria-hidden="true" />
    ),
  },
  {
    label: "Avg. Basket Value",
    value: "$68.1",
    trend: "0.39%",
    trendDirection: "down",
    icon: (
      <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} aria-hidden="true" />
    ),
  },
  {
    label: "Account Balance",
    value: "$2.3",
    suffix: "k",
    trend: "1.04%",
    trendDirection: "up",
    icon: (
      <HugeiconsIcon icon={Analytics01Icon} strokeWidth={2} aria-hidden="true" />
    ),
  },
]