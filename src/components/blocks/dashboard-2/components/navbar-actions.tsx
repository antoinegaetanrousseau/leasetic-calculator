import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon, MoreHorizontalCircle01Icon, Copy01Icon, Share08Icon, Download01Icon, SettingsIcon } from "@hugeicons/core-free-icons"

// Navbar actions with a primary module action and overflow menu.

export function NavbarActions() {
  const handleAddModule = () => {
    toast.success("Add Module", {
      description: "Open your module creation dialog.",
    })
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button type="button" onClick={handleAddModule}>
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
        <span className="sr-only md:not-sr-only">Add Module</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="More options" />
          }
        >
          <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} aria-hidden="true" />
        </DropdownMenuTrigger>

        <DropdownMenuContent sideOffset={7} align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} aria-hidden="true" />
              Copy link
            </DropdownMenuItem>

            <DropdownMenuItem>
              <HugeiconsIcon icon={Share08Icon} strokeWidth={2} aria-hidden="true" />
              Share
            </DropdownMenuItem>

            <DropdownMenuItem>
              <HugeiconsIcon icon={Download01Icon} strokeWidth={2} aria-hidden="true" />
              Export
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <HugeiconsIcon icon={SettingsIcon} strokeWidth={2} aria-hidden="true" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}