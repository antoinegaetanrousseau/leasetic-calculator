import { Chart as CapacityChart } from "./capacity-chart"
import { Chart as ChartCards } from "./chart-cards"
import { InvestorCard as CommanderCard } from "./commander-card"
import { ExceptionGrid } from "./exception-grid"
import { Navbar } from "./navbar"

export function Dashboard() {
  return (
    <div className="text-foreground @container mx-auto flex w-full max-w-7xl flex-col gap-2">
      <Navbar />

      <section aria-label="Fulfillment metrics">
        <ChartCards />
      </section>

      <section
        aria-label="Fulfillment operations"
        className="grid min-w-0 items-stretch gap-3 @5xl:grid-cols-2"
      >
        <div className="flex min-w-0">
          <CommanderCard />
        </div>
        <div className="flex min-w-0">
          <CapacityChart />
        </div>
      </section>

      <section aria-label="Fulfillment exception queue">
        <ExceptionGrid />
      </section>
    </div>
  )
}