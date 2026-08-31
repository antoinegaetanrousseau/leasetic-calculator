import { useState } from "react"

import { Tabs } from "@/components/ui/tabs"

import { TABS_DEFAULT_VALUE } from "./data"
import { NavbarActions } from "./navbar-actions"
import { NavbarCollaborators } from "./navbar-collaborators"
import { NavbarProject } from "./navbar-project"
import { NavbarTabs } from "./navbar-tabs"

// ── Navbar (two-row header + tab content panels) ──

export function Navbar() {
  const [tabValue, setTabValue] = useState(TABS_DEFAULT_VALUE)

  return (
    <Tabs
      value={tabValue}
      onValueChange={setTabValue}
      className="flex min-h-0 flex-1 flex-col"
    >
      <h1 className="text-foreground text-base font-semibold whitespace-nowrap sm:text-lg">
        Navbar
      </h1>

      <header className="border-border bg-background flex w-full shrink-0 flex-col gap-3 border-b">
        {/* Row 1: project title + breadcrumb | header actions */}
        <div className="flex items-center justify-between">
          <NavbarProject />
          <NavbarActions />
        </div>
        {/* Row 2: tabs | collaborators */}
        <div className="flex min-h-9 items-center justify-between">
          <NavbarTabs value={tabValue} />
          <NavbarCollaborators />
        </div>
      </header>

      {/* Tab content - Card-based panels from navbar-tabs */}
      <div className="flex flex-1 flex-col gap-4 pt-3">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="border-border/70 bg-muted/20 aspect-video rounded-lg border border-dashed" />
          <div className="border-border/70 bg-muted/20 aspect-video rounded-lg border border-dashed" />
          <div className="border-border/70 bg-muted/20 aspect-video rounded-lg border border-dashed" />
        </div>
        <div className="border-border/70 bg-muted/20 min-h-screen flex-1 rounded-lg border border-dashed md:min-h-min" />
      </div>
    </Tabs>
  )
}