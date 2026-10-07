import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createPatientAuthSyncContext } from "@/lib/patients/provision-patient-auth"
import { ensureOperationalPatientForCertificateId } from "@/lib/students/ensure-patient"
import { upsertPatientRecord } from "@/services/patientRecords"
import {
  allergiesSummaryFromHistory,
  campusIdsFromIdNumber,
  patientCampusId,
  type PatientRecord,
} from "@/types/patientRecord"
import { DOCUMENT_TYPE_LABELS } from "@/types/medicalDocument"
import type {
  ClinicalRestorePlan,
  RestoreConsultationRow,
  RestoreDocumentRow,
  RestoreMedicalProfileRow,
  RestorePatientRow,
  RestoreVitalsRow,
} from "@/features/patients/lib/restore-patient-records"

export type ClinicalRestoreResult = {
  patientsCreated: number
  patientsUpdated: number
  profilesUpdated: number
  consultationsCreated: number
  consultationsSkipped: number
  vitalsUpdated: number
  documentsCreated: number
  documentsSkipped: number
  failures: string[]
  warnings: string[]
  counts: ClinicalRestorePlan["counts"]
}

function numOrNull(value: string): number | null {
  if (!value.trim()) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function vitalsPayload(row: RestoreVitalsRow): Record<string, unknown> {
  return {
    bpSystolic: numOrNull(row.bpSystolic),
    bpDiastolic: numOrNull(row.bpDiastolic),
    heartRate: numOrNull(row.heartRate),
    temperatureC: numOrNull(row.temperatureC),
    spo2: numOrNull(row.spo2),
    heightCm: numOrNull(row.heightCm),
    weightKg: numOrNull(row.weightKg),
    respiratoryRate: numOrNull(row.respiratoryRate),
  }
}

function resolvePatientId(
  maps: {
    byExportId: Map<string, string>
    byCampusId: Map<string, string>
  },
  exportPatientRecordId: string,
  idNumber: string
): string | null {
  if (exportPatientRecordId && maps.byExportId.has(exportPatientRecordId)) {
    return maps.byExportId.get(exportPatientRecordId) ?? null
  }
  if (idNumber && maps.byCampusId.has(idNumber)) {
    return maps.byCampusId.get(idNumber) ?? null
  }
  return null
}

async function upsertRestorePatient(
  row: RestorePatientRow,
  syncContext: Awaited<ReturnType<typeof createPatientAuthSyncContext>>,
  client: SupabaseClient
): Promise<{ record: PatientRecord; created: boolean }> {
  const ids = campusIdsFromIdNumber(row.patientType, row.idNumber)
  if (!ids.ok) {
    throw new Error(ids.error)
  }

  return upsertPatientRecord(
    {
      patientType: row.patientType,
      studentId: ids.studentId ?? "",
      employeeId: ids.employeeId ?? "",
      firstName: row.firstName,
      middleName: row.middleName || null,
      lastName: row.lastName,
      course: row.patientType === "student" ? row.course || null : null,
      yearLevel: row.patientType === "student" ? row.yearLevel || null : null,
      gender: row.gender || null,
      birthDate: row.birthDate || null,
      civilStatus: row.civilStatus || null,
      religion: row.religion || null,
      nationality: row.nationality || null,
      bloodType: row.bloodType || null,
      phone: row.phone || null,
      email: row.email || null,
      address: row.address || null,
      emergencyContactName: row.emergencyContactName || null,
      emergencyContactPhone: row.emergencyContactPhone || null,
      lastVisit: row.lastVisit || null,
    },
    client,
    syncContext
  )
}

async function applyMedicalProfile(
  patientId: string,
  row: RestoreMedicalProfileRow,
  client: SupabaseClient,
  editorUserId: string
): Promise<void> {
  const allergies =
    row.allergies ||
    allergiesSummaryFromHistory(row.medicalHistory) ||
    null

  const { error } = await client
    .from("patient_records")
    .update({
      allergies,
      medical_conditions: row.medicalConditions || null,
      notes: row.notes || null,
      medical_history: row.medicalHistory,
      physical_exam: row.physicalExam,
      last_edited_at: new Date().toISOString(),
      last_edited_by: editorUserId,
    })
    .eq("id", patientId)

  if (error) throw new Error(error.message)
}

function consultationMatchKey(row: {
  consultationDate: string
  chiefComplaint: string
  providerType: string | null
}): string {
  const day = row.consultationDate.slice(0, 10)
  return [
    day,
    (row.providerType ?? "").toLowerCase(),
    row.chiefComplaint.trim().toLowerCase(),
  ].join("|")
}

async function findExistingConsultationId(
  patientId: string,
  row: RestoreConsultationRow,
  client: SupabaseClient
): Promise<string | null> {
  const { data, error } = await client
    .from("consultations")
    .select("id, consultation_date, chief_complaint, provider_type")
    .eq("patient_id", patientId)

  if (error) throw new Error(error.message)
  const target = consultationMatchKey({
    consultationDate: row.consultationDate,
    chiefComplaint: row.chiefComplaint,
    providerType: row.providerType,
  })

  for (const existing of data ?? []) {
    const key = consultationMatchKey({
      consultationDate: String(existing.consultation_date ?? ""),
      chiefComplaint: String(existing.chief_complaint ?? ""),
      providerType: (existing.provider_type as string | null) ?? null,
    })
    if (key === target) return existing.id as string
  }
  return null
}

async function insertConsultation(
  patientId: string,
  row: RestoreConsultationRow,
  vitals: Record<string, unknown> | null,
  client: SupabaseClient
): Promise<string> {
  const consultationDate =
    row.consultationDate || new Date().toISOString()

  const { data, error } = await client
    .from("consultations")
    .insert({
      patient_id: patientId,
      chief_complaint: row.chiefComplaint || null,
      symptoms: row.symptoms || null,
      assessment: row.assessment || null,
      diagnosis: row.diagnosis || null,
      treatment: row.treatment || null,
      prescription: row.prescription || null,
      provider_name: row.providerName || null,
      provider_role: row.providerRole || null,
      station: row.station || row.providerType || null,
      status: row.status,
      priority: row.priority,
      consultation_date: consultationDate,
      follow_up_date: row.followUpDate || null,
      notes: row.notes || null,
      provider_type: row.providerType,
      vitals: vitals ?? {},
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

async function updateConsultationVitals(
  consultationId: string,
  vitals: Record<string, unknown>,
  client: SupabaseClient
): Promise<void> {
  const { error } = await client
    .from("consultations")
    .update({ vitals })
    .eq("id", consultationId)
  if (error) throw new Error(error.message)
}

async function documentNumberExists(
  documentNumber: string,
  client: SupabaseClient
): Promise<boolean> {
  const { data, error } = await client
    .from("medical_certificates")
    .select("id")
    .eq("certificate_number", documentNumber)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return Boolean(data?.id)
}

async function insertDocument(input: {
  row: RestoreDocumentRow
  patientRecordId: string
  consultationId: string | null
  operationalPatientId: string
  issuedBy: string
  client: SupabaseClient
}): Promise<"created" | "skipped"> {
  if (await documentNumberExists(input.row.documentNumber, input.client)) {
    return "skipped"
  }

  const status = ["draft", "pending", "issued", "printed", "voided"].includes(
    input.row.status
  )
    ? input.row.status
    : "issued"

  const { error } = await input.client.from("medical_certificates").insert({
    patient_id: input.operationalPatientId,
    certificate_number: input.row.documentNumber,
    certificate_type:
      input.row.certificateType ||
      DOCUMENT_TYPE_LABELS[input.row.documentType],
    document_type: input.row.documentType,
    purpose: input.row.purpose || null,
    doctor_name: input.row.doctorName || null,
    remarks: input.row.remarks || null,
    status,
    issued_at: input.row.issuedAt || new Date().toISOString(),
    valid_until: input.row.validUntil || null,
    issued_by: input.issuedBy,
    consultation_id: input.consultationId,
    patient_record_id: input.patientRecordId,
    payload: {},
    template_version: "1",
  })

  if (error) {
    if (
      error.message.toLowerCase().includes("duplicate") ||
      error.code === "23505"
    ) {
      return "skipped"
    }
    throw new Error(error.message)
  }
  return "created"
}

/**
 * Ordered clinical restore: patients → profiles → consultations/vitals → documents.
 */
export async function executeClinicalRestore(input: {
  plan: ClinicalRestorePlan
  issuedByUserId: string
  client?: SupabaseClient
}): Promise<ClinicalRestoreResult> {
  // Use service role for clinical writes: nurses are not allowed to INSERT
  // consultations under RLS, but authorized Import must restore clinical sheets.
  const client = input.client ?? createAdminClient()
  const userClient = await createClient()
  const syncContext = await createPatientAuthSyncContext()
  const pkg = input.plan.package
  const failures: string[] = []
  const warnings = [...pkg.warnings]

  let patientsCreated = 0
  let patientsUpdated = 0
  let profilesUpdated = 0
  let consultationsCreated = 0
  let consultationsSkipped = 0
  let vitalsUpdated = 0
  let documentsCreated = 0
  let documentsSkipped = 0

  const byExportId = new Map<string, string>()
  const byCampusId = new Map<string, string>()

  for (const [index, row] of pkg.patients.entries()) {
    try {
      // Patient upsert stays on the user session so auth sync / RLS stay consistent.
      const { record, created } = await upsertRestorePatient(
        row,
        syncContext,
        userClient
      )
      if (created) patientsCreated += 1
      else patientsUpdated += 1

      if (row.exportPatientRecordId) {
        byExportId.set(row.exportPatientRecordId, record.id)
      }
      const campus = patientCampusId(record)
      if (campus) byCampusId.set(campus, record.id)
      if (row.idNumber) byCampusId.set(row.idNumber, record.id)
    } catch (error) {
      failures.push(
        `Patient row ${index + 1}: ${
          error instanceof Error ? error.message : "Failed to restore patient."
        }`
      )
    }
  }

  for (const [index, row] of pkg.medicalProfiles.entries()) {
    const patientId = resolvePatientId(
      { byExportId, byCampusId },
      row.exportPatientRecordId,
      row.idNumber
    )
    if (!patientId) {
      failures.push(
        `Medical profile row ${index + 1}: patient not found in restored set.`
      )
      continue
    }
    try {
      await applyMedicalProfile(
        patientId,
        row,
        client,
        input.issuedByUserId
      )
      profilesUpdated += 1
    } catch (error) {
      failures.push(
        `Medical profile row ${index + 1}: ${
          error instanceof Error ? error.message : "Failed to restore profile."
        }`
      )
    }
  }

  const vitalsByConsultation = new Map<string, RestoreVitalsRow>()
  for (const row of pkg.vitals) {
    vitalsByConsultation.set(row.exportConsultationId, row)
  }

  const consultationIdMap = new Map<string, string>()
  const allConsults = [
    ...pkg.medicalConsultations,
    ...pkg.dentalConsultations,
  ]

  for (const [index, row] of allConsults.entries()) {
    const patientId = resolvePatientId(
      { byExportId, byCampusId },
      row.exportPatientRecordId,
      row.idNumber
    )
    if (!patientId) {
      failures.push(
        `Consultation ${row.exportConsultationId}: patient not found.`
      )
      continue
    }

    try {
      const existingId = await findExistingConsultationId(
        patientId,
        row,
        client
      )
      const vitalsRow = vitalsByConsultation.get(row.exportConsultationId)
      const vitals = vitalsRow ? vitalsPayload(vitalsRow) : null

      if (existingId) {
        consultationIdMap.set(row.exportConsultationId, existingId)
        consultationsSkipped += 1
        if (vitals) {
          await updateConsultationVitals(existingId, vitals, client)
          vitalsUpdated += 1
        }
        continue
      }

      const newId = await insertConsultation(patientId, row, vitals, client)
      consultationIdMap.set(row.exportConsultationId, newId)
      consultationsCreated += 1
      if (vitals) vitalsUpdated += 1
    } catch (error) {
      failures.push(
        `Consultation row ${index + 1} (${row.exportConsultationId}): ${
          error instanceof Error ? error.message : "Failed to restore consultation."
        }`
      )
    }
  }

  for (const [index, row] of pkg.documents.entries()) {
    const patientRecordId = resolvePatientId(
      { byExportId, byCampusId },
      row.exportPatientRecordId,
      row.idNumber
    )
    if (!patientRecordId) {
      failures.push(
        `Document ${row.documentNumber}: patient not found.`
      )
      continue
    }

    const consultationId = row.exportConsultationId
      ? consultationIdMap.get(row.exportConsultationId) ?? null
      : null

    try {
      const operational = await ensureOperationalPatientForCertificateId(
        patientRecordId
      )
      const result = await insertDocument({
        row,
        patientRecordId,
        consultationId,
        operationalPatientId: operational.id,
        issuedBy: input.issuedByUserId,
        client,
      })
      if (result === "created") documentsCreated += 1
      else documentsSkipped += 1
    } catch (error) {
      failures.push(
        `Document row ${index + 1} (${row.documentNumber}): ${
          error instanceof Error ? error.message : "Failed to restore document."
        }`
      )
    }
  }

  if (
    patientsCreated === 0 &&
    patientsUpdated === 0 &&
    consultationsCreated === 0 &&
    documentsCreated === 0 &&
    profilesUpdated === 0
  ) {
    throw new Error(
      failures[0] ??
        "Nothing was restored from the clinical export package."
    )
  }

  return {
    patientsCreated,
    patientsUpdated,
    profilesUpdated,
    consultationsCreated,
    consultationsSkipped,
    vitalsUpdated,
    documentsCreated,
    documentsSkipped,
    failures,
    warnings,
    counts: input.plan.counts,
  }
}
