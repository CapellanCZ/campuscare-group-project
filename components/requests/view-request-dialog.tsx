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
import { displayConsultationLabel } from "@/lib/health/consultation-display"
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
        "grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-baseline sm:gap-4",
        className
      )}
    >
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase sm:text-sm sm:normal-case sm:tracking-normal sm:font-normal">
        {label}
      </dt>
      <dd className="min-w-0 text-sm font-medium break-words text-foreground">
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
      <DialogContent className="max-h-none gap-0 overflow-visible overscroll-auto p-0 sm:max-w-lg">
        <DialogHeader className="gap-3 border-b border-border px-6 pt-6 pr-14 pb-5 text-left">
          <div className="min-w-0 space-y-2">
            <DialogTitle className="text-xl leading-snug text-balance">
              {request.patientName}
            </DialogTitle>
            <DialogDescription className="text-sm">
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
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <span className="font-medium">Decline reason:</span>{" "}
              {request.cancellationReason?.trim() || "No reason was provided."}
            </p>
          ) : null}
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
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
                label="Recommendation"
                value="Come early and keep the scheduled date (queue #1–5)."
              />
            ) : null}
            {request.reason?.trim() &&
            request.reason.trim() !== serviceLabel &&
            !request.reason
              .trim()
              .toLowerCase()
              .startsWith("consultation request:") ? (
              <DetailRow label="Reason" value={request.reason} />
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
