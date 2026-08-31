"use client"

import { type ReactNode } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  BILLING_SPEND_CARDS,
  type BillingSpendCard,
  type SummaryMetric,
} from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { CreditCardIcon, UserMultiple02Icon, CalendarCheckIn01Icon } from "@hugeicons/core-free-icons"

export function ProfileSummaryFrame({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: SummaryMetric[]
}) {
  return (
    <Frame spacing="sm">
      {/* Header */}
      <FrameHeader>
        <FrameTitle className="capitalize">{title}</FrameTitle>
        <FrameDescription>{description}</FrameDescription>
      </FrameHeader>

      {/* Content */}
      <FramePanel className="space-y-3">
        <ProfileSummaryList items={items} />
      </FramePanel>
    </Frame>
  )
}

function ProfileSummaryList({ items }: { items: SummaryMetric[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id} className="space-y-3">
          {index > 0 ? <Separator /> : null}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">{item.label}</p>
              <p className="mt-1 text-sm font-medium">{item.value}</p>
              {item.detail ? (
                <p className="text-muted-foreground mt-1 text-sm leading-5">
                  {item.detail}
                </p>
              ) : null}
            </div>

            {item.badge ? (
              <Badge variant={item.badge.variant} size="sm">
                {item.badge.label}
              </Badge>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function getBillingSummaryIcon(id: BillingSpendCard["id"]): ReactNode {
  switch (id) {
    case "spend":
      return (
        <HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} aria-hidden="true" className="size-3.5" />
      )
    case "seats":
      return (
        <HugeiconsIcon icon={UserMultiple02Icon} strokeWidth={2} aria-hidden="true" className="size-3.5" />
      )
    case "invoice":
      return (
        <HugeiconsIcon icon={CalendarCheckIn01Icon} strokeWidth={2} aria-hidden="true" className="size-3.5" />
      )
  }
}

export function BillingSummaryFrame() {
  return (
    <Frame spacing="sm" className="@container">
      {/* Header */}
      <FrameHeader>
        <FrameTitle className="capitalize">Billing summary</FrameTitle>
        <FrameDescription>Plan, seats, and invoice.</FrameDescription>
      </FrameHeader>

      {/* Content */}
      <FramePanel className="border-border grid auto-rows-fr grid-cols-1 overflow-hidden border-t p-0! md:grid-cols-3">
        {BILLING_SPEND_CARDS.map((card) => (
          <div
            key={card.id}
            className="border-border flex h-full min-w-0 flex-col gap-3 border-b p-5 last:border-b-0 md:border-b-0 md:border-l first:md:border-l-0"
          >
            <div className="space-y-2.5">
              <div className="space-y-1">
                <p className="text-sm font-medium">{card.title}</p>
                <p className="text-muted-foreground text-xs">{card.subtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl font-semibold tracking-tight">
                  {card.value}
                </span>
                <Badge variant={card.badge.variant} size="sm">
                  {getBillingSummaryIcon(card.id)}
                  {card.badge.label}
                </Badge>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-muted-foreground text-sm leading-5">
                {card.detail}
              </p>
            </div>
          </div>
        ))}
      </FramePanel>

      <FrameFooter className="flex-row justify-end gap-2">
        <Button type="button" variant="outline">
          Download statement
        </Button>
        <Button type="button" variant="outline">
          Review invoices
        </Button>
      </FrameFooter>
    </Frame>
  )
}