import { Fragment } from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { Field } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { TEAM_MEMBERS, TIMEZONE_GROUPS, type SelectOption } from "./data"

const BILLING_APPROVER_OPTIONS = TEAM_MEMBERS.map((member) => ({
  ...member,
  position: member.role,
}))

export function ProfileAdvancedSelectField({
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

export function ProfileCompactSelectField({
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

export function ProfileTimezoneField({
  id,
  placeholder = "Select a timezone",
}: {
  id?: string
  placeholder?: string
}) {
  return (
    <Field className="w-full">
      <Combobox
        items={TIMEZONE_GROUPS}
        defaultValue={TIMEZONE_GROUPS[0]?.items[0]}
      >
        <ComboboxInput id={id} placeholder={placeholder} className="w-full" />
        <ComboboxContent className="w-(--anchor-width) min-w-(--anchor-width)">
          <ComboboxEmpty>No timezones found.</ComboboxEmpty>
          <ComboboxList>
            {(group) => (
              <ComboboxGroup key={group.value} items={group.items}>
                <ComboboxLabel>{group.value}</ComboboxLabel>
                <ComboboxCollection>
                  {(item) => (
                    <ComboboxItem key={item} value={item}>
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  )
}

export function BillingApproversCombobox() {
  const anchor = useComboboxAnchor()

  return (
    <Field className="w-full">
      <Combobox
        multiple
        items={BILLING_APPROVER_OPTIONS}
        itemToStringValue={(
          member: (typeof BILLING_APPROVER_OPTIONS)[number]
        ) => member.name}
        defaultValue={[
          BILLING_APPROVER_OPTIONS[0],
          BILLING_APPROVER_OPTIONS[1],
          BILLING_APPROVER_OPTIONS[4],
        ]}
      >
        <ComboboxChips
          ref={anchor}
          className="w-full has-data-[slot=combobox-chip]:pl-1"
        >
          <ComboboxValue>
            {(selectedMembers: (typeof BILLING_APPROVER_OPTIONS)[number][]) => (
              <Fragment>
                {selectedMembers.map((member) => (
                  <ComboboxChip
                    key={member.id}
                    showRemove={true}
                    className="gap-1.5 rounded-full"
                  >
                    <Avatar className="size-4">
                      <AvatarImage src={member.src} alt={member.name} />
                      <AvatarFallback className="text-[8px]">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    {member.name}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder="Add approvers..." />
              </Fragment>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent
          anchor={anchor}
          className="max-w-(--anchor-width) min-w-(--anchor-width)"
        >
          <ComboboxEmpty>No members found.</ComboboxEmpty>
          <ComboboxList>
            {(member) => (
              <ComboboxItem key={member.id} value={member}>
                <Item size="xs" className="p-0">
                  <Avatar className="size-6">
                    <AvatarImage src={member.src} alt={member.name} />
                    <AvatarFallback>{member.initials}</AvatarFallback>
                  </Avatar>
                  <ItemContent>
                    <ItemTitle className="whitespace-nowrap">
                      {member.name}
                    </ItemTitle>
                    <ItemDescription>{member.position}</ItemDescription>
                  </ItemContent>
                </Item>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  )
}

export function BillingAmountField({
  id,
  placeholder = "0.00",
}: {
  id: string
  placeholder?: string
}) {
  return (
    <Field className="w-full">
      {/* List */}
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>$</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput id={id} type="number" placeholder={placeholder} />
        <InputGroupAddon align="inline-end">
          <InputGroupText>USD</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}