import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts"

import { Card, CardContent } from "@/components/ui/card"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"

import { forecastData, pipelineData, winRateData } from "./data"

// Business metric cards

const businessCards = [
  {
    title: "Open Pipeline",
    period: "42 open deals",
    value: "$1.94M",
    timestamp: "",
    data: pipelineData,
    color: "var(--color-sky-500)",
    gradientId: "pipelineGradient",
    formatValue: (value: number) => `$${(value / 1000).toFixed(2)}M`,
  },
  {
    title: "Weighted Forecast",
    period: "Next 90 days",
    value: "$612K",
    timestamp: "3h ago",
    data: forecastData,
    color: "var(--color-emerald-500)",
    gradientId: "forecastGradient",
    formatValue: (value: number) => `$${value.toLocaleString()}K`,
  },
  {
    title: "Win Rate",
    period: "Last 90 days",
    value: "26%",
    timestamp: "1h ago",
    data: winRateData,
    color: "var(--color-violet-500)",
    gradientId: "winRateGradient",
    formatValue: (value: number) => `${value}%`,
  },
]

export function Chart() {
  return (
    <div className="@container w-full max-w-6xl">
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3">
        {businessCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="space-y-5">
              {/* Header */}
              <div className="text-sm font-semibold">{card.title}</div>

              {/* Chart */}
              <div className="flex items-end justify-between gap-2.5">
                {/* Value */}
                <div className="flex flex-col gap-px pb-2">
                  <div className="text-muted-foreground text-xs whitespace-nowrap">
                    {card.period}
                  </div>
                  <div className="text-foreground text-xl font-semibold tracking-tight">
                    {card.value}
                  </div>
                </div>

                <div className="relative h-16 w-full max-w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={card.data}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient
                          id={card.gradientId}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={card.color}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor={card.color}
                            stopOpacity={0.05}
                          />
                        </linearGradient>
                      </defs>

                      <Tooltip
                        cursor={{
                          stroke: card.color,
                          strokeWidth: 1,
                          strokeDasharray: "2 2",
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const value = payload[0].value as number
                            return (
                              <Item
                                variant="outline"
                                size="xs"
                                className="bg-popover text-popover-foreground pointer-events-none min-w-24 flex-nowrap shadow-md"
                              >
                                <ItemContent className="min-w-0 gap-1">
                                  <ItemTitle className="text-muted-foreground text-[10px] leading-none font-medium">
                                    {card.title}
                                  </ItemTitle>
                                  <ItemDescription className="text-popover-foreground text-xs leading-none font-semibold tabular-nums">
                                    {card.formatValue(value)}
                                  </ItemDescription>
                                </ItemContent>
                              </Item>
                            )
                          }
                          return null
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={card.color}
                        fill={`url(#${card.gradientId})`}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 4,
                          fill: card.color,
                          stroke: "white",
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}