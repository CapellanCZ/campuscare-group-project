"use client"

import {
  IconCalendarEvent,
  IconCheck,
  IconEye,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  consultationRequestStatusLabel,
  formatRequestPreferred,
} from "@/features/requests/lib/format"
import { displayConsultationLabel } from "@/lib/health/consultation-display"
import { consultationProviderLabel } from "@/lib/health/consultation-workflow"
import {
  appointmentRequestStatusDot,
  appointmentRequestStatusTone,
} from "@/lib/ui/status-badge-tone"
import type { AppointmentRequest } from "@/types/appointmentRequest"
import { cn } from "@/lib/utils"

export type RequestDialogMode =
  | "view"
  | "approve"
  | "reschedule"
  | "decline"
  | "admit"

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
  const preferred = formatRequestPreferred(
    request.preferredDate,
    request.preferredTime
  )

  const metaParts = [
    request.studentId || null,
    consultationProviderLabel(request.providerType),
    displayConsultationLabel(request.service, request.reason),
    preferred !== "—" ? preferred : null,
    request.queueNumber != null ? `#${request.queueNumber}` : null,
  ].filter(Boolean)

  const showApprove = canApprove && request.status === "pending"
  const showAdmit = canApprove && request.status === "waitlisted"
  const showReschedule =
    canReschedule &&
    (request.status === "pending" ||
      request.status === "waitlisted" ||
      request.status === "rescheduled")
  const showDecline =
    canDecline &&
    (request.status === "pending" || request.status === "waitlisted")
  const hasActions = showApprove || showAdmit || showReschedule || showDecline

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border px-6 py-4 last:border-b-0",
        "sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-medium text-foreground">
              {request.patientName}
            </p>
            <StatusBadge
              className="shrink-0"
              label={consultationRequestStatusLabel(request.status)}
              toneClassName={appointmentRequestStatusTone(request.status)}
              dotClassName={appointmentRequestStatusDot(request.status)}
            />
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {metaParts.join(" · ")}
          </p>
        </div>
        {canViewDetails ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="size-7 shrink-0 text-muted-foreground"
            aria-label={`View ${request.patientName}`}
            title="View details"
            onClick={() => onAction("view")}
          >
            <IconEye className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      {hasActions ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {showApprove ? (
            <Button
              type="button"
              size="icon-sm"
              className="size-7"
              aria-label="Approve"
              title="Approve"
              onClick={() => onAction("approve")}
            >
              <IconCheck className="size-3.5" aria-hidden />
            </Button>
          ) : null}
          {showAdmit ? (
            <Button
              type="button"
              size="icon-sm"
              className="size-7"
              aria-label="Admit"
              title="Admit"
              onClick={() => onAction("admit")}
            >
              <IconUserPlus className="size-3.5" aria-hidden />
            </Button>
          ) : null}
          {showReschedule ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="size-7"
              aria-label="Reschedule"
              title="Reschedule"
              onClick={() => onAction("reschedule")}
            >
              <IconCalendarEvent className="size-3.5" aria-hidden />
            </Button>
          ) : null}
          {showDecline ? (
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              className="size-7"
              aria-label="Decline"
              title="Decline"
              onClick={() => onAction("decline")}
            >
              <IconX className="size-3.5" aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
