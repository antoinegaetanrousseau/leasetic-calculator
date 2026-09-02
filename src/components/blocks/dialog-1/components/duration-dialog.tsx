"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Item, ItemMedia } from "@/components/ui/item"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DURATION_PRESETS,
  TIME_OPTIONS,
  type DurationPreset,
  type TimeOption,
} from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { ClockIcon, Tick02Icon, InformationCircleIcon } from "@hugeicons/core-free-icons"

type TimeValue = TimeOption["value"]
type DurationPresetId = DurationPreset["id"]
type SelectedPresetValue = DurationPresetId | ""

const TIME_OPTION_BY_VALUE = new Map(
  TIME_OPTIONS.map((option) => [option.value, option] as const)
)
const TIME_OPTION_BY_MINUTES = new Map(
  TIME_OPTIONS.map((option) => [option.minutes, option] as const)
)
const DURATION_PRESET_BY_ID = new Map(
  DURATION_PRESETS.map((preset) => [preset.id, preset] as const)
)
const DURATION_PRESET_BY_MINUTES = new Map(
  DURATION_PRESETS.map((preset) => [preset.minutes, preset] as const)
)

function getDurationMinutes(startTime: TimeValue, endTime: TimeValue) {
  const startMinutes = TIME_OPTION_BY_VALUE.get(startTime)?.minutes ?? 0
  const endMinutes = TIME_OPTION_BY_VALUE.get(endTime)?.minutes ?? 0
  const difference = endMinutes - startMinutes

  return difference <= 0 ? difference + 24 * 60 : difference
}

function getEndTimeForPreset(startTime: TimeValue, presetMinutes: number) {
  const startMinutes = TIME_OPTION_BY_VALUE.get(startTime)?.minutes ?? 0
  const totalMinutes = (startMinutes + presetMinutes) % (24 * 60)
  const nextOption = TIME_OPTION_BY_MINUTES.get(totalMinutes)

  return nextOption?.value ?? startTime
}

function getPresetIdForTimes(
  startTime: TimeValue,
  endTime: TimeValue
): SelectedPresetValue {
  const durationMinutes = getDurationMinutes(startTime, endTime)
  const preset = DURATION_PRESET_BY_MINUTES.get(durationMinutes)

  return preset?.id ?? ""
}

export function DurationDialog() {
  const [open, setOpen] = useState(true)
  const [startTime, setStartTime] = useState<TimeValue>("02:00")
  const [endTime, setEndTime] = useState<TimeValue>("02:30")
  const [selectedPresetId, setSelectedPresetId] =
    useState<SelectedPresetValue>("30-min")
  const selectedStartLabel =
    TIME_OPTION_BY_VALUE.get(startTime)?.label ?? startTime
  const selectedEndLabel = TIME_OPTION_BY_VALUE.get(endTime)?.label ?? endTime

  const handleStartTimeChange = (value: TimeValue) => {
    setStartTime(value)

    if (selectedPresetId) {
      const nextPreset = DURATION_PRESET_BY_ID.get(selectedPresetId)

      if (nextPreset) {
        setEndTime(getEndTimeForPreset(value, nextPreset.minutes))
      }

      return
    }

    const nextPresetId = getPresetIdForTimes(value, endTime)
    setSelectedPresetId(nextPresetId)
  }

  const handleEndTimeChange = (value: TimeValue) => {
    setEndTime(value)
    setSelectedPresetId(getPresetIdForTimes(startTime, value))
  }

  const handlePresetChange = (presetId: DurationPresetId) => {
    const nextPreset = DURATION_PRESET_BY_ID.get(presetId)

    if (!nextPreset) {
      return
    }

    setSelectedPresetId(presetId)
    setEndTime(getEndTimeForPreset(startTime, nextPreset.minutes))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Actions */}
      <div className="flex min-h-[320px] items-center justify-center">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setOpen(true)}
        >
          Launch dialog
        </Button>
      </div>

      {/* Content */}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="text-left">
          <div className="flex items-start gap-3 pr-8">
            <Item className="border-background bg-muted [&_svg]:text-accent-foreground flex size-10.5 shrink-0 items-center justify-center border-2 p-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] dark:border [&_svg]:size-5">
              <ItemMedia variant="icon" className="size-auto">
                <HugeiconsIcon icon={ClockIcon} strokeWidth={2} aria-hidden="true" />
              </ItemMedia>
            </Item>
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle>Select duration</DialogTitle>
              <DialogDescription>
                Pick a start and end time or use a quick preset.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-7 pt-3">
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field className="gap-2">
              <FieldLabel htmlFor="duration-start-time">
                Start time{" "}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Select
                value={startTime}
                onValueChange={(value) => {
                  if (value !== null) {
                    handleStartTimeChange(value as TimeValue)
                  }
                }}
              >
                <SelectTrigger id="duration-start-time" className="w-full">
                  <SelectValue placeholder="Select time">
                    {selectedStartLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field className="gap-2">
              <FieldLabel htmlFor="duration-end-time">
                End time{" "}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Select
                value={endTime}
                onValueChange={(value) => {
                  if (value !== null) {
                    handleEndTimeChange(value as TimeValue)
                  }
                }}
              >
                <SelectTrigger id="duration-end-time" className="w-full">
                  <SelectValue placeholder="Select time">
                    {selectedEndLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Quick duration</p>

            <ToggleGroup
              multiple={false}
              value={selectedPresetId ? [selectedPresetId] : []}
              onValueChange={(value) => {
                const nextPresetId = value[0]

                if (nextPresetId) {
                  handlePresetChange(nextPresetId as DurationPresetId)
                } else {
                  setSelectedPresetId("")
                }
              }}
              variant="outline"
              size="sm"
              spacing={2}
              className="grid w-full grid-cols-4"
              aria-label="Quick duration presets"
            >
              {DURATION_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id

                return (
                  <ToggleGroupItem
                    key={preset.id}
                    value={preset.id}
                    className={cn(
                      "relative w-full justify-center px-3 font-normal transition-colors",
                      isSelected && "font-medium"
                    )}
                  >
                    {isSelected ? (
                      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="absolute left-3 size-4" aria-hidden="true" />
                    ) : null}
                    <span className="min-w-0 text-center">{preset.label}</span>
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <TooltipProvider delay={150}>
              <Tooltip>
                <TooltipTrigger className="text-muted-foreground inline-flex w-fit items-center gap-1.5 text-sm outline-none">
                  <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4" aria-hidden="true" />
                  <span>Quick presets update the end time.</span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Pick any preset to keep the current start time and adjust the
                  end time automatically.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex w-full justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => setOpen(false)}>
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}