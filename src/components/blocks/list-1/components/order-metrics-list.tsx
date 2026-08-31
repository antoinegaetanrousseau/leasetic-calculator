import { Frame, FramePanel } from "@/components/reui/frame"

import { MetricRow } from "./metric-row"
import { orderMetrics } from "./data"

export function OrderMetricsList() {
  return (
    <Frame className="@container w-full max-w-md">
      <FramePanel className="p-0!">
        <ul className="flex flex-col">
          {orderMetrics.map((metric, index) => (
            <MetricRow
              key={metric.label}
              metric={metric}
              showSeparator={index < orderMetrics.length - 1}
            />
          ))}
        </ul>
      </FramePanel>
    </Frame>
  )
}