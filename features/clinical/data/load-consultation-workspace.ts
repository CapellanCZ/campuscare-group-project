import "server-only"

import { notFound } from "next/navigation"

import { getStaffAccess } from "@/lib/auth/access"
import { assignClinicDoctorId } from "@/lib/health/consultation-lifecycle"
import { createClient } from "@/lib/supabase/server"
import { PATIENT_RECORD_SELECT_COLUMNS } from "@/lib/students/patient-record-select"
import {
  EMPTY_PHYSICAL_EXAM,
  patientRecordFromJson,
  type PatientRecord,
} from "@/types/patientRecord"
import { mergeNurseVitalsIntoExam } from "@/features/physician/lib/merge-nurse-vitals"
import type { NurseVisitVitals } from "@/features/physician/types-visit"
import { nurseVitalsFromConsultationJson } from "@/features/physician/data/visit-chart"

export type ClinicalVisitRole = "physician" | "dentist"

export type ClinicalVisitWorkspace = {
  consultationId: string
  role: ClinicalVisitRole
  status: string
  chiefComplaint: string | null
  consultationDate: string
  symptoms: string | null
  diagnosis: string | null
  assessment: string | null
  prescription: string | null
  treatment: string | null
  followUpDate: string | null
  appointmentId: string | null
  patientName: string
  campusId: string | null
  patientRecordId: string
  priorRecordsCount: number
  medicalRecord: PatientRecord | null
  nurseVitals: NurseVisitVitals
  dashboardPath: string
}

export async function loadConsultationWorkspace(
  consultationId: string,
  role: ClinicalVisitRole
): Promise<ClinicalVisitWorkspace> {
  const access = await getStaffAccess()
  if (!access || access.primaryRole !== role) {
    notFound()
  }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from("consultations")
    .select(
      `
      id,
      patient_id,
      appointment_id,
      provider_type,
      status,
      chief_complaint,
      consultation_date,
      symptoms,
      diagnosis,
      assessment,
      prescription,
      treatment,
      follow_up_date,
      vitals,
      patient_records (
        id,
        patient_type,
        first_name,
        last_name,
        student_id,
        employee_id
      )
    `
    )
    .eq("id", consultationId)
    .maybeSingle()

  if (error || !row) notFound()

  const providerType = row.provider_type as string | null
  if (providerType && providerType !== role) notFound()

  const patientJoin = Array.isArray(row.patient_records)
    ? row.patient_records[0]
    : row.patient_records

  const firstName = (patientJoin?.first_name as string | null) ?? ""
  const lastName = (patientJoin?.last_name as string | null) ?? ""
  const patientName =
    [firstName, lastName].filter(Boolean).join(" ") || "Patient"
  const campusId =
    patientJoin?.patient_type === "faculty"
      ? ((patientJoin?.employee_id as string | null) ??
        (patientJoin?.student_id as string | null))
      : ((patientJoin?.student_id as string | null) ?? null)

  const nurseVitals = nurseVitalsFromConsultationJson(
    row.vitals as Record<string, unknown> | null
  )

  let medicalRecord: PatientRecord | null = null
  if (patientJoin?.id) {
    const { data: recordRow } = await supabase
      .from("patient_records")
      .select(PATIENT_RECORD_SELECT_COLUMNS)
      .eq("id", patientJoin.id)
      .maybeSingle()
    if (recordRow) {
      medicalRecord = {
        ...patientRecordFromJson(recordRow),
        physicalExam: mergeNurseVitalsIntoExam(
          patientRecordFromJson(recordRow).physicalExam ?? {
            ...EMPTY_PHYSICAL_EXAM,
          },
          nurseVitals
        ),
      }
    }
  }

  const { count: priorRecordsCount } = await supabase
    .from("consultations")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", row.patient_id as string)
    .neq("id", consultationId)
    .eq("status", "completed")

  if (row.status === "waiting") {
    const vitals = (row.vitals ?? {}) as Record<string, unknown>
    if (
      vitals.bpSystolic != null &&
      vitals.bpDiastolic != null &&
      vitals.heartRate != null
    ) {
      await supabase
        .from("consultations")
        .update({
          status: "ongoing",
          station: role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", consultationId)
    }
  }

  if (row.appointment_id) {
    const doctorId = await assignClinicDoctorId(role, supabase)
    if (doctorId) {
      await supabase
        .from("appointments")
        .update({
          doctor_id: doctorId,
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.appointment_id)
        .in("status", ["confirmed", "rescheduled", "pending"])
    }
  }

  return {
    consultationId,
    role,
    status: (row.status as string) ?? "waiting",
    chiefComplaint: row.chief_complaint as string | null,
    consultationDate: row.consultation_date as string,
    symptoms: row.symptoms as string | null,
    diagnosis: row.diagnosis as string | null,
    assessment: row.assessment as string | null,
    prescription: row.prescription as string | null,
    treatment: (row.treatment as string | null) ?? null,
    followUpDate: (row.follow_up_date as string | null) ?? null,
    appointmentId: row.appointment_id as string | null,
    patientName,
    campusId,
    patientRecordId: row.patient_id as string,
    priorRecordsCount: priorRecordsCount ?? 0,
    medicalRecord,
    nurseVitals,
    dashboardPath: role === "dentist" ? "/dentist/dashboard" : "/physician/dashboard",
  }
}
