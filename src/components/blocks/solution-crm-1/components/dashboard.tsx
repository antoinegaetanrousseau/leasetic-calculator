"use client"

import { Chart } from "./chart"
import { DealsDataGridView } from "./data-grid-view"
import { Navbar } from "./navbar"

/**
 * CRM dashboard adapted from dashboard-2.
 * The donor shell stays navbar -> metric charts -> dense deal grid.
 * Customize: swap deal records and chart series in data.tsx first.
 */
export function Dashboard() {
  return (
    <div className="bg-background text-foreground flex min-h-svh w-full flex-col">
      <Navbar />

      <main
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 pt-6 sm:p-8"
        aria-labelledby="page-heading"
      >
        <h1 id="page-heading" className="sr-only">
          CRM Sales Dashboard
        </h1>

        {/* Metric Charts */}
        <Chart />

        {/* Deal Grid */}
        <DealsDataGridView />
      </main>
    </div>
  )
}