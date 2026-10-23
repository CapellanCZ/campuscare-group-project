"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { requestToasts } from "@/lib/feedback/toast-messages"

import {
  ConsultationRequestCard,
  type RequestDialogMode,
} from "@/components/requests/consultation-request-card"
import { ApproveRequestDialog } from "@/components/requests/approve-request-dialog"
import { DeclineRequestDialog } from "@/components/requests/decline-request-dialog"
import { RescheduleRequestDialog } from "@/components/requests/reschedule-request-dialog"
import { ViewRequestDialog } from "@/components/requests/view-request-dialog"
import { StudentIdSearchInput } from "@/components/shared/student-id-search-input"
import { DemoPageHeader } from "@/components/demo/demo-page"
import {
  RequestStatsStrip,
  shiftRequestStats,
} from "@/components/requests/request-stats-strip"
import {
  PanelCell,
  PanelFrame,
  PanelGrid,
  panelCardClassName,
} from "@/components/layout/panel-frame"
import {
  RECENTLY_APPROVED_LIMIT,
  RecentlyApprovedPanel,
  sortRecentlyApproved,
} from "@/components/requests/recently-approved-panel"
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
import { Button } from "@/components/ui/button"
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
  fetchConsultationRequestByIdAction,
  fetchConsultationRequestStatsAction,
  fetchConsultationRequestsAction,
  fetchRecentlyApprovedRequestsAction,
} from "@/features/requests/actions"
import {
  getCachedRequests,
  loadRequestsBundle,
  saveRequestsCache,
} from "@/features/requests/lib/prefetch-requests"
import {
  requestsCacheKey,
  staffCacheIsFresh,
} from "@/lib/ui/staff-data-cache"
import { consultationRequestStatusLabel } from "@/features/requests/lib/format"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import {
  APPOINTMENT_REQUEST_STATUSES,
  NURSE_REQUEST_TAB_STATUSES,
  type AppointmentRequest,
  type AppointmentRequestListResult,
  type AppointmentRequestStats,
  type AppointmentRequestStatus,
} from "@/types/appointmentRequest"
import { IconClipboardList } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import {
  staleListBusy,
  staleListBusyClassName,
} from "@/lib/ui/stale-list-busy"
import { useInstantListRefresh } from "@/hooks/use-instant-list-refresh"
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"

const SEARCH_DEBOUNCE_MS = 300
const PAGE_SIZE = 10

const REQUEST_SORTS = [
  { value: "priority", label: "Triage priority" },
  { value: "newest", label: "Newest updated" },
  { value: "oldest", label: "Oldest updated" },
  { value: "preferred_asc", label: "Preferred date ↑" },
  { value: "preferred_desc", label: "Preferred date ↓" },
  { value: "name_asc", label: "Patient A–Z" },
] as const

type RequestSort = (typeof REQUEST_SORTS)[number]["value"]

function triageRank(status: AppointmentRequest["status"]) {
  if (status === "pending") return 0
  if (status === "waitlisted") return 1
  if (status === "rescheduled") return 2
  return 3
}

function preferredStamp(request: AppointmentRequest) {
  const date = request.preferredDate ?? request.startsAt.slice(0, 10)
  const time = (request.preferredTime ?? "00:00").slice(0, 5)
  const parsed = Date.parse(`${date}T${time}:00`)
  return Number.isNaN(parsed)
    ? new Date(request.startsAt).getTime()
    : parsed
}

function sortRequests(
  items: AppointmentRequest[],
  sort: RequestSort
): AppointmentRequest[] {
  const next = [...items]
  next.sort((a, b) => {
    switch (sort) {
      case "newest":
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      case "oldest":
        return (
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        )
      case "preferred_asc":
        return preferredStamp(a) - preferredStamp(b)
      case "preferred_desc":
        return preferredStamp(b) - preferredStamp(a)
      case "name_asc":
        return a.patientName.localeCompare(b.patientName, undefined, {
          sensitivity: "base",
        })
      case "priority":
      default: {
        const byStatus = triageRank(a.status) - triageRank(b.status)
        if (byStatus !== 0) return byStatus
        return preferredStamp(a) - preferredStamp(b)
      }
    }
  })
  return next
}

function matchesRequestSearch(request: AppointmentRequest, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = [
    request.patientName,
    request.studentId,
    request.email,
    request.phone,
    request.service,
    request.reason,
    request.doctorName,
    request.status,
    request.queueNumber != null ? String(request.queueNumber) : null,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(needle)
}

function recentFromCache(
  cached: ReturnType<typeof getCachedRequests>,
  fallbackList: AppointmentRequestListResult
): AppointmentRequest[] {
  if (cached?.recentApproved?.length) {
    return sortRecentlyApproved(cached.recentApproved).slice(
      0,
      RECENTLY_APPROVED_LIMIT
    )
  }
  return sortRecentlyApproved(
    fallbackList.items.filter((item) => item.status === "confirmed")
  ).slice(0, RECENTLY_APPROVED_LIMIT)
}

export function RequestsPage({
  access,
  initialList,
  initialStats,
  initialError,
  hydrateFromCache = false,
}: {
  access: StaffAccess
  initialList: AppointmentRequestListResult
  initialStats: AppointmentRequestStats
  initialError?: string | null
  hydrateFromCache?: boolean
}) {
  const isNurse = access.designation === "nurse"
  const cached = hydrateFromCache
    ? getCachedRequests(access.designation)
    : null
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [sort, setSort] = useState<RequestSort>("priority")
  const [page, setPage] = useState(1)
  const [list, setList] = useState(cached?.list ?? initialList)
  const [stats, setStats] = useState(cached?.stats ?? initialStats)
  const [recentApproved, setRecentApproved] = useState<AppointmentRequest[]>(
    () => recentFromCache(cached, cached?.list ?? initialList)
  )
  const [loading, setLoading] = useState(
    () => hydrateFromCache && !cached
  )
  const [recentLoading, setRecentLoading] = useState(false)
  const [selected, setSelected] = useState<AppointmentRequest | null>(null)
  const [dialogMode, setDialogMode] = useState<RequestDialogMode | null>(null)
  const skipNextFetch = useRef(true)
  const hydratedRef = useRef(false)
  const detailRequestId = useRef<string | null>(null)
  const recentApprovedRef = useRef(recentApproved)
  recentApprovedRef.current = recentApproved

  const canApprove = can(access.designation, "requests.approve")
  const canDecline = can(access.designation, "requests.decline")
  const canReschedule = can(access.designation, "requests.reschedule")
  const canViewDetails = can(access.designation, "requests.view_patient_details")

  const persistLocal = useCallback(
    (
      nextList: AppointmentRequestListResult,
      nextStats: AppointmentRequestStats,
      nextRecent: AppointmentRequest[] = recentApprovedRef.current
    ) => {
      saveRequestsCache(access.designation, {
        list: nextList,
        stats: nextStats,
        recentApproved: nextRecent,
      })
    },
    [access.designation]
  )

  const applyBundle = useCallback(
    (bundle: {
      list: AppointmentRequestListResult
      stats: AppointmentRequestStats
      recentApproved?: AppointmentRequest[]
    }) => {
      setList(bundle.list)
      setStats(bundle.stats)
      if (bundle.recentApproved) {
        const nextRecent = sortRecentlyApproved(bundle.recentApproved).slice(
          0,
          RECENTLY_APPROVED_LIMIT
        )
        setRecentApproved(nextRecent)
        persistLocal(bundle.list, bundle.stats, nextRecent)
      } else {
        persistLocal(bundle.list, bundle.stats)
      }
    },
    [persistLocal]
  )

  useEffect(() => {
    if (initialError) requestToasts.failed(initialError)
  }, [initialError])

  // Warm session cache from RSC seed so nav badge / revisits skip a cold POST.
  useEffect(() => {
    if (hydrateFromCache) return
    saveRequestsCache(access.designation, {
      list: initialList,
      stats: initialStats,
      recentApproved: recentFromCache(null, initialList),
    })
  }, [access.designation, hydrateFromCache, initialList, initialStats])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = query.trim()
      if (nextQuery === debouncedQuery) return
      setDebouncedQuery(nextQuery)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query, debouncedQuery])

  /** Soft pull from Supabase — never blanks the UI (local list stays source of truth). */
  const reconcileFromServer = useCallback(
    async (options?: { query?: string; showSkeleton?: boolean }) => {
      const nextQuery = options?.query ?? debouncedQuery
      const showSkeleton = Boolean(options?.showSkeleton)

      if (showSkeleton) setLoading(true)
      try {
        // Default inbox: one cached bundle (list + stats + recently approved).
        if (!nextQuery.trim()) {
          const bundle = await loadRequestsBundle(access.designation, {
            force: true,
          })
          applyBundle(bundle)
          return
        }

        // Search: server-filter the queue; still refresh stats + recently approved.
        const [listResult, statsResult, recentResult] = await Promise.all([
          fetchConsultationRequestsAction({
            query: nextQuery,
            status: "all",
            statuses: isNurse ? NURSE_REQUEST_TAB_STATUSES : undefined,
            page: 1,
            pageSize: 100,
          }),
          fetchConsultationRequestStatsAction(),
          fetchRecentlyApprovedRequestsAction(RECENTLY_APPROVED_LIMIT),
        ])
        if (!listResult.ok) {
          requestToasts.failed(listResult.error)
          return
        }
        if (!statsResult.ok) {
          requestToasts.failed(statsResult.error)
          return
        }
        const nextRecent = recentResult.ok
          ? sortRecentlyApproved(recentResult.data).slice(
              0,
              RECENTLY_APPROVED_LIMIT
            )
          : recentApprovedRef.current
        if (recentResult.ok) setRecentApproved(nextRecent)
        setList(listResult.data)
        setStats(statsResult.data)
        persistLocal(listResult.data, statsResult.data, nextRecent)
      } catch {
        requestToasts.failed(
          "Unable to reach the database. Check your connection and try again."
        )
      } finally {
        setLoading(false)
        setRecentLoading(false)
      }
    },
    [
      access.designation,
      applyBundle,
      debouncedQuery,
      isNurse,
      persistLocal,
    ]
  )

  const { schedule: scheduleRefresh } = useInstantListRefresh(
    () => void reconcileFromServer(),
    400
  )

  useEffect(() => {
    setPage(1)
  }, [status])

  useStaffRealtimeRefresh(
    `staff-requests-${access.designation}`,
    STAFF_REALTIME_TABLES.requests,
    scheduleRefresh
  )

  useEffect(() => {
    if (!hydrateFromCache || hydratedRef.current) return
    hydratedRef.current = true
    const hit = getCachedRequests(access.designation)
    const fresh =
      Boolean(hit) && staffCacheIsFresh(requestsCacheKey(access.designation))
    if (hit) {
      setList(hit.list)
      setStats(hit.stats)
      setRecentApproved(recentFromCache(hit, hit.list))
      setLoading(false)
    }
    // Fresh cache: paint instantly; still soft-reconcile so realtime peers catch up.
    if (fresh) {
      void reconcileFromServer()
      return
    }
    void loadRequestsBundle(access.designation, {
      force: Boolean(hit),
    })
      .then((bundle) => {
        applyBundle(bundle)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        if (!hit) void reconcileFromServer({ showSkeleton: true })
      })
    // Mount hydrate only — do not re-run when reconcile identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount hydrate only
  }, [access.designation, hydrateFromCache])

  // Status filters are local-only. Search soft-reconciles without skeleton flash.
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      if (!hydrateFromCache) void reconcileFromServer()
      return
    }
    void reconcileFromServer({ query: debouncedQuery })
  }, [debouncedQuery, hydrateFromCache, reconcileFromServer])

  const rows = useMemo(() => {
    let items = isNurse
      ? list.items.filter((item) => item.status !== "confirmed")
      : list.items
    if (status !== "all") {
      items = items.filter((item) => item.status === status)
    }
    if (debouncedQuery.trim()) {
      items = items.filter((item) =>
        matchesRequestSearch(item, debouncedQuery)
      )
    }
    return sortRequests(items, sort)
  }, [debouncedQuery, isNurse, list.items, sort, status])
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )
  const listBusy = staleListBusy(loading, rows.length)
  const filterStatuses = isNurse
    ? NURSE_REQUEST_TAB_STATUSES
    : [...APPOINTMENT_REQUEST_STATUSES]
  const statusFilterItems = selectItemsRecord([
    { value: "all", label: "All Statuses" },
    ...filterStatuses.map((value) => ({
      value,
      label: consultationRequestStatusLabel(value),
    })),
  ])
  const sortFilterItems = selectItemsRecord(
    REQUEST_SORTS.map((option) => ({
      value: option.value,
      label: option.label,
    }))
  )

  function openRequest(row: AppointmentRequest, mode: RequestDialogMode) {
    // Open immediately with list row data — do not blank/reload the queue.
    setSelected(row)
    setDialogMode(mode)
    detailRequestId.current = row.id

    void fetchConsultationRequestByIdAction(row.id).then((result) => {
      if (detailRequestId.current !== row.id) return
      if (!result.ok) {
        requestToasts.failed(result.error)
        return
      }
      setSelected((current) =>
        current?.id === result.data.id ? result.data : current
      )
    })
  }

  function closeDialog() {
    detailRequestId.current = null
    setDialogMode(null)
  }

  async function handleUpdated(request: AppointmentRequest) {
    setSelected(request)
    // Optimistic: patch local queue + KPIs + recently approved, then soft-reconcile.
    const existing = list.items.find((item) => item.id === request.id)
    const nextStats =
      existing && existing.status !== request.status
        ? shiftRequestStats(stats, existing.status, request.status)
        : stats
    // Nurse triage list never keeps confirmed rows (they live in Recently approved).
    const keepInQueue = !(isNurse && request.status === "confirmed")
    const without = list.items.filter((item) => item.id !== request.id)
    const nextItems = keepInQueue ? [request, ...without] : without
    const nextList = {
      ...list,
      items: nextItems,
      total: Math.max(0, list.total + (keepInQueue ? 0 : -1)),
    }
    const withoutRecent = recentApprovedRef.current.filter(
      (item) => item.id !== request.id
    )
    const nextRecent =
      request.status === "confirmed"
        ? sortRecentlyApproved([request, ...withoutRecent]).slice(
            0,
            RECENTLY_APPROVED_LIMIT
          )
        : withoutRecent
    setList(nextList)
    setStats(nextStats)
    setRecentApproved(nextRecent)
    persistLocal(nextList, nextStats, nextRecent)
    scheduleRefresh()
  }

  const statusCaption =
    status === "all"
      ? null
      : consultationRequestStatusLabel(status as AppointmentRequestStatus)

  return (
    <div className="flex flex-col gap-6 pt-2">
      <DemoPageHeader
        title="Consultation Requests"
        description={
          isNurse
            ? "Review student bookings here. Approve to place them in the Consultations queue."
            : "Nurse triage inbox. Approved requests move into check-in and specialty assignment."
        }
        designation={access.designation}
        showDemoBanner={false}
        showRoleSuffix={false}
      />

      <PanelFrame>
        <PanelGrid>
          {can(access.designation, "requests.summary_cards") ? (
            <PanelCell>
              <RequestStatsStrip
                framed={false}
                stats={stats}
                activeKey={status === "all" ? null : status}
                onSelect={(key) => {
                  setPage(1)
                  setStatus((current) => (current === key ? "all" : key))
                }}
              />
            </PanelCell>
          ) : null}

          <PanelCell>
            <PanelGrid className="lg:grid-cols-3">
              <PanelCell className="lg:col-span-2">
                <Card className={cn(panelCardClassName, "h-full gap-0 py-0")}>
                  <CardHeader className="gap-3 border-b px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
                    <div className="min-w-0">
                      <CardTitle className="text-base">Request queue</CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        {rows.length} request{rows.length === 1 ? "" : "s"}
                        {statusCaption ? ` · ${statusCaption}` : ""}
                        {debouncedQuery.trim() ? " matching search" : ""}
                      </p>
                    </div>
                    {can(access.designation, "requests.search_filters") ? (
                      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                        {isNurse ? (
                          <StudentIdSearchInput
                            className="w-full sm:w-52 lg:w-56"
                            value={query}
                            onChange={setQuery}
                            placeholder="Search by ID Number"
                            aria-label="Search by ID Number"
                          />
                        ) : (
                          <Input
                            className="h-9 w-full sm:w-56 lg:w-64"
                            placeholder="Search patient, ID, email…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                          />
                        )}
                        <Select
                          value={status}
                          items={statusFilterItems}
                          onValueChange={(value) => {
                            setStatus(value ?? "all")
                            setPage(1)
                          }}
                        >
                          <SelectTrigger
                            className="h-9 w-full shrink-0 sm:w-36"
                            aria-label="Filter by status"
                          >
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            {filterStatuses.map((value) => (
                              <SelectItem key={value} value={value}>
                                {consultationRequestStatusLabel(value)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={sort}
                          items={sortFilterItems}
                          onValueChange={(value) => {
                            setSort((value as RequestSort) ?? "priority")
                            setPage(1)
                          }}
                        >
                          <SelectTrigger
                            className="h-9 w-full shrink-0 sm:w-40"
                            aria-label="Sort requests"
                          >
                            <SelectValue placeholder="Sort" />
                          </SelectTrigger>
                          <SelectContent>
                            {REQUEST_SORTS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="min-w-0 p-0">
                    {listBusy.showInitialSkeleton ? (
                      <div
                        className="space-y-2 p-4"
                        role="status"
                        aria-label="Loading requests"
                      >
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton key={index} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : rows.length === 0 ? (
                      <Empty className="border-0 py-14">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <IconClipboardList aria-hidden />
                          </EmptyMedia>
                          <EmptyTitle>No consultation requests</EmptyTitle>
                          <EmptyDescription className="max-w-sm">
                            {debouncedQuery.trim() || status !== "all"
                              ? "Nothing matches your search or status filter."
                              : "Mobile appointment submissions appear here for nurse triage."}
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      <>
                        <div
                          className={cn(
                            "divide-y divide-border",
                            staleListBusyClassName(listBusy.isRefreshing)
                          )}
                          aria-busy={listBusy.isRefreshing || undefined}
                        >
                          {pageRows.map((row, rowIndex) => (
                            <ConsultationRequestCard
                              key={row.id}
                              request={row}
                              index={
                                (safePage - 1) * PAGE_SIZE + rowIndex + 1
                              }
                              canViewDetails={canViewDetails}
                              canApprove={canApprove}
                              canDecline={canDecline}
                              canReschedule={canReschedule}
                              onAction={(mode) => openRequest(row, mode)}
                            />
                          ))}
                        </div>
                        {rows.length > PAGE_SIZE ? (
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5 sm:px-5">
                            <p
                              className="text-xs text-muted-foreground tabular-nums sm:text-sm"
                              role="status"
                            >
                              Page {safePage} of {totalPages}
                              <span className="text-muted-foreground/80">
                                {" "}
                                · {rows.length} request
                                {rows.length === 1 ? "" : "s"}
                              </span>
                            </p>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={safePage <= 1 || loading}
                                onClick={() =>
                                  setPage((p) => Math.max(1, p - 1))
                                }
                              >
                                Previous
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={safePage >= totalPages || loading}
                                onClick={() =>
                                  setPage((p) => Math.min(totalPages, p + 1))
                                }
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </CardContent>
                </Card>
              </PanelCell>
              <PanelCell className="lg:col-span-1">
                <RecentlyApprovedPanel
                  items={recentApproved}
                  loading={recentLoading}
                  canViewDetails={canViewDetails}
                  onView={(request) => openRequest(request, "view")}
                />
              </PanelCell>
            </PanelGrid>
          </PanelCell>
        </PanelGrid>
      </PanelFrame>

      <ViewRequestDialog
        request={selected}
        open={dialogMode === "view"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      />
      <ApproveRequestDialog
        request={selected}
        open={dialogMode === "approve" || dialogMode === "admit"}
        mode={dialogMode === "admit" ? "admit" : "approve"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        onUpdated={handleUpdated}
      />
      <RescheduleRequestDialog
        request={selected}
        open={dialogMode === "reschedule"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        onUpdated={handleUpdated}
      />
      <DeclineRequestDialog
        requestId={selected?.id ?? null}
        patientName={selected?.patientName}
        open={dialogMode === "decline"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        onDeclined={() => {
          scheduleRefresh()
        }}
      />
    </div>
  )
}

/** @deprecated Prefer RequestsPage */
export const RequestsDemoPage = RequestsPage
