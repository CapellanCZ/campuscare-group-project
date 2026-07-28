"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
import { RequestRescheduleDialog } from "@/components/requests/request-reschedule-dialog"
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
  approveConsultationRequestAction,
  declineConsultationRequestAction,
  fetchConsultationRequestStatsAction,
  fetchConsultationRequestsAction,
  rescheduleConsultationRequestAction,
} from "@/features/requests/actions"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import type {
  ConsultationRequest,
  ConsultationRequestListResult,
  ConsultationRequestStats,
  ConsultationRequestStatus,
} from "@/types/consultationRequest"

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

const statusVariant: Record<
  ConsultationRequestStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  approved: "default",
  declined: "destructive",
  rescheduled: "outline",
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
      label: "Approved today",
      value: String(stats.approvedToday),
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
      description: "Not proceeding",
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
  const [page, setPage] = useState(1)
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [rescheduleTarget, setRescheduleTarget] =
    useState<ConsultationRequest | null>(null)
  const [isPending, startTransition] = useTransition()
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
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query, debouncedQuery])

  useEffect(() => {
    if (status !== "all") setPage(1)
  }, [status])

  const loadPage = useCallback(
    async (nextQuery: string, nextPage: number, nextStatus: string) => {
      setLoading(true)
      try {
        const [listResult, statsResult] = await Promise.all([
          fetchConsultationRequestsAction({
            query: nextQuery,
            page: nextPage,
            pageSize: PAGE_SIZE,
            status:
              nextStatus === "all"
                ? "all"
                : (nextStatus as ConsultationRequestStatus),
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
        toast.error("Unable to reach the database. Check your connection.")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void loadPage(debouncedQuery, page, status)
  }, [debouncedQuery, page, status, loadPage])

  const statCards = useMemo(() => toStatCards(stats), [stats])
  const rows = list.items
  const showSkeleton = loading || isPending

  function runMutation(
    action: () => Promise<{ ok: boolean; error?: string; message?: string }>,
    successMessage: string
  ) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error ?? "Action failed.")
        return
      }
      toast.success(successMessage)
      await loadPage(debouncedQuery, page, status)
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <DemoPageHeader
        title="Consultation Requests"
        description="Review and process incoming appointment requests"
        designation={access.designation}
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
                className="sm:w-64"
                placeholder="Search patient, ID, or service"
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
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {showSkeleton && rows.length === 0 ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyTitle>No consultation requests</EmptyTitle>
                <EmptyDescription>
                  Incoming student requests will appear here for review.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
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
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.patientName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.studentId} · {row.reason}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{row.service}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {row.preferredDate} · {row.preferredTime}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[row.status]}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        {canViewDetails ? (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              toast.info(
                                `${row.patientName} · ${row.service} · ${row.reason}`
                              )
                            }
                          >
                            View
                          </Button>
                        ) : null}
                        {canApprove && row.status === "pending" ? (
                          <Button
                            size="xs"
                            disabled={isPending}
                            onClick={() =>
                              runMutation(
                                () => approveConsultationRequestAction(row.id),
                                "Request approved and added to queue."
                              )
                            }
                          >
                            Approve
                          </Button>
                        ) : null}
                        {canReschedule && row.status === "pending" ? (
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => setRescheduleTarget(row)}
                          >
                            Reschedule
                          </Button>
                        ) : null}
                        {canDecline && row.status === "pending" ? (
                          <Button
                            size="xs"
                            variant="destructive"
                            disabled={isPending}
                            onClick={() =>
                              runMutation(
                                () => declineConsultationRequestAction(row.id),
                                "Request declined."
                              )
                            }
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
          )}
        </CardContent>
      </Card>

      {list.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || isPending}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {list.page} of {list.totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= list.totalPages || isPending}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <RequestRescheduleDialog
        open={Boolean(rescheduleTarget)}
        request={rescheduleTarget}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null)
        }}
        onSubmit={async (input) => {
          const result = await rescheduleConsultationRequestAction(input)
          if (!result.ok) {
            toast.error(result.error)
            return false
          }
          toast.success("Request rescheduled.")
          setRescheduleTarget(null)
          await loadPage(debouncedQuery, page, status)
          return true
        }}
      />
    </div>
  )
}
