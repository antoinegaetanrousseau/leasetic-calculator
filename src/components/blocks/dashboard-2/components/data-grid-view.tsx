import { useCallback, useMemo, useState } from "react"
import { Badge } from "@/components/reui/badge"
import {
  DataGrid,
  dataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import {
  DataGridTable,
  DataGridTableHeader,
} from "@/components/reui/data-grid/data-grid-table"
import {
  useTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { createModuleGridColumns, type ModuleRowAction } from "./columns"
import {
  MODULE_RECORDS,
  MODULE_STATUS_OPTIONS,
  type ModuleRecord,
  type ModuleStatus,
} from "./data"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, Flag03Icon, ArrowRight01Icon, PackageIcon, Search01Icon, Cancel01Icon, ArrowDataTransferVerticalIcon, ArrowDown01Icon, FilterIcon } from "@hugeicons/core-free-icons"

type ModuleSort = "name" | "dateStart" | "progress" | "status"

const sortLabels: Record<ModuleSort, string> = {
  name: "Name",
  dateStart: "Window",
  progress: "Progress",
  status: "Status",
}

const EMPTY_MODULE_MESSAGE = "No ReUI modules match the selected filters."

function buildSorting(sortBy: ModuleSort): SortingState {
  return [{ id: sortBy, desc: false }]
}

function getModuleSearchBlob(module: ModuleRecord) {
  return [
    module.name,
    module.id,
    module.kind,
    module.domain,
    module.owner.name,
    module.owner.role,
    module.health,
    module.status,
    module.dateRange,
  ]
    .join(" ")
    .toLowerCase()
}

export function ModulesDataGridView() {
  const [modules, setModules] = useState<ModuleRecord[]>(MODULE_RECORDS)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<ModuleStatus[]>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sortBy, setSortBy] = useState<ModuleSort>("name")
  const [sorting, setSorting] = useState<SortingState>(() =>
    buildSorting("name")
  )

  const filteredModules = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase()

    return modules.filter((module) => {
      const matchesSearch =
        normalizedSearchQuery.length === 0 ||
        getModuleSearchBlob(module).includes(normalizedSearchQuery)
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(module.status)

      return matchesSearch && matchesStatus
    })
  }, [modules, searchQuery, selectedStatuses])

  const activeFilterCount = selectedStatuses.length

  const resetPagination = useCallback(() => {
    setPagination((current) => ({
      ...current,
      pageIndex: 0,
    }))
  }, [])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      resetPagination()
    },
    [resetPagination]
  )

  const handleStatusToggle = useCallback(
    (status: ModuleStatus, checked: boolean) => {
      setSelectedStatuses((current) => {
        if (checked) {
          return current.includes(status) ? current : [...current, status]
        }

        return current.filter((item) => item !== status)
      })
      resetPagination()
    },
    [resetPagination]
  )

  const handleSortChange = useCallback(
    (value: string) => {
      const nextSort = value as ModuleSort
      setSortBy(nextSort)
      setSorting(buildSorting(nextSort))
      resetPagination()
    },
    [resetPagination]
  )

  const handleModuleAction = useCallback(
    (action: ModuleRowAction, module: ModuleRecord) => {
      if (action === "favorite") {
        setModules((current) =>
          current.map((item) =>
            item.id === module.id
              ? {
                  ...item,
                  favorite: !item.favorite,
                }
              : item
          )
        )
        toast.success(module.favorite ? "Removed favorite" : "Module starred", {
          description: module.name,
          icon: (
            <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
          ),
        })
        return
      }

      if (action === "open") {
        toast.info("Open ReUI module", {
          description: `${module.name} (${module.kind})`,
        })
        return
      }

      toast.message(
        action === "duplicate" ? "Duplicate module" : "Archive module",
        {
          description: `Connect this action to your ${module.name} flow.`,
        }
      )
    },
    []
  )

  const handleAddModule = () => {
    toast.success("Add ReUI module", {
      description: "Open your module creation dialog.",
      icon: (
        <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
      ),
    })
  }

  const columns = useMemo(
    () => createModuleGridColumns({ onAction: handleModuleAction }),
    [handleModuleAction]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useTable({
    features: dataGridFeatures,
    data: filteredModules,
    columns,
    pageCount: Math.ceil(filteredModules.length / pagination.pageSize),
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
  })

  return (
    <DataGrid
      table={table}
      recordCount={filteredModules.length}
      emptyMessage={EMPTY_MODULE_MESSAGE}
      tableLayout={{
        dense: true,
        rowBorder: true,
        headerSticky: false,
        columnsVisibility: false,
        columnsResizable: false,
        columnsMovable: false,
        width: "fixed",
      }}
      tableClassNames={{
        bodyRow: "group/module-row [&>td]:h-16",
      }}
    >
      <div className="flex w-full max-w-6xl flex-col">
        <div className="flex flex-col gap-3 border-b px-0 py-3 lg:min-h-14 lg:flex-row lg:items-center lg:gap-4 lg:py-0">
          <div className="flex min-w-0 items-center gap-2">
            <HugeiconsIcon icon={Flag03Icon} strokeWidth={2} className="size-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span className="text-muted-foreground truncate text-sm">ReUI</span>
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
            <HugeiconsIcon icon={PackageIcon} strokeWidth={2} className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <h2 className="text-foreground truncate text-sm font-medium">
              Modules
            </h2>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:ml-auto lg:flex-nowrap">
            <InputGroup className="w-full min-w-40 sm:w-48">
              <InputGroupAddon align="inline-start">
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="text-muted-foreground size-4" aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search..."
                aria-label="Search modules"
              />
              {searchQuery.length > 0 ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Clear search"
                    onClick={() => handleSearchChange("")}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" aria-hidden="true" />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="outline">
                    <HugeiconsIcon icon={ArrowDataTransferVerticalIcon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
                    {sortLabels[sortBy]}
                    <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} data-icon="inline-end" aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuGroup>
                  {(["name", "dateStart", "progress", "status"] as const).map(
                    (value) => (
                      <DropdownMenuItem
                        key={value}
                        onClick={() => handleSortChange(value)}
                      >
                        {sortLabels[value]}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="outline">
                    <HugeiconsIcon icon={FilterIcon} strokeWidth={2} data-icon="inline-start" aria-hidden="true" />
                    Filters
                    {activeFilterCount > 0 ? (
                      <Badge variant="outline" radius="full">
                        {activeFilterCount}
                      </Badge>
                    ) : null}
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  {MODULE_STATUS_OPTIONS.map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={selectedStatuses.includes(status)}
                      closeOnClick={false}
                      onCheckedChange={(checked) =>
                        handleStatusToggle(status, checked === true)
                      }
                    >
                      {status}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
                {activeFilterCount > 0 ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      closeOnClick={false}
                      onClick={() => {
                        setSelectedStatuses([])
                        resetPagination()
                      }}
                    >
                      Reset filters
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button type="button" onClick={handleAddModule}>
              Add Module
            </Button>
          </div>
        </div>

        {filteredModules.length > 0 ? (
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        ) : (
          <>
            <DataGridScrollArea>
              <DataGridTableHeader />
            </DataGridScrollArea>
            <div className="text-muted-foreground flex min-h-48 w-full items-center justify-center px-4 text-center text-sm">
              {EMPTY_MODULE_MESSAGE}
            </div>
          </>
        )}

        <div className="border-t px-0 py-3">
          {filteredModules.length > 0 ? (
            <DataGridPagination
              sizes={[10, 15, 20]}
              info="{from} - {to} of {count} modules"
              className="py-0"
            />
          ) : (
            <p className="text-muted-foreground text-center text-sm">
              0 modules
            </p>
          )}
        </div>
      </div>
    </DataGrid>
  )
}