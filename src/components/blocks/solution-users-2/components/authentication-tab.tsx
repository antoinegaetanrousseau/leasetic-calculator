import { Fragment } from "react"
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
import { AUTH_FACTORS, AUTH_SIGNALS, TOAST_INFO_ICON } from "./data"
import { MemberSummaryFrame } from "./member-summary-frames"
import { HugeiconsIcon } from "@hugeicons/react"
import { Mail01Icon, RefreshIcon } from "@hugeicons/core-free-icons"

export function AuthenticationTabContent() {
  const handleReset2fa = () => {
    toast("Two-factor reset sent", {
      description: "Nora Vale must re-enroll a factor before the next sign-in.",
      icon: TOAST_INFO_ICON,
    })
  }

  const handleResendInvite = () => {
    toast("Invite resent", {
      description:
        "A fresh link goes to nora.vale@acmecloud.com. Expires in 7 days.",
      icon: TOAST_INFO_ICON,
    })
  }

  return (
    <div className="space-y-4">
      <Frame spacing="sm" className="text-foreground">
        <FrameHeader>
          <FrameTitle className="capitalize">Authentication Factors</FrameTitle>
          <FrameDescription className="dark:text-foreground/70">
            2 of 3 factors enabled.
          </FrameDescription>
        </FrameHeader>

        <FramePanel className="px-5 py-2">
          <div className="flex flex-col">
            {AUTH_FACTORS.map((factor, index) => (
              <Fragment key={factor.id}>
                {index > 0 ? <Separator /> : null}

                <Item size="sm" className="px-0">
                  <ItemMedia variant="icon">
                    <Item className="border-background bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center border-2 p-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] dark:border [&_svg]:size-4">
                      {factor.icon}
                    </Item>
                  </ItemMedia>

                  <ItemContent className="min-w-0 gap-1">
                    <ItemTitle>{factor.name}</ItemTitle>
                    <ItemDescription>{factor.detail}</ItemDescription>
                  </ItemContent>

                  <ItemActions className="self-center">
                    <Badge variant={factor.badge.variant}>
                      {factor.badge.label}
                    </Badge>
                  </ItemActions>
                </Item>
              </Fragment>
            ))}
          </div>
        </FramePanel>

        <FrameFooter className="flex-row justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleResendInvite}>
            <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
            Resend Invite
          </Button>
          <Button type="button" onClick={handleReset2fa}>
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
            Reset 2FA
          </Button>
        </FrameFooter>
      </Frame>

      <MemberSummaryFrame
        title="Sign-in security"
        description="Password, SSO, and recovery state."
        items={AUTH_SIGNALS}
      />
    </div>
  )
}