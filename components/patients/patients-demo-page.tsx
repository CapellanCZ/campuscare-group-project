"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react"
import { useRouter } from "next/navigation"
import { patientToasts } from "@/lib/feedback/toast-messages"
import { appToast } from "@/lib/feedback/app-toast"
import { staffBasePath } from "@/lib/auth/home-path"
import { useCachedPatientPages } from "@/features/patients/hooks/use-cached-patient-pages"

import { PatientDocumentsSheet } from "@/components/patients/patient-documents-sheet"
import { PatientExportButton } from "@/components/patients/patient-export-button"
import { PatientHistorySheet } from "@/components/patients/patient-history-sheet"
import { PatientImportSheet } from "@/components/patients/patient-import-sheet"
import { PatientMedicalSheet } from "@/components/patients/patient-medical-sheet"
import { PatientProfileSheet } from "@/components/patients/patient-profile-sheet"
import {
  clinicalScopeForDesignation,
  historyStationFilterForDesignation,
} from "@/lib/clinical/record-scope"
import { PATIENT_SEARCH_PLACEHOLDER } from "@/lib/students/patient-search-copy"
import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
import {
  PanelFrame,
  panelCardClassName,
} from "@/components/layout/panel-frame"
import {
  DirectoryColumnHeader,
  DirectoryColumnLabel,
  type ColumnSortDirection,
} from "@/features/admin/components/directory-column-header"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useConfirm } from "@/components/feedback/confirm-provider"
import {
  archivePatientRecordsAction,
  ensurePatientRecordAction,
  fetchPatientRecordStatsAction,
  searchPatientRecordsAction,
} from "@/features/patients/actions"
import { prefetchPatientHistory } from "@/features/patients/lib/prefetch-patient-history"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import { NO_STUDENT_FOUND } from "@/lib/students/types"
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"
import { selectItemsRecord } from "@/lib/ui/select-label"
import {
  staleListBusy,
  staleListBusyClassName,
} from "@/lib/ui/stale-list-busy"
import {
  patientCampusId,
  patientFullName,
  patientTypeIsStudent,
  patientTypeLabel,
  type PatientRecord,
  type PatientRecordListResult,
  type PatientRecordSortColumn,
  type PatientRecordStats,
  type PatientType,
} from "@/types/patientRecord"
import { IconSearch, IconUsers } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

type PatientRecordTypeFilter = PatientType | "all"

const PATIENT_TYPE_FILTER_OPTIONS: {
  value: PatientRecordTypeFilter
  label: string
}[] = [
  { value: "all", label: "All types" },
  { value: "student", label: "Student" },
  { value: "faculty", label: "Faculty" },
  { value: "employee", label: "Employee" },
]

function toStatCards(stats: PatientRecordStats): DemoStat[] {
  return [
    {
      key: "total",
      label: "Patients on file",
      value: String(stats.patientsOnFile),
      description: "Imported patient records",
    },
    {
      key: "visited",
      label: "Visited this month",
      value: String(stats.visitedThisMonth),
      description: "Based on last visit",
    },
    {
      key: "allergies",
      label: "Flagged allergies",
      value: String(stats.flaggedAllergies),
      description: "Require caution",
    },
    {
      key: "docs",
      label: "Documents",
      value: String(stats.documents),
      description: "Medical certificates",
    },
  ]
}

function PatientsTableSkeleton() {
  return (
    <div className="space-y-2 p-4" role="status" aria-label="Loading patients">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  )
}

export function PatientsPage({
  access,
  initialList,
  initialStats,
  initialError,
}: {
  access: StaffAccess
  initialList: PatientRecordListResult
  initialStats: PatientRecordStats
  initialError?: string | null
}) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [patientTypeFilter, setPatientTypeFilter] =
    useState<PatientRecordTypeFilter>("all")
  const [sortColumn, setSortColumn] =
    useState<PatientRecordSortColumn>("patient")
  const [sortDirection, setSortDirection] =
    useState<ColumnSortDirection>("asc")
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [medicalPatient, setMedicalPatient] = useState<PatientRecord | null>(
    null
  )
  const [profilePatient, setProfilePatient] = useState<PatientRecord | null>(null)
  const [historyPatient, setHistoryPatient] = useState<PatientRecord | null>(null)
  const [documentsPatient, setDocumentsPatient] = useState<PatientRecord | null>(
    null
  )
  const [page, setPage] = useState(initialList.page ?? 1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [archivePending, setArchivePending] = useState(false)
  const [isPending, startTransition] = useTransition()
  const skipNextFetch = useRef(true)
  const mountedRef = useRef(false)
  const { confirmPreset } = useConfirm()
  const router = useRouter()
  const pageCache = useCachedPatientPages()

  const canUpdateMedical = can(access.designation, "patients.update_medical")
  const canViewHistory = can(
    access.designation,
    "patients.view_consultation_history"
  )
  const canViewDocs = can(access.designation, "patients.view_medical_documents")
  const canArchive = can(access.designation, "patients.edit_information")

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (initialError) patientToasts.failed(initialError)
  }, [initialError])

  // Prefetch Bin route so navigation feels instant.
  useEffect(() => {
    const base = staffBasePath(access.designation)
    router.prefetch(`${base}/bin`)
    router.prefetch(`${base}/patients`)
  }, [access.designation, router])

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
        type: patientTypeFilter,
        sort: sortColumn,
        dir: activeSortDir,
      }),
    [activeSortDir, debouncedQuery, patientTypeFilter, sortColumn]
  )

  const fetchListPage = useCallback(
    async (nextPage: number): Promise<PatientRecordListResult | null> => {
      const listResult = await searchPatientRecordsAction(debouncedQuery, {
        page: nextPage,
        pageSize: PAGE_SIZE,
        patientType: patientTypeFilter,
        sortBy: sortColumn,
        sortDir: activeSortDir,
      })
      if (!listResult.ok) {
        if (listResult.error === NO_STUDENT_FOUND) {
          return {
            items: [],
            total: 0,
            page: 1,
            pageSize: PAGE_SIZE,
            totalPages: 1,
          }
        }
        patientToasts.failed(listResult.error)
        return null
      }
      return listResult.data
    },
    [activeSortDir, debouncedQuery, patientTypeFilter, sortColumn]
  )

  const refreshStats = useCallback(async () => {
    const statsResult = await fetchPatientRecordStatsAction()
    if (!mountedRef.current) return
    if (!statsResult.ok) {
      patientToasts.failed(statsResult.error)
      return
    }
    setStats(statsResult.data)
  }, [])

  const loadPage = useCallback(
    async (
      nextPage: number,
      options: { includeStats?: boolean; force?: boolean } = {}
    ) => {
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
        // Soft revalidate in the background without blocking UI.
        void pageCache
          .fetchPage(nextPage, fetchListPage, { bypassCache: true })
          .then((fresh) => {
            if (!mountedRef.current || !fresh) return
            if (fresh.page === nextPage) {
              setList(fresh)
              pageCache.prefetchAdjacent(
                fresh.page,
                fresh.totalPages,
                fetchListPage
              )
            }
          })
        if (options.includeStats) void refreshStats()
        return
      }

      setLoading(true)
      try {
        const listPromise = pageCache.fetchPage(nextPage, fetchListPage, {
          bypassCache: options.force,
        })
        const statsPromise = options.includeStats
          ? refreshStats()
          : Promise.resolve()
        const [data] = await Promise.all([listPromise, statsPromise])
        if (!mountedRef.current) return
        if (!data) return
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
    [fetchListPage, pageCache, queryScope, refreshStats]
  )

  const refresh = useCallback(() => {
    pageCache.invalidate()
    setPage(1)
    startTransition(() => {
      void loadPage(1, { includeStats: true, force: true })
    })
  }, [loadPage, pageCache])

  // Realtime + post-import: jump to page 1 so new roster rows are visible.
  const refreshAfterImport = useCallback(() => {
    pageCache.invalidate()
    setSelectedIds(new Set())
    setPage(1)
    startTransition(() => {
      void loadPage(1, { includeStats: true, force: true })
    })
  }, [loadPage, pageCache])

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      // Prefetch neighbors for SSR first page immediately.
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
    `staff-patients-${access.designation}`,
    STAFF_REALTIME_TABLES.patients,
    () => {
      pageCache.invalidate()
      void loadPage(page, { includeStats: true, force: true })
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

  function handleSaved(patient: PatientRecord) {
    // Local-first: patch the visible row immediately; sync stats in background.
    setList((prev) => {
      const next = {
        ...prev,
        items: prev.items.map((item) =>
          item.id === patient.id ||
          (patient.studentId != null && item.studentId === patient.studentId)
            ? patient
            : item
        ),
      }
      pageCache.put(next)
      return next
    })
    void refreshStats()
  }

  function openEnsuredPatient(
    patient: PatientRecord,
    setPatient: Dispatch<SetStateAction<PatientRecord | null>>
  ) {
    // Open immediately with list row data — do not blank/reload the directory.
    setPatient(patient)

    void ensurePatientRecordAction(patient)
      .then((result) => {
        if (!result.ok) {
          patientToasts.failed(result.error)
          return
        }
        setList((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === result.data.id ||
            item.id === patient.id ||
            (result.data.studentId != null &&
              item.studentId === result.data.studentId)
              ? result.data
              : item
          ),
        }))
        setPatient((current) => {
          if (!current) return null
          if (
            current.id === patient.id ||
            current.id === result.data.id ||
            (result.data.studentId != null &&
              current.studentId === result.data.studentId)
          ) {
            return result.data
          }
          return current
        })
      })
      .catch(() => {
        patientToasts.failed(
          "Could not sync enrolled student into patient records."
        )
      })
  }

  const statCards = useMemo(() => toStatCards(stats), [stats])
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

  function requestArchiveSelected() {
    const ids = [...selectedIds]
    if (ids.length === 0 || archivePending) return
    const noun = ids.length === 1 ? "patient" : "patients"

    void confirmPreset("archive", {
      title: ids.length === 1 ? "Archive Patient?" : "Archive Patients?",
      description: `Move ${ids.length} selected ${noun} to Bin? They will leave the active directory until permanently deleted.`,
      confirmLabel: "Archive",
      onConfirm: async () => {
        setArchivePending(true)
        const snapshot = list
        const idSet = new Set(ids)
        // Optimistic local update — UI reacts before the network returns.
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
          const result = await archivePatientRecordsAction(ids)
          if (!result.ok) throw new Error(result.error)
          patientToasts.archived(result.data.archived)
          pageCache.invalidate()
          const nextPage =
            snapshot.items.length <= ids.length && page > 1 ? page - 1 : page
          if (nextPage !== page) setPage(nextPage)
          else void loadPage(page, { includeStats: true, force: true })
        } catch (error) {
          setList(snapshot)
          pageCache.put(snapshot)
          throw error
        } finally {
          setArchivePending(false)
        }
      },
    })
  }

  const { showInitialSkeleton, isRefreshing } = staleListBusy(
    loading,
    rows.length,
    isPending
  )
  const emptyMessage = debouncedQuery
    ? NO_STUDENT_FOUND
    : patientTypeFilter !== "all"
      ? `No ${patientTypeLabel(patientTypeFilter).toLowerCase()} patients found.`
      : "No patients on file yet. Use Import patients to upload a roster."

  return (
    <main
      className={cn(
        "flex flex-col gap-6",
        access.designation === "dentist" && "gap-8 pt-2"
      )}
    >
      <DemoPageHeader
        title="Patient Records"
        description={
          access.designation === "nurse" ||
          access.designation === "physician" ||
          access.designation === "dentist"
            ? ""
            : "Import a roster into Patient Records, then search and update medical history here."
        }
        designation={access.designation}
        showDemoBanner={false}
      />

      {can(access.designation, "patients.summary_cards") ? (
        <DemoStatGrid stats={statCards} />
      ) : null}

      <PanelFrame>
        <Card className={cn(panelCardClassName, "gap-0 py-0")}>
        <CardHeader
          className={cn(
            "flex flex-col gap-3 border-b pt-(--card-spacing) sm:flex-row sm:items-center sm:justify-between",
            access.designation === "dentist" &&
              "gap-4 border-b px-6 py-5 pt-5"
          )}
        >
          <CardTitle className="text-base">Patient directory</CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              value={patientTypeFilter}
              items={selectItemsRecord(PATIENT_TYPE_FILTER_OPTIONS)}
              onValueChange={(value) => {
                setPatientTypeFilter(value as PatientRecordTypeFilter)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Patient type">
                <SelectValue placeholder="Patient type" />
              </SelectTrigger>
              <SelectContent>
                {PATIENT_TYPE_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {can(access.designation, "patients.search") ? (
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
            ) : null}
            {can(access.designation, "patients.table") ? (
              <>
                <PatientImportSheet toolbar onImported={refreshAfterImport} />
                <PatientExportButton
                  toolbar
                  query={debouncedQuery}
                  patientType={patientTypeFilter}
                />
              </>
            ) : null}
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
              {canArchive ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={archivePending}
                  onClick={requestArchiveSelected}
                >
                  Archive
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={archivePending}
                onClick={clearSelection}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        <CardContent className="min-w-0 p-0">
          {showInitialSkeleton ? (
            <PatientsTableSkeleton />
          ) : rows.length === 0 ? (
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconUsers aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No patients found</EmptyTitle>
                <EmptyDescription>{emptyMessage}</EmptyDescription>
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
                      onCheckedChange={(value) => toggleSelectAll(!!value)}
                      aria-label={
                        allVisibleSelected
                          ? "Deselect all visible patients"
                          : "Select all visible patients"
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
                  <TableHead className="hidden h-12 px-4 lg:table-cell">
                    <DirectoryColumnLabel title="Allergies / flags" />
                  </TableHead>
                  <TableHead className="hidden h-12 px-4 sm:table-cell">
                    <DirectoryColumnHeader
                      title="Last edited"
                      sortDirection={sortDirectionFor("lastVisit")}
                      onSortAsc={() => setColumnSort("lastVisit", "asc")}
                      onSortDesc={() => setColumnSort("lastVisit", "desc")}
                      onClearSort={() => setColumnSort("patient", "asc")}
                    />
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
                    <TableRow
                      key={row.id}
                      data-state={selected ? "selected" : undefined}
                    >
                      <TableCell className="px-4">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(value) =>
                            toggleRow(row.id, !!value)
                          }
                          aria-label={`Select ${patientFullName(row)}`}
                        />
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{patientFullName(row)}</p>
                          <Badge variant="outline">
                            {patientTypeLabel(row.patientType)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ID Number {patientCampusId(row) ?? "—"}
                          {patientTypeIsStudent(row.patientType) && row.yearLevel
                            ? ` · ${row.yearLevel}`
                            : ""}
                        </p>
                      </TableCell>
                      <TableCell className="hidden px-4 md:table-cell">
                        {patientTypeIsStudent(row.patientType)
                          ? row.course || "—"
                          : "—"}
                      </TableCell>
                      <TableCell className="hidden px-4 lg:table-cell">
                        <p className="text-sm">
                          {row.allergies ||
                            (row.medicalHistory?.allergy
                              ? "Allergy noted"
                              : "None")}
                        </p>
                      </TableCell>
                      <TableCell className="hidden px-4 sm:table-cell">
                        <p>
                          {row.lastEditedAt
                            ? new Date(row.lastEditedAt).toLocaleString(
                                "en-PH",
                                {
                                  timeZone: "Asia/Manila",
                                  dateStyle: "medium",
                                }
                              )
                            : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.lastEditedByName
                            ? `by ${row.lastEditedByName}`
                            : row.lastEditedAt
                              ? "Editor unknown"
                              : "Never edited"}
                        </p>
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex flex-wrap justify-end gap-1">
                          {can(access.designation, "patients.view_profile") ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                openEnsuredPatient(row, setProfilePatient)
                              }
                            >
                              Profile
                            </Button>
                          ) : null}
                          {canViewHistory ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onMouseEnter={() =>
                                prefetchPatientHistory(
                                  row,
                                  historyStationFilterForDesignation(
                                    access.designation
                                  ),
                                  clinicalScopeForDesignation(
                                    access.designation
                                  )
                                )
                              }
                              onFocus={() =>
                                prefetchPatientHistory(
                                  row,
                                  historyStationFilterForDesignation(
                                    access.designation
                                  ),
                                  clinicalScopeForDesignation(
                                    access.designation
                                  )
                                )
                              }
                              onClick={() =>
                                openEnsuredPatient(row, setHistoryPatient)
                              }
                            >
                              History
                            </Button>
                          ) : null}
                          {canViewDocs ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                openEnsuredPatient(row, setDocumentsPatient)
                              }
                            >
                              Documents
                            </Button>
                          ) : null}
                          {canUpdateMedical ? (
                            <Button
                              size="xs"
                              onClick={() =>
                                openEnsuredPatient(row, setMedicalPatient)
                              }
                            >
                              Update medical
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
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
                    disabled={list.page >= list.totalPages || isRefreshing}
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

      <PatientMedicalSheet
        patient={medicalPatient}
        open={Boolean(medicalPatient)}
        onOpenChange={(open) => {
          if (!open) setMedicalPatient(null)
        }}
        onSaved={handleSaved}
      />
      <PatientProfileSheet
        patient={profilePatient}
        open={Boolean(profilePatient)}
        onOpenChange={(open) => {
          if (!open) setProfilePatient(null)
        }}
      />
      <PatientHistorySheet
        patient={historyPatient}
        open={Boolean(historyPatient)}
        onOpenChange={(open) => {
          if (!open) setHistoryPatient(null)
        }}
        stationFilter={historyStationFilterForDesignation(access.designation)}
        documentScope={clinicalScopeForDesignation(access.designation)}
      />
      <PatientDocumentsSheet
        patient={documentsPatient}
        open={Boolean(documentsPatient)}
        onOpenChange={(open) => {
          if (!open) setDocumentsPatient(null)
        }}
        documentScope={clinicalScopeForDesignation(access.designation)}
      />
    </main>
  )
}

export function PatientsDemoPage(props: {
  access: StaffAccess
  initialList?: PatientRecordListResult
  initialStats?: PatientRecordStats
  initialError?: string | null
}) {
  return (
    <PatientsPage
      access={props.access}
      initialList={
        props.initialList ?? {
          items: [],
          total: 0,
          page: 1,
          pageSize: PAGE_SIZE,
          totalPages: 1,
        }
      }
      initialStats={
        props.initialStats ?? {
          patientsOnFile: 0,
          visitedThisMonth: 0,
          flaggedAllergies: 0,
          documents: 0,
        }
      }
      initialError={props.initialError}
    />
  )
}
