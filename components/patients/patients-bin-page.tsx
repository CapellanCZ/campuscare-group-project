"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { IconSearch, IconTrash } from "@tabler/icons-react"

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
} from "@/features/patients/actions"
import { useCachedPatientPages } from "@/features/patients/hooks/use-cached-patient-pages"
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
  const [deletePending, setDeletePending] = useState(false)
  const [isPending, startTransition] = useTransition()
  const skipNextFetch = useRef(true)
  const mountedRef = useRef(false)
  const pageCache = useCachedPatientPages()

  const canDelete = can(access.designation, "patients.edit_information")

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
        void pageCache
          .fetchPage(nextPage, fetchListPage, { bypassCache: true })
          .then((fresh) => {
            if (!mountedRef.current || !fresh) return
            if (fresh.page === nextPage) setList(fresh)
          })
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

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      pageCache.setScope(queryScope)
      pageCache.put(initialList)
      pageCache.prefetchAdjacent(
        initialList.page,
        initialList.totalPages,
        fetchListPage
      )
      return
    }
    setSelectedIds(new Set())
    void loadPage(page)
  }, [fetchListPage, initialList, loadPage, page, pageCache, queryScope])

  useStaffRealtimeRefresh(
    `staff-patients-bin-${access.designation}`,
    STAFF_REALTIME_TABLES.patients,
    () => {
      pageCache.invalidate()
      void loadPage(page, { force: true })
    },
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
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(patientId)
      else next.delete(patientId)
      return next
    })
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        for (const id of visibleIds) next.add(id)
      } else {
        for (const id of visibleIds) next.delete(id)
      }
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function permanentlyDelete(ids: string[], label: string) {
    if (ids.length === 0 || deletePending || !canDelete) return

    void confirmPreset("delete", {
      title:
        ids.length === 1
          ? "Permanently Delete Patient?"
          : "Permanently Delete Patients?",
      description: `Permanently delete ${label} from Supabase? Linked consultations are removed. This cannot be undone.`,
      confirmLabel: "Delete permanently",
      onConfirm: async () => {
        setDeletePending(true)
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
        try {
          const result = await deleteArchivedPatientRecordsAction(ids)
          if (!result.ok) throw new Error(result.error)
          patientToasts.deleted()
          pageCache.invalidate()
          startTransition(() => {
            const nextPage =
              snapshot.items.length <= ids.length && page > 1 ? page - 1 : page
            if (nextPage !== page) setPage(nextPage)
            else void loadPage(page, { force: true })
          })
        } catch (error) {
          setList(snapshot)
          pageCache.put(snapshot)
          throw error
        } finally {
          setDeletePending(false)
        }
      },
    })
  }

  function requestDeleteSelected() {
    const ids = [...selectedIds]
    const noun = ids.length === 1 ? "patient record" : "patient records"
    permanentlyDelete(ids, `${ids.length} archived ${noun}`)
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
        description="Archived patient records. Permanently delete them here to remove them from Supabase."
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

          {selectedIds.size > 0 ? (
            <div
              className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-(--card-spacing) py-3"
              role="status"
            >
              <p className="text-sm">
                <span className="font-medium tabular-nums">
                  {selectedIds.size}
                </span>{" "}
                selected
              </p>
              <div className="flex flex-wrap gap-2">
                {canDelete ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={deletePending}
                    onClick={requestDeleteSelected}
                  >
                    Delete
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={deletePending}
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : null}

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
                      <TableHead className="h-12 w-12 px-4">
                        <Checkbox
                          checked={allVisibleSelected}
                          indeterminate={someVisibleSelected}
                          disabled={rows.length === 0}
                          onCheckedChange={(value) =>
                            toggleSelectAll(!!value)
                          }
                          aria-label={
                            allVisibleSelected
                              ? "Deselect all archived patients"
                              : "Select all archived patients"
                          }
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
                          canDelete={canDelete}
                          deletePending={deletePending}
                          onToggle={(checked) => toggleRow(row.id, checked)}
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
  canDelete,
  deletePending,
  onToggle,
  onDelete,
}: {
  row: PatientRecord
  selected: boolean
  canDelete: boolean
  deletePending: boolean
  onToggle: (checked: boolean) => void
  onDelete: () => void
}) {
  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell className="px-4">
        <Checkbox
          checked={selected}
          disabled={deletePending}
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
          {canDelete ? (
            <Button
              size="xs"
              variant="outline"
              disabled={deletePending}
              onClick={onDelete}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  )
}
