"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import Link from "next/link"
import { toast } from "sonner"

import { ConsultationRequestDetailSheet } from "@/components/requests/consultation-request-detail-sheet"
import {
  DemoPageHeader,
  DemoStatGrid,
} from "@/components/demo/demo-page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  CONSULTATION_REQUEST_STATUSES,
  type ConsultationRequest,
  type ConsultationRequestListResult,
  type ConsultationRequestStats,
  type ConsultationRequestStatus,
} from "@/types/consultationRequest"

const SEARCH_DEBOUNCE_MS = 300

const statusVariant: Record<
  ConsultationRequestStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  approved: "default",
  declined: "destructive",
  rescheduled: "outline",
  completed: "default",
  cancelled: "destructive",
}

function toStatCards(stats: ConsultationRequestStats): DemoStat[] {
  return [
    {
      key: "pending",
      label: "Pending",
      value: String(stats.pending),
      description: "Awaiting nurse review",
    },
    {
      key: "approved",
      label: "Approved",
      value: String(stats.approved),
      description: "Ready for queue",
    },
    {
      key: "rescheduled",
      label: "Rescheduled",
      value: String(stats.rescheduled),
      description: "New slots proposed",
    },
    {
      key: "declined",
      label: "Declined",
      value: String(stats.declined),
      description: "Not accepted",
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
  initialList: ConsultationRequestListResult
  initialStats: ConsultationRequestStats
  initialError?: string | null
}) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<ConsultationRequest | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const skipNextFetch = useRef(true)

  const canApprove = can(access.designation, "requests.approve")
  const canDecline = can(access.designation, "requests.decline")
  const canReschedule = can(access.designation, "requests.reschedule")
  const canViewDetails = can(access.designation, "requests.view_patient_details")
  const queueHref = `/${access.designation}/queue`

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
                : (nextStatus as ConsultationRequestStatus),
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

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void loadPage(debouncedQuery, status)
  }, [debouncedQuery, status, loadPage])

  const rows = list.items
  const statCards = useMemo(() => toStatCards(stats), [stats])

  function openRequest(row: ConsultationRequest) {
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

  async function handleUpdated(request: ConsultationRequest) {
    setSelected(request)
    await refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <DemoPageHeader
        title="Consultation Requests"
        description="Nurse triage only — approve to queue the patient for check-in and intake, then assign specialty for the doctor list."
        designation={access.designation}
        showDemoBanner={false}
        actions={
          canApprove ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={queueHref} />}
              nativeButton={false}
            >
              Open queue
            </Button>
          ) : null
        }
      />

      {can(access.designation, "requests.summary_cards") ? (
        <DemoStatGrid stats={statCards} />
      ) : null}

      <Card className="min-w-0 shadow-none dark:ring-0">
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Request queue</CardTitle>
          {can(access.designation, "requests.search_filters") ? (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <Input
                className="sm:w-72"
                placeholder="Search patient, ID, email, service, doctor, nurse, status"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                aria-label="Filter by status"
                className="h-9 rounded-4xl border border-border bg-input/30 px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                {CONSULTATION_REQUEST_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {consultationRequestStatusLabel(value)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {loading || pending ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Preferred</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No consultation requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium">{row.patientName}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {row.studentId || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{row.service}</TableCell>
                      <TableCell className="text-sm">
                        {formatRequestDate(row.preferredDate)}{" "}
                        {row.preferredTime || ""}
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
                              size="xs"
                              variant="ghost"
                              onClick={() => openRequest(row)}
                            >
                              View
                            </Button>
                          ) : null}
                          {canApprove && row.status === "pending" ? (
                            <Button
                              size="xs"
                              onClick={() => openRequest(row)}
                            >
                              Approve
                            </Button>
                          ) : null}
                          {canReschedule && row.status === "pending" ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openRequest(row)}
                            >
                              Reschedule
                            </Button>
                          ) : null}
                          {canDecline && row.status === "pending" ? (
                            <Button
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
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
