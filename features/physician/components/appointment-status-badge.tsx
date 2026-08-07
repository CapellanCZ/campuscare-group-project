import { Badge } from "@/components/reui/badge"
import type { AppointmentStatus } from "@/features/physician/types"

const STATUS_VARIANT: Record<
  AppointmentStatus,
  "primary-light" | "success-light" | "warning-light" | "destructive-light" | "invert-light" | "info-light"
> = {
  pending: "warning-light",
  confirmed: "info-light",
  rescheduled: "invert-light",
  in_progress: "primary-light",
  completed: "success-light",
  cancelled: "destructive-light",
  no_show: "destructive-light",
  waitlisted: "warning-light",
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  waitlisted: "Waitlisted",
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} size="sm" radius="full">
      {STATUS_LABEL[status]}
    </Badge>
  )
}
