import { Frame, FramePanel } from "@/components/reui/frame"
import { Cell, Pie, PieChart } from "recharts"

import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  allocationMemberCount,
  allocationMembers,
  allocationPeriods,
  inflowChartConfig,
  inflowPeriods,
  SEGMENT_COUNT,
  type AllocationPeriod,
  type InflowFund,
  type InflowPeriod,
} from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { InformationCircleIcon } from "@hugeicons/core-free-icons"

const segments = Array.from({ length: SEGMENT_COUNT }, (_, index) => index)

const CHART_REVEAL_STYLE = `
@keyframes dashboard-1-flow-reveal-up {
  from {
    clip-path: inset(100% 0 0 0);
    opacity: 0.75;
  }
  to {
    clip-path: inset(0 0 0 0);
    opacity: 1;
  }
}

.dashboard-1-flow-reveal-up {
  animation: dashboard-1-flow-reveal-up 680ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-1-flow-reveal-up {
    animation: none;
    clip-path: none;
    opacity: 1;
  }
}
`

function AllocationMeter({ period }: { period: AllocationPeriod }) {
  return (
    <div
      aria-label={`${period.label} capacity allocation is ${period.allocation}`}
      className="flex h-7 w-full items-stretch justify-between"
      role="img"
    >
      {segments.map((segment) => (
        <span
          aria-hidden="true"
          key={segment}
          className={cn(
            "h-full w-1 shrink-0 rounded-full",
            segment < period.filledSegments ? "bg-success" : "bg-muted"
          )}
        />
      ))}
    </div>
  )
}

function MemberStack() {
  return (
    <div className="flex items-center gap-2">
      <AvatarGroup className="-space-x-2">
        {allocationMembers.map((member) => (
          <Avatar key={member.name} className="size-6">
            {member.avatar ? (
              <AvatarImage src={member.avatar} alt={member.name} />
            ) : null}
            <AvatarFallback className="bg-background text-xs font-medium">
              {member.initials}
            </AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
      <span className="text-muted-foreground text-xs whitespace-nowrap">
        {allocationMemberCount} Members
      </span>
    </div>
  )
}

function AllocationChart() {
  return (
    <Frame className="@container h-full w-full">
      <FramePanel>
        <Tabs
          defaultValue={allocationPeriods[0].value}
          className="h-full w-full min-w-0 gap-4"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="text-sm font-medium">Capacity Allocation</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className="text-muted-foreground/70 hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex shrink-0 rounded-full p-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        aria-label="Capacity Allocation info"
                      />
                    }
                  >
                    <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-3.5" aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-56 px-2.5 py-1.5 text-xs leading-5"
                  >
                    Fulfillment capacity by selected period.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <TabsList>
              {allocationPeriods.map((period) => (
                <TabsTrigger key={period.value} value={period.value}>
                  {period.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {allocationPeriods.map((period) => (
            <TabsContent
              key={period.value}
              value={period.value}
              className="mt-0"
            >
              <div className="flex flex-col gap-4">
                {/* Metric */}
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[26px] font-medium">
                    {period.allocation}
                  </span>
                  <span className="text-success text-xs font-medium">
                    {period.delta}
                  </span>
                  <span className="text-muted-foreground/70 text-xs">
                    {period.comparison}
                  </span>
                </div>

                {/* Chart */}
                <AllocationMeter period={period} />

                {/* Footer */}
                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                  <p>
                    <span className="text-muted-foreground/70 text-xs">
                      Queued Orders:
                    </span>{" "}
                    <span className="text-sm font-medium">
                      {period.exposure}
                    </span>
                  </p>
                  <MemberStack />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </FramePanel>
    </Frame>
  )
}

type DonutSlice =
  | InflowFund
  | {
      key: "reserve"
      name: string
      amount: string
      share: number
      color: string
      fill: string
    }

function getDonutData(period: InflowPeriod) {
  const trackedShare = period.funds.reduce(
    (total, fund) => total + fund.share,
    0
  )
  const reserveShare = Math.max(100 - trackedShare, 0)

  return [
    ...period.funds,
    {
      key: "reserve",
      name: "Reserve Capacity",
      amount: "",
      share: reserveShare,
      color: "var(--muted)",
      fill: "var(--color-reserve)",
    },
  ] satisfies DonutSlice[]
}

function ChartTooltipFormatter(item: unknown) {
  const fund = item as DonutSlice
  const value = fund.key === "reserve" ? `${fund.share}%` : fund.amount

  return (
    <div className="flex min-w-40 items-center justify-between gap-6">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: fund.color }}
        />
        <span className="text-muted-foreground truncate">{fund.name}</span>
      </div>
      <span className="text-foreground font-medium tabular-nums">{value}</span>
    </div>
  )
}

function InfoTooltip() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label="About Decision Flow"
            className="text-muted-foreground/70 -my-1"
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} aria-hidden="true" className="text-sm" data-icon="inline-start" />
          </Button>
        }
      />
      <TooltipContent side="top" sideOffset={8}>
        <p>Tracked decisions entering fulfillment lanes.</p>
      </TooltipContent>
    </Tooltip>
  )
}

function InflowDonut({ period }: { period: InflowPeriod }) {
  const chartData = getDonutData(period)

  return (
    <div className="dashboard-1-flow-reveal-up relative size-[8.25rem] shrink-0">
      <ChartContainer
        aria-label={`Decision Flow: ${period.total} total for ${period.label}`}
        className="aspect-square size-[8.25rem]"
        config={inflowChartConfig}
        initialDimension={{ width: 132, height: 132 }}
      >
        <PieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <ChartTooltip
            cursor={false}
            wrapperStyle={{ zIndex: 30 }}
            content={
              <ChartTooltipContent
                hideLabel
                hideIndicator
                formatter={(_value, _name, item) =>
                  ChartTooltipFormatter(item.payload)
                }
              />
            }
          />
          <Pie
            data={chartData}
            dataKey="share"
            endAngle={-230}
            innerRadius={47}
            isAnimationActive={false}
            nameKey="name"
            outerRadius={62}
            paddingAngle={1}
            cornerRadius={3}
            startAngle={130}
            stroke="var(--background)"
            strokeWidth={2}
          >
            {chartData.map((item) => (
              <Cell key={item.key} fill={item.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="bg-background/90 border-border/70 flex size-[5.25rem] flex-col items-center justify-center rounded-full border border-dashed">
          <span className="text-muted-foreground/70 text-xs">Flow</span>
          <span className="mt-0.5 text-sm font-semibold">{period.total}</span>
        </div>
      </div>
    </div>
  )
}

function InflowLegend({ period }: { period: InflowPeriod }) {
  return (
    <ul className="flex min-w-0 flex-1 flex-col">
      {period.funds.map((fund, index) => (
        <li key={fund.key}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="border-background size-3 shrink-0 rounded-full border-2 shadow-sm"
                style={{ backgroundColor: fund.color }}
              />
              <span className="text-sm font-medium">{fund.name}</span>
            </div>
            <span className="text-sm font-medium">{fund.amount}</span>
            <span className="text-muted-foreground/70 w-8 text-right text-xs">
              {fund.share}%
            </span>
          </div>
          {index < period.funds.length - 1 ? (
            <Separator className="w-auto" />
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function InflowPeriodPanel({ period }: { period: InflowPeriod }) {
  return (
    <div className="grid gap-6 @sm:grid-cols-[8.25rem_minmax(0,1fr)] @sm:items-center">
      <InflowDonut period={period} />
      <InflowLegend period={period} />
    </div>
  )
}

function InflowChart() {
  return (
    <TooltipProvider delay={150}>
      <style>{CHART_REVEAL_STYLE}</style>
      <Frame className="@container h-full w-full">
        <FramePanel className="ps-3.5! pe-5! pt-5! pb-3.5!">
          <Tabs defaultValue="week" className="gap-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-0.5 ps-1.5">
                <h2 className="text-sm font-medium">Decision Flow</h2>
                <InfoTooltip />
              </div>

              <TabsList className="w-full @sm:w-auto">
                {inflowPeriods.map((period) => (
                  <TabsTrigger key={period.value} value={period.value}>
                    {period.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Content */}
            {inflowPeriods.map((period) => (
              <TabsContent
                key={period.value}
                value={period.value}
                className="mt-0"
              >
                <InflowPeriodPanel period={period} />
              </TabsContent>
            ))}
          </Tabs>
        </FramePanel>
      </Frame>
    </TooltipProvider>
  )
}

export function Chart() {
  return (
    <div className="@container grid h-full w-full min-w-0 auto-rows-fr gap-3">
      <AllocationChart />
      <InflowChart />
    </div>
  )
}