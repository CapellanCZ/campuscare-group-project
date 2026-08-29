"use server"

import { revalidatePath } from "next/cache"

import { getStaffAccess } from "@/lib/auth/access"
import { completeConsultationVisit } from "@/lib/health/consultation-lifecycle"
import { createClient } from "@/lib/supabase/server"
import type { ClinicalVisitRole } from "@/features/clinical/data/load-consultation-workspace"
import { updatePatientMedicalRecord } from "@/services/patientRecords"
import type { MedicalHistory, PhysicalExam } from "@/types/patientRecord"

export type VisitActionResult =
  | { ok: true; consultationId: string; completed?: boolean }
  | { ok: false; error: string }

function rolePaths(role: ClinicalVisitRole) {
  const base = role === "dentist" ? "/dentist" : "/physician"
  return [
    base,
    `${base}/dashboard`,
    `${base}/patients`,
    `${base}/consultations`,
    `${base}/queue`,
    `${base}/settings`,
    `${base}/reports`,
  ]
}

function revalidateRole(role: ClinicalVisitRole, consultationId: string) {
  for (const path of rolePaths(role)) {
    revalidatePath(path)
  }
  revalidatePath(
    `${role === "dentist" ? "/dentist" : "/physician"}/consultation/${consultationId}`
  )
}

async function requireClinician(role: ClinicalVisitRole) {
  const access = await getStaffAccess()
  if (!access || access.primaryRole !== role) return null
  return access
}

export async function saveClinicalVisit(input: {
  consultationId: string
  role: ClinicalVisitRole
  symptoms: string
  diagnosis: string
  clinicalNotes: string
  prescription: string
  treatment?: string
  followUpDate?: string | null
  complete?: boolean
  medicalChart?: {
    patientRecordId: string
    medicalHistory: MedicalHistory
    physicalExam: PhysicalExam
  }
}): Promise<VisitActionResult> {
  const access = await requireClinician(input.role)
  if (!access) {
    return { ok: false, error: "Unauthorized." }
  }

  const supabase = await createClient()
  const { data: row } = await supabase
    .from("consultations")
    .select("id, provider_type, status, vitals")
    .eq("id", input.consultationId)
    .maybeSingle()

  if (!row) return { ok: false, error: "Consultation not found." }
  if (row.provider_type && row.provider_type !== input.role) {
    return {
      ok: false,
      error: "This consultation is assigned to another provider.",
    }
  }

  const vitals = (row.vitals ?? {}) as Record<string, unknown>
  if (
    vitals.bpSystolic == null ||
    vitals.bpDiastolic == null ||
    vitals.heartRate == null
  ) {
    return {
      ok: false,
      error: "Nurse vitals must be recorded before documenting the visit.",
    }
  }

  if (input.complete) {
    const result = await completeConsultationVisit({
      consultationId: input.consultationId,
      symptoms: input.symptoms.trim(),
      diagnosis: input.diagnosis.trim(),
      notes: input.clinicalNotes.trim(),
      prescription: input.prescription.trim(),
      assessment: input.clinicalNotes.trim(),
      treatment: input.treatment?.trim() || undefined,
      followUpDate: input.followUpDate ?? undefined,
      providerName: access.fullName,
      providerRole: input.role,
      client: supabase,
    })
    if (!result.ok) return result

    if (input.medicalChart) {
      try {
        await updatePatientMedicalRecord({
          id: input.medicalChart.patientRecordId,
          medicalHistory: input.medicalChart.medicalHistory,
          physicalExam: input.medicalChart.physicalExam,
        })
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not save medical chart to patient history.",
        }
      }
    }
  } else {
    const { error } = await supabase
      .from("consultations")
      .update({
        symptoms: input.symptoms.trim(),
        diagnosis: input.diagnosis.trim(),
        assessment: input.clinicalNotes.trim(),
        notes: input.clinicalNotes.trim(),
        prescription: input.prescription.trim(),
        treatment:
          input.treatment?.trim() ||
          (input.role === "dentist" ? "" : input.prescription.trim()),
        follow_up_date: input.followUpDate ?? null,
        status: "ongoing",
        station: input.role,
        provider_name: access.fullName,
        provider_role: input.role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.consultationId)

    if (error) return { ok: false, error: error.message }
  }

  revalidateRole(input.role, input.consultationId)
  return { ok: true, consultationId: input.consultationId, completed: input.complete }
}
