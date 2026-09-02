"use client"

import { useState } from "react"
import { Badge } from "@/components/reui/badge"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TAB_ITEMS } from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"

// ── Navbar tabs (line variant + optional badge; must be used inside Tabs) ──

type NavbarTabsProps = {
  value: string
}

export function NavbarTabs({ value }: NavbarTabsProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop: inline tabs */}
      <TabsList variant="line" className="hidden md:inline-flex">
        {TAB_ITEMS.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
            {item.badge != null && (
              <Badge
                variant="destructive-light"
                size="sm"
                className="rounded-full!"
              >
                {item.badge}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Mobile: Sheet with tab picker */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon"
              variant="ghost"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex shrink-0 items-center md:hidden"
            />
          }
        >
          <span className="relative flex size-4 items-center justify-center">
            <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} aria-hidden="true" className={cn(
                                      "absolute size-4 transition-all duration-200",
                                      open
                                        ? "scale-75 rotate-90 opacity-0"
                                        : "scale-100 rotate-0 opacity-100"
                                    )} />
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" className={cn(
                                      "absolute size-4 transition-all duration-200",
                                      open
                                        ? "scale-100 rotate-0 opacity-100"
                                        : "scale-75 -rotate-90 opacity-0"
                                    )} />
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuGroup>
            {TAB_ITEMS.map((item) => (
              <DropdownMenuItem key={item.value} onClick={() => setOpen(false)}>
                {item.label}
                {item.badge != null && (
                  <Badge
                    variant="destructive-light"
                    size="sm"
                    className="ml-auto rounded-full!"
                  >
                    {item.badge}
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}