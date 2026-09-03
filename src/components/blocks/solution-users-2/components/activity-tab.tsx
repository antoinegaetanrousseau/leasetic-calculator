"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline"

import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

import { ACTIVITY_ITEMS } from "./data"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
}

function DotSeparator() {
  return (
    <span
      className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
      aria-hidden="true"
    />
  )
}

function ActivityTimelineList() {
  return (
    <Timeline defaultValue={0}>
      {ACTIVITY_ITEMS.map((item) => (
        <TimelineItem
          key={item.id}
          step={item.id}
          className="has-[+[data-completed]]:[&_[data-slot=timeline-separator]]:bg-border group-data-[orientation=vertical]/timeline:ms-12 group-data-[orientation=vertical]/timeline:not-last:pb-8"
        >
          <TimelineHeader className="flex min-w-0 items-center justify-between gap-2.5">
            <TimelineSeparator className="bg-border group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-2.75rem)] group-data-[orientation=vertical]/timeline:translate-y-9" />
            <TimelineIndicator
              className={cn(
                "border-background bg-muted text-muted-foreground group-data-completed/timeline-item:border-background flex size-7 items-center justify-center border-2 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] group-data-[orientation=vertical]/timeline:-left-7 dark:border [&_svg]:size-4",
                item.avatar && "overflow-hidden border-none"
              )}
            >
              {item.avatar ? (
                <Avatar className="size-7">
                  <AvatarImage src={item.avatar} alt={item.actor} />
                  <AvatarFallback className="text-[10px] font-medium">
                    {getInitials(item.actor)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span className="text-muted-foreground flex size-4 items-center justify-center [&_svg]:size-4">
                  {item.icon}
                </span>
              )}
            </TimelineIndicator>

            <TimelineTitle className="min-w-0 text-sm leading-5">
              <span className="font-medium">{item.actor}</span>
              {" "}
              <span className="text-muted-foreground font-normal">
                {item.action}
              </span>
              {" "}
              <span className="font-medium">{item.target}</span>
            </TimelineTitle>

            {item.badge ? (
              <Badge variant={item.badge.variant} className="shrink-0">
                {item.icon}
                {item.badge.label}
              </Badge>
            ) : null}
          </TimelineHeader>

          <TimelineContent className="flex min-w-0 flex-col items-start gap-2 pb-1">
            {item.detail ? (
              <p className="text-muted-foreground max-w-[60ch] text-sm leading-5">
                {item.detail}
              </p>
            ) : null}

            <TimelineDate dateTime={item.dateTime} className="mb-0">
              {item.date}
            </TimelineDate>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  )
}

function ActivityTimelineSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex gap-3">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ActivityTabContent() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 900)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-4">
      <Frame spacing="sm" className="text-foreground">
        <FrameHeader>
          <FrameTitle className="capitalize">Activity Timeline</FrameTitle>
          <FrameDescription className="dark:text-foreground/70 flex items-center gap-1.5">
            <span>{ACTIVITY_ITEMS.length} audit events</span>
            <DotSeparator />
            <span>last 90 days</span>
          </FrameDescription>
        </FrameHeader>

        <FramePanel>
          {loading ? <ActivityTimelineSkeleton /> : <ActivityTimelineList />}
        </FramePanel>
      </Frame>
    </div>
  )
}