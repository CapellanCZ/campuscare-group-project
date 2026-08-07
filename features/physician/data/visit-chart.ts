import "server-only"

import { createClient } from "@/lib/supabase/server"
import { ensurePatientFromStudentId } from "@/lib/students/ensure-patient"
import { PATIENT_RECORD_SELECT_COLUMNS } from "@/lib/students/patient-record-select"
import { mergeNurseVitalsIntoExam } from "@/features/physician/lib/merge-nurse-vitals"
import type { NurseVisitVitals } from "@/features/physician/types-visit"
import {
  EMPTY_PHYSICAL_EXAM,
  patientRecordFromJson,
  type PatientRecord,
} from "@/types/patientRecord"

export type { NurseVisitVitals }
export type VisitMedicalChartData = {
  record: PatientRecord | null
  nurseVitals: NurseVisitVitals
}

function fmtNum(value: number | string | null | undefined, suffix = ""): string {
  if (value == null || value === "") return ""
  const n = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return `${n}${suffix}`
}

export function nurseVitalsFromTicket(row: {
  vitals_bp_systolic?: number | null
  vitals_bp_diastolic?: number | null
  vitals_heart_rate?: number | null
  vitals_temperature_c?: number | string | null
  vitals_spo2?: number | null
  vitals_height_cm?: number | string | null
  vitals_weight_kg?: number | string | null
} | null): NurseVisitVitals {
  if (!row) {
    return {
      bloodPressure: "",
      pulseRate: "",
      temperature: "",
      weight: "",
      height: "",
      o2: "",
    }
  }
  const sys = row.vitals_bp_systolic
  const dia = row.vitals_bp_diastolic
  let bloodPressure = ""
  if (sys != null && dia != null) bloodPressure = `${sys}/${dia}`
  else if (sys != null) bloodPressure = String(sys)

  return {
    bloodPressure,
    pulseRate: fmtNum(row.vitals_heart_rate),
    temperature: fmtNum(row.vitals_temperature_c),
    weight: fmtNum(row.vitals_weight_kg, " kg"),
    height: fmtNum(row.vitals_height_cm, " cm"),
    o2: fmtNum(row.vitals_spo2, "%"),
  }
}

export { mergeNurseVitalsIntoExam }

async function loadPatientRecordByCampusId(
  campusId: string | null
): Promise<PatientRecord | null> {
  if (!campusId?.trim()) return null

  try {
    const ensured = await ensurePatientFromStudentId(campusId)
    if (ensured?.clinical) return ensured.clinical
  } catch {
    // Fall through to direct patient_records lookup
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

/**
 * Medical chart for a physician visit: enrollment demographics + nurse vitals.
 */
export async function loadVisitMedicalChart(input: {
  appointmentId: string
  campusId: string | null
}): Promise<VisitMedicalChartData> {
  const supabase = await createClient()

  const { data: appointment } = await supabase
    .from("appointments")
    .select("queue_ticket_id, patient_id")
    .eq("id", input.appointmentId)
    .maybeSingle()

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
  if (ticketId) {
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
      .eq("id", ticketId)
      .maybeSingle()
    nurseVitals = nurseVitalsFromTicket(vitalsRow)
  }

  const record = await loadPatientRecordByCampusId(input.campusId)

  if (record) {
    return {
      record: {
        ...record,
        physicalExam: mergeNurseVitalsIntoExam(
          record.physicalExam ?? { ...EMPTY_PHYSICAL_EXAM },
          nurseVitals
        ),
      },
      nurseVitals,
    }
  }

  return { record: null, nurseVitals }
}
