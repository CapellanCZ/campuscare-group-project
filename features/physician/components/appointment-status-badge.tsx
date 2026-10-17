import { StatusBadge } from "@/components/ui/status-badge"
import type { AppointmentStatus } from "@/features/physician/types"
import {
  STATUS_BADGE_DOT,
  STATUS_BADGE_TONE,
  type StatusBadgeToneKey,
} from "@/lib/ui/status-badge-tone"

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
  waitlisted: "Waitlisted",
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const toneKey = status as StatusBadgeToneKey
  return (
    <StatusBadge
      label={STATUS_LABEL[status]}
      toneClassName={STATUS_BADGE_TONE[toneKey] ?? STATUS_BADGE_TONE.waitlisted}
      dotClassName={STATUS_BADGE_DOT[toneKey] ?? STATUS_BADGE_DOT.waitlisted}
    />
  )
}
