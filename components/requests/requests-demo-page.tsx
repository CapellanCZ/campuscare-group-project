"use client"

import {
  useCallback,
  useEffect,
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
  PanelFrame,
  panelCardClassName,
} from "@/components/layout/panel-frame"
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
  const [page, setPage] = useState(1)
  const [list, setList] = useState(cached?.list ?? initialList)
  const [stats, setStats] = useState(cached?.stats ?? initialStats)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<AppointmentRequest | null>(null)
  const [dialogMode, setDialogMode] = useState<RequestDialogMode | null>(null)
  const skipNextFetch = useRef(true)
  const hydratedRef = useRef(false)
  const detailRequestId = useRef<string | null>(null)

  const canApprove = can(access.designation, "requests.approve")
  const canDecline = can(access.designation, "requests.decline")
  const canReschedule = can(access.designation, "requests.reschedule")
  const canViewDetails = can(access.designation, "requests.view_patient_details")

  useEffect(() => {
    if (initialError) requestToasts.failed(initialError)
  }, [initialError])

  // Warm session cache from RSC seed so nav badge / revisits skip a cold POST.
  useEffect(() => {
    if (hydrateFromCache) return
    saveRequestsCache(access.designation, {
      list: initialList,
      stats: initialStats,
    })
  }, [access.designation, hydrateFromCache, initialList, initialStats])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = query.trim()
      if (nextQuery === debouncedQuery) return
      setDebouncedQuery(nextQuery)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query, debouncedQuery])

  const loadPage = useCallback(
    async (
      nextQuery: string,
      nextStatus: string,
      options?: { silent?: boolean }
    ) => {
      const silent = Boolean(options?.silent)
      const isDefault =
        !nextQuery.trim() && nextStatus === "all" && hydrateFromCache

      if (!silent) setLoading(true)
      try {
        if (isDefault) {
          const bundle = await loadRequestsBundle(access.designation, {
            force: true,
          })
          setList(bundle.list)
          setStats(bundle.stats)
          return
        }

        const [listResult, statsResult] = await Promise.all([
          fetchConsultationRequestsAction({
            query: nextQuery,
            status:
              nextStatus === "all"
                ? "all"
                : (nextStatus as AppointmentRequestStatus),
            statuses:
              nextStatus === "all" && isNurse
                ? NURSE_REQUEST_TAB_STATUSES
                : undefined,
            page: 1,
            pageSize: 100,
          }),
          fetchConsultationRequestStatsAction(),
        ])
        if (!listResult.ok) {
          requestToasts.failed(listResult.error)
          return
        }
        if (!statsResult.ok) {
          requestToasts.failed(statsResult.error)
          return
        }
        setList(listResult.data)
        setStats(statsResult.data)
        if (isDefault) {
          saveRequestsCache(access.designation, {
            list: listResult.data,
            stats: statsResult.data,
          })
        }
      } catch {
        requestToasts.failed(
          "Unable to reach the database. Check your connection and try again."
        )
      } finally {
        setLoading(false)
      }
    },
    [access.designation, hydrateFromCache, isNurse]
  )

  const refresh = useCallback(async () => {
    await loadPage(debouncedQuery, status, { silent: true })
  }, [debouncedQuery, status, loadPage])

  const { schedule: scheduleRefresh } = useInstantListRefresh(refresh, 400)

  useStaffRealtimeRefresh(
    `staff-requests-${access.designation}`,
    STAFF_REALTIME_TABLES.requests,
    scheduleRefresh
  )

  useEffect(() => {
    if (!hydrateFromCache || hydratedRef.current) return
    hydratedRef.current = true
    const hit = getCachedRequests(access.designation)
    if (hit) {
      setList(hit.list)
      setStats(hit.stats)
      setLoading(false)
    }
    void loadRequestsBundle(access.designation, {
      force:
        Boolean(hit) && !staffCacheIsFresh(requestsCacheKey(access.designation)),
    })
      .then((bundle) => {
        setList(bundle.list)
        setStats(bundle.stats)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        if (!hit) void loadPage("", "all", { silent: true })
      })
  }, [access.designation, hydrateFromCache, loadPage])

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    setPage(1)
    void loadPage(debouncedQuery, status)
  }, [debouncedQuery, status, loadPage])

  const rows = list.items
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
    // Optimistic: patch the visible queue + KPI strip immediately, then soft-reconcile.
    const existing = list.items.find((item) => item.id === request.id)
    const nextStats =
      existing && existing.status !== request.status
        ? shiftRequestStats(stats, existing.status, request.status)
        : stats
    const matchesFilter = status === "all" || request.status === status
    const without = list.items.filter((item) => item.id !== request.id)
    const nextItems = matchesFilter ? [request, ...without] : without
    const items = [...nextItems].sort((a, b) => {
      const rank = (rowStatus: AppointmentRequest["status"]) =>
        rowStatus === "pending"
          ? 0
          : rowStatus === "waitlisted"
            ? 1
            : rowStatus === "rescheduled"
              ? 2
              : 3
      const byStatus = rank(a.status) - rank(b.status)
      if (byStatus !== 0) return byStatus
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    })
    const nextList = {
      ...list,
      items,
      total: Math.max(0, list.total + (matchesFilter ? 0 : -1)),
    }
    setList(nextList)
    setStats(nextStats)
    // Keep sidebar pending badge in sync even when realtime is flaky.
    saveRequestsCache(access.designation, {
      list: nextList,
      stats: nextStats,
    })
    scheduleRefresh()
  }

  return (
    <div className="flex flex-col gap-8 pt-2">
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

      {can(access.designation, "requests.summary_cards") ? (
        <RequestStatsStrip
          stats={stats}
          activeKey={status === "all" ? null : status}
          onSelect={(key) => {
            setPage(1)
            setStatus((current) => (current === key ? "all" : key))
          }}
        />
      ) : null}

      <PanelFrame>
        <Card className={cn(panelCardClassName, "gap-0 py-0")}>
          <CardHeader className="gap-4 border-b px-6 py-5">
            <CardTitle className="text-base">Request Queue</CardTitle>
            {can(access.designation, "requests.search_filters") ? (
              <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
                {isNurse ? (
                  <StudentIdSearchInput
                    className="w-full sm:max-w-sm sm:flex-1"
                    value={query}
                    onChange={setQuery}
                    placeholder="Search by ID Number"
                    aria-label="Search by ID Number"
                  />
                ) : (
                  <Input
                    className="h-9 w-full sm:max-w-sm sm:flex-1"
                    placeholder="Search patient, ID, email, service, doctor, status"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                )}
                <Select
                  value={status}
                  items={statusFilterItems}
                  onValueChange={(value) => setStatus(value ?? "all")}
                >
                  <SelectTrigger
                    className="w-full shrink-0 sm:w-48"
                    aria-label="Filter by status"
                  >
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {filterStatuses.map((value) => (
                      <SelectItem key={value} value={value}>
                        {consultationRequestStatusLabel(value)}
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
              <Empty className="border-0 py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconClipboardList aria-hidden />
                  </EmptyMedia>
                  <EmptyTitle>No consultation requests</EmptyTitle>
                  <EmptyDescription>
                    Mobile appointment submissions appear here for nurse triage.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <div
                  className={cn(
                    "divide-y-0",
                    staleListBusyClassName(listBusy.isRefreshing)
                  )}
                  aria-busy={listBusy.isRefreshing || undefined}
                >
                  {pageRows.map((row, rowIndex) => (
                    <ConsultationRequestCard
                      key={row.id}
                      request={row}
                      index={(safePage - 1) * PAGE_SIZE + rowIndex + 1}
                      canViewDetails={canViewDetails}
                      canApprove={canApprove}
                      canDecline={canDecline}
                      canReschedule={canReschedule}
                      onAction={(mode) => openRequest(row, mode)}
                    />
                  ))}
                </div>
                {rows.length > PAGE_SIZE ? (
                  <div className="flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6">
                    <p className="text-sm text-muted-foreground" role="status">
                      Page {safePage} of {totalPages} · {rows.length} requests
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={safePage <= 1 || loading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
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
          void refresh()
        }}
      />
    </div>
  )
}

/** @deprecated Prefer RequestsPage */
export const RequestsDemoPage = RequestsPage
