import { type ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import { HelpCircleIcon } from "@hugeicons/core-free-icons"

interface SettingRowProps {
  title: string
  hint?: ReactNode
  children: ReactNode
  labelFor?: string
  align?: "center" | "start"
  contentClassName?: string
}

function SettingHintTooltip({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            aria-label={label}
          />
        }
      >
        <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-56 text-xs leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

export function SettingRow({
  title,
  hint,
  children,
  labelFor,
  align = "center",
  contentClassName,
}: SettingRowProps) {
  return (
    <Field
      orientation="responsive"
      className={cn(
        "gap-3 @md/field-group:gap-6",
        align === "start"
          ? "@md/field-group:has-[>[data-slot=field-content]]:items-start"
          : "@md/field-group:has-[>[data-slot=field-content]]:items-center"
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5 @md/field-group:w-2/5 @md/field-group:basis-2/5 @md/field-group:pr-4">
        <div className="flex min-w-0 items-center gap-1.5">
          {labelFor ? (
            <FieldLabel htmlFor={labelFor}>{title}</FieldLabel>
          ) : (
            <FieldTitle>{title}</FieldTitle>
          )}
          {hint ? (
            <SettingHintTooltip label={`${title} details`}>
              {hint}
            </SettingHintTooltip>
          ) : null}
        </div>
      </div>

      <FieldContent
        className={cn(
          "w-full min-w-0 @md/field-group:w-3/5 @md/field-group:basis-3/5",
          contentClassName
        )}
      >
        {children}
      </FieldContent>
    </Field>
  )
}