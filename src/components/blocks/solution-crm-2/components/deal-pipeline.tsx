import { useState, type ComponentProps, type ReactNode } from "react"
import { Badge } from "@/components/reui/badge"
import { IconStack } from "@/components/reui/icon-stack"
import {
  Kanban,
  KanbanBoard as KanbanBoardPrimitive,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/reui/kanban"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import {
  BOARD_TITLE,
  DEAL_COLUMNS,
  INITIAL_DEAL_COLUMNS,
  type DealColumn,
  type DealOpportunity,
  type DealSignal,
} from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { FilterIcon, PlusSignIcon, DollarCircleIcon, Calendar03Icon, DashboardSquare02Icon, DragDropVerticalIcon } from "@hugeicons/core-free-icons"

/**
 * CRM deal risk board adapted from kanban-board-7.
 * Toolbar, lanes, cards, empty state, and overlay mirror the donor structure.
 * Customize: replace INITIAL_DEAL_COLUMNS in data.tsx.
 */

const DEAL_COLUMN_BY_ID = new Map(
  DEAL_COLUMNS.map((column) => [column.id, column])
)

const signalProgressClass: Record<DealSignal, string> = {
  Blocked: "**:data-[slot=progress-indicator]:bg-red-500",
  Clear: "**:data-[slot=progress-indicator]:bg-emerald-500",
  Risk: "**:data-[slot=progress-indicator]:bg-amber-500",
}

const signalDotClass = {
  Blocked: "bg-red-500",
  Clear: "bg-emerald-500",
  Risk: "bg-amber-500",
} satisfies Record<DealSignal, string>

function BoardScrollArea({ children }: { children: ReactNode }) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className="relative w-full min-w-0 overflow-hidden pb-3"
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 w-full overflow-x-auto overflow-y-hidden transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        <ScrollAreaPrimitive.Content
          data-slot="scroll-area-content"
          className="w-max min-w-full"
        >
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        data-slot="scroll-area-scrollbar"
        data-orientation="horizontal"
        orientation="horizontal"
        className="flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent"
      >
        <ScrollAreaPrimitive.Thumb
          data-slot="scroll-area-thumb"
          className="bg-foreground/15 relative flex-1 rounded-full"
        />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    notation: "compact",
    style: "currency",
    currency: "USD",
  }).format(value)
}

function formatDealDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`))
}

function formatCloseWindow(opportunity: DealOpportunity) {
  return opportunity.daysToClose === 0
    ? "Closed"
    : `${opportunity.daysToClose}d left`
}

function findDeal(columns: Record<string, DealOpportunity[]>, dealId: string) {
  for (const opportunities of Object.values(columns)) {
    const opportunity = opportunities.find((item) => item.id === dealId)

    if (opportunity) {
      return opportunity
    }
  }

  return null
}

function DealToolbar({ dealCount }: { dealCount: number }) {
  return (
    <header className="px-1 py-1" aria-label="Deal board toolbar">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold">{BOARD_TITLE}</h2>
            <Badge variant="outline" className="bg-background">
              {dealCount}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
            Review deals by risk and close window.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          <Button type="button" variant="outline" size="sm">
            <HugeiconsIcon icon={FilterIcon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
            Filters
          </Button>

          <Button type="button" size="sm">
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
            New Deal
          </Button>
        </div>
      </div>
    </header>
  )
}

function DealSignalBadge({ signal }: { signal: DealSignal }) {
  return (
    <Badge variant="outline">
      <span
        className={cn("size-1.5 shrink-0 rounded-full", signalDotClass[signal])}
        aria-hidden="true"
      />
      {signal}
    </Badge>
  )
}

function DealSnapshotItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <Item
      variant="outline"
      size="sm"
      className="min-w-0 flex-nowrap items-start gap-2"
    >
      <ItemMedia
        variant="icon"
        className="text-muted-foreground size-auto self-start"
      >
        {icon}
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0">
        <ItemTitle
          className="truncate text-sm leading-5 font-medium tabular-nums"
          title={value}
        >
          {value}
        </ItemTitle>
        <ItemDescription className="truncate text-[0.6875rem] leading-3.5">
          {label}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}

function DealSnapshot({ opportunity }: { opportunity: DealOpportunity }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <DealSnapshotItem
        label="Value"
        value={formatCompactCurrency(opportunity.amount)}
        icon={
          <HugeiconsIcon icon={DollarCircleIcon} strokeWidth={2} className="size-3.5" aria-hidden="true" />
        }
      />
      <DealSnapshotItem
        label="Close"
        value={formatDealDate(opportunity.closeDate)}
        icon={
          <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-3.5" aria-hidden="true" />
        }
      />
    </div>
  )
}

function ConfidenceProgress({ opportunity }: { opportunity: DealOpportunity }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Confidence</span>
        <span className="font-medium tabular-nums">
          {opportunity.confidence}%
        </span>
      </div>
      <Progress
        value={opportunity.confidence}
        className={cn(
          "**:data-[slot=progress-track]:bg-muted gap-0 **:data-[slot=progress-indicator]:rounded-full **:data-[slot=progress-track]:h-1.5 **:data-[slot=progress-track]:rounded-full",
          signalProgressClass[opportunity.signal]
        )}
      >
        <ProgressLabel className="sr-only">
          {opportunity.account} deal confidence
        </ProgressLabel>
      </Progress>
    </div>
  )
}

function DealOwner({ opportunity }: { opportunity: DealOpportunity }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar size="sm" className="size-7">
        <AvatarImage
          src={opportunity.owner.avatar}
          alt={opportunity.owner.name}
        />
        <AvatarFallback className="text-xs font-semibold">
          {opportunity.owner.initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">
          {opportunity.owner.name}
        </div>
        <div className="text-muted-foreground truncate text-xs">
          {opportunity.owner.title}
        </div>
      </div>
    </div>
  )
}

interface DealCardProps extends Omit<
  ComponentProps<typeof KanbanItem>,
  "value" | "children"
> {
  opportunity: DealOpportunity
  isOverlay?: boolean
}

function DealCard({ opportunity, isOverlay, ...props }: DealCardProps) {
  const card = (
    <Card
      size="sm"
      className={cn(
        "bg-card hover:border-foreground/20 gap-0 p-0 shadow-xs transition-[border-color,box-shadow] hover:shadow-sm",
        isOverlay && "shadow-lg"
      )}
    >
      <CardHeader className="grid min-h-5 min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-x-2.5 px-3 pt-3 pb-0">
        <Item
          render={<span />}
          className="flex h-5 w-6 items-center justify-center border-0 p-0 [&_svg]:max-h-5 [&_svg]:max-w-6"
        >
          <ItemMedia variant="icon" className="size-auto">
            {opportunity.logo}
          </ItemMedia>
        </Item>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle
            className="min-w-0 truncate text-sm leading-5"
            title={opportunity.account}
          >
            {opportunity.account}
          </CardTitle>
          <DealSignalBadge signal={opportunity.signal} />
        </div>
      </CardHeader>

      <CardContent className="flex min-h-[10.75rem] flex-col gap-3 px-3 pt-3 pb-3">
        <DealSnapshot opportunity={opportunity} />

        <ConfidenceProgress opportunity={opportunity} />

        <div className="mt-auto flex min-w-0 items-center justify-between gap-3">
          <DealOwner opportunity={opportunity} />
          <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
            {formatCloseWindow(opportunity)}
          </span>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <KanbanItem value={opportunity.id} {...props}>
      {isOverlay ? (
        card
      ) : (
        <KanbanItemHandle className="block">{card}</KanbanItemHandle>
      )}
    </KanbanItem>
  )
}

function AddDealButton({ column }: { column: DealColumn }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground h-8 bg-transparent px-2"
      aria-label={column.addLabel}
    >
      <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
      {column.addLabel}
    </Button>
  )
}

function EmptyDealStage({ column }: { column: DealColumn }) {
  return (
    <div className="border-border/70 bg-background/60 flex min-h-40 items-center justify-center border border-dashed px-4 py-5">
      <Empty className="max-w-56 flex-none gap-3 border-none p-0">
        <EmptyMedia className="mb-0">
          <IconStack className="h-14 w-12" aria-hidden="true">
            <HugeiconsIcon icon={DashboardSquare02Icon} strokeWidth={1.9} aria-hidden="true" />
          </IconStack>
        </EmptyMedia>

        <EmptyHeader className="gap-1">
          <EmptyTitle className="text-sm font-semibold">
            No Deals Here
          </EmptyTitle>
          <EmptyDescription className="text-xs/5">
            Drop deals into {column.title.toLowerCase()} when this stage is
            ready.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent className="max-w-none">
          <AddDealButton column={column} />
        </EmptyContent>
      </Empty>
    </div>
  )
}

function AddStageButton() {
  return (
    <div className="w-[calc(100vw-3rem)] max-w-[18.5rem] shrink-0 p-1 sm:w-[18.5rem]">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground h-9 px-2"
        aria-label="Add deal stage"
      >
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
        Add Stage
      </Button>
    </div>
  )
}

interface DealColumnViewProps extends Omit<
  ComponentProps<typeof KanbanColumn>,
  "value" | "children"
> {
  column: DealColumn
  opportunities: DealOpportunity[]
  isOverlay?: boolean
}

function DealColumnView({
  column,
  opportunities,
  isOverlay,
  ...props
}: DealColumnViewProps) {
  return (
    <KanbanColumn
      value={column.id}
      className="w-[calc(100vw-3rem)] max-w-[18.5rem] shrink-0 self-start sm:w-[18.5rem]"
      {...props}
    >
      <section
        className={cn(
          "group/column flex flex-col gap-2 p-1",
          isOverlay && "bg-background"
        )}
        aria-label={`${column.title}: ${column.description}`}
      >
        <div className="flex min-h-9 items-center gap-2 px-1">
          <span
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              column.dotClassName
            )}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <h3
                className="truncate text-sm font-semibold"
                title={column.title}
              >
                {column.title}
              </h3>
              <Badge variant="outline" className="bg-background">
                {opportunities.length}
              </Badge>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={column.addLabel}
            className="text-muted-foreground hover:text-foreground pointer-events-none opacity-0 transition-opacity group-focus-within/column:pointer-events-auto group-focus-within/column:opacity-100 group-hover/column:pointer-events-auto group-hover/column:opacity-100"
          >
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} aria-hidden="true" />
          </Button>

          <KanbanColumnHandle
            className="pointer-events-none opacity-0 transition-opacity group-focus-within/column:pointer-events-auto group-focus-within/column:opacity-100 group-hover/column:pointer-events-auto group-hover/column:opacity-100"
            render={({ className, ...handleProps }) => (
              <Button
                {...handleProps}
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${column.title} stage`}
                className={cn(
                  "text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing",
                  className
                )}
              >
                <HugeiconsIcon icon={DragDropVerticalIcon} strokeWidth={2} aria-hidden="true" />
              </Button>
            )}
          />
        </div>

        <KanbanColumnContent
          value={column.id}
          className={cn(
            "gap-3 px-1 py-1",
            opportunities.length === 0 && "min-h-40"
          )}
        >
          {opportunities.length > 0 ? (
            opportunities.map((opportunity) => (
              <DealCard key={opportunity.id} opportunity={opportunity} />
            ))
          ) : (
            <EmptyDealStage column={column} />
          )}
        </KanbanColumnContent>
      </section>
    </KanbanColumn>
  )
}

export function DealPipeline() {
  const [dealsByColumn, setDealsByColumn] = useState(INITIAL_DEAL_COLUMNS)
  const dealCount = Object.values(dealsByColumn).reduce(
    (count, opportunities) => count + opportunities.length,
    0
  )

  return (
    <section className="mx-auto flex w-full max-w-[1240px] flex-col gap-4">
      {/* Toolbar */}
      <DealToolbar dealCount={dealCount} />

      {/* Board */}
      <Kanban
        value={dealsByColumn}
        onValueChange={setDealsByColumn}
        getItemValue={(item) => item.id}
        className="w-full"
      >
        <BoardScrollArea>
          <KanbanBoardPrimitive className="flex min-w-full items-start gap-3 p-1">
            {Object.entries(dealsByColumn).map(([columnId, opportunities]) => {
              const column = DEAL_COLUMN_BY_ID.get(columnId as DealColumn["id"])

              if (!column) {
                return null
              }

              return (
                <DealColumnView
                  key={columnId}
                  column={column}
                  opportunities={opportunities}
                />
              )
            })}
            <AddStageButton />
          </KanbanBoardPrimitive>
        </BoardScrollArea>

        {/* Overlay */}
        <KanbanOverlay>
          {({ value, variant }) => {
            if (variant === "column") {
              const column = DEAL_COLUMN_BY_ID.get(
                String(value) as DealColumn["id"]
              )

              if (!column) {
                return null
              }

              return (
                <DealColumnView
                  column={column}
                  opportunities={dealsByColumn[column.id] ?? []}
                  isOverlay
                />
              )
            }

            const opportunity = findDeal(dealsByColumn, String(value))

            return opportunity ? (
              <DealCard opportunity={opportunity} isOverlay />
            ) : null
          }}
        </KanbanOverlay>
      </Kanban>
    </section>
  )
}