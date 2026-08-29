import { useEffect, useMemo, useState } from "react"
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
  PaginationState,
  RowSelectionState,
  SortingState,
  useTable,
  type ColumnVisibilityState,
} from "@tanstack/react-table"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { columns, StatusBadge } from "./columns"
import {
  EMPLOYEES,
  getBalanceHintText,
  STATUS_ORDER,
  type IEmployee,
  type Status,
} from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, Cancel01Icon, FilterIcon, MoreHorizontalCircle01Icon, Download01Icon, RefreshIcon, SettingsIcon, UserAdd01Icon } from "@hugeicons/core-free-icons"

function employeeSearchBlob(e: IEmployee): string {
  const parts = [
    e.id,
    e.name,
    e.email,
    e.company,
    e.role,
    e.location,
    e.joined,
    e.status,
    String(e.balance),
    e.customerId,
    e.department,
    e.tenureLabel,
    e.timezone,
    e.companyTier,
    e.lastActiveLabel,
    e.balanceMeta?.reversal?.reason,
    e.balanceMeta?.reversal?.settledOn,
    getBalanceHintText(e) ?? "",
  ]
  return parts.filter(Boolean).join(" ").toLowerCase()
}

// ── Toolbar ──

interface ToolbarProps {
  searchQuery: string
  onSearchChange: (v: string) => void
  selectedStatuses: Status[]
  onStatusChange: (checked: boolean, status: Status) => void
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
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full min-w-48 sm:w-48">
          <InputGroupAddon align="inline-start">
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search customers..."
            aria-label="Search customers"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
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
              <Button variant="outline" aria-label="Filter by customer status">
                <HugeiconsIcon icon={FilterIcon} strokeWidth={2} aria-hidden="true" />
                Status
                {selectedStatuses.length > 0 && (
                  <Badge size="sm" variant="info-outline">
                    {selectedStatuses.length}
                  </Badge>
                )}
              </Button>
            }
          />
          <PopoverContent
            align="start"
            className="flex w-40 flex-col gap-2.5 p-3"
          >
            <span className="text-muted-foreground text-xs font-medium">
              Filter by status
            </span>
            {STATUS_ORDER.map((status) => (
              <div key={status} className="flex items-center gap-2.5">
                <Checkbox
                  id={`status-${status}`}
                  checked={selectedStatuses.includes(status)}
                  onCheckedChange={(checked) =>
                    onStatusChange(checked === true, status)
                  }
                />
                <Label
                  htmlFor={`status-${status}`}
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
            <Button variant="outline" aria-label="Table actions">
              <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} aria-hidden="true" />
              Actions
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() =>
                toast.success("Export ready", {
                  description: "Wire this to your API. Demo only.",
                })
              }
            >
              <HugeiconsIcon icon={Download01Icon} strokeWidth={2} aria-hidden="true" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.message("Refreshed", {
                  description: "Demo. Connect to live data when integrating.",
                })
              }
            >
              <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} aria-hidden="true" />
              Refresh
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.info("View settings", {
                  description:
                    "Open column layout and density in your app shell.",
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

// ── Main component ──

export function DataGridView() {
  const [employees, setEmployees] = useState<IEmployee[]>(EMPLOYEES)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>([])

  const [columnOrder, setColumnOrder] = useState<string[]>(
    columns.map((c) => c.id as string)
  )
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({
      joined: false,
    })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const statusCounts = useMemo(
    () =>
      employees.reduce(
        (acc, e) => {
          acc[e.status] = (acc[e.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
    [employees]
  )

  const filteredData = useMemo(() => {
    return employees.filter((item) => {
      const matchesStatus =
        !selectedStatuses.length || selectedStatuses.includes(item.status)
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery || employeeSearchBlob(item).includes(searchLower)
      return matchesStatus && matchesSearch
    })
  }, [employees, searchQuery, selectedStatuses])

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedStatuses.length > 0

  const handleStatusChange = (checked: boolean, status: Status) => {
    setSelectedStatuses((prev) =>
      checked ? [...prev, status] : prev.filter((s) => s !== status)
    )
  }

  const handleClearFilters = () => {
    setSelectedStatuses([])
    setSearchQuery("")
  }

  useEffect(() => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }, [searchQuery, selectedStatuses])

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
      {/* Table */}
      <ReuiDataGrid
        table={table}
        recordCount={filteredData.length}
        emptyMessage={
          filteredData.length === 0
            ? "No customers match your search or status filters. Clear filters or widen your search."
            : undefined
        }
        tableLayout={{
          columnsPinnable: true,
          columnsResizable: true,
          columnsMovable: true,
          columnsVisibility: true,
          dense: true,
        }}
      >
        <Frame variant="default" spacing="sm" className="w-full">
          <FrameHeader className="flex-row items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <FrameTitle id="page-heading" className="text-balance">
                Customers
              </FrameTitle>
              <FrameDescription className="text-xs text-pretty">
                {filteredData.length} of {employees.length} customers
              </FrameDescription>
            </div>
            <Button
              type="button"
              onClick={() =>
                toast.info("Add customer", {
                  description: "Connect your CRM or signup flow. Demo only.",
                })
              }
            >
              <HugeiconsIcon icon={UserAdd01Icon} strokeWidth={2} aria-hidden="true" />
              Add customer
            </Button>
          </FrameHeader>
          <FramePanel className="bg-card p-0! shadow-none!">
            <div className="px-4 py-3">
              <Toolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
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