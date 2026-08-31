"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { WORKSPACES, type Workspace } from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon, MoreHorizontalCircle01Icon, PlusSignIcon } from "@hugeicons/core-free-icons"

function getWorkspaceInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}

// Leasetic propeller mark (public/logo-mark.svg): four ellipse blades
// pinwheeling around a shared centre — never rebuilt from scratch, never
// recoloured outside the documented lockup variants.
function SidebarLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex size-6 shrink-0 items-center justify-center",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, no theme switch needed */}
      <img src="/logo-mark.svg" alt="" width={20} height={20} />
    </span>
  )
}

function WorkspaceAvatar({
  workspace,
  className,
  size = "default",
}: {
  workspace: Workspace
  className?: string
  size?: "default" | "sm" | "lg"
}) {
  const initials = getWorkspaceInitials(workspace.name)
  return (
    <Avatar size={size} className={cn("size-6! shrink-0", className)}>
      {workspace.imageUrl ? (
        <AvatarImage
          src={workspace.imageUrl}
          alt={workspace.name}
          className="rounded-md"
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "rounded-md text-sm",
          workspace.avatarClassName ?? "bg-primary text-primary-foreground"
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

function WorkspaceItem({
  workspace,
  isActive,
  onSelect,
}: {
  workspace: Workspace
  isActive: boolean
  onSelect: (ws: Workspace) => void
}) {
  return (
    <DropdownMenuItem onClick={() => onSelect(workspace)}>
      <WorkspaceAvatar workspace={workspace} />
      <div className="flex items-center gap-1">
        <span className="truncate text-sm">{workspace.name}</span>
      </div>
      {isActive && (
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} aria-hidden="true" className="ml-auto size-3.5" />
      )}
    </DropdownMenuItem>
  )
}

export function WorkspaceSwitcher() {
  const [active, setActive] = useState<Workspace>(WORKSPACES[0])

  return (
    <SidebarMenu>
      {/* Sidebar */}
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="h-9"
                aria-label="Switch workspace"
              />
            }
          >
            <SidebarLogo className="transition-[margin] duration-300 ease-in-out in-data-[state=collapsed]:-ml-1" />
            <div className="truncate font-semibold">{active.name}</div>
            <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} aria-hidden="true" className="ml-auto size-3.5 opacity-60" />
          </DropdownMenuTrigger>

          <DropdownMenuContent side="bottom" align="start" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuGroup>
                {WORKSPACES.map((ws) => (
                  <WorkspaceItem
                    key={ws.id}
                    workspace={ws}
                    isActive={active.id === ws.id}
                    onSelect={setActive}
                  />
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} aria-hidden="true" className="mx-1 size-4" />
                <div className="flex flex-col items-start">
                  <span className="text-sm">New Workspace</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    Collaborate with others.
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}