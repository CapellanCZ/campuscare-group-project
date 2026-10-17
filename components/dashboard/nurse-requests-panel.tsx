"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  IconCalendarEvent,
  IconCheck,
  IconEye,
  IconSearch,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react"

import { ModuleSnapshot } from "@/components/dashboard/module-snapshot"
import { ApproveRequestDialog } from "@/components/requests/approve-request-dialog"
import { DeclineRequestDialog } from "@/components/requests/decline-request-dialog"
import { RescheduleRequestDialog } from "@/components/requests/reschedule-request-dialog"
import { ViewRequestDialog } from "@/components/requests/view-request-dialog"
import type { RequestDialogMode } from "@/components/requests/consultation-request-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fetchConsultationRequestByIdAction } from "@/features/requests/actions"
import {
  consultationRequestStatusLabel,
  formatRequestPreferred,
} from "@/features/requests/lib/format"
import { consultationProviderLabel } from "@/lib/health/consultation-workflow"
import { requestToasts } from "@/lib/feedback/toast-messages"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import {
  appointmentRequestStatusDot,
  appointmentRequestStatusTone,
} from "@/lib/ui/status-badge-tone"
import type { AppointmentRequest } from "@/types/appointmentRequest"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

export function NurseRequestsPanel({
  access,
  summary,
  decorative = false,
}: {
  access: StaffAccess
  summary: RoleDashboardSummary
  /** Marketing / static shot — table only, no request dialogs. */
  decorative?: boolean
}) {
  const router = useRouter()
  const canApprove =
    !decorative && can(access.designation, "requests.approve")
  const canDecline =
    !decorative && can(access.designation, "requests.decline")
  const canReschedule =
    !decorative && can(access.designation, "requests.reschedule")
  const canViewDetails =
    !decorative && can(access.designation, "requests.view_patient_details")
  const [pendingView, startView] = useTransition()
  const [selectedRequest, setSelectedRequest] =
    useState<AppointmentRequest | null>(null)
  const [dialogMode, setDialogMode] = useState<RequestDialogMode | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return summary.requests.recent.filter((row) => {
      if (row.status === "confirmed" || dismissedIds.has(row.id)) return false
      if (!q) return true
      const haystack = [
        row.patientName,
        row.studentId,
        row.service,
        row.providerType,
        row.status,
        row.queueNumber != null ? String(row.queueNumber) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [summary.requests.recent, dismissedIds, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  function softRefreshAfterMutation(requestId: string) {
    setDismissedIds((prev) => new Set(prev).add(requestId))
    closeDialog()
    setSelectedRequest(null)
    router.refresh()
  }

  function openRequest(requestId: string, mode: RequestDialogMode) {
    startView(async () => {
      const result = await fetchConsultationRequestByIdAction(requestId)
      if (!result.ok) {
        requestToasts.failed(result.error)
        return
      }
      setSelectedRequest(result.data)
      setDialogMode(mode)
    })
  }

  function closeDialog() {
    setDialogMode(null)
  }

  return (
    <>
      <ModuleSnapshot
        title="Request queue"
        badge={summary.requests.pendingCount}
        className="gap-0"
      >
        <div className="relative px-1">
          <IconSearch
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="h-9 pl-9"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Search patient, ID, or service"
            aria-label="Search request queue"
            disabled={decorative}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            {query.trim()
              ? "No requests match your search."
              : "No appointment requests yet."}
          </p>
        ) : (
          <>
            <div className="-mx-6 min-w-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Patient</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Service
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Preferred
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const showApprove =
                      canApprove && row.status === "pending"
                    const showAdmit =
                      canApprove && row.status === "waitlisted"
                    const showReschedule =
                      canReschedule &&
                      (row.status === "pending" ||
                        row.status === "waitlisted" ||
                        row.status === "rescheduled")
                    const showDecline =
                      canDecline &&
                      (row.status === "pending" ||
                        row.status === "waitlisted")
                    const hasActions =
                      decorative ||
                      showApprove ||
                      showAdmit ||
                      showReschedule ||
                      showDecline

                    return (
                      <TableRow key={row.id}>
                        <TableCell className="pl-6">
                          <div className="flex min-w-0 items-start gap-1.5 py-1">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">
                                {row.patientName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground tabular-nums">
                                {row.studentId || "—"}
                                {row.queueNumber != null
                                  ? ` · #${row.queueNumber}`
                                  : ""}
                              </p>
                            </div>
                            {decorative || canViewDetails ? (
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                className="mt-0.5 size-7 shrink-0 text-muted-foreground"
                                disabled={decorative ? false : pendingView}
                                tabIndex={decorative ? -1 : undefined}
                                aria-label={`View ${row.patientName}`}
                                title="View details"
                                onClick={() => {
                                  if (decorative) return
                                  openRequest(row.id, "view")
                                }}
                              >
                                <IconEye className="size-4" aria-hidden />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {consultationProviderLabel(row.providerType)}
                          {row.service ? ` · ${row.service}` : ""}
                        </TableCell>
                        <TableCell className="hidden text-sm tabular-nums md:table-cell">
                          {formatRequestPreferred(
                            row.preferredDate,
                            row.preferredTime
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            label={consultationRequestStatusLabel(row.status)}
                            toneClassName={appointmentRequestStatusTone(
                              row.status
                            )}
                            dotClassName={appointmentRequestStatusDot(
                              row.status
                            )}
                          />
                        </TableCell>
                        <TableCell className="pr-6">
                          {hasActions ? (
                            <div className="flex flex-wrap justify-end gap-1">
                              {decorative ? (
                                row.status === "pending" ? (
                                  <>
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      className="size-7"
                                      tabIndex={-1}
                                      aria-label="Approve"
                                    >
                                      <IconCheck
                                        className="size-3.5"
                                        aria-hidden
                                      />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="outline"
                                      className="size-7"
                                      tabIndex={-1}
                                      aria-label="Reschedule"
                                    >
                                      <IconCalendarEvent
                                        className="size-3.5"
                                        aria-hidden
                                      />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="destructive"
                                      className="size-7"
                                      tabIndex={-1}
                                      aria-label="Decline"
                                    >
                                      <IconX
                                        className="size-3.5"
                                        aria-hidden
                                      />
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                )
                              ) : (
                                <>
                                  {showApprove ? (
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      className="size-7"
                                      disabled={pendingView}
                                      aria-label="Approve"
                                      title="Approve"
                                      onClick={() =>
                                        openRequest(row.id, "approve")
                                      }
                                    >
                                      <IconCheck
                                        className="size-3.5"
                                        aria-hidden
                                      />
                                    </Button>
                                  ) : null}
                                  {showAdmit ? (
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      className="size-7"
                                      disabled={pendingView}
                                      aria-label="Admit"
                                      title="Admit"
                                      onClick={() =>
                                        openRequest(row.id, "admit")
                                      }
                                    >
                                      <IconUserPlus
                                        className="size-3.5"
                                        aria-hidden
                                      />
                                    </Button>
                                  ) : null}
                                  {showReschedule ? (
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="outline"
                                      className="size-7"
                                      disabled={pendingView}
                                      aria-label="Reschedule"
                                      title="Reschedule"
                                      onClick={() =>
                                        openRequest(row.id, "reschedule")
                                      }
                                    >
                                      <IconCalendarEvent
                                        className="size-3.5"
                                        aria-hidden
                                      />
                                    </Button>
                                  ) : null}
                                  {showDecline ? (
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="destructive"
                                      className="size-7"
                                      disabled={pendingView}
                                      aria-label="Decline"
                                      title="Decline"
                                      onClick={() =>
                                        openRequest(row.id, "decline")
                                      }
                                    >
                                      <IconX
                                        className="size-3.5"
                                        aria-hidden
                                      />
                                    </Button>
                                  ) : null}
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="block text-right text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {filtered.length > PAGE_SIZE ? (
              <div
                className={cn(
                  "flex items-center justify-between gap-3 border-t px-1 pt-3"
                )}
              >
                <p className="text-sm text-muted-foreground" role="status">
                  Page {safePage} of {totalPages}
                  <span className="hidden sm:inline">
                    {" "}
                    · {filtered.length} requests
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={safePage <= 1 || decorative}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={safePage >= totalPages || decorative}
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
      </ModuleSnapshot>

      {!decorative ? (
        <>
          <ViewRequestDialog
            request={selectedRequest}
            open={dialogMode === "view"}
            onOpenChange={(open) => {
              if (!open) {
                closeDialog()
                setSelectedRequest(null)
              }
            }}
          />
          <ApproveRequestDialog
            request={selectedRequest}
            open={dialogMode === "approve" || dialogMode === "admit"}
            mode={dialogMode === "admit" ? "admit" : "approve"}
            onOpenChange={(open) => {
              if (!open) {
                closeDialog()
                setSelectedRequest(null)
              }
            }}
            onUpdated={() => {
              if (selectedRequest) softRefreshAfterMutation(selectedRequest.id)
              else router.refresh()
            }}
          />
          <RescheduleRequestDialog
            request={selectedRequest}
            open={dialogMode === "reschedule"}
            onOpenChange={(open) => {
              if (!open) {
                closeDialog()
                setSelectedRequest(null)
              }
            }}
            onUpdated={() => {
              if (selectedRequest) softRefreshAfterMutation(selectedRequest.id)
              else router.refresh()
            }}
          />
          <DeclineRequestDialog
            requestId={selectedRequest?.id ?? null}
            patientName={selectedRequest?.patientName}
            open={dialogMode === "decline"}
            onOpenChange={(open) => {
              if (!open) {
                closeDialog()
                setSelectedRequest(null)
              }
            }}
            onDeclined={() => {
              if (selectedRequest) softRefreshAfterMutation(selectedRequest.id)
              else router.refresh()
            }}
          />
        </>
      ) : null}
    </>
  )
}
