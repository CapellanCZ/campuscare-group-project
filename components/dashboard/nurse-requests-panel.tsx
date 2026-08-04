"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ModuleSnapshot } from "@/components/dashboard/module-snapshot"
import { ConsultationRequestDetailSheet } from "@/components/requests/consultation-request-detail-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  formatRequestDate,
} from "@/features/requests/lib/format"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import type { ConsultationRequest } from "@/types/consultationRequest"
import type { ConsultationRequestStatus } from "@/types/consultationRequest"

const REQUESTS_HREF = "/nurse/requests"
const DASHBOARD_LIMIT = 6

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

export function NurseRequestsPanel({
  access,
  summary,
}: {
  access: StaffAccess
  summary: RoleDashboardSummary
}) {
  const router = useRouter()
  const canApprove = can(access.designation, "requests.approve")
  const canDecline = can(access.designation, "requests.decline")
  const canReschedule = can(access.designation, "requests.reschedule")
  const canViewDetails = can(access.designation, "requests.view_patient_details")
  const [pendingView, startView] = useTransition()
  const [selectedRequest, setSelectedRequest] =
    useState<ConsultationRequest | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const rows = summary.requests.recent.slice(0, DASHBOARD_LIMIT)

  function openRequestView(requestId: string) {
    startView(async () => {
      const result = await fetchConsultationRequestByIdAction(requestId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setSelectedRequest(result.data)
      setSheetOpen(true)
    })
  }

  return (
    <>
      <ModuleSnapshot
        title="Request queue"
        href={REQUESTS_HREF}
        linkLabel="View all"
        badge={summary.requests.pendingCount}
        className="gap-0"
      >
        {rows.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            No consultation requests yet.
          </p>
        ) : (
          <div className="-mx-6 min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Patient</TableHead>
                  <TableHead className="hidden sm:table-cell">Service</TableHead>
                  <TableHead className="hidden md:table-cell">Preferred</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-6">
                      <div className="min-w-0 py-1">
                        <p className="font-medium">{row.patientName}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {row.studentId || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {row.service}
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {formatRequestDate(row.preferredDate)}{" "}
                      {row.preferredTime || ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[row.status]}>
                        {consultationRequestStatusLabel(row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex flex-wrap justify-end gap-1">
                        {canViewDetails ? (
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            disabled={pendingView}
                            onClick={() => openRequestView(row.id)}
                          >
                            View
                          </Button>
                        ) : null}
                        {canApprove && row.status === "pending" ? (
                          <Button
                            type="button"
                            size="xs"
                            disabled={pendingView}
                            onClick={() => openRequestView(row.id)}
                          >
                            Approve
                          </Button>
                        ) : null}
                        {canReschedule && row.status === "pending" ? (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            disabled={pendingView}
                            onClick={() => openRequestView(row.id)}
                          >
                            Reschedule
                          </Button>
                        ) : null}
                        {canDecline && row.status === "pending" ? (
                          <Button
                            type="button"
                            size="xs"
                            variant="destructive"
                            disabled={pendingView}
                            onClick={() => openRequestView(row.id)}
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
      </ModuleSnapshot>

      <ConsultationRequestDetailSheet
        request={selectedRequest}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) setSelectedRequest(null)
        }}
        canApprove={canApprove}
        canDecline={canDecline}
        canReschedule={canReschedule}
        onUpdated={(request) => {
          setSelectedRequest(request)
          router.refresh()
        }}
      />
    </>
  )
}
