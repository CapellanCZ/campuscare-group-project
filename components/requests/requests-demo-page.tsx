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

import { ConsultationRequestDetailSheet } from "@/components/requests/consultation-request-detail-sheet"
import { StudentIdSearchInput } from "@/components/shared/student-id-search-input"
import {
  DemoPageHeader,
  DemoStatGrid,
} from "@/components/demo/demo-page"
import {
  PanelFrame,
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  fetchConsultationRequestByIdAction,
  fetchConsultationRequestStatsAction,
  fetchConsultationRequestsAction,
} from "@/features/requests/actions"
import {
  consultationRequestStatusLabel,
  formatRequestDate,
} from "@/features/requests/lib/format"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import {
  APPOINTMENT_REQUEST_STATUSES,
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

const NURSE_FILTER_STATUSES: AppointmentRequestStatus[] = [
  "pending",
  "confirmed",
  "waitlisted",
  "rescheduled",
  "cancelled",
]

const statusVariant: Record<
  AppointmentRequestStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  confirmed: "default",
  waitlisted: "outline",
  rescheduled: "outline",
  in_progress: "default",
  completed: "default",
  cancelled: "destructive",
  no_show: "destructive",
}

function toStatCards(stats: AppointmentRequestStats): DemoStat[] {
  return [
    {
      key: "pending",
      label: "Pending",
      value: String(stats.pending),
      description: "Awaiting nurse review",
    },
    {
      key: "confirmed",
      label: "Confirmed",
      value: String(stats.confirmed),
      description: "Approved reservations",
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
      label: "Cancelled",
      value: String(stats.cancelled),
      description: "Declined or cancelled",
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
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<AppointmentRequest | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
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
    []
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
  const filterStatuses =
    access.designation === "nurse"
      ? NURSE_FILTER_STATUSES
      : [...APPOINTMENT_REQUEST_STATUSES]

  function openRequest(row: AppointmentRequest) {
    setSelected(row)
    setSheetOpen(true)
    startTransition(async () => {
      const result = await fetchConsultationRequestByIdAction(row.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setSelected(result.data)
    })
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
          access.designation === "nurse"
            ? ""
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
              {access.designation === "nurse" ? (
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
            <div className="space-y-3 p-4" role="status" aria-label="Loading requests">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
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
            <div className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden sm:table-cell">Service</TableHead>
                  <TableHead className="hidden md:table-cell">Preferred</TableHead>
                  <TableHead className="hidden lg:table-cell">Queue #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium">{row.patientName}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {row.studentId || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div>
                          <p>{row.service}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {row.providerType}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm md:table-cell">
                        {formatRequestDate(row.preferredDate)}{" "}
                        {row.preferredTime || ""}
                      </TableCell>
                      <TableCell className="hidden tabular-nums lg:table-cell">
                        {row.queueNumber != null ? row.queueNumber : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[row.status]}>
                          {consultationRequestStatusLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1">
                          {canViewDetails ? (
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() => openRequest(row)}
                            >
                              View
                            </Button>
                          ) : null}
                          {canApprove && row.status === "pending" ? (
                            <Button
                              type="button"
                              size="xs"
                              onClick={() => openRequest(row)}
                            >
                              Approve
                            </Button>
                          ) : null}
                          {canApprove && row.status === "waitlisted" ? (
                            <Button
                              type="button"
                              size="xs"
                              onClick={() => openRequest(row)}
                            >
                              Admit
                            </Button>
                          ) : null}
                          {canReschedule &&
                          (row.status === "pending" ||
                            row.status === "waitlisted" ||
                            row.status === "confirmed") ? (
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => openRequest(row)}
                            >
                              Reschedule
                            </Button>
                          ) : null}
                          {canDecline &&
                          (row.status === "pending" ||
                            row.status === "waitlisted") ? (
                            <Button
                              type="button"
                              size="xs"
                              variant="destructive"
                              onClick={() => openRequest(row)}
                            >
                              Decline
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </PanelFrame>

      <ConsultationRequestDetailSheet
        request={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        canApprove={canApprove}
        canDecline={canDecline}
        canReschedule={canReschedule}
        onUpdated={handleUpdated}
      />
    </div>
  )
}

/** @deprecated Prefer RequestsPage */
export const RequestsDemoPage = RequestsPage
