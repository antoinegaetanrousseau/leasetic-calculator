import { useState } from "react"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"

import { SEAT_LIMIT_OPTIONS } from "./data"

export function BillingSeatSelectionCards() {
  const [selectedSeatLimit, setSelectedSeatLimit] = useState(
    SEAT_LIMIT_OPTIONS[1]?.value ?? ""
  )

  return (
    <FieldGroup className="grid w-full gap-3 md:grid-cols-3">
      {SEAT_LIMIT_OPTIONS.map((option) => {
        const checked = option.value === selectedSeatLimit
        const inputId = `billing-seat-${option.value}`

        return (
          <FieldLabel
            key={option.value}
            htmlFor={inputId}
            className="relative flex h-full w-full min-w-0 cursor-pointer p-0"
          >
            <Field
              orientation="horizontal"
              className={cn(
                "relative h-full w-full px-2 py-2 shadow-xs transition-colors",
                checked
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/70 hover:bg-muted/40"
              )}
            >
              <Checkbox
                id={inputId}
                checked={checked}
                onCheckedChange={(nextChecked) => {
                  if (nextChecked) {
                    setSelectedSeatLimit(option.value)
                  }
                }}
                aria-label={option.label}
                className="absolute -top-2 -right-2 size-5 rounded-full border-none shadow-none"
              />

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <FieldTitle className="text-sm font-medium">
                  {option.label}
                </FieldTitle>
                <FieldDescription className="line-clamp-2 text-sm leading-5">
                  {option.description}
                </FieldDescription>
              </div>
            </Field>
          </FieldLabel>
        )
      })}
    </FieldGroup>
  )
}