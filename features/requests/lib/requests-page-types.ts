import type {
  AppointmentRequestListResult,
  AppointmentRequestStats,
} from "@/types/appointmentRequest"

export type RequestsPageBundle = {
  list: AppointmentRequestListResult
  stats: AppointmentRequestStats
}
