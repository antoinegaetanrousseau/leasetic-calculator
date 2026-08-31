import { type ComponentProps } from "react"
import { Badge } from "@/components/reui/badge"
import { type DataGridFeatures } from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { type ColumnDef } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type DealRecord, type DealStatus } from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar03Icon, File02Icon, StarIcon, MoreHorizontalCircle01Icon, Copy01Icon, Archive01Icon } from "@hugeicons/core-free-icons"

export type DealRowAction = "open" | "favorite" | "duplicate" | "archive"

const dealStatusVariant: Record<
  DealStatus,
  ComponentProps<typeof Badge>["variant"]
> = {
  Discovery: "info-outline",
  Proposal: "warning-outline",
  Negotiation: "success-outline",
}

const dealStatusDotClass: Record<DealStatus, string> = {
  Discovery: "bg-sky-500 dark:bg-sky-400",
  Proposal: "bg-amber-500 dark:bg-amber-400",
  Negotiation: "bg-emerald-500 dark:bg-emerald-400",
}

function DotSeparator() {
  return (
    <span
      className="bg-muted-foreground/45 size-1 shrink-0 rounded-full"
      aria-hidden="true"
    />
  )
}

function getProgressToneClass(value: number) {
  if (value >= 75) return "text-emerald-500 dark:text-emerald-400"
  if (value >= 40) return "text-amber-500 dark:text-amber-400"
  if (value > 0) return "text-sky-500 dark:text-sky-400"

  return "text-muted-foreground/35"
}

function getWindowDurationLabel(deal: DealRecord) {
  const start = new Date(deal.dateStart).getTime()
  const end = new Date(deal.dateEnd).getTime()
  const dayMs = 24 * 60 * 60 * 1000
  const days = Math.max(1, Math.round((end - start) / dayMs))

  return `${days}-day close window`
}

function getCompactDateRange(deal: DealRecord) {
  return deal.dateRange.replace(/, 2026/g, "")
}

function DealProgress({ deal }: { deal: DealRecord }) {
  const value = deal.progress
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (value / 100) * circumference
  const progressClassName = getProgressToneClass(value)

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="relative size-10 shrink-0">
        <svg
          viewBox="0 0 44 44"
          className="absolute inset-0 size-10 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            className="stroke-muted-foreground/20"
            strokeWidth="3.25"
          />
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            className={cn("stroke-current", progressClassName)}
            strokeWidth="3.25"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="text-muted-foreground absolute inset-0 flex items-center justify-center text-[9px] leading-none font-medium tabular-nums">
          {value}%
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-foreground text-sm font-medium tabular-nums">
          {value}% probability
        </span>
        <span className="text-muted-foreground truncate text-xs tabular-nums">
          {deal.tasksCompleted}/{deal.tasksTotal} steps
        </span>
      </div>
    </div>
  )
}

function DealNameCell({ deal }: { deal: DealRecord }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-foreground truncate text-sm leading-5 font-medium">
        {deal.name}
      </span>
      <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
        <span className="shrink-0">{deal.kind}</span>
        <DotSeparator />
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Avatar className="size-4 shrink-0">
            {deal.owner.avatar ? (
              <AvatarImage src={deal.owner.avatar} alt={deal.owner.name} />
            ) : null}
            <AvatarFallback className="text-[8px]">
              {deal.owner.initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{deal.owner.name}</span>
        </span>
        <DotSeparator />
        <span className="truncate font-mono tracking-wide">{deal.domain}</span>
      </div>
    </div>
  )
}

function DealDateCell({ deal }: { deal: DealRecord }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-foreground truncate text-sm font-medium tabular-nums">
        {getCompactDateRange(deal)}
      </span>
      <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 truncate text-xs">
        <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-3.5 shrink-0" aria-hidden="true" />
        {getWindowDurationLabel(deal)}
      </span>
    </div>
  )
}

function DealStatusCell({ deal }: { deal: DealRecord }) {
  return (
    <Badge variant={dealStatusVariant[deal.status]}>
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full!",
          dealStatusDotClass[deal.status]
        )}
        aria-hidden="true"
      />
      {deal.status}
    </Badge>
  )
}

function DealActions({
  deal,
  onAction,
}: {
  deal: DealRecord
  onAction: (action: DealRowAction, deal: DealRecord) => void
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Open ${deal.name}`}
        onClick={(event) => {
          event.stopPropagation()
          onAction("open", deal)
        }}
      >
        <HugeiconsIcon icon={File02Icon} strokeWidth={2} aria-hidden="true" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`${deal.favorite ? "Unfavorite" : "Favorite"} ${deal.name}`}
        className={cn(deal.favorite && "text-amber-500")}
        onClick={(event) => {
          event.stopPropagation()
          onAction("favorite", deal)
        }}
      >
        <HugeiconsIcon icon={StarIcon} strokeWidth={2} aria-hidden="true" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`More actions for ${deal.name}`}
              onClick={(event) => event.stopPropagation()}
            />
          }
        >
          <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onAction("duplicate", deal)}>
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} aria-hidden="true" />
              Clone
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onAction("archive", deal)}
            >
              <HugeiconsIcon icon={Archive01Icon} strokeWidth={2} aria-hidden="true" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function createDealGridColumns({
  onAction,
}: {
  onAction: (action: DealRowAction, deal: DealRecord) => void
}): ColumnDef<DataGridFeatures, DealRecord>[] {
  return [
    {
      accessorKey: "progress",
      id: "progress",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <DealProgress deal={row.original} />,
      size: 210,
      enableSorting: true,
      enableHiding: false,
      enableResizing: false,
      meta: {
        headerTitle: "Probability",
      },
    },
    {
      accessorKey: "name",
      id: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <DealNameCell deal={row.original} />,
      minSize: 300,
      enableSorting: true,
      enableHiding: false,
      enableResizing: false,
      meta: {
        autoSize: true,
        headerTitle: "Account",
      },
    },
    {
      accessorKey: "dateStart",
      id: "dateStart",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <DealDateCell deal={row.original} />,
      sortFn: (rowA, rowB) =>
        new Date(rowA.original.dateStart).getTime() -
        new Date(rowB.original.dateStart).getTime(),
      size: 180,
      enableSorting: true,
      enableHiding: false,
      enableResizing: false,
      meta: {
        headerTitle: "Close",
      },
    },
    {
      accessorKey: "status",
      id: "status",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <DealStatusCell deal={row.original} />,
      size: 126,
      enableSorting: true,
      enableHiding: false,
      enableResizing: false,
      meta: {
        headerTitle: "Stage",
      },
    },
    {
      id: "actions",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => (
        <DealActions deal={row.original} onAction={onAction} />
      ),
      size: 104,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      meta: {
        headerTitle: "Actions",
      },
    },
  ]
}