import type { QueueTicketRow } from "@/lib/health/types"

export type QueueTicketBookingDetail = {
  ticketId: string
  source: "appointment" | "consultation_request" | "walk_in" | "ticket"
  appointmentId: string | null
  consultationRequestId: string | null
  consultationId: string | null
  scheduledStartsAt: string | null
  preferredDate: string | null
  preferredTime: string | null
  reason: string | null
  service: string | null
  providerType: string | null
  appointmentStatus: string | null
  requestStatus: string | null
  doctorName: string | null
  patientEmail: string | null
  patientPhone: string | null
}

export type QueueTicketDetailSeed = Pick<
  QueueTicketRow,
  | "ticketId"
  | "appointmentId"
  | "consultationRequestId"
  | "consultationId"
  | "appointmentStartsAt"
  | "chiefComplaint"
  | "consultationType"
  | "service"
  | "providerType"
  | "patientId"
  | "campusId"
  | "studentId"
>

export function isWalkInTicketDetail(
  ticket: Pick<
    QueueTicketRow,
    "consultationType" | "appointmentId" | "consultationRequestId"
  >,
  booking: QueueTicketBookingDetail | null
): boolean {
  if (booking?.source === "walk_in") return true
  if (
    booking?.source === "appointment" ||
    booking?.source === "consultation_request"
  ) {
    return false
  }
  if (ticket.appointmentId || ticket.consultationRequestId) return false
  return (ticket.consultationType ?? "").toLowerCase().includes("walk")
}
