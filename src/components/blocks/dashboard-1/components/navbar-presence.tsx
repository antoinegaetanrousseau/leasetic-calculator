import { useState } from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { TEAM_EXTRA_COUNT, TEAM_MEMBERS } from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserAdd01Icon } from "@hugeicons/core-free-icons"

// Header presence controls with team avatars and invite action.

export function NavbarPresence() {
  const [email, setEmail] = useState("")
  const [open, setOpen] = useState(false)

  const handleInvite = () => {
    if (!email.trim()) return
    setEmail("")
    setOpen(false)
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <AvatarGroup>
        {TEAM_MEMBERS.map((member, index) => (
          <Avatar key={index} size="sm">
            <AvatarImage src={member.src} alt={member.name} />
            <AvatarFallback className="text-[9px]! font-medium">
              {member.initials}
            </AvatarFallback>
          </Avatar>
        ))}
        <AvatarGroupCount className="text-[10px]! font-medium">
          +{TEAM_EXTRA_COUNT}
        </AvatarGroupCount>
      </AvatarGroup>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Invite team member"
            />
          }
        >
          <HugeiconsIcon icon={UserAdd01Icon} strokeWidth={2} aria-hidden="true" />
        </PopoverTrigger>

        <PopoverContent sideOffset={7} align="end" className="w-72">
          <div className="flex flex-col gap-3">
            <h4 className="text-foreground text-sm">Invite team member</h4>

            <Input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <Button onClick={handleInvite} disabled={!email.trim()}>
              Send invite
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}