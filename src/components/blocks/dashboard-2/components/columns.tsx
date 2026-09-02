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
import { type ModuleRecord, type ModuleStatus } from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar03Icon, File02Icon, StarIcon, MoreHorizontalCircle01Icon, Copy01Icon, Archive01Icon } from "@hugeicons/core-free-icons"

export type ModuleRowAction = "open" | "favorite" | "duplicate" | "archive"

const moduleStatusVariant: Record<
  ModuleStatus,
  ComponentProps<typeof Badge>["variant"]
> = {
  Planned: "info-outline",
  Backlog: "outline",
  "In Progress": "warning-outline",
}

const moduleStatusDotClass: Record<ModuleStatus, string> = {
  Planned: "bg-sky-500 dark:bg-sky-400",
  Backlog: "bg-muted-foreground/50",
  "In Progress": "bg-amber-500 dark:bg-amber-400",
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

function getWindowDurationLabel(module: ModuleRecord) {
  const start = new Date(module.dateStart).getTime()
  const end = new Date(module.dateEnd).getTime()
  const dayMs = 24 * 60 * 60 * 1000
  const days = Math.max(1, Math.round((end - start) / dayMs))

  return `${days}-day window`
}

function getCompactDateRange(module: ModuleRecord) {
  return module.dateRange.replace(/, 2026/g, "")
}

function ModuleProgress({ module }: { module: ModuleRecord }) {
  const value = module.progress
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
          {value}% ready
        </span>
        <span className="text-muted-foreground truncate text-xs tabular-nums">
          {module.tasksCompleted}/{module.tasksTotal} tasks
        </span>
      </div>
    </div>
  )
}

function ModuleNameCell({ module }: { module: ModuleRecord }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-foreground truncate text-sm leading-5 font-medium">
        {module.name}
      </span>
      <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
        <span className="shrink-0">{module.kind}</span>
        <DotSeparator />
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Avatar className="size-4 shrink-0">
            {module.owner.avatar ? (
              <AvatarImage src={module.owner.avatar} alt={module.owner.name} />
            ) : null}
            <AvatarFallback className="text-[8px]">
              {module.owner.initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{module.owner.name}</span>
        </span>
        <DotSeparator />
        <span className="truncate font-mono tracking-wide">
          {module.domain}
        </span>
      </div>
    </div>
  )
}

function ModuleDateCell({ module }: { module: ModuleRecord }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-foreground truncate text-sm font-medium tabular-nums">
        {getCompactDateRange(module)}
      </span>
      <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 truncate text-xs">
        <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-3.5 shrink-0" aria-hidden="true" />
        {getWindowDurationLabel(module)}
      </span>
    </div>
  )
}

function ModuleStatusCell({ module }: { module: ModuleRecord }) {
  return (
    <Badge variant={moduleStatusVariant[module.status]}>
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full!",
          moduleStatusDotClass[module.status]
        )}
        aria-hidden="true"
      />
      {module.status}
    </Badge>
  )
}

function ModuleActions({
  module,
  onAction,
}: {
  module: ModuleRecord
  onAction: (action: ModuleRowAction, module: ModuleRecord) => void
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Open ${module.name}`}
        onClick={(event) => {
          event.stopPropagation()
          onAction("open", module)
        }}
      >
        <HugeiconsIcon icon={File02Icon} strokeWidth={2} aria-hidden="true" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`${module.favorite ? "Unfavorite" : "Favorite"} ${
          module.name
        }`}
        className={cn(module.favorite && "text-amber-500")}
        onClick={(event) => {
          event.stopPropagation()
          onAction("favorite", module)
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
              aria-label={`More actions for ${module.name}`}
              onClick={(event) => event.stopPropagation()}
            />
          }
        >
          <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onAction("duplicate", module)}>
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} aria-hidden="true" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onAction("archive", module)}
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

export function createModuleGridColumns({
  onAction,
}: {
  onAction: (action: ModuleRowAction, module: ModuleRecord) => void
}): ColumnDef<DataGridFeatures, ModuleRecord>[] {
  return [
    {
      accessorKey: "progress",
      id: "progress",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <ModuleProgress module={row.original} />,
      size: 210,
      enableSorting: true,
      enableHiding: false,
      enableResizing: false,
      meta: {
        headerTitle: "Progress",
      },
    },
    {
      accessorKey: "name",
      id: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <ModuleNameCell module={row.original} />,
      minSize: 300,
      enableSorting: true,
      enableHiding: false,
      enableResizing: false,
      meta: {
        autoSize: true,
        headerTitle: "Module",
      },
    },
    {
      accessorKey: "dateStart",
      id: "dateStart",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <ModuleDateCell module={row.original} />,
      sortFn: (rowA, rowB) =>
        new Date(rowA.original.dateStart).getTime() -
        new Date(rowB.original.dateStart).getTime(),
      size: 180,
      enableSorting: true,
      enableHiding: false,
      enableResizing: false,
      meta: {
        headerTitle: "Window",
      },
    },
    {
      accessorKey: "status",
      id: "status",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <ModuleStatusCell module={row.original} />,
      size: 126,
      enableSorting: true,
      enableHiding: false,
      enableResizing: false,
      meta: {
        headerTitle: "Status",
      },
    },
    {
      id: "actions",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => (
        <ModuleActions module={row.original} onAction={onAction} />
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