"use client"

import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"

export const DUTY_REFRESH_EVENT = "campuscare:duty-refresh"

export function emitDutyRefresh() {
  window.dispatchEvent(new CustomEvent(DUTY_REFRESH_EVENT))
}

/** Subscribes to duty/break tables and notifies shell providers to refresh. */
export function StaffRealtimeShell() {
  useStaffRealtimeRefresh(
    "staff-shell-duty",
    STAFF_REALTIME_TABLES.duty,
    emitDutyRefresh
  )
  return null
}
