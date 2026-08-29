"use client"

import { Badge } from "@/components/ui/badge"
import {
  consultationStatusLabel,
  normalizeConsultationStatus,
  type ConsultationStatus,
} from "@/types/consultation"
import { cn } from "@/lib/utils"

const statusVariant: Record<
  ConsultationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  waiting: "outline",
  ongoing: "secondary",
  completed: "default",
  cancelled: "destructive",
}

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
  const variant =
    statusVariant[key] ??
    (normalized === "Completed"
      ? "default"
      : normalized === "Ongoing"
        ? "secondary"
        : "outline")

  return (
    <Badge variant={variant} className={cn("capitalize", className)}>
      {normalized}
    </Badge>
  )
}
