"use client"

import type { ComponentType } from "react"
import {
  IconCalendarEvent,
  IconCheck,
  IconClipboardText,
  IconDental,
  IconEye,
  IconHash,
  IconStethoscope,
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

function MetaChip({
  icon: Icon,
  label,
  className,
}: {
  icon: ComponentType<{ className?: string; stroke?: number }>
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground",
        className
      )}
    >
      <Icon className="size-3.5 shrink-0 opacity-70" stroke={1.75} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  )
}

export type RequestDialogMode =
  | "view"
  | "approve"
  | "reschedule"
  | "decline"
  | "admit"

export function ConsultationRequestCard({
  request,
  index,
  canViewDetails,
  canApprove,
  canDecline,
  canReschedule,
  onAction,
}: {
  request: AppointmentRequest
  /** 1-based row number shown at the far left. */
  index?: number
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
  const serviceLabel = displayConsultationLabel(
    request.service,
    request.reason
  )
  const specialtyLabel = consultationProviderLabel(request.providerType)
  const SpecialtyIcon =
    request.providerType === "dentist" ? IconDental : IconStethoscope

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
  const hasActions =
    canViewDetails || showApprove || showAdmit || showReschedule || showDecline

  return (
    <div
      className={cn(
        // No per-row border — parent uses divide-y so a single item has no
        // bottom line doubling the card/panel frame.
        "flex flex-col gap-2.5 px-4 py-3.5 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {typeof index === "number" ? (
          <span
            className="w-6 shrink-0 pt-0.5 text-sm tabular-nums text-muted-foreground"
            aria-hidden
          >
            {index}.
          </span>
        ) : null}
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
            {request.queueNumber != null ? (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-background px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground"
                title={`Queue number ${request.queueNumber}`}
              >
                <IconHash className="size-3.5 text-muted-foreground" stroke={1.75} aria-hidden />
                {request.queueNumber}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <MetaChip icon={SpecialtyIcon} label={specialtyLabel} />
            {serviceLabel !== "—" ? (
              <MetaChip icon={IconClipboardText} label={serviceLabel} />
            ) : null}
            {preferred !== "—" ? (
              <MetaChip icon={IconCalendarEvent} label={preferred} />
            ) : null}
          </div>
        </div>
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
          {canViewDetails ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="size-7 border-border/70 bg-background text-muted-foreground"
              aria-label={`View ${request.patientName}`}
              title="View details"
              onClick={() => onAction("view")}
            >
              <IconEye className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
