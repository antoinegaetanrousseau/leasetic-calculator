"use client"

import { Fragment, useState } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { MEMBER_SESSIONS, TOAST_SUCCESS_ICON } from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { LogoutSquare01Icon } from "@hugeicons/core-free-icons"

function DotSeparator() {
  return (
    <span
      className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
      aria-hidden="true"
    />
  )
}

export function SessionsTabContent() {
  const [sessions, setSessions] = useState(MEMBER_SESSIONS)

  const handleRevoke = (id: string, device: string) => {
    setSessions((current) => current.filter((session) => session.id !== id))
    toast.success("Session revoked", {
      description: `${device} signed out. ${id} cannot reconnect.`,
      icon: TOAST_SUCCESS_ICON,
    })
  }

  const handleRevokeOthers = () => {
    setSessions((current) => current.filter((session) => session.current))
    toast.success("Other sessions revoked", {
      description: "Only the current Chrome on macOS session stays signed in.",
      icon: TOAST_SUCCESS_ICON,
    })
  }

  const others = sessions.filter((session) => !session.current).length

  return (
    <div className="space-y-4">
      <Frame spacing="sm" className="text-foreground">
        <FrameHeader>
          <FrameTitle className="capitalize">Active Sessions</FrameTitle>
          <FrameDescription className="dark:text-foreground/70 flex items-center gap-1.5">
            <span>{sessions.length} signed in</span>
            <DotSeparator />
            <span>1 current</span>
          </FrameDescription>
        </FrameHeader>

        <FramePanel className="px-5 py-2">
          {sessions.length > 0 ? (
            <div className="flex flex-col">
              {sessions.map((session, index) => (
                <Fragment key={session.id}>
                  {index > 0 ? <Separator /> : null}

                  <Item size="sm" className="px-0">
                    <ItemMedia variant="icon">
                      <Item className="border-background bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center border-2 p-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] dark:border [&_svg]:size-4">
                        {session.icon}
                      </Item>
                    </ItemMedia>

                    <ItemContent className="min-w-0 gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ItemTitle>{session.device}</ItemTitle>
                        {session.current ? (
                          <Badge variant="success-light">Current</Badge>
                        ) : null}
                      </div>
                      <ItemDescription className="flex items-center gap-1.5">
                        <span>{session.city}</span>
                        <DotSeparator />
                        <span>{session.ip}</span>
                      </ItemDescription>
                      <p className="text-muted-foreground truncate text-sm">
                        Last seen {session.lastSeen}
                      </p>
                    </ItemContent>

                    <ItemActions className="self-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={session.current}
                        onClick={() => handleRevoke(session.id, session.device)}
                      >
                        Revoke
                      </Button>
                    </ItemActions>
                  </Item>
                </Fragment>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No active sessions. New sign-ins from Nora Vale land here.
            </div>
          )}
        </FramePanel>

        <FrameFooter className="flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={others === 0}
            onClick={handleRevokeOthers}
          >
            <HugeiconsIcon icon={LogoutSquare01Icon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
            Revoke Other Sessions
          </Button>
        </FrameFooter>
      </Frame>
    </div>
  )
}