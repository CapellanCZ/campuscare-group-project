import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { ConsultationVitals } from "@/lib/health/consultation-lifecycle"
import { campusIdLookupVariants } from "@/lib/students/student-id-input"

function fmtNum(value: number | null | undefined, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return ""
  return `${value}${suffix}`
}

/** Map nurse intake vitals onto patient_records.physical_exam field names. */
export function nurseVitalsToPhysicalExamPatch(vitals: ConsultationVitals): {
  bloodPressure: string
  pulseRate: string
  temperature: string
  weight: string
  height: string
  o2: string
} {
  let bloodPressure = ""
  if (vitals.bpSystolic != null && vitals.bpDiastolic != null) {
    bloodPressure = `${vitals.bpSystolic}/${vitals.bpDiastolic}`
  } else if (vitals.bpSystolic != null) {
    bloodPressure = String(vitals.bpSystolic)
  }

  return {
    bloodPressure,
    pulseRate: fmtNum(vitals.heartRate),
    temperature: fmtNum(vitals.temperatureC),
    weight: fmtNum(vitals.weightKg, " kg"),
    height: fmtNum(vitals.heightCm, " cm"),
    o2: fmtNum(vitals.spo2, "%"),
  }
}

/**
 * After nurse intake, mirror vitals into patient_records.physical_exam so the
 * patient mobile app (and vitals realtime) see them immediately — without
 * waiting for physician/dentist chart save.
 */
export async function syncNurseVitalsToPatientRecord(params: {
  client: SupabaseClient
  campusId?: string | null
  operationalPatientId?: string | null
  vitals: ConsultationVitals
}): Promise<{ ok: true; updated: boolean } | { ok: false; error: string }> {
  const supabase = params.client
  const patch = nurseVitalsToPhysicalExamPatch(params.vitals)
  if (
    !patch.bloodPressure &&
    !patch.pulseRate &&
    !patch.temperature &&
    !patch.o2
  ) {
    return { ok: true, updated: false }
  }

  let campusId = params.campusId?.trim() || null

  if (!campusId && params.operationalPatientId) {
    const { data: patient } = await supabase
      .from("patients")
      .select("student_id, employee_id")
      .eq("id", params.operationalPatientId)
      .maybeSingle()
    campusId =
      (patient?.student_id as string | null)?.trim() ||
      (patient?.employee_id as string | null)?.trim() ||
      null
  }

  if (!campusId) {
    return { ok: true, updated: false }
  }

  const variants = campusIdLookupVariants(campusId)
  let recordId: string | null = null
  let existingExam: Record<string, unknown> = {}

  for (const variant of variants) {
    const { data: byStudent } = await supabase
      .from("patient_records")
      .select("id, physical_exam")
      .eq("student_id", variant)
      .limit(1)
      .maybeSingle()
    if (byStudent?.id) {
      recordId = byStudent.id
      existingExam =
        byStudent.physical_exam &&
        typeof byStudent.physical_exam === "object" &&
        !Array.isArray(byStudent.physical_exam)
          ? (byStudent.physical_exam as Record<string, unknown>)
          : {}
      break
    }
    const { data: byEmployee } = await supabase
      .from("patient_records")
      .select("id, physical_exam")
      .eq("employee_id", variant)
      .limit(1)
      .maybeSingle()
    if (byEmployee?.id) {
      recordId = byEmployee.id
      existingExam =
        byEmployee.physical_exam &&
        typeof byEmployee.physical_exam === "object" &&
        !Array.isArray(byEmployee.physical_exam)
          ? (byEmployee.physical_exam as Record<string, unknown>)
          : {}
      break
    }
  }

  if (!recordId) {
    return { ok: true, updated: false }
  }

  const nextExam = {
    ...existingExam,
    ...(patch.bloodPressure ? { bloodPressure: patch.bloodPressure } : {}),
    ...(patch.pulseRate ? { pulseRate: patch.pulseRate } : {}),
    ...(patch.temperature ? { temperature: patch.temperature } : {}),
    ...(patch.weight ? { weight: patch.weight } : {}),
    ...(patch.height ? { height: patch.height } : {}),
    ...(patch.o2 ? { o2: patch.o2 } : {}),
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("patient_records")
    .update({
      physical_exam: nextExam,
      last_edited_at: now,
      updated_at: now,
    })
    .eq("id", recordId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, updated: true }
}
