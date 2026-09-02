import { useState } from "react"

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
import { Search01Icon, StarIcon, MoreHorizontalCircle01Icon, Share08Icon, Copy01Icon, SettingsIcon } from "@hugeicons/core-free-icons"

// ── Header actions (search, star, more) ──

export function NavbarActions() {
  const [starred, setStarred] = useState(false)

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button variant="ghost" size="icon-sm">
        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={starred ? "Unstar" : "Star"}
        onClick={() => setStarred((s) => !s)}
      >
        <HugeiconsIcon icon={StarIcon} strokeWidth={2} className={starred ? "fill-amber-500 text-amber-500" : undefined} aria-hidden="true" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} aria-hidden="true" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <HugeiconsIcon icon={Share08Icon} strokeWidth={2} className="opacity-60" aria-hidden="true" />
              Share
            </DropdownMenuItem>

            <DropdownMenuItem>
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="opacity-60" aria-hidden="true" />
              Copy link
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <HugeiconsIcon icon={SettingsIcon} strokeWidth={2} className="opacity-60" aria-hidden="true" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}