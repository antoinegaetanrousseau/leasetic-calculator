import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import { AppSidebar } from "./app-sidebar"

export function AppShell() {
  return (
    <SidebarProvider
      className={cn(
        // Leasetic DS bridge — "the seven rules" (Notion: Documentation Hub ›
        // Leasetic Design System): green is the ONLY interactive signal (rule 1),
        // so the accent tint + focus ring are green; everything else (surfaces,
        // dividers) stays borderless — rhythm comes from fill contrast, not
        // chrome (rules 3–4).
        "[--sidebar:var(--surface)]",
        "[--sidebar-width:260px]",
        "[--sidebar-accent:color-mix(in_oklab,var(--gd)_10%,transparent)]",
        "[--sidebar-accent-foreground:var(--ink)]"
      )}
    >
      {/* Sidebar */}
      <AppSidebar />
      <SidebarInset className="bg-[var(--paper)]">
        <header className="flex h-12 shrink-0 items-center gap-2 bg-[var(--surface)] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 md:hidden" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#" className="text-[var(--muted)]">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden text-[var(--muted)] md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[var(--ink)]">
                    Overview
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Rule 4: cards are borderless, no default shadow — separation is the
              white-card-on-sunken-shell fill contrast, not a border/shadow. */}
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-[24px] bg-[var(--surface)]" />
            <div className="aspect-video rounded-[24px] bg-[var(--surface)]" />
            <div className="aspect-video rounded-[24px] bg-[var(--surface)]" />
          </div>
          <div className="min-h-screen flex-1 rounded-[24px] bg-[var(--surface)] md:min-h-min" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}