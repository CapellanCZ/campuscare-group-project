"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  consultationRequestStatusLabel,
  formatRequestDate,
} from "@/features/requests/lib/format"
import type { AppointmentRequest, AppointmentRequestStatus } from "@/types/appointmentRequest"
import { cn } from "@/lib/utils"

export type RequestDialogMode =
  | "view"
  | "approve"
  | "reschedule"
  | "decline"
  | "admit"

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

export function ConsultationRequestCard({
  request,
  canViewDetails,
  canApprove,
  canDecline,
  canReschedule,
  onAction,
}: {
  request: AppointmentRequest
  canViewDetails: boolean
  canApprove: boolean
  canDecline: boolean
  canReschedule: boolean
  onAction: (mode: RequestDialogMode) => void
}) {
  const preferred = [
    formatRequestDate(request.preferredDate),
    request.preferredTime || "",
  ]
    .filter(Boolean)
    .join(" ")

  const metaParts = [
    request.studentId || null,
    request.service,
    preferred || null,
    request.queueNumber != null ? `#${request.queueNumber}` : null,
  ].filter(Boolean)

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border px-6 py-4 last:border-b-0",
        "sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate font-medium text-foreground">
            {request.patientName}
          </p>
          <Badge variant={statusVariant[request.status]} className="shrink-0">
            {consultationRequestStatusLabel(request.status)}
          </Badge>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {metaParts.join(" · ")}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        {canViewDetails ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => onAction("view")}
          >
            View
          </Button>
        ) : null}
        {canApprove && request.status === "pending" ? (
          <Button type="button" size="xs" onClick={() => onAction("approve")}>
            Approve
          </Button>
        ) : null}
        {canApprove && request.status === "waitlisted" ? (
          <Button type="button" size="xs" onClick={() => onAction("admit")}>
            Admit
          </Button>
        ) : null}
        {canReschedule &&
        (request.status === "pending" ||
          request.status === "waitlisted" ||
          request.status === "rescheduled") ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => onAction("reschedule")}
          >
            Reschedule
          </Button>
        ) : null}
        {canDecline &&
        (request.status === "pending" || request.status === "waitlisted") ? (
          <Button
            type="button"
            size="xs"
            variant="destructive"
            onClick={() => onAction("decline")}
          >
            Decline
          </Button>
        ) : null}
      </div>
    </div>
  )
}
