"use server"

import { revalidatePath } from "next/cache"

import {
  embedDentalChartInNotes,
  extractDentalChartFromNotes,
} from "@/features/dentist/data/visit-chart"
import {
  parseDentalPatientChart,
  type DentalPatientChart,
} from "@/features/dentist/types/dental-chart"
import { getStaffAccess } from "@/lib/auth/access"
import { createClient } from "@/lib/supabase/server"

export type DentalChartActionResult =
  | { ok: true; consultationId?: string | null }
  | { ok: false; error: string }

const DENTIST_PATHS = [
  "/dentist",
  "/dentist/dashboard",
  "/dentist/queue",
  "/dentist/consultations",
  "/dentist/patients",
]

function revalidateDentist(appointmentId: string) {
  for (const path of DENTIST_PATHS) {
    revalidatePath(path)
  }
  revalidatePath(`/dentist/consultation/${appointmentId}`)
}

async function requireDentist() {
  const access = await getStaffAccess()
  if (!access || access.primaryRole !== "dentist") {
    return null
  }
  return access
}

function toothSummary(chart: DentalPatientChart): string {
  const marks = Object.entries(chart.teeth)
    .filter(([, m]) => m.code)
    .map(([n, m]) => `#${n}=${m.code}`)
  return marks.length ? `Odontogram: ${marks.join(", ")}` : "Odontogram: no marks"
}

export async function claimDentalVisit(
  appointmentId: string
): Promise<DentalChartActionResult> {
  const access = await requireDentist()
  if (!access) {
    return { ok: false, error: "Unauthorized. Dentist access required." }
  }

  const supabase = await createClient()
  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("id, doctor_id, status, clinic_id, patient_id")
    .eq("id", appointmentId)
    .maybeSingle()

  if (error || !appointment) {
    return { ok: false, error: "Appointment not found." }
  }

  if (
    appointment.doctor_id &&
    appointment.doctor_id !== access.userId
  ) {
    return {
      ok: false,
      error: "This visit is assigned to another clinician.",
    }
  }

  if (
    appointment.status === "cancelled" ||
    appointment.status === "no_show" ||
    appointment.status === "completed"
  ) {
    return {
      ok: false,
      error: `Cannot start consultation for a ${String(appointment.status).replace("_", " ")} appointment.`,
    }
  }

  const { error: updateError } = await supabase
    .from("appointments")
    .update({
      status: "in_progress",
      doctor_id: access.userId,
      provider_type: "dentist",
    })
    .eq("id", appointmentId)

  if (updateError) return { ok: false, error: updateError.message }

  const { data: existing } = await supabase
    .from("appointment_consultations")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle()

  if (!existing) {
    await supabase.from("appointment_consultations").insert({
      appointment_id: appointmentId,
      clinic_id: appointment.clinic_id,
      doctor_id: access.userId,
      patient_id: appointment.patient_id,
      started_at: new Date().toISOString(),
    })
  }

  revalidateDentist(appointmentId)
  return { ok: true }
}

async function resolvePatientRecordId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string
): Promise<string | null> {
  const { data: patient } = await supabase
    .from("patients")
    .select("student_id, employee_id, patient_type")
    .eq("id", patientId)
    .maybeSingle()

  const campusId =
    patient?.patient_type === "faculty"
      ? (patient.employee_id ?? patient.student_id)
      : (patient?.student_id ?? null)

  if (!campusId?.trim()) return null

  const id = campusId.trim()
  const { data: record } = await supabase
    .from("patient_records")
    .select("id")
    .or(`student_id.eq.${id},employee_id.eq.${id}`)
    .maybeSingle()

  return (record?.id as string | null) ?? null
}

async function upsertStaffConsultation(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  patientRecordId: string
  appointmentId: string
  queueTicketId: string | null
  chart: DentalPatientChart
  providerName: string
  complete: boolean
}): Promise<string | null> {
  const {
    supabase,
    patientRecordId,
    appointmentId,
    queueTicketId,
    chart,
    providerName,
    complete,
  } = params

  const chartNote = `dental_appointment_id=${appointmentId}`
  const payload = {
    patient_id: patientRecordId,
    chief_complaint: chart.clinical.chiefComplaint || null,
    symptoms: chart.clinical.caseHistory || null,
    assessment: toothSummary(chart),
    diagnosis: chart.diagnosis || null,
    treatment: chart.treatmentNotes || null,
    prescription: chart.prescription || null,
    provider_name: providerName,
    provider_role: "dentist",
    provider_type: "dentist" as const,
    station: "dentist",
    status: complete ? "completed" : "ongoing",
    priority: "Normal",
    consultation_date: new Date().toISOString(),
    notes: chartNote,
    queue_ticket_id: queueTicketId,
    appointment_id: appointmentId,
  }

  const { data: existing } = await supabase
    .from("consultations")
    .select("id")
    .eq("notes", chartNote)
    .maybeSingle()

  let consultationId: string | null = null

  if (existing?.id) {
    consultationId = existing.id as string
  } else if (queueTicketId) {
    const { data: byTicket } = await supabase
      .from("consultations")
      .select("id")
      .eq("queue_ticket_id", queueTicketId)
      .eq("station", "dentist")
      .maybeSingle()

    if (byTicket?.id) {
      consultationId = byTicket.id as string
    }
  }

  if (consultationId) {
    await supabase
      .from("consultations")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", consultationId)
  } else {
    const { data: inserted, error } = await supabase
      .from("consultations")
      .insert(payload)
      .select("id")
      .single()

    if (error) return null
    consultationId = (inserted?.id as string | undefined) ?? null
  }

  if (complete && consultationId) {
    await supabase
      .from("patient_records")
      .update({ last_visit: new Date().toISOString().slice(0, 10) })
      .eq("id", patientRecordId)
  }

  return consultationId
}

export async function saveDentalPatientChart(input: {
  appointmentId: string
  chart: DentalPatientChart
  complete?: boolean
}): Promise<DentalChartActionResult> {
  const access = await requireDentist()
  if (!access) {
    return { ok: false, error: "Unauthorized. Dentist access required." }
  }

  const parsed = parseDentalPatientChart(input.chart)
  if (!parsed) {
    return { ok: false, error: "Invalid dental chart payload." }
  }

  const supabase = await createClient()

  const { data: appointment, error: aptError } = await supabase
    .from("appointments")
    .select("id, doctor_id, clinic_id, patient_id, status, queue_ticket_id")
    .eq("id", input.appointmentId)
    .maybeSingle()

  if (aptError || !appointment) {
    return { ok: false, error: "Appointment not found." }
  }

  if (
    appointment.doctor_id &&
    appointment.doctor_id !== access.userId
  ) {
    return {
      ok: false,
      error: "This visit is assigned to another clinician.",
    }
  }

  const complete = Boolean(input.complete)
  const humanNotes = [
    parsed.clinical.caseHistory.trim() &&
      `Case history: ${parsed.clinical.caseHistory.trim()}`,
    parsed.treatmentNotes.trim() &&
      `Treatment: ${parsed.treatmentNotes.trim()}`,
    toothSummary(parsed),
  ]
    .filter(Boolean)
    .join("\n")

  const clinicalNotes = embedDentalChartInNotes(parsed, humanNotes)

  // Prefer dedicated column; fall back to notes-only if migration not applied.
  const chartUpdate = await supabase
    .from("appointments")
    .update({
      dental_chart: parsed,
      doctor_id: access.userId,
      provider_type: "dentist",
      ...(complete ? { status: "completed" } : { status: "in_progress" }),
    })
    .eq("id", input.appointmentId)

  if (chartUpdate.error?.message?.includes("dental_chart")) {
    const fallback = await supabase
      .from("appointments")
      .update({
        doctor_id: access.userId,
        provider_type: "dentist",
        ...(complete ? { status: "completed" } : { status: "in_progress" }),
      })
      .eq("id", input.appointmentId)
    if (fallback.error) return { ok: false, error: fallback.error.message }
  } else if (chartUpdate.error) {
    return { ok: false, error: chartUpdate.error.message }
  }

  const symptoms = parsed.clinical.chiefComplaint.trim()
  const diagnosis = parsed.diagnosis.trim()
  const prescription = parsed.prescription.trim()

  const { data: existing } = await supabase
    .from("appointment_consultations")
    .select("id, clinical_notes")
    .eq("appointment_id", input.appointmentId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from("appointment_consultations")
      .update({
        symptoms,
        diagnosis,
        clinical_notes: clinicalNotes,
        prescription,
        doctor_id: access.userId,
        ...(complete ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("appointment_id", input.appointmentId)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from("appointment_consultations").insert({
      appointment_id: input.appointmentId,
      clinic_id: appointment.clinic_id,
      doctor_id: access.userId,
      patient_id: appointment.patient_id,
      started_at: new Date().toISOString(),
      symptoms,
      diagnosis,
      clinical_notes: clinicalNotes,
      prescription,
      ...(complete ? { completed_at: new Date().toISOString() } : {}),
    })
    if (error) return { ok: false, error: error.message }
  }

  let ticketId = (appointment.queue_ticket_id as string | null) ?? null
  if (!ticketId) {
    const { data: ticket } = await supabase
      .from("health_queue_tickets")
      .select("id")
      .eq("appointment_id", input.appointmentId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    ticketId = ticket?.id ?? null
  }

  if (complete && ticketId) {
    await supabase
      .from("health_queue_tickets")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
  }

  const patientRecordId = await resolvePatientRecordId(
    supabase,
    appointment.patient_id as string
  )
  let consultationId: string | null = null
  if (patientRecordId) {
    consultationId = await upsertStaffConsultation({
      supabase,
      patientRecordId,
      appointmentId: input.appointmentId,
      queueTicketId: ticketId,
      chart: parsed,
      providerName: access.fullName,
      complete,
    })
  }

  revalidateDentist(input.appointmentId)
  return { ok: true, consultationId }
}

/** Verify a saved chart can be reloaded (used after complete). */
export async function peekSavedDentalChart(
  appointmentId: string
): Promise<DentalChartActionResult & { hasChart?: boolean }> {
  const access = await requireDentist()
  if (!access) {
    return { ok: false, error: "Unauthorized. Dentist access required." }
  }

  const supabase = await createClient()
  const withChart = await supabase
    .from("appointments")
    .select("dental_chart")
    .eq("id", appointmentId)
    .maybeSingle()

  if (!withChart.error && parseDentalPatientChart(withChart.data?.dental_chart)) {
    return { ok: true, hasChart: true }
  }

  const { data: consult } = await supabase
    .from("appointment_consultations")
    .select("clinical_notes")
    .eq("appointment_id", appointmentId)
    .maybeSingle()

  return {
    ok: true,
    hasChart: Boolean(extractDentalChartFromNotes(consult?.clinical_notes)),
  }
}
