import { Badge } from "@/components/reui/badge"

import { Button } from "@/components/ui/button"
import { Item, ItemMedia } from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { type OrderMetric } from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { TradeUpIcon, TradeDownIcon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons"

function MetricTrendBadge({
  direction,
  value,
}: {
  direction: OrderMetric["trendDirection"]
  value: string
}) {
  const isUp = direction === "up"

  return (
    <Badge variant={isUp ? "success-light" : "destructive-light"}>
      {isUp ? (
        <HugeiconsIcon icon={TradeUpIcon} strokeWidth={2} aria-hidden="true" />
      ) : (
        <HugeiconsIcon icon={TradeDownIcon} strokeWidth={2} aria-hidden="true" />
      )}
      {value}
    </Badge>
  )
}

export function MetricRow({
  metric,
  showSeparator,
}: {
  metric: OrderMetric
  showSeparator: boolean
}) {
  return (
    <li>
      <div className="flex items-center gap-2 px-4 py-4">
        <Item className="border-background bg-muted [&_svg]:text-accent-foreground flex size-10.5 shrink-0 items-center justify-center border-3 p-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] dark:border [&_svg]:size-4.5 [&_svg]:opacity-70">
          <ItemMedia variant="icon" className="size-auto">
            {metric.icon}
          </ItemMedia>
        </Item>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-1.5">
            <p className="text-foreground text-xl leading-none font-semibold">
              {metric.value}
              {metric.suffix ? (
                <span className="text-muted-foreground/45">
                  {" "}
                  {metric.suffix}
                </span>
              ) : null}
            </p>
            <MetricTrendBadge
              direction={metric.trendDirection}
              value={metric.trend}
            />
          </div>
          <p className="text-muted-foreground text-xs leading-4">
            {metric.label}
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          aria-label={`Open ${metric.label} details`}
        >
          <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} aria-hidden="true" className="opacity-60" />
        </Button>
      </div>
      {showSeparator ? <Separator /> : null}
    </li>
  )
}