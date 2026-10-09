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
import {
  DemoPageHeader,
  DemoStatGrid,
} from "@/components/demo/demo-page"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
import { consultationRequestStatusLabel } from "@/features/requests/lib/format"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
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

function toStatCards(stats: AppointmentRequestStats): DemoStat[] {
  return [
    {
      key: "pending",
      label: "Pending",
      value: String(stats.pending),
      description: "Awaiting nurse review",
    },
    {
      key: "waitlisted",
      label: "Waitlisted",
      value: String(stats.waitlisted ?? 0),
      description: "Date capacity full",
    },
    {
      key: "rescheduled",
      label: "Rescheduled",
      value: String(stats.rescheduled),
      description: "New slots proposed",
    },
    {
      key: "cancelled",
      label: "Declined",
      value: String(stats.cancelled),
      description: "Declined by nurse",
    },
  ]
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
  const [list, setList] = useState(cached?.list ?? initialList)
  const [stats, setStats] = useState(cached?.stats ?? initialStats)
  const [loading, setLoading] = useState(
    () => hydrateFromCache && !cached && initialList.items.length === 0
  )
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
            pageSize: 50,
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
    void loadRequestsBundle(access.designation, { force: Boolean(hit) })
      .then((bundle) => {
        setList(bundle.list)
        setStats(bundle.stats)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        if (!hit) void loadPage("", "all")
      })
  }, [access.designation, hydrateFromCache, loadPage])

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void loadPage(debouncedQuery, status)
  }, [debouncedQuery, status, loadPage])

  const rows = list.items
  const listBusy = staleListBusy(loading, rows.length)
  const statCards = useMemo(() => toStatCards(stats), [stats])
  const filterStatuses = isNurse
    ? NURSE_REQUEST_TAB_STATUSES
    : [...APPOINTMENT_REQUEST_STATUSES]

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
    // Optimistic: patch the visible queue immediately, then soft-reconcile.
    setList((prev) => {
      const matchesFilter =
        status === "all" || request.status === status
      const without = prev.items.filter((item) => item.id !== request.id)
      const items = matchesFilter ? [request, ...without] : without
      return {
        ...prev,
        items,
        total: Math.max(0, prev.total + (matchesFilter ? 0 : -1)),
      }
    })
    scheduleRefresh()
  }

  return (
    <div className="flex flex-col gap-8 pt-2">
      <DemoPageHeader
        title="Consultation Requests"
        description={
          isNurse
            ? "Pending requests only — approve to move patients into Consultations."
            : "Nurse triage only — approve to queue the patient for check-in and intake, then assign specialty for the doctor list."
        }
        designation={access.designation}
        showDemoBanner={false}
      />

      {can(access.designation, "requests.summary_cards") ? (
        <DemoStatGrid stats={statCards} />
      ) : null}

      <PanelFrame>
        <Card className={cn(panelCardClassName, "gap-0 py-0")}>
          <CardHeader className="gap-4 border-b px-6 py-5">
            <CardTitle className="text-base">Request queue</CardTitle>
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
                <select
                  aria-label="Filter by status"
                  className="h-9 w-full shrink-0 rounded-4xl border border-border bg-input/30 px-3 text-sm sm:w-48"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  {filterStatuses.map((value) => (
                    <option key={value} value={value}>
                      {consultationRequestStatusLabel(value)}
                    </option>
                  ))}
                </select>
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
              <div
                className={cn(
                  "divide-y-0",
                  staleListBusyClassName(listBusy.isRefreshing)
                )}
                aria-busy={listBusy.isRefreshing || undefined}
              >
                {rows.map((row) => (
                  <ConsultationRequestCard
                    key={row.id}
                    request={row}
                    canViewDetails={canViewDetails}
                    canApprove={canApprove}
                    canDecline={canDecline}
                    canReschedule={canReschedule}
                    onAction={(mode) => openRequest(row, mode)}
                  />
                ))}
              </div>
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
