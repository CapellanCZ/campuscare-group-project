"use client"

import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  consultationRequestStatusLabel,
  formatRequestDate,
  formatRequestDateTime,
} from "@/features/requests/lib/format"
import type { AppointmentRequest } from "@/types/appointmentRequest"

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border/60 py-2.5 last:border-b-0">
      <dt className="w-36 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-foreground">{value || "—"}</dd>
    </div>
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

  const statusTone =
    request.status === "cancelled" || request.status === "no_show"
      ? "destructive"
      : request.status === "confirmed" || request.status === "completed"
        ? "default"
        : request.status === "waitlisted"
          ? "outline"
          : "secondary"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8">{request.patientName}</DialogTitle>
          <DialogDescription>
            {request.service} · {consultationRequestStatusLabel(request.status)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Badge variant={statusTone}>
            {consultationRequestStatusLabel(request.status)}
          </Badge>
          {request.status === "cancelled" ? (
            <p className="text-sm text-destructive">
              <span className="font-medium">Decline reason:</span>{" "}
              {request.cancellationReason?.trim() || "No reason was provided."}
            </p>
          ) : null}

          <dl>
            <DetailRow label="Student ID" value={request.studentId} />
            <DetailRow label="Email" value={request.email} />
            <DetailRow label="Phone" value={request.phone} />
            <DetailRow label="Service" value={request.service} />
            <DetailRow
              label="Provider type"
              value={
                request.providerType === "dentist" ? "Dentist" : "Physician"
              }
            />
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
            <DetailRow
              label="Preferred date"
              value={formatRequestDate(request.preferredDate)}
            />
            <DetailRow label="Preferred time" value={request.preferredTime} />
            <DetailRow label="Reason" value={request.reason} />
            <DetailRow
              label="Submitted"
              value={formatRequestDateTime(request.createdAt)}
            />
            <DetailRow label="Assigned doctor" value={request.doctorName} />
            <DetailRow label="Location" value={request.location} />
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  )
}
