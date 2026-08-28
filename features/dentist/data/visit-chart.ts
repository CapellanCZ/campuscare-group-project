import "server-only"

import { nurseVitalsFromTicket } from "@/features/physician/data/visit-chart"
import type { NurseVisitVitals } from "@/features/physician/types-visit"
import {
  emptyDentalPatientChart,
  parseDentalPatientChart,
  type DentalPatientChart,
} from "@/features/dentist/types/dental-chart"
import { createClient } from "@/lib/supabase/server"
import { ensurePatientFromStudentId } from "@/lib/students/ensure-patient"
import { PATIENT_RECORD_SELECT_COLUMNS } from "@/lib/students/patient-record-select"
import {
  patientAgeYears,
  patientCampusId,
  patientFullName,
  patientRecordFromJson,
  type PatientRecord,
} from "@/types/patientRecord"

export const DENTAL_CHART_NOTE_PREFIX = "__DENTAL_CHART_V1__"

export type DentalVisitChartData = {
  chart: DentalPatientChart
  record: PatientRecord | null
  nurseVitals: NurseVisitVitals
  appointmentStatus: string | null
  patientName: string
  campusId: string | null
  queueTicketId: string | null
}

function seedDemographics(
  record: PatientRecord | null,
  fallback: {
    name: string
    campusId: string | null
    phone: string | null
    sex: string | null
    chiefComplaint: string | null
    bloodPressure: string
  }
): DentalPatientChart {
  const chart = emptyDentalPatientChart()
  const age = record ? patientAgeYears(record.birthDate) : null

  chart.demographics = {
    name: record ? patientFullName(record) : fallback.name,
    age: age != null ? String(age) : "",
    sex: record?.gender?.trim() || fallback.sex?.trim() || "",
    civilStatus: record?.civilStatus?.trim() || "",
    studentId: record
      ? patientCampusId(record) ?? ""
      : fallback.campusId?.trim() || "",
    yearLevel: record?.yearLevel?.trim() || "",
    strandProgram: record?.course?.trim() || "",
    section: "",
    officeAddress: record?.address?.trim() || "",
    telNo: record?.phone?.trim() || fallback.phone?.trim() || "",
  }

  if (fallback.chiefComplaint?.trim()) {
    chart.clinical.chiefComplaint = fallback.chiefComplaint.trim()
  }
  if (fallback.bloodPressure) {
    chart.clinical.bloodPressure = fallback.bloodPressure
  }
  if (record?.allergies?.trim()) {
    chart.clinical.allergy = record.allergies.trim()
  }

  return chart
}

export function embedDentalChartInNotes(
  chart: DentalPatientChart,
  humanNotes: string
): string {
  return `${DENTAL_CHART_NOTE_PREFIX}\n${JSON.stringify(chart)}\n\n${humanNotes}`.trim()
}

export function extractDentalChartFromNotes(
  notes: string | null | undefined
): DentalPatientChart | null {
  if (!notes?.startsWith(DENTAL_CHART_NOTE_PREFIX)) return null
  const raw = notes.slice(DENTAL_CHART_NOTE_PREFIX.length).trim()
  const jsonLine = raw.split("\n\n")[0]?.trim()
  if (!jsonLine) return null
  try {
    return parseDentalPatientChart(JSON.parse(jsonLine))
  } catch {
    return null
  }
}

async function loadPatientRecordByCampusId(
  campusId: string | null
): Promise<PatientRecord | null> {
  if (!campusId?.trim()) return null

  try {
    const ensured = await ensurePatientFromStudentId(campusId)
    if (ensured?.clinical) return ensured.clinical
  } catch {
    // Fall through
  }

  const supabase = await createClient()
  const id = campusId.trim()
  const { data } = await supabase
    .from("patient_records")
    .select(PATIENT_RECORD_SELECT_COLUMNS)
    .or(`student_id.eq.${id},employee_id.eq.${id}`)
    .maybeSingle()

  if (!data) return null
  return patientRecordFromJson(data)
}

function mergeChart(
  seeded: DentalPatientChart,
  saved: DentalPatientChart | null
): DentalPatientChart {
  if (!saved) return seeded
  return {
    ...seeded,
    ...saved,
    demographics: {
      ...seeded.demographics,
      ...saved.demographics,
      name: saved.demographics.name.trim() || seeded.demographics.name,
      studentId:
        saved.demographics.studentId.trim() || seeded.demographics.studentId,
    },
    teeth: { ...seeded.teeth, ...saved.teeth },
    clinical: {
      ...seeded.clinical,
      ...saved.clinical,
      bloodPressure:
        saved.clinical.bloodPressure.trim() || seeded.clinical.bloodPressure,
      chiefComplaint:
        saved.clinical.chiefComplaint.trim() ||
        seeded.clinical.chiefComplaint,
      allergy: saved.clinical.allergy.trim() || seeded.clinical.allergy,
    },
  }
}

/**
 * Load dental patient chart for a dentist visit appointment.
 * Seeds from patient_records + queue vitals when the visit has no saved chart yet.
 */
export async function loadDentalVisitChart(input: {
  appointmentId: string
  campusId: string | null
}): Promise<DentalVisitChartData> {
  const supabase = await createClient()

  const baseSelect = `
      id,
      status,
      reason,
      queue_ticket_id,
      patient_id,
      patients (
        full_name,
        student_id,
        employee_id,
        patient_type,
        phone,
        sex
      )
    `

  let appointment: Record<string, unknown> | null = null
  let dentalChartRaw: unknown = null

  const withChart = await supabase
    .from("appointments")
    .select(`${baseSelect}, dental_chart`)
    .eq("id", input.appointmentId)
    .maybeSingle()

  if (withChart.error?.message?.includes("dental_chart")) {
    const without = await supabase
      .from("appointments")
      .select(baseSelect)
      .eq("id", input.appointmentId)
      .maybeSingle()
    appointment = without.data as Record<string, unknown> | null
  } else {
    appointment = withChart.data as Record<string, unknown> | null
    dentalChartRaw = withChart.data?.dental_chart
  }

  const patientJoin = appointment?.patients
  const patient = Array.isArray(patientJoin)
    ? patientJoin[0]
    : (patientJoin as
        | {
            full_name?: string
            student_id?: string | null
            employee_id?: string | null
            patient_type?: string | null
            phone?: string | null
            sex?: string | null
          }
        | null)

  const campusId =
    input.campusId ??
    (patient?.patient_type === "faculty"
      ? (patient.employee_id ?? patient.student_id)
      : (patient?.student_id ?? null)) ??
    null

  let ticketId = (appointment?.queue_ticket_id as string | null) ?? null
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

  let nurseVitals = nurseVitalsFromTicket(null)
  let ticketComplaint: string | null = null
  if (ticketId) {
    const { data: vitalsRow } = await supabase
      .from("health_queue_tickets")
      .select(
        `
        chief_complaint,
        vitals_bp_systolic,
        vitals_bp_diastolic,
        vitals_heart_rate,
        vitals_temperature_c,
        vitals_spo2,
        vitals_height_cm,
        vitals_weight_kg
      `
      )
      .eq("id", ticketId)
      .maybeSingle()
    nurseVitals = nurseVitalsFromTicket(vitalsRow)
    ticketComplaint =
      typeof vitalsRow?.chief_complaint === "string"
        ? vitalsRow.chief_complaint
        : null
  }

  // Fallback: chart embedded in appointment_consultations notes.
  if (!parseDentalPatientChart(dentalChartRaw)) {
    const { data: consult } = await supabase
      .from("appointment_consultations")
      .select("clinical_notes")
      .eq("appointment_id", input.appointmentId)
      .maybeSingle()
    const fromNotes = extractDentalChartFromNotes(
      consult?.clinical_notes as string | null
    )
    if (fromNotes) dentalChartRaw = fromNotes
  }

  const record = await loadPatientRecordByCampusId(campusId)
  const saved = parseDentalPatientChart(dentalChartRaw)

  const seeded = seedDemographics(record, {
    name: patient?.full_name ?? "Unknown patient",
    campusId,
    phone: patient?.phone ?? null,
    sex: patient?.sex ?? null,
    chiefComplaint:
      ticketComplaint ??
      (typeof appointment?.reason === "string" ? appointment.reason : null),
    bloodPressure: nurseVitals.bloodPressure,
  })

  const chart = mergeChart(seeded, saved)

  return {
    chart,
    record,
    nurseVitals,
    appointmentStatus: (appointment?.status as string | null) ?? null,
    patientName: chart.demographics.name || patient?.full_name || "Patient",
    campusId,
    queueTicketId: ticketId,
  }
}
