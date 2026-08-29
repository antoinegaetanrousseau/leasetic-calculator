import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { COLLABORATORS, COLLABORATORS_EXTRA_COUNT } from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon } from "@hugeicons/core-free-icons"

// ── Navbar collaborators (avatar stack + count + add) ──

export function NavbarCollaborators() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button className="group/fab relative flex h-7 w-7 items-center overflow-hidden rounded-full px-3 transition-[width] duration-300 ease-in-out hover:w-32">
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 group-hover/fab:left-3 group-hover/fab:translate-x-0" />
        <span className="ml-8 pr-2 whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover/fab:opacity-100">
          Create New
        </span>
      </Button>

      <Separator orientation="vertical" className="my-auto h-4" />

      {/* List */}
      <AvatarGroup>
        {COLLABORATORS.map((person, index) => (
          <Avatar key={index} size="sm">
            <AvatarImage src={person.src} alt={person.initials} />
            <AvatarFallback className="text-xs">
              {person.initials}
            </AvatarFallback>
          </Avatar>
        ))}
        <AvatarGroupCount>+{COLLABORATORS_EXTRA_COUNT}</AvatarGroupCount>
      </AvatarGroup>
    </div>
  )
}