import type { AppointmentRequestStatus } from "@/types/appointmentRequest"
import type { ConsultationStatus } from "@/types/consultation"

/** Shared clinic status colors — pending ≠ completed. */
export const STATUS_BADGE_TONE = {
  pending:
    "border-warning/40 bg-warning/15 text-warning-foreground dark:text-warning",
  completed:
    "border-success/30 bg-success/10 text-success dark:text-emerald-400",
  waiting: "border-border bg-muted/60 text-muted-foreground",
  ongoing: "border-primary/30 bg-primary/10 text-primary",
  confirmed: "border-primary/30 bg-primary/10 text-primary",
  in_progress: "border-primary/30 bg-primary/10 text-primary",
  waitlisted: "border-border bg-input/40 text-foreground",
  rescheduled: "border-border bg-input/40 text-foreground",
  cancelled: "border-destructive/40 bg-destructive/10 text-destructive",
  no_show: "border-destructive/40 bg-destructive/10 text-destructive",
  on_break:
    "border-warning/40 bg-warning/15 text-warning-foreground dark:text-warning",
} as const

export const STATUS_BADGE_DOT = {
  pending: "bg-warning",
  completed: "bg-success",
  waiting: "bg-muted-foreground/50",
  ongoing: "bg-primary",
  confirmed: "bg-primary",
  in_progress: "bg-primary",
  waitlisted: "bg-muted-foreground/50",
  rescheduled: "bg-muted-foreground/50",
  cancelled: "bg-destructive",
  no_show: "bg-destructive",
  on_break: "bg-warning",
} as const

export type StatusBadgeToneKey = keyof typeof STATUS_BADGE_TONE

export function consultationStatusTone(
  status: ConsultationStatus | string
): string {
  return STATUS_BADGE_TONE[status as StatusBadgeToneKey] ?? STATUS_BADGE_TONE.waiting
}

export function consultationStatusDot(
  status: ConsultationStatus | string
): string {
  return STATUS_BADGE_DOT[status as StatusBadgeToneKey] ?? STATUS_BADGE_DOT.waiting
}

export function appointmentRequestStatusTone(
  status: AppointmentRequestStatus | string
): string {
  const key = status as StatusBadgeToneKey
  return STATUS_BADGE_TONE[key] ?? STATUS_BADGE_TONE.waitlisted
}

export function appointmentRequestStatusDot(
  status: AppointmentRequestStatus | string
): string {
  const key = status as StatusBadgeToneKey
  return STATUS_BADGE_DOT[key] ?? STATUS_BADGE_DOT.waitlisted
}
