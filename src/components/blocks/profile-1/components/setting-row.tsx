import { type ReactNode } from "react"

import { cn } from "@/lib/utils"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldSeparator,
  FieldTitle,
} from "@/components/ui/field"

interface SettingRowProps {
  title: string
  description?: ReactNode
  children: ReactNode
  last?: boolean
  compact?: boolean
  stacked?: boolean
  labelFor?: string
  contentClassName?: string
  titleAddon?: ReactNode
}

export function SettingRow({
  title,
  description,
  children,
  last,
  compact,
  stacked,
  labelFor,
  contentClassName,
  titleAddon,
}: SettingRowProps) {
  return (
    <>
      <Field
        orientation={stacked ? "vertical" : "responsive"}
        className="gap-4 px-5 py-4"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 @md/field-group:max-w-sm">
          <div className="flex flex-wrap items-center gap-2">
            {labelFor ? (
              <FieldLabel htmlFor={labelFor}>
                <span className="capitalize">{title}</span>
              </FieldLabel>
            ) : (
              <FieldTitle>
                <span className="capitalize">{title}</span>
              </FieldTitle>
            )}
            {titleAddon}
          </div>

          {description ? (
            <FieldDescription className="text-sm">
              {description}
            </FieldDescription>
          ) : null}
        </div>

        <FieldContent
          className={cn(
            "w-full min-w-0 @md/field-group:flex-1",
            stacked
              ? "max-w-none"
              : compact
                ? "@md/field-group:max-w-[17rem] @md/field-group:shrink-0"
                : "@md/field-group:max-w-[34rem]",
            contentClassName
          )}
        >
          <div
            className={cn(
              "flex w-full justify-start",
              stacked ? "justify-start" : "@md/field-group:justify-end"
            )}
          >
            {children}
          </div>
        </FieldContent>
      </Field>

      {!last ? <FieldSeparator /> : null}
    </>
  )
}