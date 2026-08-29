"use client"

import Link from "next/link"

import { ConsultationStatusBadge } from "@/components/consultations/consultation-status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Consultation } from "@/types/consultation"
import { resolveConsultationProviderRole } from "@/types/consultation"

function formatConsultationDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Manila",
    })
  } catch {
    return iso.slice(0, 10)
  }
}

function providerLabel(row: Consultation): string {
  const role = resolveConsultationProviderRole(row)
  if (role === "dentist") return "Dentist"
  if (role === "physician") return "Physician"
  if (row.station === "nurse") return "Nurse"
  return row.providerName ?? "—"
}

function serviceLabel(row: Consultation): string {
  const role = resolveConsultationProviderRole(row)
  if (role === "dentist") return "Dental Consultation"
  if (role === "physician") return "General Consultation"
  return row.chiefComplaint?.trim() || "Consultation"
}

export function ConsultationListCard({
  row,
  onView,
  onComplete,
  showComplete,
  clinicianHref,
  className,
}: {
  row: Consultation
  onView?: () => void
  onComplete?: () => void
  showComplete?: boolean
  clinicianHref?: string
  className?: string
}) {
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-none",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{row.patient.fullName}</p>
          <p className="text-xs text-muted-foreground">{row.patient.studentId}</p>
        </div>
        <ConsultationStatusBadge status={row.status} />
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Service</dt>
          <dd className="font-medium">{serviceLabel(row)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Provider</dt>
          <dd className="font-medium">{providerLabel(row)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Date</dt>
          <dd>{formatConsultationDate(row.consultationDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Queue #</dt>
          <dd>{row.queueNumber ?? "—"}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {clinicianHref ? (
          <Button size="sm" render={<Link href={clinicianHref} />} nativeButton={false}>
            Open
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onView}>
            View
          </Button>
        )}
        {showComplete && onComplete ? (
          <Button size="sm" variant="secondary" onClick={onComplete}>
            Complete
          </Button>
        ) : null}
      </div>
    </article>
  )
}

export function formatConsultationTableDate(iso: string): string {
  return formatConsultationDate(iso)
}

export { providerLabel, serviceLabel }
