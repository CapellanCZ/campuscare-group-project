"use client"

import {
  useCallback,
  useEffect,
  useEffectEvent,
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
import { SyncPatientAccountsButton } from "@/components/patients/sync-patient-accounts-button"
import { PatientProfileSheet } from "@/components/patients/patient-profile-sheet"
import {
  PatientSelectAllBanner,
  PatientSelectScopeControl,
  type PatientSelectionScope,
} from "@/components/patients/patient-select-scope-control"
import {
  clinicalScopeForDesignation,
  historyStationFilterForDesignation,
} from "@/lib/clinical/record-scope"
import { PATIENT_SEARCH_PLACEHOLDER } from "@/lib/students/patient-search-copy"
import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
import {
  PanelCell,
  PanelFrame,
  PanelGrid,
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
  listMatchingPatientRecordIdsAction,
  searchPatientRecordsAction,
} from "@/features/patients/actions"
import { prefetchPatientHistory } from "@/features/patients/lib/prefetch-patient-history"
import {
  getCachedPatients,
  loadPatientsBundle,
  savePatientsCache,
} from "@/features/patients/lib/prefetch-patients"
import {
  patientsCacheKey,
  staffCacheIsFresh,
} from "@/lib/ui/staff-data-cache"
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
  CAMPUS_ID_LABEL,
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
import {
  IconAlertTriangle,
  IconFileText,
  IconHistory,
  IconSearch,
  IconUser,
  IconUsers,
  IconUserHeart,
} from "@tabler/icons-react"
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

const PATIENT_STATS_BASELINE_KEY = "campuscare:patient-stats-baseline"

type PatientStatsBaseline = {
  patientsOnFile: number
  visitedThisMonth: number
  flaggedAllergies: number
  documents: number
}

function readPatientStatsBaseline(): PatientStatsBaseline | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(PATIENT_STATS_BASELINE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PatientStatsBaseline
    if (
      typeof parsed.patientsOnFile !== "number" ||
      typeof parsed.visitedThisMonth !== "number" ||
      typeof parsed.flaggedAllergies !== "number" ||
      typeof parsed.documents !== "number"
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writePatientStatsBaseline(stats: PatientRecordStats) {
  try {
    window.sessionStorage.setItem(
      PATIENT_STATS_BASELINE_KEY,
      JSON.stringify({
        patientsOnFile: stats.patientsOnFile,
        visitedThisMonth: stats.visitedThisMonth,
        flaggedAllergies: stats.flaggedAllergies,
        documents: stats.documents,
      } satisfies PatientStatsBaseline)
    )
  } catch {
    /* ignore */
  }
}

function toStatCards(
  stats: PatientRecordStats,
  baseline: PatientStatsBaseline | null
): DemoStat[] {
  const grew = (key: keyof PatientStatsBaseline) =>
    baseline != null && stats[key] > baseline[key]

  return [
    {
      key: "total",
      label: "On file",
      value: String(stats.patientsOnFile),
      description: "Active patient records",
      icon: <IconUsers stroke={1.75} aria-hidden />,
      iconClassName: "bg-primary/12 text-primary",
      highlight: grew("patientsOnFile"),
    },
    {
      key: "visited",
      label: "Seen this month",
      value: String(stats.visitedThisMonth),
      description: "Clinic visits recorded",
      icon: <IconUserHeart stroke={1.75} aria-hidden />,
      iconClassName: "bg-success/12 text-success",
      highlight: grew("visitedThisMonth"),
    },
    {
      key: "allergies",
      label: "Allergy flags",
      value: String(stats.flaggedAllergies),
      description: "Needs clinical caution",
      icon: <IconAlertTriangle stroke={1.75} aria-hidden />,
      iconClassName: "bg-warning/15 text-warning",
      highlight: grew("flaggedAllergies"),
    },
    {
      key: "docs",
      label: "Certificates",
      value: String(stats.documents),
      description: "Medical documents on file",
      icon: <IconFileText stroke={1.75} aria-hidden />,
      iconClassName: "bg-muted text-muted-foreground",
      highlight: grew("documents"),
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
  hydrateFromCache = false,
}: {
  access: StaffAccess
  initialList: PatientRecordListResult
  initialStats: PatientRecordStats
  initialError?: string | null
  hydrateFromCache?: boolean
}) {
  // Read session cache once for seed — do not re-read each render (savePatientsCache
  // would change the reference and re-trigger fetch effects).
  const sessionCachedRef = useRef(
    hydrateFromCache ? getCachedPatients(access.designation) : null
  )
  const sessionCached = sessionCachedRef.current
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [patientTypeFilter, setPatientTypeFilter] =
    useState<PatientRecordTypeFilter>("all")
  const [sortColumn, setSortColumn] =
    useState<PatientRecordSortColumn>("patient")
  const [sortDirection, setSortDirection] =
    useState<ColumnSortDirection>("asc")
  const [list, setList] = useState(sessionCached?.list ?? initialList)
  const [stats, setStats] = useState(sessionCached?.stats ?? initialStats)
  const [loading, setLoading] = useState(false)
  const [profilePatient, setProfilePatient] = useState<PatientRecord | null>(null)
  const [historyPatient, setHistoryPatient] = useState<PatientRecord | null>(null)
  const [documentsPatient, setDocumentsPatient] = useState<PatientRecord | null>(
    null
  )
  const [page, setPage] = useState(
    () => sessionCached?.list.page ?? initialList.page ?? 1
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [selectionScope, setSelectionScope] =
    useState<PatientSelectionScope>("none")
  const [selectingAll, setSelectingAll] = useState(false)
  const [archivePending, setArchivePending] = useState(false)
  const [isPending, startTransition] = useTransition()
  const skipNextFetch = useRef(true)
  const hydratedRef = useRef(false)
  const selectionQueryScopeRef = useRef("")
  const mountedRef = useRef(false)
  const statsRef = useRef(stats)
  statsRef.current = stats
  const { confirmPreset } = useConfirm()
  const router = useRouter()
  const pageCache = useCachedPatientPages()

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
      options: {
        includeStats?: boolean
        force?: boolean
        silent?: boolean
      } = {}
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
        if (options.includeStats) void refreshStats()
        return
      }

      if (!options.silent) setLoading(true)
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
        // Persist default first-page roster for instant revisits.
        if (
          hydrateFromCache &&
          nextPage === 1 &&
          !debouncedQuery.trim() &&
          patientTypeFilter === "all"
        ) {
          savePatientsCache(access.designation, {
            list: data,
            stats: statsRef.current,
          })
        }
      } catch {
        if (!mountedRef.current) return
        patientToasts.failed(
          "Unable to reach the database. Check your connection and try again."
        )
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    },
    [
      access.designation,
      debouncedQuery,
      fetchListPage,
      hydrateFromCache,
      pageCache,
      patientTypeFilter,
      queryScope,
      refreshStats,
    ]
  )

  const refresh = useCallback(() => {
    pageCache.invalidate()
    setPage(1)
    startTransition(() => {
      void loadPage(1, { includeStats: true, force: true })
    })
  }, [loadPage, pageCache])

  // Realtime + post-import: jump to page 1 so new roster rows are visible.
  // Avoid startTransition here — it dims the directory while import progress toast is showing.
  const refreshAfterImport = useCallback(() => {
    pageCache.invalidate()
    setSelectionScope("none")
    setSelectedIds(new Set())
    setPage(1)
    void loadPage(1, { includeStats: true, force: true })
  }, [loadPage, pageCache])

  useEffect(() => {
    if (!hydrateFromCache || hydratedRef.current) return
    hydratedRef.current = true
    const hit = getCachedPatients(access.designation)
    if (hit) {
      setList(hit.list)
      setStats(hit.stats)
      setPage(hit.list.page)
      setLoading(false)
      pageCache.setScope(queryScope)
      pageCache.put(hit.list)
    }
    void loadPatientsBundle(access.designation, {
      force:
        Boolean(hit) && !staffCacheIsFresh(patientsCacheKey(access.designation)),
    })
      .then((bundle) => {
        if (!mountedRef.current) return
        setList(bundle.list)
        setStats(bundle.stats)
        setPage(bundle.list.page)
        setLoading(false)
        pageCache.setScope(queryScope)
        pageCache.put(bundle.list)
      })
      .catch(() => {
        if (!mountedRef.current) return
        setLoading(false)
        if (!hit) void loadPage(1, { includeStats: true, silent: true })
      })
    // Intentionally once per mount — loadPage/queryScope must not re-fire hydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount hydrate only
  }, [access.designation, hydrateFromCache])

  const onPageOrFiltersChange = useEffectEvent((nextPage: number) => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      const seed = sessionCachedRef.current?.list ?? initialList
      if (seed.items.length > 0 || sessionCachedRef.current) {
        pageCache.setScope(queryScope)
        pageCache.put(seed)
        pageCache.prefetchAdjacent(seed.page, seed.totalPages, fetchListPage)
      }
      selectionQueryScopeRef.current = queryScope
      return
    }
    const filtersChanged = selectionQueryScopeRef.current !== queryScope
    selectionQueryScopeRef.current = queryScope
    setSelectionScope((current) => {
      // Keep “select all matching” while paging the same filter set.
      if (current === "all" && !filtersChanged) return current
      setSelectedIds(new Set())
      return "none"
    })
    void loadPage(nextPage)
  })

  useEffect(() => {
    onPageOrFiltersChange(page)
  }, [page, queryScope])

  const onRealtimePatients = useEffectEvent(() => {
    pageCache.invalidate()
    void loadPage(page, { includeStats: true, force: true, silent: true })
  })

  useStaffRealtimeRefresh(
    `staff-patients-${access.designation}`,
    STAFF_REALTIME_TABLES.patients,
    onRealtimePatients,
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

  const [statsBaseline, setStatsBaseline] =
    useState<PatientStatsBaseline | null>(null)
  const statsBaselineReady = useRef(false)

  useEffect(() => {
    if (statsBaselineReady.current) return
    statsBaselineReady.current = true
    const existing = readPatientStatsBaseline()
    if (existing) {
      setStatsBaseline(existing)
      return
    }
    // First open this session — seed quietly so nothing looks “new” yet.
    const seed = {
      patientsOnFile: stats.patientsOnFile,
      visitedThisMonth: stats.visitedThisMonth,
      flaggedAllergies: stats.flaggedAllergies,
      documents: stats.documents,
    }
    writePatientStatsBaseline(stats)
    setStatsBaseline(seed)
  }, [stats])

  useEffect(() => {
    if (!statsBaseline) return
    // After the nurse can notice a blue “new” count, lock the baseline.
    const id = window.setTimeout(() => {
      writePatientStatsBaseline(stats)
      setStatsBaseline({
        patientsOnFile: stats.patientsOnFile,
        visitedThisMonth: stats.visitedThisMonth,
        flaggedAllergies: stats.flaggedAllergies,
        documents: stats.documents,
      })
    }, 12_000)
    return () => window.clearTimeout(id)
  }, [stats, statsBaseline])

  const statCards = useMemo(
    () => toStatCards(stats, statsBaseline),
    [stats, statsBaseline]
  )
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
        patientType: patientTypeFilter,
        sortBy: sortColumn,
        sortDir: activeSortDir,
        archived: false,
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

  function requestArchiveSelected() {
    const ids = [...selectedIds]
    if (ids.length === 0 || archivePending) return
    const noun = ids.length === 1 ? "patient" : "patients"
    const scopeNote =
      selectionScope === "all"
        ? ` all ${ids.length} matching ${noun}`
        : ` ${ids.length} selected ${noun}`

    void confirmPreset("archive", {
      title: ids.length === 1 ? "Archive Patient?" : "Archive Patients?",
      description: `Move${scopeNote} to Bin? They will leave the active directory until permanently deleted.`,
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
            ? "Search, import, and open patient files for clinic care."
            : "Import a roster into Patient Records, then search and manage patient files here."
        }
        designation={access.designation}
        showDemoBanner={false}
        showRoleSuffix={false}
      />

      <PanelFrame>
        <PanelGrid>
          {can(access.designation, "patients.summary_cards") ? (
            <PanelCell>
              <DemoStatGrid
                stats={statCards}
                framed={false}
                variant="lane"
              />
            </PanelCell>
          ) : null}
          <PanelCell>
        <Card className={cn(panelCardClassName, "gap-0 py-0")}>
        <CardHeader className="gap-3 border-b px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <CardTitle className="text-base">Patient directory</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {list.total} patient{list.total === 1 ? "" : "s"}
              {patientTypeFilter !== "all"
                ? ` · ${patientTypeLabel(patientTypeFilter)}s`
                : ""}
              {debouncedQuery.trim() ? " matching search" : ""}
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {can(access.designation, "patients.search") ? (
              <div className="relative w-full sm:w-56 lg:w-64">
                <IconSearch
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="h-9 pl-8"
                  placeholder={PATIENT_SEARCH_PLACEHOLDER}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label={PATIENT_SEARCH_PLACEHOLDER}
                />
              </div>
            ) : null}
            <Select
              value={patientTypeFilter}
              items={selectItemsRecord(PATIENT_TYPE_FILTER_OPTIONS)}
              onValueChange={(value) => {
                setPatientTypeFilter(value as PatientRecordTypeFilter)
                setPage(1)
              }}
            >
              <SelectTrigger
                className="h-9 w-full shrink-0 sm:w-36"
                aria-label="Patient type"
              >
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
            {can(access.designation, "patients.table") ? (
              <div className="flex flex-wrap items-center gap-2">
                <PatientImportSheet toolbar onImported={refreshAfterImport} />
                {can(access.designation, "patients.edit_information") ? (
                  <SyncPatientAccountsButton
                    toolbar
                    onSynced={refreshAfterImport}
                  />
                ) : null}
                <PatientExportButton
                  toolbar
                  query={debouncedQuery}
                  patientType={patientTypeFilter}
                />
              </div>
            ) : null}
          </div>
        </CardHeader>
        {selectedIds.size > 0 ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5 sm:px-5"
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
              {canArchive ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={archivePending || selectingAll}
                  onClick={requestArchiveSelected}
                >
                  Archive
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={archivePending || selectingAll}
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
          onSelectAllMatching={() => {
            void selectAllMatching()
          }}
          onClear={clearSelection}
        />

        <CardContent className="min-w-0 p-0">
          {showInitialSkeleton ? (
            <PatientsTableSkeleton />
          ) : rows.length === 0 ? (
            <Empty className="border-0 py-14">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconUsers aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No patients found</EmptyTitle>
                <EmptyDescription className="max-w-sm">
                  {emptyMessage}
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
                <TableRow className="border-b hover:bg-transparent">
                  <TableHead className="h-10 w-12 px-3 sm:px-4">
                    <PatientSelectScopeControl
                      pageCount={visibleIds.length}
                      totalMatching={list.total}
                      scope={selectionScope}
                      allPageSelected={allVisibleSelected}
                      somePageSelected={someVisibleSelected}
                      selectingAll={selectingAll}
                      disabled={archivePending}
                      onSelectPage={selectCurrentPage}
                      onSelectAllMatching={() => {
                        void selectAllMatching()
                      }}
                      onClear={clearSelection}
                    />
                  </TableHead>
                  <TableHead className="h-10 px-3 sm:px-4">
                    <DirectoryColumnHeader
                      title="Patient"
                      sortDirection={sortDirectionFor("patient")}
                      onSortAsc={() => setColumnSort("patient", "asc")}
                      onSortDesc={() => setColumnSort("patient", "desc")}
                      onClearSort={() => setColumnSort("patient", "asc")}
                    />
                  </TableHead>
                  <TableHead className="hidden h-10 px-3 sm:px-4 md:table-cell">
                    <DirectoryColumnHeader
                      title="Program"
                      sortDirection={sortDirectionFor("program")}
                      onSortAsc={() => setColumnSort("program", "asc")}
                      onSortDesc={() => setColumnSort("program", "desc")}
                      onClearSort={() => setColumnSort("patient", "asc")}
                    />
                  </TableHead>
                  <TableHead className="hidden h-10 px-3 sm:px-4 lg:table-cell">
                    <DirectoryColumnLabel title="Allergies / flags" />
                  </TableHead>
                  <TableHead className="hidden h-10 px-3 sm:px-4 sm:table-cell">
                    <DirectoryColumnHeader
                      title="Last edited"
                      sortDirection={sortDirectionFor("lastVisit")}
                      onSortAsc={() => setColumnSort("lastVisit", "asc")}
                      onSortDesc={() => setColumnSort("lastVisit", "desc")}
                      onClearSort={() => setColumnSort("patient", "asc")}
                    />
                  </TableHead>
                  <TableHead className="h-10 px-3 text-right sm:px-4">
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
                    const allergyLabel =
                      row.allergies?.trim() ||
                      (row.medicalHistory?.allergy ? "Allergy noted" : null)
                    const programLabel = patientTypeIsStudent(row.patientType)
                      ? row.course?.trim() || null
                      : null
                    const campusId = patientCampusId(row)
                    return (
                    <TableRow
                      key={row.id}
                      data-state={selected ? "selected" : undefined}
                      className="hover:bg-muted/30"
                    >
                      <TableCell className="px-3 py-2.5 sm:px-4">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(value) =>
                            toggleRow(row.id, !!value)
                          }
                          aria-label={`Select ${patientFullName(row)}`}
                        />
                      </TableCell>
                      <TableCell className="max-w-[22rem] px-3 py-2.5 sm:px-4">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {patientFullName(row)}
                          </p>
                          <Badge
                            variant="secondary"
                            className="h-5 shrink-0 px-1.5 text-[11px] font-normal text-muted-foreground"
                          >
                            {patientTypeLabel(row.patientType)}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                          {CAMPUS_ID_LABEL}{" "}
                          <span className="text-foreground/70">
                            {campusId ?? "—"}
                          </span>
                          {patientTypeIsStudent(row.patientType) &&
                          row.yearLevel ? (
                            <span className="text-muted-foreground/80">
                              {" "}
                              · {row.yearLevel}
                            </span>
                          ) : null}
                        </p>
                      </TableCell>
                      <TableCell className="hidden px-3 py-2.5 text-sm tabular-nums sm:px-4 md:table-cell">
                        {programLabel ? (
                          <span className="text-foreground">{programLabel}</span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden max-w-[14rem] px-3 py-2.5 sm:px-4 lg:table-cell">
                        {allergyLabel ? (
                          <span className="inline-flex max-w-full items-start gap-1.5 text-sm text-warning">
                            <IconAlertTriangle
                              className="mt-0.5 size-3.5 shrink-0"
                              stroke={1.75}
                              aria-hidden
                            />
                            <span className="line-clamp-2">{allergyLabel}</span>
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground/60">
                            None
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden px-3 py-2.5 sm:table-cell sm:px-4">
                        {row.lastEditedAt ? (
                          <>
                            <p className="text-sm tabular-nums text-foreground">
                              {new Date(row.lastEditedAt).toLocaleString(
                                "en-PH",
                                {
                                  timeZone: "Asia/Manila",
                                  dateStyle: "medium",
                                }
                              )}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {row.lastEditedByName
                                ? `by ${row.lastEditedByName}`
                                : "Editor unknown"}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground/60">
                            Never edited
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 sm:px-4">
                        <div className="flex flex-nowrap justify-end gap-1">
                          {can(access.designation, "patients.view_profile") ? (
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="size-7"
                              aria-label={`Profile ${patientFullName(row)}`}
                              title="Profile"
                              onClick={() =>
                                openEnsuredPatient(row, setProfilePatient)
                              }
                            >
                              <IconUser
                                className="size-3.5"
                                stroke={1.75}
                                aria-hidden
                              />
                            </Button>
                          ) : null}
                          {canViewHistory ? (
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="size-7"
                              aria-label={`History ${patientFullName(row)}`}
                              title="History"
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
                              <IconHistory
                                className="size-3.5"
                                stroke={1.75}
                                aria-hidden
                              />
                            </Button>
                          ) : null}
                          {canViewDocs ? (
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="size-7"
                              aria-label={`Documents ${patientFullName(row)}`}
                              title="Documents"
                              onClick={() =>
                                openEnsuredPatient(row, setDocumentsPatient)
                              }
                            >
                              <IconFileText
                                className="size-3.5"
                                stroke={1.75}
                                aria-hidden
                              />
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5 sm:px-5">
                <p className="text-xs text-muted-foreground tabular-nums sm:text-sm">
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
          </PanelCell>
        </PanelGrid>
      </PanelFrame>

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
