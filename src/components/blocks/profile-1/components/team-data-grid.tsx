import { useMemo, useState } from "react"
import { Badge } from "@/components/reui/badge"
import {
  DataGrid,
  dataGridFeatures,
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
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  TEAM_MEMBERS,
  TEAM_STATUS_ORDER,
  type TeamMember,
  type TeamMemberStatus,
} from "./data"
import { teamColumns, TeamStatusBadge } from "./team-columns"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, Cancel01Icon, FilterIcon, UserAdd01Icon } from "@hugeicons/core-free-icons"

const EMPTY_TEAM_STATUS_COUNTS: Record<TeamMemberStatus, number> = {
  Active: 0,
  Invited: 0,
  Limited: 0,
  Suspended: 0,
}

function teamSearchBlob(user: TeamMember): string {
  const parts = [
    user.id,
    user.name,
    user.email,
    user.role,
    user.department,
    user.access,
    user.status,
    user.location,
    user.timezone,
    user.joined,
    user.lastActive,
  ]

  return parts.filter(Boolean).join(" ").toLowerCase()
}

function getTeamStatusCounts(
  members: TeamMember[]
): Record<TeamMemberStatus, number> {
  const counts = { ...EMPTY_TEAM_STATUS_COUNTS }

  for (const member of members) {
    counts[member.status] += 1
  }

  return counts
}

type ToolbarProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedStatuses: TeamMemberStatus[]
  onStatusChange: (checked: boolean, status: TeamMemberStatus) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  statusCounts: Record<TeamMemberStatus, number>
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
    <div className="flex flex-wrap items-center gap-2">
      {/* List */}
      <InputGroup className="w-full sm:w-60">
        <InputGroupAddon align="inline-start">
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search team..."
          aria-label="Search team"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        {searchQuery.length > 0 ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Clear search"
              size="icon-xs"
              onClick={() => onSearchChange("")}
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-label="Filter by member status"
            >
              <HugeiconsIcon icon={FilterIcon} strokeWidth={2} aria-hidden="true" />
              Status
              {selectedStatuses.length > 0 ? (
                <Badge size="sm" variant="info-light">
                  {selectedStatuses.length}
                </Badge>
              ) : null}
            </Button>
          }
        />
        <PopoverContent
          align="start"
          className="flex w-44 flex-col gap-2.5 p-3"
        >
          <span className="text-muted-foreground text-xs font-medium">
            Filter by status
          </span>
          {TEAM_STATUS_ORDER.map((status) => (
            <div key={status} className="flex items-center gap-2.5">
              <Checkbox
                id={`team-status-${status.toLowerCase()}`}
                checked={selectedStatuses.includes(status)}
                onCheckedChange={(checked) =>
                  onStatusChange(checked === true, status)
                }
              />
              <Label
                htmlFor={`team-status-${status.toLowerCase()}`}
                className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 font-normal"
              >
                <TeamStatusBadge status={status} />
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {statusCounts[status] ?? 0}
                </span>
              </Label>
            </div>
          ))}
        </PopoverContent>
      </Popover>

      {hasActiveFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={onClearFilters}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  )
}

export function TeamDataGridView() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<TeamMemberStatus[]>(
    []
  )

  const statusCounts = useMemo(() => getTeamStatusCounts(TEAM_MEMBERS), [])

  const filteredData = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase()

    return TEAM_MEMBERS.filter((user) => {
      const matchesStatus =
        !selectedStatuses.length || selectedStatuses.includes(user.status)
      const matchesSearch =
        normalizedSearchQuery.length === 0 ||
        teamSearchBlob(user).includes(normalizedSearchQuery)

      return matchesStatus && matchesSearch
    })
  }, [searchQuery, selectedStatuses])

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedStatuses.length > 0

  const handleStatusChange = (checked: boolean, status: TeamMemberStatus) => {
    setSelectedStatuses((current) =>
      checked ? [...current, status] : current.filter((item) => item !== status)
    )
    setPagination((current) => ({
      ...current,
      pageIndex: 0,
    }))
  }

  const handleClearFilters = () => {
    setSelectedStatuses([])
    setSearchQuery("")
    setPagination((current) => ({
      ...current,
      pageIndex: 0,
    }))
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setPagination((current) => ({
      ...current,
      pageIndex: 0,
    }))
  }

  const table = useTable({
    features: dataGridFeatures,
    columns: teamColumns,
    data: filteredData,
    pageCount: Math.ceil(filteredData.length / pagination.pageSize),
    getRowId: (row) => row.id,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  })

  return (
    <DataGrid
      table={table}
      recordCount={filteredData.length}
      emptyMessage={
        filteredData.length === 0 ? "No members match your filters." : undefined
      }
      tableLayout={{
        columnsPinnable: false,
        columnsResizable: false,
        columnsMovable: false,
        columnsVisibility: false,
        headerSticky: false,
        dense: true,
      }}
    >
      <Frame variant="default" spacing="sm" className="w-full">
        <FrameHeader className="flex-row items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <FrameTitle id="team-heading" className="text-balance capitalize">
              Workspace Team
            </FrameTitle>
            <FrameDescription className="text-sm">
              Manage members and access.
            </FrameDescription>
          </div>
          <Button
            type="button"
            onClick={() =>
              toast.info("Invite member", {
                description: "Connect your invite or directory flow.",
              })
            }
          >
            <HugeiconsIcon icon={UserAdd01Icon} strokeWidth={2} aria-hidden="true" />
            Invite member
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
    </DataGrid>
  )
}