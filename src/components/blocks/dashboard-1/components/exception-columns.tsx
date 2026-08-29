import { memo } from "react"
import { Badge } from "@/components/reui/badge"
import { type DataGridFeatures } from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import {
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/components/reui/data-grid/data-grid-table"
import { type ColumnDef, type Row } from "@tanstack/react-table"
import { toast } from "sonner"

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
import { Item, ItemMedia } from "@/components/ui/item"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AUTOMATION_BADGE_VARIANT,
  STATUS_BADGE_VARIANT,
  type AutomationLevel,
  type FulfillmentException,
  type FulfillmentStatus,
} from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { PackageIcon, InformationCircleIcon, MoreHorizontalCircle01Icon, ViewIcon, NotificationIcon, Copy01Icon, Alert02Icon } from "@hugeicons/core-free-icons"

const currencyCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const numberCompact = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

const availabilityColor: Record<FulfillmentStatus, string> = {
  "On Time": "bg-success",
  "At Risk": "bg-warning",
  Delayed: "bg-info",
  Blocked: "bg-destructive",
}

const stageProgress: Record<string, number> = {
  "Carrier tender": 72,
  "Pick wave": 64,
  "Inventory hold": 28,
  Packing: 82,
  "Cold chain": 48,
  Labeling: 76,
  "Split shipment": 39,
  "Dock queue": 31,
  "Fraud review": 24,
  Manifest: 90,
}

function DotSeparator() {
  return (
    <span
      aria-hidden="true"
      className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
    />
  )
}

export const StatusBadge = memo(function StatusBadge({
  status,
}: {
  status: FulfillmentStatus
}) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]} className="gap-1.5">
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", availabilityColor[status])}
      />
      {status}
    </Badge>
  )
})

function AutomationBadge({ level }: { level: AutomationLevel }) {
  return <Badge variant={AUTOMATION_BADGE_VARIANT[level]}>{level}</Badge>
}

const ReferenceCell = memo(function ReferenceCell({
  row,
}: {
  row: Row<DataGridFeatures, FulfillmentException>
}) {
  const order = row.original

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <a
        href="#"
        className="text-primary truncate text-sm font-medium underline-offset-2 transition-colors hover:underline"
        aria-label={`View order ${order.reference}`}
      >
        {order.reference}
      </a>
      <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
        <span className="shrink-0">{order.facility}</span>
        <DotSeparator />
        <span className="truncate">{order.owner}</span>
      </div>
    </div>
  )
})

const CustomerCell = memo(function CustomerCell({
  row,
}: {
  row: Row<DataGridFeatures, FulfillmentException>
}) {
  const order = row.original

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative shrink-0">
        <Avatar className="size-8">
          <AvatarImage src={order.avatar} alt={order.customer} />
          <AvatarFallback>{order.initials}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "ring-background absolute right-0 bottom-0.5 size-2 rounded-full ring-2",
            availabilityColor[order.status]
          )}
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0">
        <a
          href="#"
          className="text-foreground hover:text-primary line-clamp-1 font-medium underline-offset-2 transition-colors hover:underline"
          aria-label={`View customer ${order.customer}`}
        >
          {order.customer}
        </a>
        <div
          className="text-muted-foreground line-clamp-1 text-xs"
          title={order.email}
        >
          {order.email}
        </div>
      </div>
    </div>
  )
})

const StageCell = memo(function StageCell({
  row,
}: {
  row: Row<DataGridFeatures, FulfillmentException>
}) {
  const order = row.original
  const progress = stageProgress[order.stage] ?? 50

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <Item render={<span />} className="w-auto shrink-0 border-0 p-0">
          <ItemMedia variant="icon" className="text-muted-foreground size-auto">
            <HugeiconsIcon icon={PackageIcon} strokeWidth={2} className="size-4" aria-hidden="true" />
          </ItemMedia>
        </Item>
        <span className="text-foreground min-w-0 truncate font-medium">
          {order.stage}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <span className="bg-muted block h-1.5 min-w-16 flex-1 overflow-hidden rounded-full">
          <span
            className={cn(
              "block h-full rounded-full",
              availabilityColor[order.status]
            )}
            style={{ width: `${progress}%` }}
          />
        </span>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {progress}%
        </span>
      </div>
    </div>
  )
})

const LaneCell = memo(function LaneCell({
  row,
}: {
  row: Row<DataGridFeatures, FulfillmentException>
}) {
  const order = row.original

  return (
    <div className="flex max-w-full min-w-0 flex-col gap-0.5">
      <span
        className="text-foreground block max-w-full min-w-0 truncate font-medium"
        title={order.lane}
      >
        {order.lane}
      </span>
      <span
        className="text-muted-foreground block max-w-full min-w-0 truncate text-xs"
        title={order.facility}
      >
        {order.facility}
      </span>
    </div>
  )
})

const ValueCell = memo(function ValueCell({
  row,
}: {
  row: Row<DataGridFeatures, FulfillmentException>
}) {
  const valueHint =
    row.original.value >= 30000 ? "Priority lane" : "Standard lane"

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="text-foreground font-medium tabular-nums">
        {currencyCompact.format(row.original.value)}
      </span>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex size-5 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2"
              aria-label={`Value hint for ${row.original.reference}: ${valueHint}`}
            />
          }
        >
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-3.5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-48 p-2.5 text-xs leading-5">
          <div className="flex flex-col">
            <span>{valueHint}</span>
            <span className="text-background/80">
              {numberCompact.format(row.original.units)} units
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  )
})

function StateCell({
  row,
}: {
  row: Row<DataGridFeatures, FulfillmentException>
}) {
  const sla = row.original.slaMinutes
  const slaHint =
    sla < 0
      ? `${Math.abs(sla)} min overdue`
      : sla <= 45
        ? `${sla} min buffer`
        : `Due ${row.original.promise}`

  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <StatusBadge status={row.original.status} />
      <span className="text-muted-foreground max-w-full truncate text-xs">
        {slaHint}
      </span>
    </div>
  )
}

function RiskCell({
  row,
}: {
  row: Row<DataGridFeatures, FulfillmentException>
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1.5 rounded-full focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={`Risk note for ${row.original.reference}: ${row.original.risk}`}
          />
        }
      >
        <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-3.5" aria-hidden="true" />
        <span className="max-w-32 truncate text-xs">{row.original.risk}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 text-xs leading-5">
        {row.original.risk}
      </TooltipContent>
    </Tooltip>
  )
}

function ActionsCell({
  row,
}: {
  row: Row<DataGridFeatures, FulfillmentException>
}) {
  const copyReference = async () => {
    await navigator.clipboard?.writeText(row.original.reference)
    toast.success("Reference copied", {
      description: row.original.reference,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label={`Actions for ${row.original.reference}`}
          />
        }
      >
        <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() =>
              toast.info("Opening order", {
                description: row.original.reference,
              })
            }
          >
            <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-4" aria-hidden="true" />
            View order
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              toast.info("Owner notified", {
                description: row.original.owner,
              })
            }
          >
            <HugeiconsIcon icon={NotificationIcon} strokeWidth={2} className="size-4" aria-hidden="true" />
            Notify owner
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyReference}>
            <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
            Copy reference
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              toast.warning("Escalation staged", {
                description: "Connect this action to your incident workflow.",
              })
            }
          >
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
            Escalate
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const columns: ColumnDef<DataGridFeatures, FulfillmentException>[] = [
  {
    accessorKey: "id",
    id: "id",
    header: () => <DataGridTableRowSelectAll />,
    cell: ({ row }) => <DataGridTableRowSelect row={row} />,
    enableSorting: false,
    size: 35,
    enableResizing: false,
    enableHiding: false,
    meta: {
      headerClassName: "ps-4!",
      cellClassName: "ps-4!",
    },
  },
  {
    accessorKey: "reference",
    id: "reference",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <ReferenceCell row={row} />,
    size: 138,
    enableSorting: true,
    enableHiding: false,
    enableResizing: true,
    meta: {
      headerTitle: "Order",
    },
  },
  {
    accessorKey: "customer",
    id: "customer",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <CustomerCell row={row} />,
    size: 210,
    enableSorting: true,
    enableHiding: false,
    enableResizing: true,
    minSize: 190,
    meta: {
      headerTitle: "Customer",
      autoSize: true,
    },
  },
  {
    accessorKey: "lane",
    id: "lane",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <LaneCell row={row} />,
    size: 165,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Lane",
    },
  },
  {
    accessorKey: "stage",
    id: "stage",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <StageCell row={row} />,
    size: 160,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Stage",
    },
  },
  {
    accessorKey: "automation",
    id: "automation",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <AutomationBadge level={row.original.automation} />,
    size: 112,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Automation",
    },
  },
  {
    accessorKey: "value",
    id: "value",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <ValueCell row={row} />,
    size: 120,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Value",
    },
  },
  {
    accessorKey: "risk",
    id: "risk",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <RiskCell row={row} />,
    size: 170,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Risk",
    },
  },
  {
    accessorKey: "status",
    id: "status",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <StateCell row={row} />,
    size: 142,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "State",
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ActionsCell row={row} />,
    size: 46,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
  },
]