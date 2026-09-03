import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"

import { Separator } from "@/components/ui/separator"

import { type SummaryMetric } from "./data"

export function MemberSummaryFrame({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: SummaryMetric[]
}) {
  return (
    <Frame spacing="sm" className="text-foreground">
      {/* Header */}
      <FrameHeader>
        <FrameTitle className="capitalize">{title}</FrameTitle>
        <FrameDescription className="dark:text-foreground/70">
          {description}
        </FrameDescription>
      </FrameHeader>

      {/* Content */}
      <FramePanel className="space-y-3">
        <MemberSummaryList items={items} />
      </FramePanel>
    </Frame>
  )
}

function MemberSummaryList({ items }: { items: SummaryMetric[] }) {
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
              <Badge variant={item.badge.variant}>{item.badge.label}</Badge>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}