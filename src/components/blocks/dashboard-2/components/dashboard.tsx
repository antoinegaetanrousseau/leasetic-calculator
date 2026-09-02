"use client"

import { Chart } from "./chart"
import { ModulesDataGridView } from "./data-grid-view"
import { Navbar } from "./navbar"

/**
 * ReUI operations dashboard: navbar -> metric charts -> module grid.
 * The sections are copied from reviewed donor blocks.
 * Customize: swap the records and chart series in data.tsx first.
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
          ReUI Operations Dashboard
        </h1>

        {/* Metric Charts */}
        <Chart />

        {/* Module Grid */}
        <ModulesDataGridView />
      </main>
    </div>
  )
}