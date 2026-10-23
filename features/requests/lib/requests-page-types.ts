import type {
  AppointmentRequest,
  AppointmentRequestListResult,
  AppointmentRequestStats,
} from "@/types/appointmentRequest"

export type RequestsPageBundle = {
  list: AppointmentRequestListResult
  stats: AppointmentRequestStats
  /** Confirmed bookings for the sidebar — kept separate from the nurse triage list. */
  recentApproved: AppointmentRequest[]
}
