import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DataGrid,
  dataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import { Filters } from "@/components/reui/filters/filters"
import {
  createFilterQuery,
  createFilterRule,
  flattenFilterConditions,
} from "@/components/reui/filters/filters-query"
import type { FilterCondition } from "@/components/reui/filters/filters-query"
import type {
  FilterField,
  FilterQuery,
} from "@/components/reui/filters/filters-types"
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
} from "@tanstack/react-table"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Item, ItemMedia } from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  createContactColumns,
  LifecycleBadge,
  type ContactRowAction,
} from "./columns"
import { ContactDetailSheet } from "./contact-detail-sheet"
import { ContactsSelectionBar } from "./contacts-selection-bar"
import {
  ACCOUNT_COUNT,
  AccountLogo,
  CONTACTS,
  LIFECYCLE_OPTIONS,
  OWNERS,
  type IContact,
  type Lifecycle,
} from "./data"
import { DotSeparator } from "./dot-separator"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserIcon, Mail01Icon, Building02Icon, UserMultiple02Icon, GitBranchIcon, UserAdd01Icon, FilterIcon, FilterRemoveIcon } from "@hugeicons/core-free-icons"

// ── Helpers ──

function getActiveFilters(filters: FilterCondition[]) {
  return filters.filter((filter) => {
    const { operator, values } = filter
    // `empty` and `not_empty` take no value, so an empty `values` is the whole
    // condition rather than a half-filled one.
    if (operator === "empty" || operator === "not_empty") return true
    if (!values || values.length === 0) return false
    if (
      values.every((value) => typeof value === "string" && value.trim() === "")
    )
      return false
    if (values.every((value) => value === null || value === undefined))
      return false
    if (values.every((value) => Array.isArray(value) && value.length === 0))
      return false
    return true
  })
}

// `negated` is part of the key: negating a rule keeps the same field, operator
// and values, so leaving it out makes the chip's Negate action a no-op for the
// data even though the chip reads "not starts with".
function serializeActiveFiltersKey(active: FilterCondition[]) {
  return JSON.stringify(
    active.map((f) => ({
      field: f.field,
      operator: f.operator,
      values: f.values,
      negated: f.negated,
    }))
  )
}

function filterFieldValue(item: IContact, field: string): unknown {
  if (field === "owner") return item.owner.name
  return item[field as keyof IContact]
}

function matchesContactCondition(
  fieldValue: unknown,
  operator: string,
  values: unknown[]
): boolean {
  switch (operator) {
    case "is":
      return values.includes(fieldValue)
    case "is_not":
      return !values.includes(fieldValue)
    case "is_any_of":
      return values.some((v) => fieldValue === v)
    case "is_none_of":
      return !values.some((v) => fieldValue === v)
    case "contains": {
      const tokens = values.map((v) => String(v).trim()).filter(Boolean)
      if (tokens.length === 0) return true
      return tokens.some((token) =>
        String(fieldValue).toLowerCase().includes(token.toLowerCase())
      )
    }
    case "not_contains":
      return !values.some((v) =>
        String(fieldValue).toLowerCase().includes(String(v).toLowerCase())
      )
    case "starts_with":
      return values.some((v) =>
        String(fieldValue).toLowerCase().startsWith(String(v).toLowerCase())
      )
    case "ends_with":
      return values.some((v) =>
        String(fieldValue).toLowerCase().endsWith(String(v).toLowerCase())
      )
    case "eq":
      return fieldValue === values[0]
    case "neq":
      return fieldValue !== values[0]
    case "empty":
      return fieldValue === "" || fieldValue == null
    case "not_empty":
      return fieldValue !== "" && fieldValue != null
    default:
      return true
  }
}

function applyFiltersToData(
  data: IContact[],
  filters: FilterCondition[]
): IContact[] {
  const active = getActiveFilters(filters)
  let result = [...data]
  active.forEach((filter) => {
    const { field, operator, values, negated } = filter
    result = result.filter((item) => {
      const raw = filterFieldValue(item, field)
      const fieldValue = raw != null ? raw : ""
      const matches = matchesContactCondition(fieldValue, operator, values)
      // Negate swaps to the operator's declared inverse where there is one and
      // otherwise sets this flag, so "starts with" and "ends with" only read
      // right once the match is flipped here.
      return negated ? !matches : matches
    })
  })
  return result
}

function renderSelectedCount(values: unknown[]) {
  if (values.length === 0) return "Select..."
  if (values.length > 1) return `${values.length} selected`
  return null
}

function createDefaultContactFilters(): FilterQuery {
  return createFilterQuery([
    createFilterRule({
      id: "name-1",
      path: ["name"],
      operator: "contains",
      value: "",
    }),
  ])
}

// ── Main ──

export function ContactsGridView() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [filterQuery, setFilterQuery] = useState<FilterQuery>(
    createDefaultContactFilters
  )
  const filters = useMemo(
    () => flattenFilterConditions(filterQuery),
    [filterQuery]
  )
  const [bulkOwnerValue, setBulkOwnerValue] = useState<string>(OWNERS[0].name)

  const [isLoading, setIsLoading] = useState(false)
  const [filteredData, setFilteredData] = useState<IContact[]>(CONTACTS)
  const isInitialLoad = useRef(true)
  const lastAppliedActiveKey = useRef<string>(
    serializeActiveFiltersKey(
      getActiveFilters(flattenFilterConditions(createDefaultContactFilters()))
    )
  )

  const [selectedContact, setSelectedContact] = useState<IContact | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const companyOptions = useMemo(() => {
    return [
      ...new Map(
        CONTACTS.map((contact) => [contact.company, contact])
      ).values(),
    ]
      .sort((a, b) => a.company.localeCompare(b.company))
      .map((contact) => ({
        value: contact.company,
        label: contact.company,
        icon: (
          <Item variant="outline" size="xs" className="size-7 shrink-0 p-0">
            <ItemMedia variant="icon" className="size-auto">
              <AccountLogo company={contact.company} className="size-4" />
            </ItemMedia>
          </Item>
        ),
      }))
  }, [])

  const ownerOptions = useMemo(
    () => OWNERS.map((owner) => ({ value: owner.name, label: owner.name })),
    []
  )

  const filterFields: FilterField[] = useMemo(
    () => [
      {
        id: "name",
        label: "Name",
        icon: (
          <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-3.5" aria-hidden />
        ),
        type: "text",
        placeholder: "Search contacts...",
      },
      {
        id: "email",
        label: "Email",
        icon: (
          <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} className="size-3.5" aria-hidden />
        ),
        type: "text",
        placeholder: "Search...",
      },
      {
        id: "company",
        label: "Account",
        icon: (
          <HugeiconsIcon icon={Building02Icon} strokeWidth={2} className="size-3.5" aria-hidden />
        ),
        type: "select",
        searchable: true,
        // Wider than the option editor's 192px default on purpose: the option
        // rows carry an account avatar, so "Apex Manufacturing" needs 239px in
        // luma and clips below that.
        className: "w-64",
        options: companyOptions,
        renderValue: ({ values, options }) => {
          const state = renderSelectedCount(values)
          if (state) return state

          const option = options.find((item) => item.value === values[0])
          if (!option) return String(values[0])

          return (
            <div className="flex items-center gap-2">
              {option.icon}
              <span className="truncate">{option.label}</span>
            </div>
          )
        },
      },
      {
        id: "owner",
        label: "Owner",
        icon: (
          <HugeiconsIcon icon={UserMultiple02Icon} strokeWidth={2} className="size-3.5" aria-hidden />
        ),
        type: "select",
        searchable: true,
        options: ownerOptions,
        renderValue: ({ values }) => {
          const state = renderSelectedCount(values)
          if (state) return state
          return String(values[0])
        },
      },
      {
        id: "lifecycle",
        label: "Lifecycle",
        icon: (
          <HugeiconsIcon icon={GitBranchIcon} strokeWidth={2} className="size-3.5" aria-hidden />
        ),
        type: "select",
        searchable: false,
        options: LIFECYCLE_OPTIONS,
        renderValue: ({ values }) => {
          const state = renderSelectedCount(values)
          if (state) return state
          return <LifecycleBadge lifecycle={values[0] as Lifecycle} />
        },
      },
    ],
    [companyOptions, ownerOptions]
  )

  const applyFilters = useCallback((newFilters: FilterCondition[]) => {
    return applyFiltersToData(CONTACTS, newFilters)
  }, [])

  const simulateAsyncFiltering = useCallback(
    async (newFilters: FilterCondition[]) => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 400))
      setFilteredData(applyFilters(newFilters))
      setIsLoading(false)
    },
    [applyFilters]
  )

  const handleFiltersChange = useCallback(
    (nextQuery: FilterQuery) => {
      const newFilters = flattenFilterConditions(nextQuery)

      setFilterQuery(nextQuery)
      const newActive = getActiveFilters(newFilters)
      const nextKey = serializeActiveFiltersKey(newActive)
      if (nextKey === lastAppliedActiveKey.current) return
      lastAppliedActiveKey.current = nextKey
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
      setRowSelection({})
      simulateAsyncFiltering(newFilters)
    },
    [simulateAsyncFiltering]
  )

  useEffect(() => {
    if (isInitialLoad.current) {
      setFilteredData(applyFilters(filters))
      isInitialLoad.current = false
    }
  }, [filters, applyFilters])

  const handleRowAction = useCallback(
    (action: ContactRowAction, contact: IContact) => {
      if (action === "view") {
        setSelectedContact(contact)
        setDetailOpen(true)
        return
      }
      if (action === "delete") {
        toast.message("Delete requested", {
          description: `${contact.name} queued for removal from ${contact.company}.`,
        })
        return
      }
      // email
      toast.success("Email logged", {
        description: `Logged against ${contact.name}. Next step: book a follow up.`,
      })
    },
    []
  )

  const columns = useMemo(
    () => createContactColumns({ onAction: handleRowAction }),
    [handleRowAction]
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: filteredData,
    pageCount: Math.ceil(filteredData.length / pagination.pageSize),
    getRowId: (row) => row.id,
    state: {
      pagination,
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
  })

  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((row) => row.original.id)
  const selectedCount = selectedRows.length
  const showClearButton = filters.length > 0

  const handleClearSelection = useCallback(() => setRowSelection({}), [])

  const handleAssignOwner = useCallback(() => {
    if (selectedRows.length === 0) return
    setRowSelection({})
    toast.success("Owner assigned", {
      description: `${bulkOwnerValue} now owns ${selectedRows.length} contact${
        selectedRows.length === 1 ? "" : "s"
      }.`,
    })
  }, [bulkOwnerValue, selectedRows])

  const handleAddToList = useCallback(() => {
    if (selectedRows.length === 0) return
    setRowSelection({})
    toast.success("Added to list", {
      description: `${selectedRows.length} contact${
        selectedRows.length === 1 ? "" : "s"
      } added to Q3 Outbound.`,
    })
  }, [selectedRows])

  const handleLogEmail = useCallback((contact: IContact) => {
    setDetailOpen(false)
    toast.success("Email logged", {
      description: `Logged against ${contact.name}. Next step: book a follow up.`,
    })
  }, [])

  return (
    <TooltipProvider delay={200}>
      <>
        <DataGrid
          table={table}
          isLoading={isLoading}
          loadingMode="skeleton"
          recordCount={filteredData.length}
          emptyMessage={
            !isLoading && filteredData.length === 0
              ? "No contacts match these filters. Clear filters to see all accounts."
              : undefined
          }
          tableLayout={{
            headerSticky: true,
            dense: true,
          }}
        >
          <Frame spacing="sm" className="w-full">
            <FrameHeader className="flex-row items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <FrameTitle className="text-balance">Contacts</FrameTitle>
                <FrameDescription className="flex items-center gap-1.5 text-xs text-pretty">
                  <span>{CONTACTS.length} contacts</span>
                  <DotSeparator />
                  <span>{ACCOUNT_COUNT} accounts</span>
                </FrameDescription>
              </div>
              <Button
                type="button"
                onClick={() =>
                  toast.info("Add contact", {
                    description:
                      "Draft a contact, set the owner and account, then save.",
                  })
                }
              >
                <HugeiconsIcon icon={UserAdd01Icon} strokeWidth={2} aria-hidden="true" />
                Add Contact
              </Button>
            </FrameHeader>
            <FramePanel className="p-0 shadow-none">
              <div className="flex flex-wrap items-center justify-between gap-2 px-(--frame-panel-header-px) py-(--frame-panel-header-py)">
                <Filters
                  query={filterQuery}
                  fields={filterFields}
                  onQueryChange={handleFiltersChange}
                  size="default"
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      aria-label="Filters"
                    >
                      <HugeiconsIcon icon={FilterIcon} strokeWidth={2} aria-hidden />
                      Filters
                    </Button>
                  }
                />
                {showClearButton && (
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      const nextQuery = createDefaultContactFilters()
                      const next = flattenFilterConditions(nextQuery)
                      lastAppliedActiveKey.current = serializeActiveFiltersKey(
                        getActiveFilters(next)
                      )
                      setFilterQuery(nextQuery)
                      setRowSelection({})
                      simulateAsyncFiltering(next)
                    }}
                    disabled={isLoading}
                  >
                    <HugeiconsIcon icon={FilterRemoveIcon} strokeWidth={2} className="size-3.5" aria-hidden />
                    Clear
                  </Button>
                )}
              </div>
              {selectedCount > 0 ? (
                <ContactsSelectionBar
                  selectedCount={selectedCount}
                  ownerValue={bulkOwnerValue}
                  ownerOptions={OWNERS}
                  onOwnerChange={setBulkOwnerValue}
                  onAssign={handleAssignOwner}
                  onAddToList={handleAddToList}
                  onClear={handleClearSelection}
                />
              ) : (
                <Separator />
              )}
              <DataGridScrollArea>
                <DataGridTable />
              </DataGridScrollArea>
              <Separator />
              <FrameFooter>
                <DataGridPagination sizes={[10, 20, 30]} />
              </FrameFooter>
            </FramePanel>
          </Frame>
        </DataGrid>

        <ContactDetailSheet
          contact={selectedContact}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onLogEmail={handleLogEmail}
        />
      </>
    </TooltipProvider>
  )
}

export { ContactsGridView as DataGridView }