"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { useConfirm } from "@/components/feedback/confirm-provider"
import { appToast } from "@/lib/feedback/app-toast"
import {
  CONSULTATION_DATE_RANGE_LABELS,
  type ConsultationDateRange,
} from "@/lib/date/consultation-date-range"
import { PATIENT_SEARCH_PLACEHOLDER } from "@/lib/students/patient-search-copy"

import { ConsultationDeleteDialog } from "@/components/consultations/consultation-delete-dialog"
import { ConsultationFormSheet } from "@/components/consultations/consultation-form-sheet"
import { ConsultationRecordsPanel } from "@/components/consultations/consultation-records-panel"
import { PatientVisitDetailDialog } from "@/components/patients/patient-visit-detail-dialog"
import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
import {
  PanelCell,
  PanelFrame,
  PanelGrid,
  panelCardClassName,
} from "@/components/layout/panel-frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { selectItemsRecord } from "@/lib/ui/select-label"
import {
  fetchConsultationStatsAction,
  listConsultationFilterOptionsAction,
  searchConsultationsAction,
  updateConsultationAction,
} from "@/features/consultations/actions"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import {
  partitionConsultationsByDay,
  sortConsultationsForList,
  sortConsultationsUpcoming,
} from "@/lib/consultations/sort"
import type { DemoStat } from "@/lib/demo/types"
import { cn } from "@/lib/utils"
import {
  staleListBusy,
  staleListBusyClassName,
} from "@/lib/ui/stale-list-busy"
import {
  getCachedConsultations,
  loadConsultationsBundle,
  saveConsultationsCache,
} from "@/features/consultations/lib/prefetch-consultations"
import {
  consultationsCacheKey,
  staffCacheIsFresh,
} from "@/lib/ui/staff-data-cache"
import { useInstantListRefresh } from "@/hooks/use-instant-list-refresh"
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"
import {
  CONSULTATION_STATUSES,
  CONSULTATION_TAB_STATUSES,
  consultationStatusLabel,
  type Consultation,
  type ConsultationListResult,
  type ConsultationStats,
  type ConsultationStatus,
} from "@/types/consultation"
import {
  IconCalendarEvent,
  IconHeartbeat,
  IconStethoscope,
  IconUserHeart,
} from "@tabler/icons-react"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const CONSULT_STATS_BASELINE_KEY = "campuscare:consultation-stats-baseline"

type ConsultationStatsBaseline = {
  openToday: number
  awaitingAssessment: number
  inProgress: number
  completedToday: number
}

function readConsultationStatsBaseline(): ConsultationStatsBaseline | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(CONSULT_STATS_BASELINE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConsultationStatsBaseline
    if (
      typeof parsed.openToday !== "number" ||
      typeof parsed.awaitingAssessment !== "number" ||
      typeof parsed.inProgress !== "number" ||
      typeof parsed.completedToday !== "number"
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeConsultationStatsBaseline(stats: ConsultationStats) {
  try {
    window.sessionStorage.setItem(
      CONSULT_STATS_BASELINE_KEY,
      JSON.stringify({
        openToday: stats.openToday,
        awaitingAssessment: stats.awaitingAssessment,
        inProgress: stats.inProgress,
        completedToday: stats.completedToday,
      } satisfies ConsultationStatsBaseline)
    )
  } catch {
    /* ignore */
  }
}

function toConsultationBaseline(
  stats: ConsultationStats
): ConsultationStatsBaseline {
  return {
    openToday: stats.openToday,
    awaitingAssessment: stats.awaitingAssessment,
    inProgress: stats.inProgress,
    completedToday: stats.completedToday,
  }
}

function toStatCards(
  stats: ConsultationStats,
  mode: "nurse" | "clinician" | "default" = "default",
  baseline: ConsultationStatsBaseline | null = null
): DemoStat[] {
  const grew = (key: keyof ConsultationStatsBaseline) =>
    baseline != null && stats[key] > baseline[key]

  if (mode === "nurse") {
    return [
      {
        key: "open",
        label: "Open today",
        value: String(stats.openToday),
        description: "Consultations created today",
        icon: <IconCalendarEvent stroke={1.75} aria-hidden />,
        iconClassName: "bg-primary/12 text-primary",
        highlight: grew("openToday"),
      },
      {
        key: "assessment",
        label: "In nurse queue",
        value: String(stats.awaitingAssessment),
        description: "Waiting for vitals",
        icon: <IconHeartbeat stroke={1.75} aria-hidden />,
        iconClassName: "bg-warning/15 text-warning",
        highlight: grew("awaitingAssessment"),
      },
      {
        key: "in_progress",
        label: "Vitals in progress",
        value: String(stats.inProgress),
        description: "Until doctor starts",
        icon: <IconUserHeart stroke={1.75} aria-hidden />,
        iconClassName: "bg-muted text-muted-foreground",
        highlight: grew("inProgress"),
      },
      {
        key: "done",
        label: "Completed today",
        value: String(stats.completedToday),
        description: "Doctor finished",
        icon: <IconStethoscope stroke={1.75} aria-hidden />,
        iconClassName: "bg-success/12 text-success",
        highlight: grew("completedToday"),
      },
    ]
  }
  if (mode === "clinician") {
    return [
      {
        key: "open",
        label: "Queued today",
        value: String(stats.openToday),
        description: "Post-vitals patients",
        icon: <IconCalendarEvent stroke={1.75} aria-hidden />,
        iconClassName: "bg-primary/12 text-primary",
        highlight: grew("openToday"),
      },
      {
        key: "assessment",
        label: "Waiting to be called",
        value: String(stats.awaitingAssessment),
        description: "Ready for consultation",
        icon: <IconHeartbeat stroke={1.75} aria-hidden />,
        iconClassName: "bg-warning/15 text-warning",
        highlight: grew("awaitingAssessment"),
      },
      {
        key: "in_progress",
        label: "In consultation",
        value: String(stats.inProgress),
        description: "Ongoing with you",
        icon: <IconUserHeart stroke={1.75} aria-hidden />,
        iconClassName: "bg-muted text-muted-foreground",
        highlight: grew("inProgress"),
      },
      {
        key: "done",
        label: "Completed today",
        value: String(stats.completedToday),
        description: "Sessions finished",
        icon: <IconStethoscope stroke={1.75} aria-hidden />,
        iconClassName: "bg-success/12 text-success",
        highlight: grew("completedToday"),
      },
    ]
  }
  return [
    {
      key: "open",
      label: "Open today",
      value: String(stats.openToday),
      description: "Across stations",
      icon: <IconCalendarEvent stroke={1.75} aria-hidden />,
      iconClassName: "bg-primary/12 text-primary",
      highlight: grew("openToday"),
    },
    {
      key: "assessment",
      label: "Awaiting assessment",
      value: String(stats.awaitingAssessment),
      description: "Nurse triage",
      icon: <IconHeartbeat stroke={1.75} aria-hidden />,
      iconClassName: "bg-warning/15 text-warning",
      highlight: grew("awaitingAssessment"),
    },
    {
      key: "in_progress",
      label: "In progress",
      value: String(stats.inProgress),
      description: "With provider",
      icon: <IconUserHeart stroke={1.75} aria-hidden />,
      iconClassName: "bg-muted text-muted-foreground",
      highlight: grew("inProgress"),
    },
    {
      key: "done",
      label: "Completed today",
      value: String(stats.completedToday),
      description: "Charted & closed",
      icon: <IconStethoscope stroke={1.75} aria-hidden />,
      iconClassName: "bg-success/12 text-success",
      highlight: grew("completedToday"),
    },
  ]
}

function ConsultationsTableSkeleton() {
  return (
    <div
      className="space-y-2 p-4"
      role="status"
      aria-label="Loading consultations"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </div>
  )
}

export function ConsultationsPage({
  access,
  initialList,
  initialStats,
  initialError,
  initialProviders = [],
  initialStations = [],
  hydrateFromCache = false,
}: {
  access: StaffAccess
  initialList: ConsultationListResult
  initialStats: ConsultationStats
  initialError?: string | null
  initialProviders?: string[]
  initialStations?: string[]
  /** Paint from session cache / hover prefetch, then soft-refresh. */
  hydrateFromCache?: boolean
}) {
  const cached = hydrateFromCache
    ? getCachedConsultations(access.designation)
    : null
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | "all">(
    "all"
  )
  const [providerFilter, setProviderFilter] = useState("all")
  const [providerTypeFilter, setProviderTypeFilter] = useState<
    "all" | "physician" | "dentist"
  >("all")
  const [stationFilter, setStationFilter] = useState(
    access.designation === "dentist"
      ? "dentist"
      : access.designation === "physician"
        ? "physician"
        : "all"
  )
  const [dateRange, setDateRange] = useState<ConsultationDateRange>("all_time")
  const [providers, setProviders] = useState(
    cached?.providers ?? initialProviders
  )
  const [stations, setStations] = useState(cached?.stations ?? initialStations)
  const [list, setList] = useState(cached?.list ?? initialList)
  const [stats, setStats] = useState(cached?.stats ?? initialStats)
  // Cold visit only — soft Supabase pulls never blank the local list.
  const [loading, setLoading] = useState(
    () => hydrateFromCache && !cached
  )
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("edit")
  const [editing, setEditing] = useState<Consultation | null>(null)
  const [deleting, setDeleting] = useState<Consultation | null>(null)
  const [viewing, setViewing] = useState<Consultation | null>(null)
  const [isPending, startTransition] = useTransition()
  const { confirmPreset } = useConfirm()
  /** Skip the first filter effect when cache hydration owns the initial load. */
  const skipNextFetch = useRef(hydrateFromCache)
  const hydratedRef = useRef(false)
  /** Bumped on local mutations so in-flight soft loads cannot wipe optimistic UI. */
  const listEpochRef = useRef(0)
  const listRef = useRef(list)
  listRef.current = list
  const providersRef = useRef(providers)
  providersRef.current = providers
  const stationsRef = useRef(stations)
  stationsRef.current = stations
  const d = access.designation
  const isPhysician = d === "physician"
  const isNurse = d === "nurse"
  const isDentist = d === "dentist"

  useEffect(() => {
    if (initialError) {
      appToast.error({
        title: "Unable to Load Consultations",
        description: initialError,
      })
    }
  }, [initialError])

  // Warm session cache from RSC seed so revisits / prefetch share the payload.
  useEffect(() => {
    if (hydrateFromCache) return
    saveConsultationsCache(access.designation, {
      list: initialList,
      stats: initialStats,
      providers: initialProviders,
      stations: initialStations,
    })
  }, [
    access.designation,
    hydrateFromCache,
    initialList,
    initialStats,
    initialProviders,
    initialStations,
  ])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = query.trim()
      if (nextQuery === debouncedQuery) return
      setDebouncedQuery(nextQuery)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query, debouncedQuery])

  const filterParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      status: statusFilter,
      provider: isPhysician || isNurse || isDentist ? "all" : providerFilter,
      station: isPhysician
        ? "physician"
        : isDentist
          ? "dentist"
          : isNurse
            ? "all"
            : stationFilter,
      providerType: isNurse ? providerTypeFilter : "all",
      consultationDate: "all",
      dateRange,
    }),
    [
      page,
      statusFilter,
      providerFilter,
      stationFilter,
      dateRange,
      isPhysician,
      isNurse,
      isDentist,
      providerTypeFilter,
    ]
  )

  const persistLocal = useCallback(
    (
      nextList: ConsultationListResult,
      nextStats: ConsultationStats,
      nextProviders?: string[],
      nextStations?: string[]
    ) => {
      saveConsultationsCache(access.designation, {
        list: nextList,
        stats: nextStats,
        providers: nextProviders ?? providersRef.current,
        stations: nextStations ?? stationsRef.current,
      })
    },
    [access.designation]
  )

  const applyBundle = useCallback(
    (
      bundle: {
        list: ConsultationListResult
        stats: ConsultationStats
        providers: string[]
        stations: string[]
      },
      epoch: number
    ) => {
      if (epoch !== listEpochRef.current) return
      setList(bundle.list)
      setStats(bundle.stats)
      setProviders(bundle.providers)
      setStations(bundle.stations)
      persistLocal(
        bundle.list,
        bundle.stats,
        bundle.providers,
        bundle.stations
      )
    },
    [persistLocal]
  )

  const filterParamsRef = useRef(filterParams)
  filterParamsRef.current = filterParams
  const debouncedQueryRef = useRef(debouncedQuery)
  debouncedQueryRef.current = debouncedQuery

  /**
   * Soft pull from Supabase — local list stays source of truth.
   * Never blanks the UI unless showSkeleton (cold / empty filter change).
   */
  const reconcileFromServer = useCallback(
    async (options?: {
      query?: string
      showSkeleton?: boolean
      params?: typeof filterParams
    }) => {
      const nextQuery = options?.query ?? debouncedQueryRef.current
      const params = options?.params ?? filterParamsRef.current
      const showSkeleton = Boolean(options?.showSkeleton)
      const epoch = listEpochRef.current
      const isDefaultQuery =
        !nextQuery.trim() &&
        params.page === 1 &&
        params.status === "all" &&
        params.dateRange === "all_time" &&
        (params.providerType === "all" || !isNurse)

      if (showSkeleton) setLoading(true)
      try {
        if (isDefaultQuery && hydrateFromCache) {
          const bundle = await loadConsultationsBundle(access.designation, {
            force: true,
          })
          applyBundle(bundle, epoch)
          return
        }

        const [listResult, statsResult, optionsResult] = await Promise.all([
          searchConsultationsAction(nextQuery, params),
          fetchConsultationStatsAction(),
          listConsultationFilterOptionsAction(),
        ])
        if (epoch !== listEpochRef.current) return
        if (!listResult.ok) {
          appToast.error({
            title: "Unable to Load Consultations",
            description: listResult.error,
          })
          return
        }
        if (!statsResult.ok) {
          appToast.error({
            title: "Unable to Load Consultation Summary",
            description: statsResult.error,
          })
          return
        }
        applyBundle(
          {
            list: listResult.data,
            stats: statsResult.data,
            providers: optionsResult.ok
              ? optionsResult.data.providers
              : providersRef.current,
            stations: optionsResult.ok
              ? optionsResult.data.stations
              : stationsRef.current,
          },
          epoch
        )
      } catch {
        appToast.error({
          title: "Unable to Load Consultations",
          description:
            "Unable to reach the database. Check your connection and try again.",
        })
      } finally {
        setLoading(false)
      }
    },
    [access.designation, applyBundle, hydrateFromCache, isNurse]
  )

  const refresh = useCallback(() => {
    startTransition(() => {
      void reconcileFromServer({
        showSkeleton: listRef.current.items.length === 0,
      })
    })
  }, [reconcileFromServer])

  const { schedule: scheduleRefresh } = useInstantListRefresh(() => {
    void reconcileFromServer()
  }, 400)

  useEffect(() => {
    if (!hydrateFromCache || hydratedRef.current) return
    hydratedRef.current = true
    const hit = getCachedConsultations(access.designation)
    const fresh =
      Boolean(hit) &&
      staffCacheIsFresh(consultationsCacheKey(access.designation))
    if (hit) {
      setList(hit.list)
      setStats(hit.stats)
      setProviders(hit.providers)
      setStations(hit.stations)
      setLoading(false)
    }
    if (fresh) return
    // Soft revalidate in the background — keep cache rows visible.
    const epoch = listEpochRef.current
    void loadConsultationsBundle(access.designation, {
      force: Boolean(hit),
    })
      .then((bundle) => {
        applyBundle(bundle, epoch)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        if (!hit) {
          void reconcileFromServer({ query: "", showSkeleton: true })
        }
      })
  }, [
    access.designation,
    applyBundle,
    hydrateFromCache,
    reconcileFromServer,
  ])

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void reconcileFromServer({
      showSkeleton: listRef.current.items.length === 0,
    })
  }, [debouncedQuery, filterParams, reconcileFromServer])

  useStaffRealtimeRefresh(
    `staff-consultations-${access.designation}`,
    STAFF_REALTIME_TABLES.consultations,
    scheduleRefresh
  )

  const isClinician = isPhysician || isDentist
  const rolePath = isDentist ? "dentist" : "physician"

  const [statsBaseline, setStatsBaseline] =
    useState<ConsultationStatsBaseline | null>(null)
  const statsBaselineReady = useRef(false)

  useEffect(() => {
    if (statsBaselineReady.current) return
    statsBaselineReady.current = true
    const existing = readConsultationStatsBaseline()
    if (existing) {
      setStatsBaseline(existing)
      return
    }
    // First open this session — seed quietly so nothing looks “new” yet.
    const seed = toConsultationBaseline(stats)
    writeConsultationStatsBaseline(stats)
    setStatsBaseline(seed)
  }, [stats])

  useEffect(() => {
    if (!statsBaseline) return
    // After staff can notice a blue “new” count, lock the baseline as seen.
    const id = window.setTimeout(() => {
      writeConsultationStatsBaseline(stats)
      setStatsBaseline(toConsultationBaseline(stats))
    }, 12_000)
    return () => window.clearTimeout(id)
  }, [stats, statsBaseline])

  const statCards = useMemo(
    () =>
      toStatCards(
        stats,
        isNurse ? "nurse" : isClinician ? "clinician" : "default",
        statsBaseline
      ),
    [stats, isNurse, isClinician, statsBaseline]
  )
  const rows = list.items
  const daySections = useMemo(() => {
    const { today, upcoming, past } = partitionConsultationsByDay(rows)
    const sections: Array<{
      id: string
      title: string
      description: string
      rows: Consultation[]
      emphasizeDate: boolean
    }> = [
      {
        id: "today",
        title: "Today",
        description: "Consultations scheduled for today (Manila time)",
        rows: sortConsultationsForList(today),
        emphasizeDate: false,
      },
      {
        id: "upcoming",
        title: "Upcoming",
        description: "Approved consultations on future dates — not in queue yet",
        rows: sortConsultationsUpcoming(upcoming),
        emphasizeDate: true,
      },
    ]
    if (past.length > 0) {
      sections.push({
        id: "earlier",
        title: "Earlier",
        description: "Past consultation dates",
        rows: sortConsultationsForList(past),
        emphasizeDate: true,
      })
    }
    return sections
  }, [rows])
  const { showInitialSkeleton, isRefreshing } = staleListBusy(
    loading,
    rows.length,
    isPending
  )

  function patchConsultationLocal(
    id: string,
    patch: Partial<Consultation>
  ) {
    listEpochRef.current += 1
    setList((prev) => {
      const next: ConsultationListResult = {
        ...prev,
        items: prev.items.map((item) =>
          item.id === id ? { ...item, ...patch } : item
        ),
      }
      persistLocal(next, stats)
      return next
    })
  }

  async function applyConsultationPatch(
    row: Consultation,
    patch: Partial<{
      assessment: string
      diagnosis: string
      treatment: string
      prescription: string
      status: ConsultationStatus
    }>
  ) {
    const snapshot = row
    patchConsultationLocal(row.id, patch)
    const result = await updateConsultationAction({
      id: row.id,
      patientId: row.patientId,
      chiefComplaint: row.chiefComplaint,
      symptoms: row.symptoms,
      assessment: patch.assessment ?? row.assessment,
      diagnosis: patch.diagnosis ?? row.diagnosis,
      treatment: patch.treatment ?? row.treatment,
      prescription: patch.prescription ?? row.prescription,
      providerName: row.providerName,
      providerRole: row.providerRole,
      station: row.station,
      status: patch.status ?? row.status,
      priority: row.priority,
      consultationDate: row.consultationDate,
      followUpDate: row.followUpDate,
      notes: row.notes,
    })
    if (!result.ok) {
      patchConsultationLocal(row.id, snapshot)
      throw new Error(result.error)
    }
    if (result.data) {
      patchConsultationLocal(result.data.id, result.data)
    }
    scheduleRefresh()
  }

  async function completeConsultation(row: Consultation) {
    await confirmPreset("completeConsultation", {
      onConfirm: async () => {
        await applyConsultationPatch(row, { status: "completed" })
      },
      successToast: {
        title: "Consultation Completed",
        description:
          "The consultation has been marked as completed successfully.",
      },
      errorToast: {
        title: "Unable to Complete Consultation",
      },
    })
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-8 pt-2",
        isDentist && "gap-10 pt-3"
      )}
    >
      <DemoPageHeader
        title={d === "dentist" ? "Dental consultations" : "Consultations"}
        description={
          isNurse
            ? "Today’s visits stay ready for the floor; upcoming approved dates stay here until their day (Manila time)."
            : isPhysician || isDentist
              ? "Today’s consultations for your station, with upcoming approved dates listed separately."
              : "Today’s consultations and upcoming approved dates (Manila time)."
        }
        designation={d}
        showDemoBanner={false}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={refresh}>
              Refresh
            </Button>
          </div>
        }
      />

      <PanelFrame>
        <PanelGrid>
          {can(d, "consultations.cards") ? (
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
              <CardTitle className="text-base">Consultation schedule</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {list.total} consultation{list.total === 1 ? "" : "s"}
                {list.totalPages > 1
                  ? ` · page ${list.page} of ${list.totalPages}`
                  : ""}
                {debouncedQuery.trim() ? " matching search" : ""}
              </p>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <Input
                className="h-9 w-full sm:w-56 lg:w-64"
                placeholder={PATIENT_SEARCH_PLACEHOLDER}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={PATIENT_SEARCH_PLACEHOLDER}
              />
              <Select
                value={statusFilter}
                items={selectItemsRecord([
                  { value: "all", label: "All statuses" },
                  ...CONSULTATION_TAB_STATUSES.map((status) => ({
                    value: status,
                    label: consultationStatusLabel(status),
                  })),
                ])}
                onValueChange={(value) => {
                  setPage(1)
                  setStatusFilter(
                    (value as ConsultationStatus | "all") ?? "all"
                  )
                }}
              >
                <SelectTrigger
                  className="h-9 w-full shrink-0 sm:w-36"
                  aria-label="Filter by status"
                >
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {CONSULTATION_TAB_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {consultationStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isNurse ? (
                <Select
                  value={providerTypeFilter}
                  items={{
                    all: "All providers",
                    physician: "Physician",
                    dentist: "Dentist",
                  }}
                  onValueChange={(value) => {
                    setPage(1)
                    setProviderTypeFilter(
                      (value as "all" | "physician" | "dentist") ?? "all"
                    )
                  }}
                >
                  <SelectTrigger
                    className="h-9 w-full shrink-0 sm:w-36"
                    aria-label="Filter by provider type"
                  >
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All providers</SelectItem>
                    <SelectItem value="physician">Physician</SelectItem>
                    <SelectItem value="dentist">Dentist</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {!isPhysician && !isNurse && !isDentist ? (
                <>
                  <Select
                    value={providerFilter}
                    items={selectItemsRecord([
                      { value: "all", label: "All providers" },
                      ...providers.map((provider) => ({
                        value: provider,
                        label: provider,
                      })),
                    ])}
                    onValueChange={(value) => {
                      setPage(1)
                      setProviderFilter(value ?? "all")
                    }}
                  >
                    <SelectTrigger
                      className="h-9 w-full shrink-0 sm:w-40"
                      aria-label="Filter by provider"
                    >
                      <SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All providers</SelectItem>
                      {providers.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={stationFilter}
                    items={selectItemsRecord([
                      { value: "all", label: "All stations" },
                      ...stations.map((station) => ({
                        value: station,
                        label: station,
                      })),
                    ])}
                    onValueChange={(value) => {
                      setPage(1)
                      setStationFilter(value ?? "all")
                    }}
                  >
                    <SelectTrigger
                      className="h-9 w-full shrink-0 sm:w-36"
                      aria-label="Filter by station"
                    >
                      <SelectValue placeholder="Station" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All stations</SelectItem>
                      {stations.map((station) => (
                        <SelectItem key={station} value={station}>
                          {station}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : null}
              <Select
                value={dateRange}
                items={CONSULTATION_DATE_RANGE_LABELS}
                onValueChange={(value) => {
                  setPage(1)
                  setDateRange((value as ConsultationDateRange) ?? "all_time")
                }}
              >
                <SelectTrigger
                  className="h-9 w-full shrink-0 sm:w-36"
                  aria-label="Filter by date range"
                >
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(
                      CONSULTATION_DATE_RANGE_LABELS
                    ) as ConsultationDateRange[]
                  ).map((range) => (
                    <SelectItem key={range} value={range}>
                      {CONSULTATION_DATE_RANGE_LABELS[range]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 p-0">
            {showInitialSkeleton ? (
              <ConsultationsTableSkeleton />
            ) : rows.length === 0 ? (
              <Empty className="border-0 py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconStethoscope aria-hidden />
                  </EmptyMedia>
                  <EmptyTitle>No consultations found</EmptyTitle>
                  <EmptyDescription>
                    Consultations will appear here once approved consultation
                    requests enter the consultation workflow.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div
                className={staleListBusyClassName(isRefreshing)}
                aria-busy={isRefreshing || undefined}
              >
                <div className="divide-y">
                  {daySections.map((section) => (
                    <section key={section.id} className="min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground">
                            {section.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {section.description}
                          </p>
                        </div>
                        <Badge variant="secondary" className="tabular-nums">
                          {section.rows.length}
                        </Badge>
                      </div>
                      {section.rows.length === 0 ? (
                        <p className="px-6 pb-6 text-sm text-muted-foreground">
                          No consultations in this group.
                        </p>
                      ) : (
                        <ConsultationRecordsPanel
                          rows={section.rows}
                          emphasizeDate={section.emphasizeDate}
                          isDentist={isDentist}
                          isClinician={isClinician}
                          rolePath={rolePath}
                          access={access}
                          onView={setViewing}
                          onComplete={(row) => void completeConsultation(row)}
                          onEdit={(row) => {
                            setFormMode("edit")
                            setEditing(row)
                            setFormOpen(true)
                          }}
                          onDelete={setDeleting}
                        />
                      )}
                    </section>
                  ))}
                </div>
                {list.totalPages > 1 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3">
                    <p
                      className="text-xs text-muted-foreground tabular-nums sm:text-sm"
                      role="status"
                    >
                      Page {list.page} of {list.totalPages}
                      <span className="text-muted-foreground/80">
                        {" "}
                        · {list.total} consultation
                        {list.total === 1 ? "" : "s"}
                      </span>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
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
                        type="button"
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
          </PanelCell>
        </PanelGrid>
      </PanelFrame>

      <PatientVisitDetailDialog
        consultation={viewing}
        patient={null}
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) setViewing(null)
        }}
      />

      <ConsultationFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        consultation={editing}
        onSaved={(consultation) => {
          listEpochRef.current += 1
          setList((prev) => {
            const exists = prev.items.some((item) => item.id === consultation.id)
            const items = exists
              ? prev.items.map((item) =>
                  item.id === consultation.id ? consultation : item
                )
              : [consultation, ...prev.items].slice(0, prev.pageSize)
            const next: ConsultationListResult = {
              ...prev,
              items,
              total: exists ? prev.total : prev.total + 1,
            }
            persistLocal(next, stats)
            return next
          })
          scheduleRefresh()
        }}
        access={access}
      />
      <ConsultationDeleteDialog
        consultation={deleting}
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onDeleted={(id) => {
          setDeleting(null)
          listEpochRef.current += 1
          setList((prev) => {
            const next: ConsultationListResult = {
              ...prev,
              items: prev.items.filter((item) => item.id !== id),
              total: Math.max(0, prev.total - 1),
            }
            persistLocal(next, stats)
            return next
          })
          scheduleRefresh()
        }}
      />
    </div>
  )
}

/** Compatibility export while routes migrate */
export function ConsultationsDemoPage(props: { access: StaffAccess }) {
  return (
    <ConsultationsPage
      access={props.access}
      initialList={{
        items: [],
        total: 0,
        page: 1,
        pageSize: PAGE_SIZE,
        totalPages: 1,
      }}
      initialStats={{
        openToday: 0,
        awaitingAssessment: 0,
        inProgress: 0,
        completedToday: 0,
      }}
    />
  )
}
