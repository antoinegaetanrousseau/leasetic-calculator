import type { ReactNode } from "react"
import { Badge } from "@/components/reui/badge"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  STAGE_STATUSES,
  STATUS_LABEL,
  WORKFLOWS,
  type StageStatus,
} from "./data"
import { StatusDot, StatusGlyph } from "./run-board-cells"
import { HugeiconsIcon } from "@hugeicons/react"
import { HelpCircleIcon, SlidersHorizontalIcon } from "@hugeicons/core-free-icons"

/** How much of the left pane the board gives up to the timeline. */
type TreeMode = "full" | "compact" | "hidden"

interface BoardSettings {
  criticalOnly: boolean
  scheduleHints: boolean
  rowLines: boolean
  rollups: boolean
  treeMode: TreeMode
}

const TREE_MODES: { value: TreeMode; label: string }[] = [
  { value: "full", label: "Full" },
  { value: "compact", label: "Compact" },
  { value: "hidden", label: "Hidden" },
]

/** One source for the opening state and for what Reset View restores. */
const DEFAULT_SETTINGS: BoardSettings = {
  criticalOnly: false,
  scheduleHints: true,
  rowLines: true,
  rollups: true,
  treeMode: "full",
}

/** Compared field by field so the reset stays honest when a setting is added. */
function isDefaultView(settings: BoardSettings): boolean {
  return (
    settings.criticalOnly === DEFAULT_SETTINGS.criticalOnly &&
    settings.scheduleHints === DEFAULT_SETTINGS.scheduleHints &&
    settings.rowLines === DEFAULT_SETTINGS.rowLines &&
    settings.rollups === DEFAULT_SETTINGS.rollups &&
    settings.treeMode === DEFAULT_SETTINGS.treeMode
  )
}

/**
 * The reset each tab owns, rule included. Both appear only once that tab has
 * something to undo: a permanently disabled button is dead weight, and its
 * absence already says the tab is untouched.
 */
function ResetSection({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <>
      <FieldSeparator className="-mx-3.5" />
      <Button
        type="button"
        size="xs"
        variant="outline"
        className="w-full"
        onClick={onClick}
      >
        {label}
      </Button>
    </>
  )
}

/** Group heading inside the popover. The only heading this surface carries. */
function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground text-xs font-medium">{children}</div>
  )
}

/** A switch row with the reason beside it, so a toggle is never guessed at. */
function SettingRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  hint: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Field
      orientation="horizontal"
      className="min-h-9 items-center justify-between gap-3"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <FieldLabel htmlFor={id} className="text-sm font-normal">
          {label}
        </FieldLabel>
        <Tooltip>
          <TooltipTrigger className="text-muted-foreground shrink-0">
            <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} className="size-3.5" aria-hidden="true" />
            <span className="sr-only">About {label}</span>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-56">
            {hint}
          </TooltipContent>
        </Tooltip>
      </div>
      <Switch
        id={id}
        size="sm"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </Field>
  )
}

/**
 * Multi-select as pressed chips, the corpus idiom for this surface: a column of
 * checkboxes would double the popover's height for the same few choices.
 */
function FilterChip({
  active,
  glyph,
  label,
  onClick,
}: {
  active: boolean
  glyph: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="xs"
      variant={active ? "secondary" : "outline"}
      aria-pressed={active}
      className={cn("rounded-full", active && "border-foreground/10")}
      onClick={onClick}
    >
      {glyph}
      {label}
    </Button>
  )
}

function RunBoardSettings({
  settings,
  hiddenWorkflows,
  dimmedStatuses,
  workflowStatus,
  onChange,
  onToggleWorkflow,
  onToggleStatus,
  onResetView,
  onResetFilters,
}: {
  settings: BoardSettings
  hiddenWorkflows: Set<string>
  /** Pressed here means faded on the board, so the label matches the effect. */
  dimmedStatuses: Set<StageStatus>
  workflowStatus: Map<string, StageStatus>
  onChange: (patch: Partial<BoardSettings>) => void
  onToggleWorkflow: (workflowId: string) => void
  onToggleStatus: (status: StageStatus) => void
  onResetView: () => void
  onResetFilters: () => void
}) {
  const activeFilters = hiddenWorkflows.size + dimmedStatuses.size
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" size="sm" variant="outline">
            <HugeiconsIcon icon={SlidersHorizontalIcon} strokeWidth={2} className="size-4" aria-hidden="true" />
            <span className="max-sm:sr-only">Settings</span>
            {activeFilters > 0 ? (
              <Badge radius="full" className="tabular-nums">
                {activeFilters}
              </Badge>
            ) : null}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-[320px] p-0">
        <Tabs defaultValue="view">
          <div className="px-3.5 pt-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="view">View</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="view" className="m-0">
            <FieldGroup className="gap-3 px-3.5 py-3">
              <div className="space-y-2">
                <GroupLabel>Board</GroupLabel>
                <div className="space-y-0">
                  <SettingRow
                    id="setting-critical"
                    label="Critical Path"
                    hint="Fades every stage that still has slack, leaving the chain that decides when the run lands."
                    checked={settings.criticalOnly}
                    onCheckedChange={(checked) =>
                      onChange({ criticalOnly: checked })
                    }
                  />
                  <SettingRow
                    id="setting-hints"
                    label="Placement Hints"
                    hint="Shows a snapped tile on empty track where a stage may legally be scheduled."
                    checked={settings.scheduleHints}
                    onCheckedChange={(checked) =>
                      onChange({ scheduleHints: checked })
                    }
                  />
                  <SettingRow
                    id="setting-lines"
                    label="Row Separators"
                    hint="Draws a rule between rows. Turn it off for a lighter grid on a dense board."
                    checked={settings.rowLines}
                    onCheckedChange={(checked) =>
                      onChange({ rowLines: checked })
                    }
                  />
                  <SettingRow
                    id="setting-rollups"
                    label="Playbook Rollups"
                    hint="Draws the envelope strip and completion figure on each playbook row."
                    checked={settings.rollups}
                    onCheckedChange={(checked) =>
                      onChange({ rollups: checked })
                    }
                  />
                </div>
              </div>

              <FieldSeparator className="-mx-3.5" />

              <div className="space-y-2">
                <GroupLabel>Layout</GroupLabel>
                <Field
                  orientation="horizontal"
                  className="min-h-9 items-center justify-between gap-3"
                >
                  <FieldLabel
                    htmlFor="setting-tree"
                    className="text-sm font-normal"
                  >
                    Tree Panel
                  </FieldLabel>
                  <Select
                    value={settings.treeMode}
                    // items is what lets SelectValue render the label rather
                    // than the raw stored value
                    items={TREE_MODES}
                    onValueChange={(value: string | null) => {
                      // narrow the string back to a known mode before storing
                      const mode = TREE_MODES.find(
                        (item) => item.value === value
                      )
                      if (mode) onChange({ treeMode: mode.value })
                    }}
                  >
                    <SelectTrigger
                      id="setting-tree"
                      size="sm"
                      className="w-[132px] shrink-0"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectGroup>
                        {TREE_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {isDefaultView(settings) ? null : (
                <ResetSection label="Reset View" onClick={onResetView} />
              )}
            </FieldGroup>
          </TabsContent>

          <TabsContent value="filters" className="m-0">
            <FieldGroup className="gap-3 px-3.5 py-3">
              <div className="space-y-2.5">
                <GroupLabel>Playbooks</GroupLabel>
                {/* Hiding a playbook removes its ROWS, because a playbook is a
                  self contained graph and no edge crosses out of it. */}
                <div className="flex flex-wrap gap-1.5">
                  {WORKFLOWS.map((workflow) => {
                    const status = workflowStatus.get(workflow.id)
                    return (
                      <FilterChip
                        key={workflow.id}
                        active={!hiddenWorkflows.has(workflow.id)}
                        glyph={status ? <StatusGlyph status={status} /> : null}
                        label={workflow.title}
                        onClick={() => onToggleWorkflow(workflow.id)}
                      />
                    )
                  })}
                </div>
              </div>

              <FieldSeparator className="-mx-3.5" />

              <div className="space-y-2.5">
                <GroupLabel>Dim Status</GroupLabel>
                {/* Dimming, never hiding: a bar removed from the board takes the
                  ripple with it, and the ripple is the thing worth watching. */}
                <div className="flex flex-wrap gap-1.5">
                  {STAGE_STATUSES.map((status) => (
                    <FilterChip
                      key={status}
                      active={dimmedStatuses.has(status)}
                      glyph={<StatusDot status={status} />}
                      label={STATUS_LABEL[status]}
                      onClick={() => onToggleStatus(status)}
                    />
                  ))}
                </div>
              </div>

              {activeFilters > 0 ? (
                <ResetSection label="Reset Filters" onClick={onResetFilters} />
              ) : null}
            </FieldGroup>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

export { DEFAULT_SETTINGS, RunBoardSettings, TREE_MODES }
export type { BoardSettings, TreeMode }