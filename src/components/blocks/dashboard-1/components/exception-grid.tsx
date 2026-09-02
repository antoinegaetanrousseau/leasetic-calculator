import { useMemo, useState } from "react"
import { Badge } from "@/components/reui/badge"
import {
  dataGridFeatures,
  DataGrid as ReuiDataGrid,
} from "@/components/reui/data-grid/data-grid"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import {
  useTable,
  type ColumnVisibilityState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  FULFILLMENT_ROWS,
  fulfillmentSearchBlob,
  STATUS_ORDER,
  type FulfillmentStatus,
} from "./data"
import { columns, StatusBadge } from "./exception-columns"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, Cancel01Icon, FilterIcon, MoreHorizontalCircle01Icon, Download01Icon, RefreshIcon, SettingsIcon, PlusSignIcon } from "@hugeicons/core-free-icons"

interface ToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedStatuses: FulfillmentStatus[]
  onStatusChange: (checked: boolean, status: FulfillmentStatus) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  statusCounts: Record<string, number>
}

function Toolbar({
  searchQuery,
  onSearchChange,
  selectedStatuses,
  onStatusChange,
  onClearFilters,
  hasActiveFilters,
  statusCounts,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full min-w-52 sm:w-60">
          <InputGroupAddon align="inline-start">
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search orders..."
            aria-label="Search orders"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {searchQuery.length > 0 && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Clear search"
                size="icon-xs"
                onClick={() => onSearchChange("")}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>

        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" aria-label="Filter by order status">
                <HugeiconsIcon icon={FilterIcon} strokeWidth={2} aria-hidden="true" />
                Status
                {selectedStatuses.length > 0 && (
                  <Badge variant="info-outline">
                    {selectedStatuses.length}
                  </Badge>
                )}
              </Button>
            }
          />
          <PopoverContent
            align="start"
            className="flex w-48 flex-col gap-2.5 p-3"
          >
            <span className="text-muted-foreground text-xs font-medium">
              Filter by status
            </span>
            {STATUS_ORDER.map((status) => (
              <div key={status} className="flex items-center gap-2.5">
                <Checkbox
                  id={`status-${status.toLowerCase().replace(/\s+/g, "-")}`}
                  checked={selectedStatuses.includes(status)}
                  onCheckedChange={(checked) =>
                    onStatusChange(checked === true, status)
                  }
                />
                <Label
                  htmlFor={`status-${status.toLowerCase().replace(/\s+/g, "-")}`}
                  className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 font-normal"
                >
                  <StatusBadge status={status} />
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {statusCounts[status] ?? 0}
                  </span>
                </Label>
              </div>
            ))}
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" aria-label="Exception queue actions">
              <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} aria-hidden="true" />
              Actions
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() =>
                toast.success("Export ready", {
                  description: "Exception queue export prepared.",
                })
              }
            >
              <HugeiconsIcon icon={Download01Icon} strokeWidth={2} aria-hidden="true" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.message("Queue refreshed", {
                  description: "Live data would refresh through your API.",
                })
              }
            >
              <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} aria-hidden="true" />
              Refresh
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.info("View settings", {
                  description: "Column and density controls are available.",
                })
              }
            >
              <HugeiconsIcon icon={SettingsIcon} strokeWidth={2} aria-hidden="true" />
              View settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function ExceptionGrid() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "value", desc: true },
  ])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<FulfillmentStatus[]>(
    []
  )
  const [columnOrder, setColumnOrder] = useState<string[]>(
    columns.map((column) => column.id as string)
  )
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({
      risk: false,
    })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const statusCounts = useMemo(
    () =>
      FULFILLMENT_ROWS.reduce(
        (acc, row) => {
          acc[row.status] = (acc[row.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
    []
  )

  const filteredData = useMemo(() => {
    return FULFILLMENT_ROWS.filter((row) => {
      const matchesStatus =
        !selectedStatuses.length || selectedStatuses.includes(row.status)
      const matchesSearch =
        !searchQuery ||
        fulfillmentSearchBlob(row).includes(searchQuery.toLowerCase())

      return matchesStatus && matchesSearch
    })
  }, [searchQuery, selectedStatuses])

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedStatuses.length > 0

  const resetToFirstPage = () => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    resetToFirstPage()
  }

  const handleStatusChange = (checked: boolean, status: FulfillmentStatus) => {
    setSelectedStatuses((current) =>
      checked ? [...current, status] : current.filter((item) => item !== status)
    )
    resetToFirstPage()
  }

  const handleClearFilters = () => {
    setSelectedStatuses([])
    setSearchQuery("")
    resetToFirstPage()
  }

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: filteredData,
    pageCount: Math.ceil(filteredData.length / pagination.pageSize),
    getRowId: (row) => row.id,
    state: { pagination, sorting, columnOrder, columnVisibility, rowSelection },
    enableRowSelection: true,
    autoResetPageIndex: false,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
  })

  return (
    <TooltipProvider delay={200}>
      <ReuiDataGrid
        table={table}
        recordCount={filteredData.length}
        emptyMessage={
          filteredData.length === 0
            ? "No fulfillment exceptions match your filters."
            : undefined
        }
        tableLayout={{
          columnsPinnable: true,
          columnsResizable: true,
          columnsMovable: true,
          columnsVisibility: true,
          headerSticky: true,
          dense: true,
        }}
        tableClassNames={{
          bodyRow: "[&>td]:h-16",
        }}
      >
        <Frame variant="default" spacing="sm" className="w-full">
          <FrameHeader className="flex-row items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <FrameTitle className="text-balance">Exception Queue</FrameTitle>
              <FrameDescription className="text-xs text-pretty">
                {filteredData.length} of {FULFILLMENT_ROWS.length} fulfillment
                records
              </FrameDescription>
            </div>
            <Button
              type="button"
              onClick={() =>
                toast.info("Create exception", {
                  description:
                    "Connect this button to your incident intake flow.",
                })
              }
            >
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} aria-hidden="true" />
              Add exception
            </Button>
          </FrameHeader>
          <FramePanel className="bg-card p-0! shadow-none!">
            <div className="px-4 py-3">
              <Toolbar
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                selectedStatuses={selectedStatuses}
                onStatusChange={handleStatusChange}
                onClearFilters={handleClearFilters}
                hasActiveFilters={hasActiveFilters}
                statusCounts={statusCounts}
              />
            </div>
            <Separator />
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </FramePanel>
          <FrameFooter>
            <DataGridPagination />
          </FrameFooter>
        </Frame>
      </ReuiDataGrid>
    </TooltipProvider>
  )
}