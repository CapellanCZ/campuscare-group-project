import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import type { ConsultationProviderType } from "@/lib/health/consultation-workflow"
import type { NurseIntakeInput } from "@/lib/health/types"
import { createClient } from "@/lib/supabase/server"

export type ConsultationLifecycleStatus =
  | "waiting"
  | "ongoing"
  | "completed"
  | "cancelled"

export type ConsultationVitals = {
  bpSystolic: number | null
  bpDiastolic: number | null
  heartRate: number | null
  temperatureC: number | null
  spo2: number | null
  heightCm: number | null
  weightKg: number | null
  respiratoryRate: number | null
}

export function formatClinicQueueCode(
  providerType: ConsultationProviderType,
  n: number
): string {
  const prefix = providerType === "dentist" ? "D" : "M"
  return `${prefix}-${String(n).padStart(3, "0")}`
}

export function vitalsFromIntake(intake: NurseIntakeInput): ConsultationVitals {
  return {
    bpSystolic: intake.bpSystolic ?? null,
    bpDiastolic: intake.bpDiastolic ?? null,
    heartRate: intake.heartRate ?? null,
    temperatureC: intake.temperatureC ?? null,
    spo2: intake.spo2 ?? null,
    heightCm: intake.heightCm ?? null,
    weightKg: intake.weightKg ?? null,
    respiratoryRate: intake.respiratoryRate ?? null,
  }
}

export function hasRequiredNurseVitals(vitals: ConsultationVitals): boolean {
  return (
    vitals.bpSystolic != null &&
    vitals.bpDiastolic != null &&
    vitals.heartRate != null
  )
}

export async function resolveClinicalPatientId(
  operationalPatientId: string | null | undefined,
  client?: SupabaseClient
): Promise<string | null> {
  if (!operationalPatientId) return null
  const supabase = client ?? (await createClient())

  const { data: operational } = await supabase
    .from("patients")
    .select(
      "id, full_name, student_id, employee_id, patient_type, email, phone, date_of_birth, sex"
    )
    .eq("id", operationalPatientId)
    .maybeSingle()

  if (!operational) return null

  const studentId = (operational.student_id as string | null)?.trim() || null
  const employeeId = (operational.employee_id as string | null)?.trim() || null
  const isFaculty = operational.patient_type === "faculty"

  let existing: { id: string } | null = null
  if (isFaculty && employeeId) {
    const { data } = await supabase
      .from("patient_records")
      .select("id")
      .eq("employee_id", employeeId)
      .maybeSingle()
    existing = data
  } else if (studentId) {
    const { data } = await supabase
      .from("patient_records")
      .select("id")
      .eq("student_id", studentId)
      .maybeSingle()
    existing = data
  }

  if (existing?.id) return existing.id

  const fullName = String(operational.full_name ?? "Patient").trim()
  const parts = fullName.split(/\s+/).filter(Boolean)
  const lastName = parts.at(-1) || "Unknown"
  const firstName = parts.slice(0, -1).join(" ") || lastName

  const { data: created, error } = await supabase
    .from("patient_records")
    .insert({
      patient_type: isFaculty ? "faculty" : "student",
      student_id: isFaculty ? null : studentId,
      employee_id: isFaculty ? employeeId : null,
      first_name: firstName,
      last_name: lastName,
      course: null,
      email: operational.email,
      phone: operational.phone,
      birth_date: operational.date_of_birth,
      gender: operational.sex,
    })
    .select("id")
    .single()

  if (error || !created?.id) return null
  return created.id as string
}

export async function assignClinicDoctorId(
  providerType: ConsultationProviderType,
  client?: SupabaseClient
): Promise<string | null> {
  const supabase = client ?? (await createClient())
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("primary_role", providerType)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()
  return (data?.id as string | undefined) ?? null
}

export async function ensureConsultationFromAppointment(params: {
  appointmentId: string
  ticketId?: string | null
  queueNumber?: number | null
  staffName: string
  client?: SupabaseClient
}): Promise<{ id: string; created: boolean } | { error: string }> {
  const supabase = params.client ?? (await createClient())

  const { data: existing } = await supabase
    .from("consultations")
    .select("id")
    .eq("appointment_id", params.appointmentId)
    .maybeSingle()

  if (existing?.id) {
    if (params.ticketId) {
      await linkTicketAndConsultation({
        supabase,
        ticketId: params.ticketId,
        consultationId: existing.id as string,
      })
    }
    return { id: existing.id as string, created: false }
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, patient_id, provider_type, reason, starts_at, doctor_id")
    .eq("id", params.appointmentId)
    .maybeSingle()

  if (!appt) return { error: "Appointment not found." }

  const providerType: ConsultationProviderType =
    appt.provider_type === "dentist" ? "dentist" : "physician"

  const clinicalPatientId = await resolveClinicalPatientId(
    appt.patient_id as string | null,
    supabase
  )
  if (!clinicalPatientId) {
    return { error: "Could not resolve a patient record for this appointment." }
  }

  const doctorId =
    (appt.doctor_id as string | null) ||
    (await assignClinicDoctorId(providerType, supabase))

  if (doctorId && !appt.doctor_id) {
    await supabase
      .from("appointments")
      .update({ doctor_id: doctorId, updated_at: new Date().toISOString() })
      .eq("id", params.appointmentId)
  }

  const { data: created, error } = await supabase
    .from("consultations")
    .insert({
      patient_id: clinicalPatientId,
      appointment_id: params.appointmentId,
      queue_ticket_id: params.ticketId ?? null,
      provider_type: providerType,
      station: "nurse",
      status: "waiting",
      priority: "Normal",
      chief_complaint: appt.reason,
      provider_name: params.staffName,
      provider_role: "nurse",
      consultation_date: appt.starts_at ?? new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      const { data: raced } = await supabase
        .from("consultations")
        .select("id")
        .eq("appointment_id", params.appointmentId)
        .maybeSingle()
      if (raced?.id) return { id: raced.id as string, created: false }
    }
    return { error: error.message }
  }

  if (params.ticketId) {
    await linkTicketAndConsultation({
      supabase,
      ticketId: params.ticketId,
      consultationId: created.id as string,
    })
  }

  return { id: created.id as string, created: true }
}

export async function ensureWalkInConsultation(params: {
  operationalPatientId: string | null
  providerType: ConsultationProviderType
  patientName: string
  chiefComplaint?: string | null
  staffName: string
  consultationDate?: string
  client?: SupabaseClient
}): Promise<{ id: string } | { error: string }> {
  const supabase = params.client ?? (await createClient())
  const clinicalPatientId = await resolveClinicalPatientId(
    params.operationalPatientId,
    supabase
  )
  if (!clinicalPatientId) {
    return { error: "Could not resolve a patient record for this walk-in." }
  }

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      patient_id: clinicalPatientId,
      appointment_id: null,
      provider_type: params.providerType,
      station: "nurse",
      status: "waiting",
      priority: "Normal",
      chief_complaint: params.chiefComplaint ?? "Walk-in consultation",
      provider_name: params.staffName,
      provider_role: "nurse",
      consultation_date: params.consultationDate ?? new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error || !data?.id) {
    return { error: error?.message || "Could not create walk-in consultation." }
  }
  return { id: data.id as string }
}

export async function setConsultationStatus(params: {
  consultationId: string
  status: ConsultationLifecycleStatus
  station?: "nurse" | "physician" | "dentist"
  providerName?: string
  providerRole?: string
  client?: SupabaseClient
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = params.client ?? (await createClient())
  const patch: Record<string, unknown> = {
    status: params.status,
    updated_at: new Date().toISOString(),
  }
  if (params.station) patch.station = params.station
  if (params.providerName) patch.provider_name = params.providerName
  if (params.providerRole) patch.provider_role = params.providerRole

  const { error } = await supabase
    .from("consultations")
    .update(patch)
    .eq("id", params.consultationId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function saveConsultationVitals(params: {
  consultationId: string
  vitals: ConsultationVitals
  chiefComplaint?: string | null
  notes?: string | null
  station: "physician" | "dentist"
  staffName: string
  client?: SupabaseClient
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = params.client ?? (await createClient())
  const { error } = await supabase
    .from("consultations")
    .update({
      vitals: params.vitals,
      chief_complaint: params.chiefComplaint || undefined,
      notes: params.notes || undefined,
      station: params.station,
      status: "waiting",
      provider_name: params.staffName,
      provider_role: "nurse",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.consultationId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function completeConsultationVisit(params: {
  consultationId: string
  symptoms?: string | null
  diagnosis?: string | null
  notes?: string | null
  prescription?: string | null
  assessment?: string | null
  treatment?: string | null
  followUpDate?: string | null
  providerName?: string
  providerRole?: "physician" | "dentist"
  client?: SupabaseClient
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = params.client ?? (await createClient())
  const now = new Date().toISOString()

  const { data: row, error: findError } = await supabase
    .from("consultations")
    .select("id, appointment_id, queue_ticket_id")
    .eq("id", params.consultationId)
    .maybeSingle()

  if (findError || !row) {
    return { ok: false, error: findError?.message || "Consultation not found." }
  }

  const { error } = await supabase
    .from("consultations")
    .update({
      symptoms: params.symptoms ?? undefined,
      diagnosis: params.diagnosis ?? undefined,
      notes: params.notes ?? undefined,
      prescription: params.prescription ?? undefined,
      assessment: params.assessment ?? undefined,
      treatment: params.treatment ?? undefined,
      follow_up_date: params.followUpDate ?? undefined,
      status: "completed",
      station: params.providerRole ?? undefined,
      provider_name: params.providerName,
      provider_role: params.providerRole,
      updated_at: now,
    })
    .eq("id", params.consultationId)

  if (error) return { ok: false, error: error.message }

  if (row.queue_ticket_id) {
    await supabase
      .from("health_queue_tickets")
      .update({ status: "completed", updated_at: now })
      .eq("id", row.queue_ticket_id)
  }

  if (row.appointment_id) {
    await supabase
      .from("appointments")
      .update({ status: "completed", updated_at: now })
      .eq("id", row.appointment_id)
  }

  return { ok: true }
}

export async function resolveConsultationIdForTicket(
  ticketId: string,
  client?: SupabaseClient
): Promise<string | null> {
  const supabase = client ?? (await createClient())

  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("consultation_id, consultation_request_id, appointment_id")
    .eq("id", ticketId)
    .maybeSingle()

  if (ticket?.consultation_id) return ticket.consultation_id as string

  const { data: byTicket } = await supabase
    .from("consultations")
    .select("id")
    .eq("queue_ticket_id", ticketId)
    .maybeSingle()
  if (byTicket?.id) {
    await linkTicketAndConsultation({
      supabase,
      ticketId,
      consultationId: byTicket.id as string,
    })
    return byTicket.id as string
  }

  if (ticket?.consultation_request_id) {
    const { data: byRequest } = await supabase
      .from("consultations")
      .select("id")
      .eq("consultation_request_id", ticket.consultation_request_id)
      .maybeSingle()
    if (byRequest?.id) {
      await linkTicketAndConsultation({
        supabase,
        ticketId,
        consultationId: byRequest.id as string,
      })
      return byRequest.id as string
    }
  }

  if (ticket?.appointment_id) {
    const { data: byAppointment } = await supabase
      .from("consultations")
      .select("id")
      .eq("appointment_id", ticket.appointment_id)
      .maybeSingle()
    if (byAppointment?.id) {
      await linkTicketAndConsultation({
        supabase,
        ticketId,
        consultationId: byAppointment.id as string,
      })
      return byAppointment.id as string
    }
  }

  return null
}

export async function linkTicketAndConsultation(params: {
  supabase: SupabaseClient
  ticketId: string
  consultationId: string
}) {
  const now = new Date().toISOString()
  await params.supabase
    .from("health_queue_tickets")
    .update({ consultation_id: params.consultationId, updated_at: now })
    .eq("id", params.ticketId)
  await params.supabase
    .from("consultations")
    .update({ queue_ticket_id: params.ticketId, updated_at: now })
    .eq("id", params.consultationId)
}

export { CAMPUS_CLINIC_ID }
