import { Frame, FramePanel } from "@/components/reui/frame"

import { cn } from "@/lib/utils"
import { Item, ItemMedia } from "@/components/ui/item"

import { FULFILLMENT_CARDS, type FulfillmentCard } from "./data"

function CardItem({ card }: { card: FulfillmentCard }) {
  return (
    <FramePanel>
      {/* Heading */}
      <div className="flex items-center gap-2.5">
        <Item
          className={cn(
            "p-0",
            "border-background flex size-10 items-center justify-center border-2 [background-image:radial-gradient(48.05%_48.05%_at_50%_5.95%,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0)_100%)] shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] dark:border [&_svg]:size-5 [&_svg]:text-white",
            card.iconBg
          )}
        >
          <ItemMedia variant="icon" className="size-auto">
            {card.icon}
          </ItemMedia>
        </Item>
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-sm leading-tight">
            {card.typeLabel}
          </p>
          <h3 className="text-sm leading-tight font-medium">{card.title}</h3>
        </div>
      </div>
      <div className="mt-5 space-y-1.5">
        <p className="text-muted-foreground text-sm leading-tight">
          {card.metricLabel}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xl font-medium tracking-tight">
            {card.balance}
          </span>
          <span
            className={cn(
              "text-sm font-medium",
              card.change.positive ? "text-teal-600" : "text-rose-600"
            )}
          >
            {card.change.percent} ({card.change.amount})
          </span>
        </div>
      </div>
    </FramePanel>
  )
}

export function Chart() {
  return (
    <Frame className="@container w-full">
      {/* Grid */}
      <div className="grid gap-1 @2xl:grid-cols-2 @5xl:grid-cols-4">
        {FULFILLMENT_CARDS.map((card) => (
          <CardItem key={card.title} card={card} />
        ))}
      </div>
    </Frame>
  )
}