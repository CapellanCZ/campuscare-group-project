"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  consultationRequestStatusLabel,
  formatRequestDate,
  formatRequestDateTime,
  formatRequestTime12h,
} from "@/features/requests/lib/format"
import {
  displayConsultationLabel,
  normalizeConsultationReason,
} from "@/lib/health/consultation-display"
import {
  appointmentRequestStatusDot,
  appointmentRequestStatusTone,
} from "@/lib/ui/status-badge-tone"
import { cn } from "@/lib/utils"
import type { AppointmentRequest } from "@/types/appointmentRequest"

function DetailRow({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-0.5 px-3 py-2.5 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-baseline sm:gap-3 sm:px-4 sm:py-3 md:grid-cols-[8.5rem_minmax(0,1fr)] md:gap-4",
        className
      )}
    >
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase sm:text-xs sm:normal-case sm:tracking-normal sm:font-normal md:text-sm">
        {label}
      </dt>
      <dd className="min-w-0 text-sm font-medium break-words [overflow-wrap:anywhere] text-foreground">
        {value || "—"}
      </dd>
    </div>
  )
}

function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {title}
      </h3>
      <dl className="overflow-hidden rounded-xl border border-border divide-y divide-border bg-background">
        {children}
      </dl>
    </section>
  )
}

export function ViewRequestDialog({
  open,
  onOpenChange,
  request,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: AppointmentRequest | null
}) {
  if (!request) return null

  const serviceLabel = displayConsultationLabel(request.service, request.reason)
  const preferredTime =
    formatRequestTime12h(request.preferredTime) || request.preferredTime || "—"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 gap-2 border-b border-border px-4 pt-5 pr-12 pb-4 text-left sm:gap-3 sm:px-6 sm:pt-6 sm:pr-14 sm:pb-5">
          <div className="min-w-0 space-y-1.5 sm:space-y-2">
            <DialogTitle className="text-lg leading-snug text-balance sm:text-xl">
              {request.patientName}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {serviceLabel}
              {request.providerType === "dentist"
                ? " · Dentist"
                : " · Physician"}
            </DialogDescription>
            <StatusBadge
              label={consultationRequestStatusLabel(request.status)}
              toneClassName={appointmentRequestStatusTone(request.status)}
              dotClassName={appointmentRequestStatusDot(request.status)}
            />
          </div>
          {request.status === "cancelled" ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive sm:text-sm">
              <span className="font-medium">Decline reason:</span>{" "}
              {request.cancellationReason?.trim() || "No reason was provided."}
            </p>
          ) : null}
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4 sm:gap-5 sm:px-6 sm:py-5">
          <DetailSection title="Patient information">
            <DetailRow label="Student ID" value={request.studentId} />
            <DetailRow label="Email" value={request.email} />
            <DetailRow label="Phone" value={request.phone} />
          </DetailSection>

          <DetailSection title="Consultation details">
            <DetailRow
              label="Preferred date"
              value={formatRequestDate(request.preferredDate)}
            />
            <DetailRow label="Preferred time" value={preferredTime} />
            <DetailRow
              label="Queue number"
              value={
                request.queueNumber != null ? String(request.queueNumber) : "—"
              }
            />
            {request.recommendComeEarly ? (
              <DetailRow
                label="Queue tip"
                value="Auto tip for early slots (queue #1–5): suggest the student arrive early and keep this date."
              />
            ) : null}
            {normalizeConsultationReason(request.reason) ? (
              <DetailRow
                label="Reason"
                value={normalizeConsultationReason(request.reason)}
              />
            ) : null}
            <DetailRow
              label="Submitted"
              value={formatRequestDateTime(request.createdAt)}
            />
            <DetailRow label="Assigned doctor" value={request.doctorName} />
          </DetailSection>
        </div>
      </DialogContent>
    </Dialog>
  )
}
