"use client"

import { memo, useState } from "react"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { Badge } from "@/components/reui/badge"
import { type DataGridFeatures } from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import {
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/components/reui/data-grid/data-grid-table"
import { Row, type ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { getBalanceHintText, IEmployee, Status, type CompanyTier } from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon, InformationCircleIcon, ArrowUp02Icon, ArrowDown02Icon, MoreHorizontalCircle01Icon, ViewIcon, PenIcon, Copy01Icon, Delete02Icon } from "@hugeicons/core-free-icons"

const currencyCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const availabilityColor: Record<string, string> = {
  online: "bg-green-500",
  away: "bg-yellow-400",
  busy: "bg-red-500",
  offline: "bg-gray-500",
}

const tierBadgeVariant: Record<
  CompanyTier,
  "primary-outline" | "info-outline" | "outline"
> = {
  Enterprise: "primary-outline",
  Pro: "info-outline",
  Starter: "outline",
}

export const StatusBadge = memo(function StatusBadge({
  status,
}: {
  status: Status
}) {
  if (status === "Active")
    return <Badge variant="success-outline">Active</Badge>
  if (status === "Blocked")
    return <Badge variant="destructive-outline">Blocked</Badge>
  if (status === "Inactive")
    return <Badge variant="info-outline">Inactive</Badge>
  return <Badge variant="warning-outline">Pending</Badge>
})

const BalanceCell = memo(function BalanceCell({
  row,
}: {
  row: Row<DataGridFeatures, IEmployee>
}) {
  const meta = row.original.balanceMeta
  const formatted = currencyCompact.format(row.original.balance)
  const trend = meta?.trendPct
  const up = trend !== undefined && trend >= 0
  const hint = getBalanceHintText(row.original)

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <span className="text-foreground font-medium tabular-nums">
          {formatted}
        </span>
        {meta?.reversal && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="text-destructive hover:text-destructive/90 focus-visible:ring-ring focus-visible:ring-offset-background inline-flex shrink-0 rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2"
                  aria-label={`Reversal ${currencyCompact.format(meta.reversal.amount)}. ${meta.reversal.reason}`}
                />
              }
            >
              <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-3.5" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs p-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Reversal on file</span>
                  <Badge variant="destructive" size="xs">
                    {currencyCompact.format(meta.reversal.amount)}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1 text-xs opacity-80">
                  <p>• {meta.reversal.reason}</p>
                  <p>• Settled {meta.reversal.settledOn}</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {trend !== undefined &&
        (hint ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex shrink-0 rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2"
                  aria-label={`Balance insight: ${hint}`}
                />
              }
            >
              <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-3.5" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs p-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Balance insight</span>
                  <Badge variant="info-outline" size="xs">
                    Trend
                  </Badge>
                </div>
                <div className="flex flex-col gap-1 text-xs opacity-80">
                  <p>{hint}</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div
            className={cn(
              "flex items-center gap-1 text-xs tabular-nums",
              up ? "text-success" : "text-destructive"
            )}
          >
            {up ? (
              <HugeiconsIcon icon={ArrowUp02Icon} strokeWidth={2} className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <HugeiconsIcon icon={ArrowDown02Icon} strokeWidth={2} className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        ))}
    </div>
  )
})

const CustomerCell = memo(function CustomerCell({
  row,
}: {
  row: Row<DataGridFeatures, IEmployee>
}) {
  const o = row.original

  return (
    <div className="flex items-center gap-2">
      <div className="relative shrink-0">
        <Avatar className="size-8">
          <AvatarImage src={o.avatar} alt="" />
          <AvatarFallback>
            {o.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "ring-background absolute right-0 bottom-0.5 size-2 rounded-full ring-2",
            availabilityColor[o.availability]
          )}
          aria-hidden
        />
      </div>
      <div className="min-w-0">
        <div className="text-foreground line-clamp-1 font-medium">{o.name}</div>
        <div
          className="text-muted-foreground line-clamp-1 text-xs"
          title={o.email}
        >
          {o.email}
        </div>
      </div>
    </div>
  )
})

export function ActionsCell({
  row,
}: {
  row: Row<DataGridFeatures, IEmployee>
}) {
  const { copyToClipboard } = useCopyToClipboard()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleCopyId = () => {
    copyToClipboard(row.original.id)
    toast.success("Customer ID copied", { description: row.original.id })
  }

  const handleDeleteConfirm = () => {
    setDeleteOpen(false)
    toast.message("Delete requested", {
      description: `${row.original.name}. Wire to your API (demo).`,
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label="Row actions"
            />
          }
        >
          <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="start" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() =>
                toast.info("View profile", {
                  description: "Demo. Open detail route in your app.",
                })
              }
            >
              <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-4" aria-hidden="true" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.info("Edit customer", {
                  description: "Demo. Open your edit form.",
                })
              }
            >
              <HugeiconsIcon icon={PenIcon} strokeWidth={2} className="size-4" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyId}>
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="text-foreground font-medium">
                {row.original.name}
              </span>{" "}
              from the list. This action cannot be undone in production. Connect
              your API to persist changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export const columns: ColumnDef<DataGridFeatures, IEmployee>[] = [
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
    accessorKey: "name",
    id: "name",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <CustomerCell row={row} />,
    size: 220,
    enableSorting: true,
    enableHiding: false,
    enableResizing: true,
    minSize: 200,
    meta: {
      headerTitle: "Customer",
      autoSize: true,
    },
  },
  {
    accessorKey: "company",
    id: "company",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-1">
        <Item render={<span />} className="w-auto shrink-0 border-0 p-0">
          <ItemMedia variant="icon" className="size-auto">
            {row.original.companyLogo}
          </ItemMedia>
        </Item>
        <span className="text-foreground min-w-0 truncate font-medium">
          {row.original.company}
        </span>
      </div>
    ),
    size: 150,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Company",
    },
  },
  {
    accessorKey: "role",
    id: "role",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-foreground line-clamp-1 font-medium">
          {row.original.role}
        </span>
        {row.original.department && (
          <span className="text-muted-foreground line-clamp-1 text-xs">
            {row.original.department}
          </span>
        )}
      </div>
    ),
    size: 160,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Role",
    },
  },
  {
    accessorKey: "location",
    id: "location",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <img
            src={`https://flagcdn.com/${row.original.flag.toLowerCase()}.svg`}
            alt=""
            width={16}
            height={16}
            loading="lazy"
            decoding="async"
            className="size-4 shrink-0 rounded-full object-cover"
          />
          <span className="text-foreground line-clamp-1 font-medium">
            {row.original.location}
          </span>
        </div>
        {row.original.timezone && (
          <span className="text-muted-foreground line-clamp-1 text-xs tabular-nums">
            {row.original.timezone}
          </span>
        )}
      </div>
    ),
    size: 160,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Location",
    },
  },
  {
    accessorKey: "joined",
    id: "joined",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-foreground line-clamp-1 font-medium">
          {row.original.joined}
        </span>
        {row.original.tenureLabel && (
          <span className="text-muted-foreground line-clamp-1 text-xs">
            {row.original.tenureLabel}
          </span>
        )}
      </div>
    ),
    size: 150,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Joined",
    },
  },
  {
    accessorKey: "balance",
    id: "balance",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <BalanceCell row={row} />,
    size: 180,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Balance ($)",
    },
  },
  {
    accessorKey: "status",
    id: "status",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    size: 110,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Status",
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ActionsCell row={row} />,
    size: 50,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
  },
]