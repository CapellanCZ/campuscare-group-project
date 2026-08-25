"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { toast } from "sonner"

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
}: {
  access: StaffAccess
  initialList: AppointmentRequestListResult
  initialStats: AppointmentRequestStats
  initialError?: string | null
}) {
  const isNurse = access.designation === "nurse"
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<AppointmentRequest | null>(null)
  const [dialogMode, setDialogMode] = useState<RequestDialogMode | null>(null)
  const [pending, startTransition] = useTransition()
  const skipNextFetch = useRef(true)

  const canApprove = can(access.designation, "requests.approve")
  const canDecline = can(access.designation, "requests.decline")
  const canReschedule = can(access.designation, "requests.reschedule")
  const canViewDetails = can(access.designation, "requests.view_patient_details")

  useEffect(() => {
    if (initialError) toast.error(initialError)
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
    async (nextQuery: string, nextStatus: string) => {
      setLoading(true)
      try {
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
          toast.error(listResult.error)
          return
        }
        if (!statsResult.ok) {
          toast.error(statsResult.error)
          return
        }
        setList(listResult.data)
        setStats(statsResult.data)
      } catch {
        toast.error(
          "Unable to reach the database. Check your connection and try again."
        )
      } finally {
        setLoading(false)
      }
    },
    [isNurse]
  )

  const refresh = useCallback(async () => {
    await loadPage(debouncedQuery, status)
  }, [debouncedQuery, status, loadPage])

  useStaffRealtimeRefresh(
    `staff-requests-${access.designation}`,
    STAFF_REALTIME_TABLES.requests,
    () => {
      void refresh()
    }
  )

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void loadPage(debouncedQuery, status)
  }, [debouncedQuery, status, loadPage])

  const rows = list.items
  const statCards = useMemo(() => toStatCards(stats), [stats])
  const filterStatuses = isNurse
    ? NURSE_REQUEST_TAB_STATUSES
    : [...APPOINTMENT_REQUEST_STATUSES]

  function openRequest(row: AppointmentRequest, mode: RequestDialogMode) {
    setSelected(row)
    setDialogMode(mode)
    startTransition(async () => {
      const result = await fetchConsultationRequestByIdAction(row.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setSelected(result.data)
    })
  }

  function closeDialog() {
    setDialogMode(null)
  }

  async function handleUpdated(request: AppointmentRequest) {
    setSelected(request)
    await refresh()
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
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                {isNurse ? (
                  <StudentIdSearchInput
                    className="sm:w-72"
                    value={query}
                    onChange={setQuery}
                    placeholder="Search by Student ID"
                  />
                ) : (
                  <Input
                    className="sm:w-72"
                    placeholder="Search patient, ID, email, service, doctor, status"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                )}
                <select
                  aria-label="Filter by status"
                  className="h-9 rounded-4xl border border-border bg-input/30 px-3 text-sm"
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
            {loading || pending ? (
              <div
                className="space-y-3 p-4"
                role="status"
                aria-label="Loading requests"
              >
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
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
              <div className="divide-y-0">
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
