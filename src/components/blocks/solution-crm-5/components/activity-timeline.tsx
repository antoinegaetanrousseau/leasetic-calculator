import { useCallback, useMemo, useState } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameHeader,
  FramePanel,
} from "@/components/reui/frame"
import { IconStack } from "@/components/reui/icon-stack"
import {
  Timeline,
  TimelineContent,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline"
import { ChevronRightIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  ACTIVITIES,
  activityTypeIcon,
  activityTypeLabel,
  BUCKET_ORDER,
  bucketLabel,
  outcomeDotClass,
  outcomeLabel,
  outcomeVariant,
  OWNER_FILTER_OPTIONS,
  OWNERS,
  TOAST_INFO_ICON,
  TOAST_SUCCESS_ICON,
  TYPE_FILTER_OPTIONS,
  type Activity,
  type ActivityType,
} from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, UserMultiple02Icon, InboxIcon, FilterIcon } from "@hugeicons/core-free-icons"

function ActivityEntryContent({ activity }: { activity: Activity }) {
  const owner = OWNERS[activity.ownerId]

  const handleCopyRef = useCallback(() => {
    toast.success("Reference copied", {
      description: `${activity.ref} for ${activity.account} is on your clipboard.`,
      icon: TOAST_SUCCESS_ICON,
    })
  }, [activity.account, activity.ref])

  return (
    <div className="space-y-2.5">
      <p className="text-muted-foreground text-xs leading-5">
        {activity.detail}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t pt-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="size-6">
            <AvatarImage src={owner.avatar} alt={owner.name} />
            <AvatarFallback className="text-[10px]">
              {owner.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-col">
            <span className="text-foreground truncate text-xs font-medium">
              {owner.name}
            </span>
            <span className="text-muted-foreground truncate text-[11px]">
              {owner.role}
            </span>
          </span>
        </div>

        <Button
          variant="outline"
          size="xs"
          type="button"
          onClick={handleCopyRef}
        >
          <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-3.5" aria-hidden="true" />
          {activity.ref}
        </Button>
      </div>
    </div>
  )
}

function ActivityEntry({
  activity,
  step,
  defaultOpen = false,
}: {
  activity: Activity
  step: number
  defaultOpen?: boolean
}) {
  return (
    <TimelineItem step={step} className="ms-10 pb-6">
      <TimelineHeader>
        <TimelineSeparator className="bg-border! group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.5rem-0.5rem)] group-data-[orientation=vertical]/timeline:translate-y-7" />
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <TimelineTitle className="text-sm font-semibold">
            {activity.title}
          </TimelineTitle>
          <Badge variant={outcomeVariant[activity.outcome]} className="gap-1.5">
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                outcomeDotClass[activity.outcome]
              )}
              aria-hidden="true"
            />
            {outcomeLabel[activity.outcome]}
          </Badge>
        </div>
        <TimelineIndicator className="bg-background text-muted-foreground border-border flex size-6 items-center justify-center border group-data-[orientation=vertical]/timeline:-left-7 [&_svg]:size-3.5">
          {activityTypeIcon[activity.type]}
        </TimelineIndicator>
      </TimelineHeader>
      <TimelineContent className="mt-1.5">
        <Frame stacked dense spacing="sm">
          <Collapsible className="group/collapsible" defaultOpen={defaultOpen}>
            <CollapsibleTrigger
              type="button"
              className="flex w-full"
              aria-label={`Toggle ${activity.title} details`}
            >
              <FrameHeader className="flex grow flex-row items-center justify-between gap-2">
                <div className="flex min-w-0 flex-col items-start gap-0.5">
                  <span className="text-foreground min-w-0 truncate text-sm font-medium">
                    {activity.account}
                  </span>
                  <span className="text-muted-foreground min-w-0 truncate text-xs">
                    {activity.time}
                  </span>
                </div>
                <ChevronRightIcon
                  className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-open/collapsible:rotate-90"
                  aria-hidden="true"
                />
              </FrameHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <FramePanel className="space-y-2.5">
                <ActivityEntryContent activity={activity} />
              </FramePanel>
            </CollapsibleContent>
          </Collapsible>
        </Frame>
      </TimelineContent>
    </TimelineItem>
  )
}

export function ActivityTimeline() {
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [ownerFilter, setOwnerFilter] = useState<string>("all")

  const handleTypeChange = useCallback((value: string[]) => {
    const next = value[0]
    if (!next) return
    setTypeFilter(next)
  }, [])

  const handleOwnerChange = useCallback((value: string | null) => {
    if (!value) return
    setOwnerFilter(value)
  }, [])

  const handleResetFilters = useCallback(() => {
    setTypeFilter("all")
    setOwnerFilter("all")
    toast("Filters cleared", {
      description: "Showing all 12 activities across 5 owners.",
      icon: TOAST_INFO_ICON,
    })
  }, [])

  const filtered = useMemo(
    () =>
      ACTIVITIES.filter(
        (activity) =>
          (typeFilter === "all" || activity.type === typeFilter) &&
          (ownerFilter === "all" || activity.ownerId === ownerFilter)
      ),
    [typeFilter, ownerFilter]
  )

  const buckets = useMemo(
    () =>
      BUCKET_ORDER.map((key) => ({
        key,
        entries: filtered.filter((activity) => activity.bucket === key),
      })).filter((bucket) => bucket.entries.length > 0),
    [filtered]
  )

  const defaultOpenIds = useMemo(
    () => new Set(filtered.slice(0, 2).map((activity) => activity.id)),
    [filtered]
  )

  const emptyActivityType =
    typeFilter === "all"
      ? "activity"
      : `${activityTypeLabel[typeFilter as ActivityType].toLowerCase()} activity`

  const isFiltered = typeFilter !== "all" || ownerFilter !== "all"

  return (
    <section
      className="w-full max-w-2xl"
      aria-labelledby="activity-timeline-title"
    >
      {/* Content header */}
      <div className="mb-6 space-y-4">
        <div className="space-y-0.5">
          <h1
            id="activity-timeline-title"
            className="text-xl font-semibold tracking-tight"
          >
            Activity
          </h1>
          <p className="text-muted-foreground text-sm leading-5">
            {filtered.length} activities in view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            multiple={false}
            value={[typeFilter]}
            onValueChange={handleTypeChange}
            variant="outline"
            size="sm"
            aria-label="Filter by activity type"
            className="flex-wrap"
          >
            {TYPE_FILTER_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="px-3"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Select
            value={ownerFilter}
            onValueChange={handleOwnerChange}
            items={OWNER_FILTER_OPTIONS}
          >
            <SelectTrigger size="sm" className="w-[150px] sm:ml-auto">
              <HugeiconsIcon icon={UserMultiple02Icon} strokeWidth={2} className="text-muted-foreground size-4" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" alignItemWithTrigger={false}>
              <SelectGroup>
                {OWNER_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {buckets.length === 0 ? (
        <div className="flex min-h-[360px] w-full items-center justify-center px-4 py-10 md:py-12">
          <Empty className="w-full flex-none gap-6 border-0 bg-transparent p-0 md:p-0">
            <EmptyHeader className="max-w-108 items-center gap-5 text-center">
              <EmptyMedia className="mb-0">
                <IconStack aria-hidden="true">
                  <HugeiconsIcon icon={InboxIcon} strokeWidth={1.9} aria-hidden="true" />
                </IconStack>
              </EmptyMedia>

              <div className="flex flex-col items-center gap-2">
                <EmptyTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                  No Matching Activity
                </EmptyTitle>
                <EmptyDescription className="max-w-96 text-sm/relaxed">
                  No {emptyActivityType} logged for this filter. Calls, emails,
                  and meetings land here as your reps work the pipeline.
                </EmptyDescription>
              </div>
            </EmptyHeader>

            <EmptyContent className="max-w-none items-center gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
              >
                Clear Filters
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <div className="space-y-8">
          {buckets.map((bucket) => (
            <div key={bucket.key}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {bucketLabel[bucket.key]}
                </h2>
                <span className="bg-border h-px grow" aria-hidden="true" />
                <span className="text-muted-foreground text-xs tabular-nums">
                  {bucket.entries.length}
                </span>
              </div>

              <Timeline defaultValue={bucket.entries.length}>
                {bucket.entries.map((activity, index) => (
                  <ActivityEntry
                    key={activity.id}
                    activity={activity}
                    step={index + 1}
                    defaultOpen={defaultOpenIds.has(activity.id)}
                  />
                ))}
              </Timeline>
            </div>
          ))}

          {isFiltered ? (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
              >
                <HugeiconsIcon icon={FilterIcon} strokeWidth={2} className="size-4" aria-hidden="true" />
                Clear Filters
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}