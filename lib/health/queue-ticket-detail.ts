import "server-only"

import { createClient } from "@/lib/supabase/server"
import { manilaPreferredStartsAtIso } from "@/lib/health/appointment-queue-eligibility"
import type {
  QueueTicketBookingDetail,
  QueueTicketDetailSeed,
} from "@/lib/health/queue-ticket-detail-types"

export type {
  QueueTicketBookingDetail,
  QueueTicketDetailSeed,
} from "@/lib/health/queue-ticket-detail-types"

function blankDetail(ticket: QueueTicketDetailSeed): QueueTicketBookingDetail {
  const isWalkIn = (ticket.consultationType ?? "")
    .toLowerCase()
    .includes("walk")
  return {
    ticketId: ticket.ticketId,
    source: isWalkIn
      ? "walk_in"
      : ticket.appointmentId
        ? "appointment"
        : ticket.consultationRequestId
          ? "consultation_request"
          : "ticket",
    appointmentId: ticket.appointmentId,
    consultationRequestId: ticket.consultationRequestId,
    consultationId: ticket.consultationId,
    scheduledStartsAt: ticket.appointmentStartsAt,
    preferredDate: null,
    preferredTime: null,
    reason: ticket.chiefComplaint,
    service: ticket.service ?? ticket.consultationType,
    providerType: ticket.providerType,
    appointmentStatus: null,
    requestStatus: null,
    doctorName: null,
    patientEmail: null,
    patientPhone: null,
  }
}

async function loadPatientContact(params: {
  patientId: string | null
  campusId: string | null
  studentId: string | null
}): Promise<{ email: string | null; phone: string | null }> {
  const supabase = await createClient()
  const empty = { email: null, phone: null }

  if (params.patientId) {
    const { data } = await supabase
      .from("patient_records")
      .select("email, phone")
      .eq("id", params.patientId)
      .maybeSingle()
    if (data) {
      return {
        email: (data.email as string | null)?.trim() || null,
        phone: (data.phone as string | null)?.trim() || null,
      }
    }
  }

  const idLookup = (params.campusId || params.studentId || "").trim()
  if (!idLookup) return empty

  const { data: byStudent } = await supabase
    .from("patient_records")
    .select("email, phone")
    .eq("student_id", idLookup)
    .limit(1)
    .maybeSingle()
  if (byStudent) {
    return {
      email: (byStudent.email as string | null)?.trim() || null,
      phone: (byStudent.phone as string | null)?.trim() || null,
    }
  }

  const { data: byEmployee } = await supabase
    .from("patient_records")
    .select("email, phone")
    .eq("employee_id", idLookup)
    .limit(1)
    .maybeSingle()
  if (byEmployee) {
    return {
      email: (byEmployee.email as string | null)?.trim() || null,
      phone: (byEmployee.phone as string | null)?.trim() || null,
    }
  }

  return empty
}

/**
 * Enrich a queue ticket with booking / consultation-request fields.
 * Local ticket remains the UI seed; this fills gaps from appointments + requests
 * and patient contact from patient records.
 */
export async function fetchQueueTicketBookingDetail(
  ticket: QueueTicketDetailSeed
): Promise<QueueTicketBookingDetail> {
  const base = blankDetail(ticket)
  const supabase = await createClient()

  let next = { ...base }

  if (ticket.appointmentId) {
    const { data: appt } = await supabase
      .from("appointments")
      .select(
        "id, status, starts_at, reason, provider_type, doctor_id, doctor:users!doctor_id(full_name)"
      )
      .eq("id", ticket.appointmentId)
      .maybeSingle()

    if (appt) {
      const doctor = Array.isArray(appt.doctor) ? appt.doctor[0] : appt.doctor
      next = {
        ...next,
        source: "appointment",
        appointmentId: String(appt.id),
        scheduledStartsAt:
          (appt.starts_at as string | null) ?? next.scheduledStartsAt,
        reason: (appt.reason as string | null) ?? next.reason,
        providerType:
          (appt.provider_type as string | null) ?? next.providerType,
        appointmentStatus: (appt.status as string | null) ?? null,
        doctorName:
          (doctor as { full_name?: string | null } | null)?.full_name ?? null,
      }
    }
  }

  if (ticket.consultationRequestId) {
    const { data: req } = await supabase
      .from("consultation_requests")
      .select(
        "id, status, preferred_date, preferred_time, reason, service, provider_type, email, phone, doctor_name"
      )
      .eq("id", ticket.consultationRequestId)
      .maybeSingle()

    if (req) {
      const preferredIso = manilaPreferredStartsAtIso(
        req.preferred_date as string | null,
        req.preferred_time as string | null
      )
      next = {
        ...next,
        source:
          next.source === "appointment" ? "appointment" : "consultation_request",
        consultationRequestId: String(req.id),
        preferredDate: (req.preferred_date as string | null) ?? null,
        preferredTime: (req.preferred_time as string | null) ?? null,
        scheduledStartsAt: next.scheduledStartsAt ?? preferredIso,
        reason: (req.reason as string | null) ?? next.reason,
        service: (req.service as string | null) ?? next.service,
        providerType:
          (req.provider_type as string | null) ?? next.providerType,
        requestStatus: (req.status as string | null) ?? null,
        doctorName: (req.doctor_name as string | null) ?? next.doctorName,
        patientEmail: (req.email as string | null)?.trim() || null,
        patientPhone: (req.phone as string | null)?.trim() || null,
      }
    }
  }

  if (!next.patientEmail || !next.patientPhone) {
    const contact = await loadPatientContact({
      patientId: ticket.patientId,
      campusId: ticket.campusId,
      studentId: ticket.studentId,
    })
    next = {
      ...next,
      patientEmail: next.patientEmail || contact.email,
      patientPhone: next.patientPhone || contact.phone,
    }
  }

  return next
}
