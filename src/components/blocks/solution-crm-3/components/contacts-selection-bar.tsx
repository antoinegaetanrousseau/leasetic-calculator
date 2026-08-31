import { Badge } from "@/components/reui/badge"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { OWNERS, type IOwner } from "./data"

interface ContactsSelectionBarProps {
  selectedCount: number
  ownerValue: string
  ownerOptions: IOwner[]
  onOwnerChange: (value: string) => void
  onAssign: () => void
  onAddToList: () => void
  onClear: () => void
}

export function ContactsSelectionBar({
  selectedCount,
  ownerValue,
  ownerOptions = OWNERS,
  onOwnerChange,
  onAssign,
  onAddToList,
  onClear,
}: ContactsSelectionBarProps) {
  return (
    <div className="bg-muted/30 flex flex-col gap-3 border-y px-(--frame-panel-header-px) py-(--frame-panel-header-py) lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Badge variant="primary-light">Group actions</Badge>
        <Badge variant="outline">{selectedCount} selected</Badge>
        <span className="text-muted-foreground text-sm">
          Assign an owner or add to a list.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <Select
          value={ownerValue}
          onValueChange={(value) => {
            if (!value) return
            onOwnerChange(value)
          }}
        >
          <SelectTrigger
            className="w-full sm:w-[190px]"
            aria-label="Assign owner"
          >
            <SelectValue placeholder="Assign owner" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {ownerOptions.map((option) => (
                <SelectItem key={option.name} value={option.name}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button type="button" variant="outline" onClick={onClear}>
          Deselect
        </Button>
        <Button type="button" variant="outline" onClick={onAddToList}>
          Add to list
        </Button>
        <Button type="button" onClick={onAssign}>
          Assign owner
        </Button>
      </div>
    </div>
  )
}