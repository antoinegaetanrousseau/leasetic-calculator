import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert"
import { Badge } from "@/components/reui/badge"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Item, ItemGroup } from "@/components/ui/item"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  APPROVERS,
  KIND_LABEL,
  STAGE_BY_ID,
  STATUS_LABEL,
  type StageData,
  type StageMeta,
} from "./data"
import { DotSeparator, KIND_GLYPH, StatusCell } from "./run-board-cells"
import {
  formatClock,
  formatCost,
  formatDuration,
  formatTokens,
  type StageSlack,
} from "./schedule"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, Shield01Icon, ClockIcon, Route01Icon, Layers01Icon, FlashIcon, File02Icon, AlertCircleIcon, SquareLock01Icon, RefreshIcon, Delete02Icon } from "@hugeicons/core-free-icons"

const STAGE_FORM_ID = "run-board-stage-form"

/** 15 minute steps across the whole day: the board's snap, and its full range. */
const TIME_STEPS: number[] = Array.from({ length: 96 }, (_, i) => i * 15)

type StageSheetMode = "view" | "edit" | "create"

interface StageDraft {
  /** Bar id, or null while scheduling a new one. */
  id: string | null
  stageId: string
  title: string
  /** Minutes from midnight, always a multiple of 15. */
  startMin: number
  endMin: number
  note: string
}

interface StageSheetState {
  mode: StageSheetMode
  draft: StageDraft
  /** The executed bar behind the draft; null while creating. */
  data: StageData | null
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="-me-1 shrink-0"
      onClick={onClose}
    >
      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
      <span className="sr-only">Close</span>
    </Button>
  )
}

function DetailRow({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="text-muted-foreground flex size-4 shrink-0 items-center justify-center [&_svg]:size-4"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  )
}

/** Section heading inside the sheet body. Quiet, because the data is the point. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {children}
    </p>
  )
}

/**
 * The calls the stage actually made. Names stay monospaced because an operator
 * copies them into a log query, and a wrapped tool id is unusable.
 */
function ToolTrace({ data }: { data: StageData }) {
  if (data.toolCalls.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>Tool Calls</SectionLabel>
      <ItemGroup className="gap-1.5">
        {data.toolCalls.map((call) => (
          <Item
            key={`${call.name}-${call.latency}`}
            variant="outline"
            size="xs"
            className="gap-2"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-xs">
              {call.name}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {call.latency}
            </span>
            <Badge
              variant={call.ok ? "success-light" : "destructive-light"}
              radius="full"
              className="shrink-0"
            >
              {call.ok ? "Succeeded" : "Failed"}
            </Badge>
          </Item>
        ))}
      </ItemGroup>
    </div>
  )
}

function ApproverRow({ stageId }: { stageId: string }) {
  const approver = APPROVERS[stageId]
  if (!approver) return null
  return (
    <DetailRow
      icon={
        <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} />
      }
    >
      <div className="flex items-center gap-2">
        <Avatar className="size-5">
          <AvatarImage src={approver.image} alt="" loading="lazy" />
          <AvatarFallback className="text-[9px]">
            {approver.name
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <span className="text-foreground truncate">{approver.name}</span>
        <DotSeparator />
        <span className="text-muted-foreground shrink-0 text-xs">
          {approver.role}
        </span>
      </div>
    </DetailRow>
  )
}

function StageView({
  draft,
  data,
  stage,
  slack,
  waitsFor,
  cutoffLabel,
  onEdit,
  onRerun,
  onClose,
}: {
  draft: StageDraft
  data: StageData
  stage: StageMeta
  slack: StageSlack | null
  waitsFor: string | null
  cutoffLabel: string
  onEdit: () => void
  onRerun: () => void
  onClose: () => void
}) {
  const counter = data.attempt
    ? `Attempt ${data.attempt} of ${data.attempts}`
    : data.shard
      ? `Shard ${data.shard} of ${data.shards}`
      : null
  const slackLabel = slack?.blocked
    ? "Blocked behind a failure"
    : slack?.fixed
      ? "Fixed window"
      : slack
        ? `${formatDuration(slack.minutes)} of slack`
        : null

  return (
    <>
      <div className="flex shrink-0 items-center gap-2.5 border-b px-5 py-3">
        <SheetTitle className="min-w-0 shrink truncate text-lg leading-tight font-semibold">
          {draft.title}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {stage.description}
        </SheetDescription>
        <StatusCell status={data.status} />
        <div aria-hidden="true" className="flex-1" />
        <CloseButton onClose={onClose} />
      </div>

      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-6 px-5 py-5">
            {/* What the stage is for, before what it did: an operator opening a
              failed stage may never have seen this playbook before. */}
            <p className="text-muted-foreground text-sm">{stage.description}</p>

            <div className="flex flex-col gap-4">
              <DetailRow
                icon={
                  <HugeiconsIcon icon={ClockIcon} strokeWidth={2} />
                }
              >
                <div className="flex items-center gap-2">
                  <span className="text-foreground tabular-nums">
                    {formatClock(draft.startMin)} to {formatClock(draft.endMin)}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatDuration(draft.endMin - draft.startMin)}
                  </span>
                </div>
              </DetailRow>

              <DetailRow icon={KIND_GLYPH[data.kind]}>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      data.kind === "tool"
                        ? "text-foreground truncate font-mono text-xs"
                        : "text-foreground truncate"
                    }
                  >
                    {data.runner}
                  </span>
                  <DotSeparator />
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {KIND_LABEL[data.kind]}
                  </span>
                </div>
              </DetailRow>

              <DetailRow
                icon={
                  <HugeiconsIcon icon={Route01Icon} strokeWidth={2} />
                }
              >
                <div className="flex items-center gap-2">
                  <span className="text-foreground truncate">
                    {waitsFor ? `Waits for ${waitsFor}` : "Trigger stage"}
                  </span>
                  {slackLabel ? (
                    <>
                      <DotSeparator />
                      <span
                        className={
                          slack?.blocked || (slack && slack.minutes <= 0)
                            ? "text-destructive shrink-0 text-xs font-medium"
                            : "text-muted-foreground shrink-0 text-xs"
                        }
                      >
                        {slackLabel}
                      </span>
                    </>
                  ) : null}
                </div>
              </DetailRow>

              <ApproverRow stageId={stage.id} />

              {counter ? (
                <DetailRow
                  icon={
                    <HugeiconsIcon icon={Layers01Icon} strokeWidth={2} />
                  }
                >
                  <p className="text-foreground">{counter}</p>
                </DetailRow>
              ) : null}

              <DetailRow
                icon={
                  <HugeiconsIcon icon={FlashIcon} strokeWidth={2} />
                }
              >
                <div className="flex items-center gap-2">
                  <span className="text-foreground tabular-nums">
                    {formatTokens(data.tokens)} tokens
                  </span>
                  <DotSeparator />
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {formatCost(data.costUsd)}
                  </span>
                </div>
              </DetailRow>

              {draft.note ? (
                <DetailRow
                  icon={
                    <HugeiconsIcon icon={File02Icon} strokeWidth={2} />
                  }
                >
                  <p className="text-foreground">{draft.note}</p>
                </DetailRow>
              ) : null}
            </div>

            {data.error ? (
              <Alert variant="destructive">
                <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} aria-hidden="true" />
                <AlertTitle>{data.error.title}</AlertTitle>
                <AlertDescription>{data.error.detail}</AlertDescription>
              </Alert>
            ) : null}

            {data.frozen ? (
              <Alert variant="info">
                <HugeiconsIcon icon={SquareLock01Icon} strokeWidth={2} aria-hidden="true" />
                <AlertTitle>Audited Window</AlertTitle>
                <AlertDescription>
                  Fixed slot. The playbook still lands by {cutoffLabel}.
                </AlertDescription>
              </Alert>
            ) : null}

            <ToolTrace data={data} />
          </div>
        </ScrollArea>
      </div>

      <div className="bg-muted flex shrink-0 items-center gap-2 border-t px-5 py-3">
        <Button type="button" variant="outline" onClick={onRerun}>
          <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-4" aria-hidden="true" />
          Re-run
        </Button>
        <div aria-hidden="true" className="flex-1" />
        <Button type="button" onClick={onEdit} disabled={data.frozen === true}>
          Edit
        </Button>
      </div>
    </>
  )
}

function StageForm({
  draft,
  isEdit,
  stages,
  onChange,
  onSave,
  onDelete,
  onClose,
}: {
  draft: StageDraft
  isEdit: boolean
  stages: StageMeta[]
  onChange: (draft: StageDraft) => void
  onSave: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const patch = (partial: Partial<StageDraft>) =>
    onChange({ ...draft, ...partial })
  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b px-5 py-3">
        <SheetTitle className="flex-1 text-base font-semibold">
          {isEdit ? "Edit Stage" : "New Stage"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {isEdit
            ? "Update this stage window."
            : "Schedule a stage into a playbook."}
        </SheetDescription>
        <CloseButton onClose={onClose} />
      </div>

      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <form
            id={STAGE_FORM_ID}
            className="flex flex-col gap-5 px-5 py-5"
            onSubmit={(event) => {
              event.preventDefault()
              onSave()
            }}
          >
            <Field className="gap-1.5">
              <FieldLabel htmlFor="stage-title">Title</FieldLabel>
              <Input
                id="stage-title"
                value={draft.title}
                placeholder="Capture Refund"
                autoComplete="off"
                onChange={(event) => patch({ title: event.target.value })}
              />
            </Field>

            {/* An execution belongs to its stage, and the gantt never moves a
              bar across rows, so the row is only chosen when one is created. */}
            {isEdit ? (
              <Field className="gap-1.5">
                <FieldLabel htmlFor="stage-row">Stage</FieldLabel>
                <div
                  id="stage-row"
                  className="text-muted-foreground flex items-center gap-2 text-sm"
                >
                  {KIND_GLYPH[STAGE_BY_ID.get(draft.stageId)?.kind ?? "tool"]}
                  <span className="truncate">
                    {STAGE_BY_ID.get(draft.stageId)?.title ?? draft.stageId}
                  </span>
                </div>
              </Field>
            ) : (
              <Field className="gap-1.5">
                <FieldLabel htmlFor="stage-row">Stage</FieldLabel>
                <Select
                  value={draft.stageId}
                  onValueChange={(value: string | null) => {
                    if (value) patch({ stageId: value })
                  }}
                >
                  <SelectTrigger id="stage-row" className="w-full">
                    <SelectValue>
                      {STAGE_BY_ID.get(draft.stageId)?.title ?? "Select stage"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <span className="flex items-center gap-2">
                          {KIND_GLYPH[stage.kind]}
                          {stage.title}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="stage-start">Start</FieldLabel>
                <Select
                  value={String(draft.startMin)}
                  onValueChange={(value: string | null) => {
                    if (!value) return
                    const startMin = Number(value)
                    // never let a window collapse below one snap step
                    const endMin =
                      draft.endMin > startMin ? draft.endMin : startMin + 15
                    patch({ startMin, endMin })
                  }}
                >
                  <SelectTrigger id="stage-start" className="w-full">
                    <SelectValue>{formatClock(draft.startMin)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {TIME_STEPS.map((step) => (
                      <SelectItem key={step} value={String(step)}>
                        {formatClock(step)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="stage-end">End</FieldLabel>
                <Select
                  value={String(draft.endMin)}
                  onValueChange={(value: string | null) => {
                    if (!value) return
                    const endMin = Number(value)
                    patch({
                      endMin:
                        endMin > draft.startMin ? endMin : draft.startMin + 15,
                    })
                  }}
                >
                  <SelectTrigger id="stage-end" className="w-full">
                    <SelectValue>{formatClock(draft.endMin)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {TIME_STEPS.filter((step) => step > draft.startMin).map(
                      (step) => (
                        <SelectItem key={step} value={String(step)}>
                          {formatClock(step)}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field className="gap-1.5">
              <FieldLabel htmlFor="stage-note">Note</FieldLabel>
              <Textarea
                id="stage-note"
                rows={4}
                value={draft.note}
                placeholder="Why this window, or what to watch for"
                onChange={(event) => patch({ note: event.target.value })}
              />
            </Field>
          </form>
        </ScrollArea>
      </div>

      <div className="bg-muted flex shrink-0 items-center gap-2 border-t px-5 py-3">
        {isEdit ? (
          <Button
            type="button"
            variant="outline"
            className="me-auto"
            onClick={onDelete}
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
            Clear
          </Button>
        ) : null}
        <div aria-hidden="true" className="flex-1" />
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          type="submit"
          form={STAGE_FORM_ID}
          disabled={!draft.title.trim()}
        >
          {isEdit ? "Save" : "Schedule"}
        </Button>
      </div>
    </>
  )
}

function StageSheet({
  state,
  stages,
  slack,
  waitsFor,
  cutoffLabel,
  onOpenChange,
  onDraftChange,
  onEdit,
  onRerun,
  onSave,
  onDelete,
}: {
  state: StageSheetState | null
  stages: StageMeta[]
  slack: StageSlack | null
  waitsFor: string | null
  cutoffLabel: string
  onOpenChange: (open: boolean) => void
  onDraftChange: (draft: StageDraft) => void
  onEdit: () => void
  onRerun: () => void
  onSave: () => void
  onDelete: () => void
}) {
  const stage = state ? STAGE_BY_ID.get(state.draft.stageId) : undefined
  const showView = state?.mode === "view" && state.data !== null && stage
  return (
    <Sheet open={state !== null} onOpenChange={onOpenChange}>
      {/* initialFocus off: autofocusing the first control pops its tooltip */}
      <SheetContent
        side="right"
        showCloseButton={false}
        initialFocus={false}
        className="inset-y-4 right-4 left-auto flex h-[calc(100svh-2rem)] w-[min(30rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-xl p-0 outline-none"
      >
        {state && showView && state.data ? (
          <StageView
            draft={state.draft}
            data={state.data}
            stage={stage}
            slack={slack}
            waitsFor={waitsFor}
            cutoffLabel={cutoffLabel}
            onEdit={onEdit}
            onRerun={onRerun}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
        {state && !showView ? (
          <StageForm
            draft={state.draft}
            isEdit={state.mode === "edit"}
            stages={stages}
            onChange={onDraftChange}
            onSave={onSave}
            onDelete={onDelete}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export { StageSheet, TIME_STEPS }
export type { StageDraft, StageSheetMode, StageSheetState }