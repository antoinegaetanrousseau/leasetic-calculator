import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameFooter,
  FramePanel,
} from "@/components/reui/frame"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  PERFORMANCE_RANGE_OPTIONS,
  SHIFT_ACTIVITY,
  SHIFT_PERFORMANCE,
  SHIFT_PIPELINE_PROGRESS,
} from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { TradeUpIcon, TradeDownIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"

export function InvestorCard() {
  return (
    <Frame className="h-full w-full">
      {/* Content */}
      <FramePanel>
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex flex-col gap-px">
            <h3 className="text-base font-semibold">Shift Performance</h3>
          </div>
          <div className="flex items-center gap-2">
            <Select defaultValue="today" items={PERFORMANCE_RANGE_OPTIONS}>
              <SelectTrigger className="h-8! w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                align="start"
                alignItemWithTrigger={false}
                className="w-28"
              >
                {PERFORMANCE_RANGE_OPTIONS.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {SHIFT_PERFORMANCE.map((item) => (
              <div
                className="flex flex-col items-start justify-start"
                key={item.label}
              >
                <div className="text-foreground text-xl font-bold">
                  {item.value}
                </div>
                <div className="text-muted-foreground mb-1 text-xs font-medium">
                  {item.label}
                </div>
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-semibold [&_svg]:h-3 [&_svg]:w-3",
                    item.trend === "positive"
                      ? "text-emerald-500"
                      : "text-destructive"
                  )}
                >
                  {item.trend === "positive" ? (
                    <HugeiconsIcon icon={TradeUpIcon} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <HugeiconsIcon icon={TradeDownIcon} strokeWidth={2} aria-hidden="true" />
                  )}
                  {item.delta}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-foreground text-sm font-medium">
                Pipeline Progress
              </span>
              <span className="text-foreground text-xs font-semibold">
                {SHIFT_PIPELINE_PROGRESS}%
              </span>
            </div>
            <Progress
              value={SHIFT_PIPELINE_PROGRESS}
              className="h-1! **:data-[slot=progress-track]:h-1"
            />
          </div>

          <Separator />

          <div>
            <div className="text-foreground mb-2.5 text-sm font-medium">
              Recent Activity
            </div>
            <ul className="space-y-2">
              {SHIFT_ACTIVITY.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-center justify-between gap-2.5 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className={cn(
                                                  "h-3.5 w-3.5 shrink-0",
                                                  activity.tone === "success" && "text-emerald-500",
                                                  activity.tone === "info" && "text-sky-500",
                                                  activity.tone === "warning" && "text-amber-500"
                                                )} aria-hidden="true" />
                    <span className="text-foreground truncate text-xs">
                      {activity.title}
                    </span>
                  </span>
                  <Badge
                    variant={
                      activity.tone === "success"
                        ? "success-light"
                        : activity.tone === "info"
                          ? "info-light"
                          : "warning-light"
                    }
                    className="shrink-0"
                  >
                    {activity.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </FramePanel>
      {/* Footer */}
      <FrameFooter className="flex-row items-center gap-2.5 p-2!">
        <Button variant="outline" className="flex-1">
          Schedule
        </Button>
        <Button className="flex-1">Full Report</Button>
      </FrameFooter>
    </Frame>
  )
}