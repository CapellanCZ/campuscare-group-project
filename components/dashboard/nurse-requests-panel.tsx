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
import {
  DirectoryColumnHeader,
  DirectoryColumnLabel,
  type ColumnSortDirection,
} from "@/features/admin/components/directory-column-header"
import { fetchConsultationRequestByIdAction } from "@/features/requests/actions"
import {
  consultationRequestStatusLabel,
  formatRequestPreferred,
} from "@/features/requests/lib/format"
import { consultationProviderLabel } from "@/lib/health/consultation-workflow"
import { requestToasts } from "@/lib/feedback/toast-messages"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type {
  DashboardRequestPreview,
  RoleDashboardSummary,
} from "@/lib/health/dashboard-summary-types"
import {
  appointmentRequestStatusDot,
  appointmentRequestStatusTone,
} from "@/lib/ui/status-badge-tone"
import type { AppointmentRequest } from "@/types/appointmentRequest"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

type SortKey = "patient" | "service" | "preferred" | "status"

const STATUS_SORT_RANK: Record<string, number> = {
  pending: 0,
  waitlisted: 1,
  rescheduled: 2,
  in_progress: 3,
  completed: 4,
  cancelled: 5,
  no_show: 6,
  confirmed: 7,
}

function preferredSortValue(row: DashboardRequestPreview) {
  return `${row.preferredDate || ""}T${row.preferredTime || ""}`
}

function serviceSortValue(row: DashboardRequestPreview) {
  return `${row.providerType || ""} ${row.service || ""}`.trim().toLowerCase()
}

function compareRows(
  a: DashboardRequestPreview,
  b: DashboardRequestPreview,
  key: SortKey,
  direction: "asc" | "desc"
) {
  let result = 0
  switch (key) {
    case "patient":
      result = a.patientName.localeCompare(b.patientName, undefined, {
        sensitivity: "base",
      })
      break
    case "service":
      result = serviceSortValue(a).localeCompare(serviceSortValue(b))
      break
    case "preferred":
      result = preferredSortValue(a).localeCompare(preferredSortValue(b))
      break
    case "status":
      result =
        (STATUS_SORT_RANK[a.status] ?? 99) - (STATUS_SORT_RANK[b.status] ?? 99)
      break
  }
  return direction === "asc" ? result : -result
}

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
  const [sortKey, setSortKey] = useState<SortKey>("preferred")
  const [sortDirection, setSortDirection] =
    useState<ColumnSortDirection>("desc")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const next = summary.requests.recent.filter((row) => {
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

    if (!sortDirection) return next
    return [...next].sort((a, b) =>
      compareRows(a, b, sortKey, sortDirection)
    )
  }, [
    summary.requests.recent,
    dismissedIds,
    query,
    sortKey,
    sortDirection,
  ])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  function sortDirectionFor(key: SortKey): ColumnSortDirection {
    return sortKey === key ? sortDirection : false
  }

  function setColumnSort(key: SortKey, direction: "asc" | "desc") {
    setSortKey(key)
    setSortDirection(direction)
    setPage(1)
  }

  function clearColumnSort(key: SortKey) {
    if (sortKey !== key) return
    setSortDirection(false)
    setPage(1)
  }

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
        toolbar={
          <div className="relative w-full">
            <IconSearch
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="h-9 pl-8"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Search patient or ID"
              aria-label="Search request queue"
              disabled={decorative}
            />
          </div>
        }
      >
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
                    <TableHead className="pl-6">
                      <DirectoryColumnHeader
                        title="Patient"
                        sortDirection={sortDirectionFor("patient")}
                        onSortAsc={() => setColumnSort("patient", "asc")}
                        onSortDesc={() => setColumnSort("patient", "desc")}
                        onClearSort={() => clearColumnSort("patient")}
                      />
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <DirectoryColumnHeader
                        title="Service"
                        sortDirection={sortDirectionFor("service")}
                        onSortAsc={() => setColumnSort("service", "asc")}
                        onSortDesc={() => setColumnSort("service", "desc")}
                        onClearSort={() => clearColumnSort("service")}
                      />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <DirectoryColumnHeader
                        title="Preferred"
                        sortDirection={sortDirectionFor("preferred")}
                        onSortAsc={() => setColumnSort("preferred", "asc")}
                        onSortDesc={() => setColumnSort("preferred", "desc")}
                        onClearSort={() => clearColumnSort("preferred")}
                      />
                    </TableHead>
                    <TableHead>
                      <DirectoryColumnHeader
                        title="Status"
                        sortDirection={sortDirectionFor("status")}
                        onSortAsc={() => setColumnSort("status", "asc")}
                        onSortDesc={() => setColumnSort("status", "desc")}
                        onClearSort={() => clearColumnSort("status")}
                      />
                    </TableHead>
                    <TableHead className="pr-6 text-right">
                      <DirectoryColumnLabel
                        title="Actions"
                        className="justify-end"
                      />
                    </TableHead>
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
                    const showView = decorative || canViewDetails
                    const hasActions =
                      showView ||
                      showApprove ||
                      showAdmit ||
                      showReschedule ||
                      showDecline

                    return (
                      <TableRow key={row.id}>
                        <TableCell className="pl-6">
                          <div className="min-w-0">
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
                            <div className="flex flex-wrap items-center justify-end gap-1">
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
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="outline"
                                      className="size-7 border-border/70 bg-background text-muted-foreground"
                                      tabIndex={-1}
                                      aria-label="View"
                                    >
                                      <IconEye
                                        className="size-4"
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
                                  {showView ? (
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="outline"
                                      className="size-7 border-border/70 bg-background text-muted-foreground"
                                      disabled={pendingView}
                                      aria-label={`View ${row.patientName}`}
                                      title="View details"
                                      onClick={() =>
                                        openRequest(row.id, "view")
                                      }
                                    >
                                      <IconEye
                                        className="size-4"
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
