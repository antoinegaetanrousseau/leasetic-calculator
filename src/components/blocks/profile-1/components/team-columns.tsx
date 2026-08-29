"use client"

import { memo, useState } from "react"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { Badge, type BadgeProps } from "@/components/reui/badge"
import { type DataGridFeatures } from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { type ColumnDef, type Row } from "@tanstack/react-table"
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
import { type TeamMember, type TeamMemberStatus } from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoreHorizontalCircle01Icon, UserIcon, Shield01Icon, Mail01Icon, RefreshIcon, Copy01Icon, UserRemove01Icon } from "@hugeicons/core-free-icons"

const availabilityColor: Record<TeamMember["availability"], string> = {
  online: "bg-green-500",
  away: "bg-yellow-400",
  busy: "bg-red-500",
  offline: "bg-zinc-400 dark:bg-zinc-600",
}

const accessBadgeVariant: Record<TeamMember["access"], BadgeProps["variant"]> =
  {
    Owner: "primary-light",
    Admin: "info-light",
    Member: "outline",
  }

export const TeamStatusBadge = memo(function TeamStatusBadge({
  status,
}: {
  status: TeamMemberStatus
}) {
  if (status === "Active") {
    return <Badge variant="success-light">Active</Badge>
  }

  if (status === "Invited") {
    return <Badge variant="info-light">Invited</Badge>
  }

  if (status === "Limited") {
    return <Badge variant="warning-light">Limited</Badge>
  }

  return <Badge variant="destructive-light">Suspended</Badge>
})

const UserCell = memo(function UserCell({
  row,
}: {
  row: Row<DataGridFeatures, TeamMember>
}) {
  const user = row.original

  return (
    <div className="flex items-center gap-2">
      <div className="relative shrink-0">
        <Avatar className="size-8">
          <AvatarImage src={user.src} alt="" />
          <AvatarFallback>{user.initials}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "ring-background absolute right-0 bottom-0.5 size-2 rounded-full ring-2",
            availabilityColor[user.availability]
          )}
          aria-hidden
        />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-foreground line-clamp-1 text-sm font-medium">
            {user.name}
          </span>
          <Badge variant={accessBadgeVariant[user.access]} size="sm">
            {user.access}
          </Badge>
        </div>
        <div
          className="text-muted-foreground line-clamp-1 text-sm"
          title={user.email}
        >
          {user.email}
        </div>
      </div>
    </div>
  )
})

function ActionsCell({ row }: { row: Row<DataGridFeatures, TeamMember> }) {
  const { copyToClipboard } = useCopyToClipboard()
  const [removeOpen, setRemoveOpen] = useState(false)

  const handleCopyId = () => {
    copyToClipboard(row.original.id)
    toast.success("Member ID copied", { description: row.original.id })
  }

  const handleRemoveConfirm = () => {
    setRemoveOpen(false)
    toast.message("Removal requested", {
      description: `${row.original.name}. Wire this to your user API.`,
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground"
              aria-label={`Open ${row.original.name} actions`}
            />
          }
        >
          <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() =>
                toast.info("Open member", {
                  description:
                    "Show the profile and recent workspace activity.",
                })
              }
            >
              <HugeiconsIcon icon={UserIcon} strokeWidth={2} aria-hidden="true" />
              View member
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.info("Change role", {
                  description: "Open the role and seat management flow.",
                })
              }
            >
              <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} aria-hidden="true" />
              Change role
            </DropdownMenuItem>
            {row.original.status === "Invited" ? (
              <DropdownMenuItem
                onClick={() =>
                  toast.message("Invite resent", {
                    description: `A fresh invite was sent to ${row.original.email}.`,
                  })
                }
              >
                <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} aria-hidden="true" />
                Resend invite
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() =>
                  toast.message("Session reset", {
                    description: `Require ${row.original.name} to sign in again.`,
                  })
                }
              >
                <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} aria-hidden="true" />
                Reset session
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleCopyId}>
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} aria-hidden="true" />
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setRemoveOpen(true)}
            >
              <HugeiconsIcon icon={UserRemove01Icon} strokeWidth={2} aria-hidden="true" />
              Remove member
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{" "}
              <span className="text-foreground font-medium">
                {row.original.name}
              </span>{" "}
              from the workspace. Connect your user API to persist changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleRemoveConfirm}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export const teamColumns: ColumnDef<DataGridFeatures, TeamMember>[] = [
  {
    accessorKey: "name",
    id: "name",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <UserCell row={row} />,
    size: 300,
    enableSorting: true,
    enableHiding: false,
    enableResizing: true,
    meta: {
      headerTitle: "Member",
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
        <span className="text-foreground line-clamp-1 text-sm font-medium">
          {row.original.role}
        </span>
        <span className="text-muted-foreground line-clamp-1 text-sm">
          {row.original.department}
        </span>
      </div>
    ),
    size: 180,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Role",
    },
  },
  {
    accessorKey: "status",
    id: "status",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <TeamStatusBadge status={row.original.status} />,
    size: 120,
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