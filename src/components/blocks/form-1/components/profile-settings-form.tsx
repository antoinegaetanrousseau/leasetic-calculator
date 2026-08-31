"use client"

import { Fragment, useState, type FormEvent, type ReactNode } from "react"
import { Badge } from "@/components/reui/badge"
import { format } from "date-fns"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  AVAILABILITY_TIME_SLOTS,
  DEFAULT_PROFILE_FORM_VALUES,
  PROFILE_FORM_ACTIONS,
  SPECIALTY_OPTIONS,
  VISIBILITY_OPTIONS,
  type ProfileSelectOption,
} from "./data"
import { ProfilePhotoUpload } from "./profile-photo-upload"
import { SettingRow } from "./setting-row"
import { HugeiconsIcon } from "@hugeicons/react"
import { UndoIcon, CheckmarkCircle02Icon, SparklesIcon, Calendar04Icon, ClockIcon, FloppyDiskIcon } from "@hugeicons/core-free-icons"

const FORM_ID = "form-1-profile-settings"

function getOptionLabel(options: ProfileSelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

type ProfileToastKind = "success" | "info"

function getToastIcon(kind: ProfileToastKind) {
  if (kind === "info") {
    return (
      <HugeiconsIcon icon={UndoIcon} strokeWidth={2} className="text-info-foreground size-4 shrink-0" aria-hidden="true" />
    )
  }

  return (
    <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="text-success size-4 shrink-0" aria-hidden="true" />
  )
}

function ToastTitle({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <span className="flex items-center gap-2">
      {icon}
      <span className="min-w-0">{children}</span>
    </span>
  )
}

function ToastDescription({ children }: { children: string }) {
  return (
    <span className="grid grid-cols-[1rem_1fr] gap-2">
      <span aria-hidden="true" />
      <span>{children}</span>
    </span>
  )
}

function showProfileToast(
  title: string,
  description: string,
  kind: ProfileToastKind = "success"
) {
  const toastTitle = <ToastTitle icon={getToastIcon(kind)}>{title}</ToastTitle>
  const options = {
    description: <ToastDescription>{description}</ToastDescription>,
    icon: null,
  }

  if (kind === "info") {
    toast.message(toastTitle, options)
    return
  }

  toast.success(toastTitle, options)
}

export function ProfileSettingsForm() {
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    () => new Date(DEFAULT_PROFILE_FORM_VALUES.birthDate)
  )
  const [availabilityDate, setAvailabilityDate] = useState<Date | undefined>(
    () => new Date(DEFAULT_PROFILE_FORM_VALUES.availabilityDate)
  )
  const [availabilityTime, setAvailabilityTime] = useState<string | undefined>(
    DEFAULT_PROFILE_FORM_VALUES.availabilityTime
  )
  const [visibility, setVisibility] = useState(
    DEFAULT_PROFILE_FORM_VALUES.visibility
  )
  const specialtyAnchor = useComboboxAnchor()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    showProfileToast(
      "Profile settings saved",
      "Identity and availability details were updated."
    )
  }

  return (
    <TooltipProvider>
      <Card className="w-full max-w-2xl gap-0 p-0">
        {/* Header */}
        <CardHeader className="gap-1 px-5 py-5 sm:px-6">
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Identity and availability.</CardDescription>
          <CardAction className="self-center">
            <Badge variant="warning-light" size="default" className="shrink-0">
              <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} aria-hidden="true" />
              84% complete
            </Badge>
          </CardAction>
        </CardHeader>

        <Separator />

        {/* Content */}
        <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
          <form id={FORM_ID} onSubmit={handleSubmit}>
            <FieldSet className="gap-0">
              <FieldLegend className="sr-only">Profile settings</FieldLegend>
              <FieldDescription className="sr-only">
                Update profile details, visibility, and availability.
              </FieldDescription>

              <FieldGroup className="gap-5">
                <SettingRow title="Photo" align="start">
                  <ProfilePhotoUpload
                    defaultAvatar={DEFAULT_PROFILE_FORM_VALUES.avatarSrc}
                    alt={DEFAULT_PROFILE_FORM_VALUES.avatarAlt}
                    inputId="form-1-profile-photo"
                  />
                </SettingRow>

                <SettingRow title="Full Name" labelFor="form-1-full-name">
                  <Input
                    id="form-1-full-name"
                    defaultValue={DEFAULT_PROFILE_FORM_VALUES.fullName}
                  />
                </SettingRow>

                <SettingRow
                  title="Birth Date"
                  hint="Used for age-gated recovery checks."
                  labelFor="form-1-birth-date"
                >
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          id="form-1-birth-date"
                          variant="outline"
                          className="w-full justify-between font-normal"
                        >
                          <span
                            className={cn(
                              "truncate",
                              !birthDate && "text-muted-foreground"
                            )}
                          >
                            {birthDate
                              ? format(birthDate, "LLL dd, y")
                              : "Pick a date"}
                          </span>
                          <HugeiconsIcon icon={Calendar04Icon} strokeWidth={2} data-icon="inline-end" aria-hidden="true" className="text-muted-foreground/80" />
                        </Button>
                      }
                    />
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={birthDate}
                        onSelect={setBirthDate}
                        defaultMonth={birthDate}
                      />
                    </PopoverContent>
                  </Popover>
                </SettingRow>

                <SettingRow
                  title="Availability Date"
                  hint="Shown on public booking surfaces."
                  labelFor="form-1-availability"
                >
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          id="form-1-availability"
                          variant="outline"
                          className="w-full justify-between font-normal"
                        >
                          <span
                            className={cn(
                              "truncate",
                              !availabilityDate && "text-muted-foreground"
                            )}
                          >
                            {availabilityDate
                              ? format(availabilityDate, "PPP") +
                                (availabilityTime
                                  ? ` - ${availabilityTime}`
                                  : "")
                              : "Pick date and time"}
                          </span>
                          <HugeiconsIcon icon={Calendar04Icon} strokeWidth={2} data-icon="inline-end" aria-hidden="true" className="text-muted-foreground/80" />
                        </Button>
                      }
                    />
                    <PopoverContent
                      className="w-auto gap-0 p-0 pt-1"
                      align="start"
                    >
                      <div className="flex max-sm:flex-col">
                        <Calendar
                          mode="single"
                          selected={availabilityDate}
                          onSelect={(newDate: Date | undefined) => {
                            if (newDate) {
                              setAvailabilityDate(newDate)
                              setAvailabilityTime(undefined)
                            }
                          }}
                          defaultMonth={availabilityDate}
                          className="p-2 sm:pe-5"
                        />

                        <div className="relative w-full max-sm:h-48 sm:w-40">
                          <div className="absolute inset-0 py-4 max-sm:border-t">
                            <ScrollArea className="h-full sm:border-s">
                              <div className="flex flex-col gap-3">
                                <div className="flex h-5 shrink-0 items-center px-5">
                                  <p className="text-sm font-medium">
                                    {availabilityDate
                                      ? format(availabilityDate, "EEEE, d")
                                      : "Pick a date"}
                                  </p>
                                </div>

                                <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                                  {AVAILABILITY_TIME_SLOTS.map(
                                    ({ time, available }) => (
                                      <Button
                                        key={time}
                                        type="button"
                                        variant={
                                          availabilityTime === time
                                            ? "default"
                                            : "outline"
                                        }
                                        size="sm"
                                        className="w-full"
                                        onClick={() =>
                                          setAvailabilityTime(time)
                                        }
                                        disabled={!available}
                                      >
                                        {time}
                                      </Button>
                                    )
                                  )}
                                </div>
                              </div>
                            </ScrollArea>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </SettingRow>

                <SettingRow title="Company" labelFor="form-1-company">
                  <Input
                    id="form-1-company"
                    defaultValue={DEFAULT_PROFILE_FORM_VALUES.company}
                  />
                </SettingRow>

                <SettingRow
                  title="Specialties"
                  labelFor="form-1-specialties"
                  align="start"
                >
                  <Combobox
                    multiple
                    autoHighlight
                    items={SPECIALTY_OPTIONS}
                    defaultValue={[...DEFAULT_PROFILE_FORM_VALUES.specialties]}
                  >
                    <ComboboxChips ref={specialtyAnchor} className="w-full">
                      <ComboboxValue>
                        {(values) => (
                          <Fragment>
                            {values.map((value: string) => (
                              <ComboboxChip key={value}>{value}</ComboboxChip>
                            ))}
                            <ComboboxChipsInput
                              id="form-1-specialties"
                              placeholder="Add specialties..."
                            />
                          </Fragment>
                        )}
                      </ComboboxValue>
                    </ComboboxChips>
                    <ComboboxContent anchor={specialtyAnchor}>
                      <ComboboxEmpty>No specialties found.</ComboboxEmpty>
                      <ComboboxList>
                        {(item) => (
                          <ComboboxItem key={item} value={item}>
                            {item}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </SettingRow>

                <SettingRow
                  title="Dismissal Time"
                  hint="Daily notification cutoff."
                  labelFor="form-1-dismissal-time"
                >
                  <InputGroup className="w-full">
                    <InputGroupInput
                      id="form-1-dismissal-time"
                      type="time"
                      step="60"
                      defaultValue={DEFAULT_PROFILE_FORM_VALUES.dismissalTime}
                      className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                    <InputGroupAddon>
                      <HugeiconsIcon icon={ClockIcon} strokeWidth={2} aria-hidden="true" />
                    </InputGroupAddon>
                  </InputGroup>
                </SettingRow>

                <SettingRow title="Phone Number" labelFor="form-1-phone">
                  <Input
                    id="form-1-phone"
                    type="tel"
                    defaultValue={DEFAULT_PROFILE_FORM_VALUES.phone}
                    placeholder="+1 (555) 000-0000"
                  />
                </SettingRow>

                <SettingRow title="Visibility" labelFor="form-1-visibility">
                  <Select
                    value={visibility}
                    onValueChange={(value) => value && setVisibility(value)}
                  >
                    <SelectTrigger id="form-1-visibility" className="w-full">
                      <SelectValue>
                        {getOptionLabel(VISIBILITY_OPTIONS, visibility)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {VISIBILITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </SettingRow>

                <SettingRow
                  title="Availability"
                  labelFor="form-1-available-to-hire"
                >
                  <Field orientation="horizontal" className="w-auto gap-2">
                    <Switch
                      id="form-1-available-to-hire"
                      defaultChecked={
                        DEFAULT_PROFILE_FORM_VALUES.availableToHire
                      }
                    />
                    <FieldLabel
                      htmlFor="form-1-available-to-hire"
                      className="font-normal"
                    >
                      Available to hire
                    </FieldLabel>
                  </Field>
                </SettingRow>
              </FieldGroup>
            </FieldSet>
          </form>
        </CardContent>

        {/* Footer */}
        <CardFooter className="flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <CardDescription>Changes stay private until saved.</CardDescription>

          <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                showProfileToast(
                  "Changes discarded",
                  "The preview values were restored.",
                  "info"
                )
              }
            >
              <HugeiconsIcon icon={UndoIcon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
              {PROFILE_FORM_ACTIONS.cancel}
            </Button>
            <Button type="submit" form={FORM_ID}>
              <HugeiconsIcon icon={FloppyDiskIcon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
              {PROFILE_FORM_ACTIONS.submit}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider>
  )
}