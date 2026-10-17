"use client"

import { StatusBadge } from "@/components/ui/status-badge"
import {
  consultationStatusDot,
  consultationStatusTone,
} from "@/lib/ui/status-badge-tone"
import {
  consultationStatusLabel,
  normalizeConsultationStatus,
} from "@/types/consultation"

type ConsultationStatusBadgeProps = {
  status: string
  className?: string
}

export function ConsultationStatusBadge({
  status,
  className,
}: ConsultationStatusBadgeProps) {
  const normalized = consultationStatusLabel(status)
  const key = normalizeConsultationStatus(status)

  return (
    <StatusBadge
      label={normalized}
      toneClassName={consultationStatusTone(key)}
      dotClassName={consultationStatusDot(key)}
      className={className}
    />
  )
}
