import "server-only"

import type { ClinicalVisitWorkspace } from "@/features/clinical/data/load-consultation-workspace"
import { loadConsultationWorkspace } from "@/features/clinical/data/load-consultation-workspace"
import {
  nurseVitalsFromConsultationJson,
  nurseVitalsFromTicket,
} from "@/features/physician/data/visit-chart"
import { getStaffAccess } from "@/lib/auth/access"
import { can } from "@/lib/auth/permissions"
import {
  ensureConsultationFromAppointment,
  ensureWalkInConsultation,
  linkTicketAndConsultation,
} from "@/lib/health/consultation-lifecycle"
import { createClient } from "@/lib/supabase/server"
import { PATIENT_RECORD_SELECT_COLUMNS } from "@/lib/students/patient-record-select"
import {
  patientCampusId,
  patientFullName,
  patientRecordFromJson,
} from "@/types/patientRecord"

/**
 * Ensure a `consultations` row exists for this dental appointment so official
 * prescriptions (medical documents) can be issued from the dental chart.
 */
export async function ensureDentalDocumentWorkspace(
  appointmentId: string
): Promise<
  | { ok: true; data: ClinicalVisitWorkspace }
  | { ok: false; error: string }
> {
  const access = await getStaffAccess()
  if (!access || access.primaryRole !== "dentist") {
    return { ok: false, error: "Dentist access required." }
  }
  if (!can(access.designation, "certificates.generate")) {
    return {
      ok: false,
      error: "You do not have permission to issue prescriptions.",
    }
  }

  const supabase = await createClient()

  const { data: appointment, error: aptError } = await supabase
    .from("appointments")
    .select("id, patient_id, reason, queue_ticket_id, status")
    .eq("id", appointmentId)
    .maybeSingle()

  if (aptError || !appointment) {
    return { ok: false, error: "Appointment not found." }
  }

  let consultationId: string | null = null

  const { data: byAppointment } = await supabase
    .from("consultations")
    .select("id")
    .eq("appointment_id", appointmentId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  consultationId = (byAppointment?.id as string | undefined) ?? null

  let ticketId = (appointment.queue_ticket_id as string | null) ?? null
  if (!ticketId) {
    const { data: ticket } = await supabase
      .from("health_queue_tickets")
      .select("id, consultation_id, patient_id, patient_name, chief_complaint")
      .eq("appointment_id", appointmentId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    ticketId = (ticket?.id as string | undefined) ?? null
    if (!consultationId && ticket?.consultation_id) {
      consultationId = ticket.consultation_id as string
    }
  } else if (!consultationId) {
    const { data: ticket } = await supabase
      .from("health_queue_tickets")
      .select("consultation_id")
      .eq("id", ticketId)
      .maybeSingle()
    consultationId = (ticket?.consultation_id as string | undefined) ?? null
  }

  if (!consultationId) {
    const ensured = await ensureConsultationFromAppointment({
      appointmentId,
      ticketId,
      staffName: access.fullName,
      client: supabase,
    })
    if ("error" in ensured) {
      // Walk-in path when appointment has no pre-linked consultation patient row.
      const { data: ticket } = ticketId
        ? await supabase
            .from("health_queue_tickets")
            .select("patient_id, patient_name, chief_complaint")
            .eq("id", ticketId)
            .maybeSingle()
        : { data: null }

      const walkIn = await ensureWalkInConsultation({
        operationalPatientId:
          (ticket?.patient_id as string | null) ??
          (appointment.patient_id as string | null),
        providerType: "dentist",
        patientName:
          (ticket?.patient_name as string | null) ??
          "Dental patient",
        chiefComplaint:
          (ticket?.chief_complaint as string | null) ??
          (appointment.reason as string | null) ??
          "Dental consultation",
        staffName: access.fullName,
        client: supabase,
      })
      if ("error" in walkIn) {
        return { ok: false, error: ensured.error || walkIn.error }
      }
      consultationId = walkIn.id
      await supabase
        .from("consultations")
        .update({
          appointment_id: appointmentId,
          provider_type: "dentist",
          station: "dentist",
          provider_role: "dentist",
          status: "ongoing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", consultationId)
      if (ticketId) {
        await linkTicketAndConsultation({
          supabase,
          ticketId,
          consultationId,
        })
      }
    } else {
      consultationId = ensured.id
    }
  } else {
    await supabase
      .from("consultations")
      .update({
        appointment_id: appointmentId,
        provider_type: "dentist",
        station: "dentist",
        updated_at: new Date().toISOString(),
      })
      .eq("id", consultationId)
      .is("appointment_id", null)
  }

  try {
    const workspace = await loadConsultationWorkspace(
      consultationId,
      "dentist"
    )
    return { ok: true, data: workspace }
  } catch {
    // Fallback when loadConsultationWorkspace notFound's due to role/provider mismatch.
    const { data: row } = await supabase
      .from("consultations")
      .select(
        `
        id,
        status,
        chief_complaint,
        consultation_date,
        symptoms,
        diagnosis,
        assessment,
        prescription,
        treatment,
        follow_up_date,
        appointment_id,
        patient_id,
        vitals,
        queue_ticket_id,
        patient_records (
          id,
          first_name,
          last_name,
          student_id,
          employee_id,
          patient_type
        )
      `
      )
      .eq("id", consultationId)
      .maybeSingle()

    if (!row) {
      return { ok: false, error: "Could not open a consultation for prescriptions." }
    }

    const patientJoin = Array.isArray(row.patient_records)
      ? row.patient_records[0]
      : row.patient_records
    let medicalRecord = null
    if (patientJoin?.id) {
      const { data: recordRow } = await supabase
        .from("patient_records")
        .select(PATIENT_RECORD_SELECT_COLUMNS)
        .eq("id", patientJoin.id as string)
        .maybeSingle()
      if (recordRow) medicalRecord = patientRecordFromJson(recordRow)
    }

    const patientName = medicalRecord
      ? patientFullName(medicalRecord)
      : [patientJoin?.first_name, patientJoin?.last_name]
          .filter(Boolean)
          .join(" ") || "Patient"

    let nurseVitals = nurseVitalsFromConsultationJson(
      row.vitals as Record<string, unknown> | null
    )
    if (
      !nurseVitals.bloodPressure &&
      !nurseVitals.pulseRate &&
      row.queue_ticket_id
    ) {
      const { data: vitalsRow } = await supabase
        .from("health_queue_tickets")
        .select(
          `
          vitals_bp_systolic,
          vitals_bp_diastolic,
          vitals_heart_rate,
          vitals_temperature_c,
          vitals_spo2,
          vitals_height_cm,
          vitals_weight_kg
        `
        )
        .eq("id", row.queue_ticket_id as string)
        .maybeSingle()
      if (vitalsRow) nurseVitals = nurseVitalsFromTicket(vitalsRow)
    }

    const workspace: ClinicalVisitWorkspace = {
      consultationId,
      role: "dentist",
      status: (row.status as string) ?? "ongoing",
      chiefComplaint: row.chief_complaint as string | null,
      consultationDate:
        (row.consultation_date as string) ?? new Date().toISOString(),
      symptoms: row.symptoms as string | null,
      diagnosis: row.diagnosis as string | null,
      assessment: row.assessment as string | null,
      prescription: row.prescription as string | null,
      treatment: (row.treatment as string | null) ?? null,
      followUpDate: (row.follow_up_date as string | null) ?? null,
      appointmentId: appointmentId,
      patientName,
      campusId: medicalRecord ? patientCampusId(medicalRecord) : null,
      patientRecordId: row.patient_id as string,
      priorRecordsCount: 0,
      medicalRecord,
      nurseVitals,
      dashboardPath: "/dentist/dashboard",
      canIssueDocuments: true,
    }
    return { ok: true, data: workspace }
  }
}
