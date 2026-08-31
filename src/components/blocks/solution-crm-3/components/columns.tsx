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
import { Skeleton } from "@/components/ui/skeleton"
import {
  AccountLogo,
  activityIcon,
  lifecycleToneClass,
  type IContact,
  type Lifecycle,
} from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoreHorizontalCircle01Icon, ViewIcon, Mail01Icon, Copy01Icon, Delete02Icon } from "@hugeicons/core-free-icons"

export type ContactRowAction = "view" | "email" | "delete"

// ── Lifecycle stage badge (dot + outline, semantic tone) ──

export function LifecycleBadge({ lifecycle }: { lifecycle: Lifecycle }) {
  return (
    <Badge variant="outline">
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full!",
          lifecycleToneClass[lifecycle]
        )}
      />
      {lifecycle}
    </Badge>
  )
}

// ── Contact cell (avatar + name + email, data-grid-1 CustomerCell layout) ──

const ContactCell = memo(function ContactCell({
  row,
}: {
  row: Row<DataGridFeatures, IContact>
}) {
  const o = row.original

  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={o.avatar} alt="" />
        <AvatarFallback>{o.initials}</AvatarFallback>
      </Avatar>
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

// ── Owner cell (assigned rep) ──

const OwnerCell = memo(function OwnerCell({
  row,
}: {
  row: Row<DataGridFeatures, IContact>
}) {
  const { owner } = row.original

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="size-6 shrink-0">
        <AvatarImage src={owner.avatar} alt="" />
        <AvatarFallback className="text-[10px]">
          {owner.initials}
        </AvatarFallback>
      </Avatar>
      <span className="text-foreground min-w-0 truncate text-sm">
        {owner.name}
      </span>
    </div>
  )
})

// ── Actions cell ──

export function ActionsCell({
  row,
  onAction,
}: {
  row: Row<DataGridFeatures, IContact>
  onAction: (action: ContactRowAction, contact: IContact) => void
}) {
  const { copyToClipboard } = useCopyToClipboard()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleDeleteConfirm = () => {
    setDeleteOpen(false)
    onAction("delete", row.original)
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
              aria-label={`Actions for ${row.original.name}`}
            />
          }
        >
          <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onAction("view", row.original)}>
              <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-4" aria-hidden="true" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("email", row.original)}>
              <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
              Log Email
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                copyToClipboard(row.original.email)
                toast.success("Email copied", {
                  description: row.original.email,
                })
              }}
            >
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
              Copy Email
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
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="text-foreground font-medium">
                {row.original.name}
              </span>{" "}
              from {row.original.company}. Connect your API to persist changes.
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

// ── Column definitions ──

export function createContactColumns({
  onAction,
}: {
  onAction: (action: ContactRowAction, contact: IContact) => void
}): ColumnDef<DataGridFeatures, IContact>[] {
  return [
    {
      accessorKey: "id",
      id: "select",
      header: () => <DataGridTableRowSelectAll />,
      cell: ({ row }) => <DataGridTableRowSelect row={row} />,
      enableSorting: false,
      size: 40,
      enableResizing: false,
      enableHiding: false,
      meta: {
        skeleton: <Skeleton className="size-4 rounded-full" />,
      },
    },
    {
      accessorKey: "name",
      id: "name",
      header: ({ column }) => (
        <DataGridColumnHeader title="Name" visibility={true} column={column} />
      ),
      cell: ({ row }) => <ContactCell row={row} />,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      minSize: 220,
      meta: {
        autoSize: true,
        skeleton: (
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ),
      },
    },
    {
      accessorKey: "company",
      id: "company",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="Account"
          visibility={true}
          column={column}
        />
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Item
            variant="outline"
            size="xs"
            className="text-foreground size-7 shrink-0 justify-center p-0"
          >
            <ItemMedia variant="icon" className="size-auto">
              <AccountLogo company={row.original.company} className="size-4" />
            </ItemMedia>
          </Item>
          <span className="text-foreground min-w-0 truncate font-medium">
            {row.original.company}
          </span>
        </div>
      ),
      size: 180,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      meta: {
        skeleton: (
          <div className="flex min-w-0 items-center gap-2.5">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
        ),
      },
    },
    {
      accessorFn: (row) => row.owner.name,
      id: "owner",
      header: ({ column }) => (
        <DataGridColumnHeader title="Owner" visibility={true} column={column} />
      ),
      cell: ({ row }) => <OwnerCell row={row} />,
      size: 160,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      meta: {
        skeleton: (
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ),
      },
    },
    {
      accessorKey: "lifecycle",
      id: "lifecycle",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="Lifecycle"
          visibility={true}
          column={column}
        />
      ),
      cell: ({ row }) => <LifecycleBadge lifecycle={row.original.lifecycle} />,
      size: 130,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      meta: {
        skeleton: <Skeleton className="h-6 w-24 rounded-full" />,
      },
    },
    {
      accessorKey: "lastActivityLabel",
      id: "lastActivity",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="Last Activity"
          visibility={true}
          column={column}
        />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          {activityIcon[row.original.lastActivityType]}
          <span className="text-muted-foreground text-sm">
            {row.original.lastActivityLabel}
          </span>
        </div>
      ),
      size: 150,
      enableSorting: false,
      enableHiding: true,
      enableResizing: true,
      meta: {
        skeleton: (
          <div className="flex items-center gap-1.5">
            <Skeleton className="size-3.5 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ),
      },
    },
    {
      accessorKey: "openDealsValue",
      id: "openDeals",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="Open Deals"
          visibility={true}
          column={column}
        />
      ),
      cell: ({ row }) => {
        const { openDeals, openDealsValue } = row.original
        if (openDeals === 0) {
          return <span className="text-muted-foreground text-sm">No deals</span>
        }
        return (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-foreground text-sm font-semibold tabular-nums">
              ${(openDealsValue / 1000).toFixed(0)}K
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {openDeals} open
            </span>
          </div>
        )
      },
      size: 110,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      meta: {
        skeleton: (
          <div className="flex min-w-0 flex-col gap-0.5">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-3 w-10" />
          </div>
        ),
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <ActionsCell row={row} onAction={onAction} />,
      size: 60,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      meta: {
        skeleton: <Skeleton className="mx-auto size-7 rounded-full" />,
      },
    },
  ]
}