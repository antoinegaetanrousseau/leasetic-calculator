"use client"

import { Field } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { type SelectOption } from "./data"

export function MemberAdvancedSelectField({
  id,
  options,
  defaultValue,
}: {
  id: string
  options: SelectOption[]
  defaultValue: SelectOption
}) {
  return (
    <Field className="w-full">
      <Select defaultValue={defaultValue} items={options}>
        <SelectTrigger id={id} className="w-full [&_small]:hidden">
          <SelectValue>
            {(item: SelectOption | null) =>
              item ? (
                <span className="flex flex-col items-start gap-px">
                  <span className="font-medium">{item.label}</span>
                  <small className="text-muted-foreground text-sm">
                    {item.description}
                  </small>
                </span>
              ) : null
            }
          </SelectValue>
        </SelectTrigger>

        <SelectContent align="end" className="w-(--anchor-width)">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option}
                className="[&_svg]:text-primary"
              >
                <span className="flex flex-col items-start gap-px">
                  <span className="font-medium">{option.label}</span>
                  <small className="text-muted-foreground text-sm">
                    {option.description}
                  </small>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

export function MemberCompactSelectField({
  id,
  options,
  defaultValue,
}: {
  id: string
  options: SelectOption[]
  defaultValue: SelectOption
}) {
  return (
    <Select defaultValue={defaultValue} items={options}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue>
          {(item: SelectOption | null) => item?.label ?? null}
        </SelectValue>
      </SelectTrigger>

      {/* Content */}
      <SelectContent className="w-(--anchor-width)">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}