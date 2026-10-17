"use client"

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import {
  IconRestore,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react"

import { useConfirm } from "@/components/feedback/confirm-provider"
import { DemoPageHeader } from "@/components/demo/demo-page"
import {
  PanelFrame,
  panelCardClassName,
} from "@/components/layout/panel-frame"
import {
  DirectoryColumnHeader,
  DirectoryColumnLabel,
  type ColumnSortDirection,
} from "@/features/admin/components/directory-column-header"
import {
  deleteArchivedPatientRecordsAction,
  listArchivedPatientRecordsAction,
  listMatchingPatientRecordIdsAction,
  restoreArchivedPatientRecordsAction,
} from "@/features/patients/actions"
import { useCachedPatientPages } from "@/features/patients/hooks/use-cached-patient-pages"
import {
  PatientSelectAllBanner,
  PatientSelectScopeControl,
  type PatientSelectionScope,
} from "@/components/patients/patient-select-scope-control"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"
import { patientToasts } from "@/lib/feedback/toast-messages"
import { PATIENT_SEARCH_PLACEHOLDER } from "@/lib/students/patient-search-copy"
import { NO_STUDENT_FOUND } from "@/lib/students/types"
import {
  staleListBusy,
  staleListBusyClassName,
} from "@/lib/ui/stale-list-busy"
import { cn } from "@/lib/utils"
import {
  patientCampusId,
  patientFullName,
  patientTypeIsStudent,
  patientTypeLabel,
  type PatientRecord,
  type PatientRecordListResult,
  type PatientRecordSortColumn,
} from "@/types/patientRecord"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

function BinTableSkeleton() {
  return (
    <div className="space-y-2 p-4" role="status" aria-label="Loading bin">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </div>
  )
}

function formatArchivedAt(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function PatientsBinPage({
  access,
  initialList,
  initialError,
}: {
  access: StaffAccess
  initialList: PatientRecordListResult
  initialError?: string | null
}) {
  const { confirmPreset } = useConfirm()
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [sortColumn, setSortColumn] =
    useState<PatientRecordSortColumn>("patient")
  const [sortDirection, setSortDirection] =
    useState<ColumnSortDirection>("asc")
  const [list, setList] = useState(initialList)
  const [page, setPage] = useState(initialList.page ?? 1)
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [selectionScope, setSelectionScope] =
    useState<PatientSelectionScope>("none")
  const [selectingAll, setSelectingAll] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const [isPending, startTransition] = useTransition()
  const skipNextFetch = useRef(true)
  const selectionQueryScopeRef = useRef("")
  const mountedRef = useRef(false)
  const pageCache = useCachedPatientPages()

  const canManage = can(access.designation, "patients.edit_information")

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (initialError) patientToasts.failed(initialError)
  }, [initialError])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = query.trim()
      if (nextQuery === debouncedQuery) return
      setDebouncedQuery(nextQuery)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query, debouncedQuery])

  const activeSortDir = sortDirection === false ? "asc" : sortDirection

  const queryScope = useMemo(
    () =>
      JSON.stringify({
        q: debouncedQuery,
        sort: sortColumn,
        dir: activeSortDir,
        bin: true,
      }),
    [activeSortDir, debouncedQuery, sortColumn]
  )

  const fetchListPage = useCallback(
    async (nextPage: number): Promise<PatientRecordListResult | null> => {
      const result = await listArchivedPatientRecordsAction({
        query: debouncedQuery,
        page: nextPage,
        pageSize: PAGE_SIZE,
        sortBy: sortColumn,
        sortDir: activeSortDir,
      })
      if (!result.ok) {
        if (result.error === NO_STUDENT_FOUND) {
          return {
            items: [],
            total: 0,
            page: 1,
            pageSize: PAGE_SIZE,
            totalPages: 1,
          }
        }
        patientToasts.failed(result.error)
        return null
      }
      return result.data
    },
    [activeSortDir, debouncedQuery, sortColumn]
  )

  const loadPage = useCallback(
    async (nextPage: number, options: { force?: boolean } = {}) => {
      pageCache.setScope(queryScope)
      const cached = !options.force ? pageCache.getCached(nextPage) : null
      if (cached) {
        setList(cached)
        setPage(cached.page)
        setLoading(false)
        pageCache.prefetchAdjacent(
          cached.page,
          cached.totalPages,
          fetchListPage
        )
        return
      }

      setLoading(true)
      try {
        const data = await pageCache.fetchPage(nextPage, fetchListPage, {
          bypassCache: options.force,
        })
        if (!mountedRef.current || !data) return
        setList(data)
        setPage(data.page)
        pageCache.prefetchAdjacent(data.page, data.totalPages, fetchListPage)
      } catch {
        if (!mountedRef.current) return
        patientToasts.failed(
          "Unable to reach the database. Check your connection and try again."
        )
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    },
    [fetchListPage, pageCache, queryScope]
  )

  const onPageOrFiltersChange = useEffectEvent((nextPage: number) => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      pageCache.setScope(queryScope)
      pageCache.put(initialList)
      pageCache.prefetchAdjacent(
        initialList.page,
        initialList.totalPages,
        fetchListPage
      )
      selectionQueryScopeRef.current = queryScope
      return
    }
    const filtersChanged = selectionQueryScopeRef.current !== queryScope
    selectionQueryScopeRef.current = queryScope
    setSelectionScope((current) => {
      if (current === "all" && !filtersChanged) return current
      setSelectedIds(new Set())
      return "none"
    })
    void loadPage(nextPage)
  })

  useEffect(() => {
    onPageOrFiltersChange(page)
  }, [page, queryScope])

  const onRealtimeBin = useEffectEvent(() => {
    pageCache.invalidate()
    void loadPage(page, { force: true })
  })

  useStaffRealtimeRefresh(
    `staff-patients-bin-${access.designation}`,
    STAFF_REALTIME_TABLES.patients,
    onRealtimeBin,
    500
  )

  function setColumnSort(
    column: PatientRecordSortColumn,
    direction: ColumnSortDirection
  ) {
    setSortColumn(column)
    setSortDirection(direction)
    setPage(1)
  }

  function sortDirectionFor(
    column: PatientRecordSortColumn
  ): ColumnSortDirection {
    return sortColumn === column ? sortDirection : false
  }

  const rows = list.items
  const visibleIds = useMemo(() => rows.map((row) => row.id), [rows])
  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedIds.has(id)
  ).length
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length
  const someVisibleSelected =
    selectedVisibleCount > 0 && !allVisibleSelected

  function toggleRow(patientId: string, checked: boolean) {
    setSelectionScope("none")
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(patientId)
      else next.delete(patientId)
      return next
    })
  }

  function selectCurrentPage() {
    setSelectionScope("page")
    setSelectedIds(new Set(visibleIds))
  }

  async function selectAllMatching() {
    if (selectingAll) return
    setSelectingAll(true)
    try {
      const result = await listMatchingPatientRecordIdsAction({
        query: debouncedQuery,
        sortBy: sortColumn,
        sortDir: activeSortDir,
        archived: true,
      })
      if (!result.ok) {
        patientToasts.failed(result.error)
        return
      }
      setSelectionScope("all")
      setSelectedIds(new Set(result.data))
    } finally {
      setSelectingAll(false)
    }
  }

  function clearSelection() {
    setSelectionScope("none")
    setSelectedIds(new Set())
  }

  function optimisticallyRemoveIds(ids: string[]) {
    const snapshot = list
    const idSet = new Set(ids)
    setList((prev) => {
      const items = prev.items.filter((item) => !idSet.has(item.id))
      const next = {
        ...prev,
        items,
        total: Math.max(0, prev.total - ids.length),
      }
      pageCache.put(next)
      return next
    })
    clearSelection()
    return snapshot
  }

  function reloadAfterRemoval(snapshot: PatientRecordListResult, removed: number) {
    pageCache.invalidate()
    startTransition(() => {
      const nextPage =
        snapshot.items.length <= removed && page > 1 ? page - 1 : page
      if (nextPage !== page) setPage(nextPage)
      else void loadPage(page, { force: true })
    })
  }

  function permanentlyDelete(ids: string[], label: string) {
    if (ids.length === 0 || actionPending || !canManage) return

    void confirmPreset("delete", {
      title:
        ids.length === 1
          ? "Permanently Delete Patient?"
          : "Permanently Delete Patients?",
      description: `Permanently delete ${label}? Linked consultations are removed. This cannot be undone.`,
      confirmLabel: "Delete permanently",
      onConfirm: async () => {
        setActionPending(true)
        const snapshot = optimisticallyRemoveIds(ids)
        try {
          const result = await deleteArchivedPatientRecordsAction(ids)
          if (!result.ok) throw new Error(result.error)
          patientToasts.deleted()
          reloadAfterRemoval(snapshot, ids.length)
        } catch (error) {
          setList(snapshot)
          pageCache.put(snapshot)
          throw error
        } finally {
          setActionPending(false)
        }
      },
    })
  }

  function restoreRecords(ids: string[], label: string) {
    if (ids.length === 0 || actionPending || !canManage) return

    void confirmPreset("restore", {
      title:
        ids.length === 1 ? "Restore Patient?" : "Restore Patients?",
      description: `Restore ${label} to Patient Records?`,
      confirmLabel: ids.length === 1 ? "Restore" : "Restore all",
      onConfirm: async () => {
        setActionPending(true)
        const snapshot = optimisticallyRemoveIds(ids)
        try {
          const result = await restoreArchivedPatientRecordsAction(ids)
          if (!result.ok) throw new Error(result.error)
          patientToasts.restored(result.data.restored)
          reloadAfterRemoval(snapshot, ids.length)
        } catch (error) {
          setList(snapshot)
          pageCache.put(snapshot)
          throw error
        } finally {
          setActionPending(false)
        }
      },
    })
  }

  function requestRestoreSelected() {
    const ids = [...selectedIds]
    const noun = ids.length === 1 ? "patient record" : "patient records"
    const label =
      selectionScope === "all"
        ? `all ${ids.length} matching archived ${noun}`
        : `${ids.length} archived ${noun}`
    restoreRecords(ids, label)
  }

  async function loadAllArchivedIds(): Promise<string[] | null> {
    const result = await listMatchingPatientRecordIdsAction({
      query: "",
      sortBy: sortColumn,
      sortDir: activeSortDir,
      archived: true,
    })
    if (!result.ok) {
      patientToasts.failed(result.error)
      return null
    }
    return result.data
  }

  async function requestRestoreAll() {
    if (actionPending || !canManage || list.total === 0) return
    setActionPending(true)
    let ids: string[] | null = null
    try {
      ids = await loadAllArchivedIds()
    } finally {
      setActionPending(false)
    }
    if (!ids) return
    if (ids.length === 0) {
      patientToasts.failed("Bin is already empty.")
      return
    }
    restoreRecords(
      ids,
      ids.length === 1
        ? "this archived patient record"
        : `all ${ids.length} archived patient records`
    )
  }

  async function requestEmptyBin() {
    if (actionPending || !canManage || list.total === 0) return
    setActionPending(true)
    let ids: string[] | null = null
    try {
      ids = await loadAllArchivedIds()
    } finally {
      setActionPending(false)
    }
    if (!ids) return
    if (ids.length === 0) {
      patientToasts.failed("Bin is already empty.")
      return
    }
    permanentlyDelete(
      ids,
      ids.length === 1
        ? "this archived patient record"
        : `all ${ids.length} items in the Bin`
    )
  }

  function requestDeleteSelected() {
    const ids = [...selectedIds]
    const noun = ids.length === 1 ? "patient record" : "patient records"
    const label =
      selectionScope === "all"
        ? `all ${ids.length} matching archived ${noun}`
        : `${ids.length} archived ${noun}`
    permanentlyDelete(ids, label)
  }

  const { showInitialSkeleton, isRefreshing } = staleListBusy(
    loading,
    rows.length,
    isPending
  )

  return (
    <main className="flex flex-col gap-6">
      <DemoPageHeader
        title="Bin"
        description="Archived patient records. Restore them back to Patient Records, or permanently delete them."
        designation={access.designation}
        showDemoBanner={false}
      />

      <PanelFrame>
        <Card className={cn(panelCardClassName, "gap-0 py-0")}>
          <CardHeader className="flex flex-col gap-3 border-b pt-(--card-spacing) sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Archived patients</CardTitle>
            <div className="relative w-full sm:w-72">
              <IconSearch
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                className="pl-8"
                placeholder={PATIENT_SEARCH_PLACEHOLDER}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={PATIENT_SEARCH_PLACEHOLDER}
              />
            </div>
          </CardHeader>

          {canManage ? (
            <div className="flex flex-wrap items-center gap-1 border-b px-(--card-spacing) py-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-1.5 text-muted-foreground"
                disabled={actionPending || selectingAll || list.total === 0}
                onClick={() => {
                  void requestEmptyBin()
                }}
              >
                <IconTrash className="size-4" aria-hidden />
                Empty Bin
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-1.5"
                disabled={actionPending || selectingAll || list.total === 0}
                onClick={() => {
                  void requestRestoreAll()
                }}
              >
                <IconRestore className="size-4" aria-hidden />
                Restore all items
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-1.5"
                disabled={
                  actionPending ||
                  selectingAll ||
                  selectedIds.size === 0
                }
                onClick={requestRestoreSelected}
              >
                <IconRestore className="size-4" aria-hidden />
                Restore the selected items
              </Button>
            </div>
          ) : null}

          {selectedIds.size > 0 ? (
            <div
              className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-(--card-spacing) py-3"
              role="status"
            >
              <p className="text-sm">
                <span className="font-medium tabular-nums">
                  {selectedIds.size}
                </span>{" "}
                {selectionScope === "all"
                  ? "matching patients selected"
                  : selectionScope === "page"
                    ? "on this page selected"
                    : "selected"}
              </p>
              <div className="flex flex-wrap gap-2">
                {canManage ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={actionPending || selectingAll}
                      onClick={requestRestoreSelected}
                    >
                      Restore
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={actionPending || selectingAll}
                      onClick={requestDeleteSelected}
                    >
                      Delete permanently
                    </Button>
                  </>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={actionPending || selectingAll}
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : null}
          <PatientSelectAllBanner
            pageCount={visibleIds.length}
            totalMatching={list.total}
            scope={selectionScope}
            selectingAll={selectingAll}
            noun="archived patients"
            onSelectAllMatching={() => {
              void selectAllMatching()
            }}
            onClear={clearSelection}
          />

          <CardContent className="min-w-0 p-0">
            {showInitialSkeleton ? (
              <BinTableSkeleton />
            ) : rows.length === 0 ? (
              <Empty className="border-0 py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconTrash aria-hidden />
                  </EmptyMedia>
                  <EmptyTitle>Bin is empty</EmptyTitle>
                  <EmptyDescription>
                    {debouncedQuery
                      ? NO_STUDENT_FOUND
                      : "Archived patients from Patient Records will appear here."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div
                className={cn(
                  "min-w-0 overflow-x-auto",
                  staleListBusyClassName(isRefreshing)
                )}
                aria-busy={isRefreshing || undefined}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 w-14 px-3">
                        <PatientSelectScopeControl
                          pageCount={visibleIds.length}
                          totalMatching={list.total}
                          scope={selectionScope}
                          allPageSelected={allVisibleSelected}
                          somePageSelected={someVisibleSelected}
                          selectingAll={selectingAll}
                          disabled={actionPending}
                          noun="archived patients"
                          onSelectPage={selectCurrentPage}
                          onSelectAllMatching={() => {
                            void selectAllMatching()
                          }}
                          onClear={clearSelection}
                        />
                      </TableHead>
                      <TableHead className="h-12 px-4">
                        <DirectoryColumnHeader
                          title="Patient"
                          sortDirection={sortDirectionFor("patient")}
                          onSortAsc={() => setColumnSort("patient", "asc")}
                          onSortDesc={() => setColumnSort("patient", "desc")}
                          onClearSort={() => setColumnSort("patient", "asc")}
                        />
                      </TableHead>
                      <TableHead className="hidden h-12 px-4 md:table-cell">
                        <DirectoryColumnHeader
                          title="Program"
                          sortDirection={sortDirectionFor("program")}
                          onSortAsc={() => setColumnSort("program", "asc")}
                          onSortDesc={() => setColumnSort("program", "desc")}
                          onClearSort={() => setColumnSort("patient", "asc")}
                        />
                      </TableHead>
                      <TableHead className="hidden h-12 px-4 sm:table-cell">
                        <DirectoryColumnLabel title="Archived" />
                      </TableHead>
                      <TableHead className="h-12 px-4 text-right">
                        <DirectoryColumnLabel
                          title="Actions"
                          className="justify-end"
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const selected = selectedIds.has(row.id)
                      return (
                        <ArchivedPatientRow
                          key={row.id}
                          row={row}
                          selected={selected}
                          canManage={canManage}
                          actionPending={actionPending}
                          onToggle={(checked) => toggleRow(row.id, checked)}
                          onRestore={() =>
                            restoreRecords(
                              [row.id],
                              patientFullName(row)
                            )
                          }
                          onDelete={() =>
                            permanentlyDelete(
                              [row.id],
                              patientFullName(row)
                            )
                          }
                        />
                      )
                    })}
                  </TableBody>
                </Table>
                {list.totalPages > 1 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      Page {list.page} of {list.totalPages}
                      <span className="text-muted-foreground/80">
                        {" "}
                        · {list.total} patient{list.total === 1 ? "" : "s"}
                      </span>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={list.page <= 1 || isRefreshing}
                        onClick={() =>
                          setPage((current) => Math.max(1, current - 1))
                        }
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          list.page >= list.totalPages || isRefreshing
                        }
                        onClick={() =>
                          setPage((current) =>
                            Math.min(list.totalPages, current + 1)
                          )
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </PanelFrame>
    </main>
  )
}

function ArchivedPatientRow({
  row,
  selected,
  canManage,
  actionPending,
  onToggle,
  onRestore,
  onDelete,
}: {
  row: PatientRecord
  selected: boolean
  canManage: boolean
  actionPending: boolean
  onToggle: (checked: boolean) => void
  onRestore: () => void
  onDelete: () => void
}) {
  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell className="px-4">
        <Checkbox
          checked={selected}
          disabled={actionPending}
          onCheckedChange={(value) => onToggle(!!value)}
          aria-label={`Select ${patientFullName(row)}`}
        />
      </TableCell>
      <TableCell className="px-4">
        <div className="flex items-center gap-2">
          <p className="font-medium">{patientFullName(row)}</p>
          <Badge variant="outline">{patientTypeLabel(row.patientType)}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          ID Number {patientCampusId(row) ?? "—"}
          {patientTypeIsStudent(row.patientType) && row.yearLevel
            ? ` · ${row.yearLevel}`
            : ""}
        </p>
      </TableCell>
      <TableCell className="hidden px-4 md:table-cell">
        {patientTypeIsStudent(row.patientType) ? row.course || "—" : "—"}
      </TableCell>
      <TableCell className="hidden px-4 sm:table-cell">
        <p className="text-sm">{formatArchivedAt(row.archivedAt)}</p>
      </TableCell>
      <TableCell className="px-4">
        <div className="flex flex-wrap justify-end gap-1">
          {canManage ? (
            <>
              <Button
                size="icon-sm"
                variant="outline"
                className="size-7"
                disabled={actionPending}
                aria-label="Restore patient"
                title="Restore"
                onClick={onRestore}
              >
                <IconRestore className="size-3.5" aria-hidden />
              </Button>
              <Button
                size="icon-sm"
                variant="destructive"
                className="size-7"
                disabled={actionPending}
                aria-label="Delete patient permanently"
                title="Delete"
                onClick={onDelete}
              >
                <IconTrash className="size-3.5" aria-hidden />
              </Button>
            </>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  )
}
