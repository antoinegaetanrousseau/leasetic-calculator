"use client"

import { Badge } from "@/components/reui/badge"
import { Frame, FramePanel } from "@/components/reui/frame"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { formatNumber, stats } from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoreHorizontalCircle01Icon, SettingsIcon, Alert02Icon, Pin02Icon, Share08Icon, Delete02Icon, ArrowUp02Icon, ArrowDown02Icon } from "@hugeicons/core-free-icons"

export function Stats() {
  return (
    <div className="grid grow grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Frame key={index}>
          <FramePanel className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-muted-foreground text-sm font-medium">
                {stat.title}
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="-me-1.5"
                    />
                  }
                >
                  <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" className="w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <HugeiconsIcon icon={SettingsIcon} strokeWidth={2} aria-hidden="true" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} aria-hidden="true" />
                      Add Alert
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <HugeiconsIcon icon={Pin02Icon} strokeWidth={2} aria-hidden="true" />
                      Pin to Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <HugeiconsIcon icon={Share08Icon} strokeWidth={2} aria-hidden="true" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">
                      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} aria-hidden="true" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-foreground text-2xl font-medium tracking-tight">
                  {stat.format
                    ? stat.format(stat.value)
                    : stat.prefix + formatNumber(stat.value) + stat.suffix}
                </span>
                <Badge
                  variant={
                    stat.positive ? "success-light" : "destructive-light"
                  }
                >
                  {stat.delta > 0 ? (
                    <HugeiconsIcon icon={ArrowUp02Icon} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <HugeiconsIcon icon={ArrowDown02Icon} strokeWidth={2} aria-hidden="true" />
                  )}
                  {stat.delta}%
                </Badge>
              </div>
              <Separator />
              <div className="text-muted-foreground text-xs">
                Vs last month:{" "}
                <span className="text-foreground font-medium">
                  {stat.lastFormat
                    ? stat.lastFormat(stat.lastMonth)
                    : stat.prefix + formatNumber(stat.lastMonth) + stat.suffix}
                </span>
              </div>
            </div>
          </FramePanel>
        </Frame>
      ))}
    </div>
  )
}