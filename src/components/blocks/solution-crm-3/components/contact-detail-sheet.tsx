import { useRef, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { LifecycleBadge } from "./columns"
import { activityIcon, type IContact } from "./data"
import { DotSeparator } from "./dot-separator"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, Mail01Icon } from "@hugeicons/core-free-icons"

interface ContactDetailSheetProps {
  contact: IContact | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogEmail: (contact: IContact) => void
}

function FactRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="text-muted-foreground min-w-0">{label}</dt>
      <dd className="text-foreground min-w-0 text-right font-medium break-words">
        {value}
      </dd>
    </div>
  )
}

export function ContactDetailSheet({
  contact,
  open,
  onOpenChange,
  onLogEmail,
}: ContactDetailSheetProps) {
  const sheetFocusRef = useRef<HTMLDivElement | null>(null)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={sheetFocusRef}
        side="right"
        showCloseButton={false}
        initialFocus={sheetFocusRef}
        tabIndex={-1}
        className="inset-y-4 right-4 left-auto h-[calc(100svh-2rem)] w-[min(26rem,calc(100vw-2rem))] max-w-none gap-0 overflow-hidden p-0 outline-none"
      >
        {contact ? (
          <>
            <SheetHeader className="shrink-0 gap-3 border-b px-4 pt-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-9 shrink-0">
                    <AvatarImage src={contact.avatar} alt="" />
                    <AvatarFallback>{contact.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-sm">
                      {contact.name}
                    </SheetTitle>
                    <SheetDescription className="truncate text-xs">
                      {contact.company}
                    </SheetDescription>
                  </div>
                </div>
                <SheetClose
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Close"
                      className="-me-1.5 -mt-1.5"
                    />
                  }
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
                </SheetClose>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LifecycleBadge lifecycle={contact.lifecycle} />
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  {activityIcon[contact.lastActivityType]}
                  <span>{contact.lastActivityType}</span>
                  <DotSeparator />
                  <span>{contact.lastActivityLabel}</span>
                </span>
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 px-4 py-4">
                  <section
                    className="flex flex-col gap-3"
                    aria-labelledby={`${contact.id}-summary`}
                  >
                    <h3
                      id={`${contact.id}-summary`}
                      className="text-foreground text-sm font-semibold"
                    >
                      Contact
                    </h3>
                    <dl className="flex flex-col gap-3">
                      <FactRow label="Email" value={contact.email} />
                      <FactRow label="Account" value={contact.company} />
                      <FactRow
                        label="Owner"
                        value={
                          <span className="flex items-center justify-end gap-1.5">
                            <Avatar className="size-5">
                              <AvatarImage src={contact.owner.avatar} alt="" />
                              <AvatarFallback className="text-[9px]">
                                {contact.owner.initials}
                              </AvatarFallback>
                            </Avatar>
                            {contact.owner.name}
                          </span>
                        }
                      />
                      <FactRow
                        label="Open deals"
                        value={
                          <span className="inline-flex items-center gap-1.5 tabular-nums">
                            {contact.openDeals === 0 ? (
                              "No open deals"
                            ) : (
                              <>
                                <span>{contact.openDeals}</span>
                                <DotSeparator />
                                <span>
                                  ${(contact.openDealsValue / 1000).toFixed(0)}K
                                </span>
                              </>
                            )}
                          </span>
                        }
                      />
                    </dl>
                  </section>
                </div>
              </ScrollArea>
            </div>

            <SheetFooter className="shrink-0 border-t px-4 py-3">
              <Button
                type="button"
                className="w-full"
                onClick={() => onLogEmail(contact)}
              >
                <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} className={cn("size-4")} aria-hidden="true" />
                Log Email
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}