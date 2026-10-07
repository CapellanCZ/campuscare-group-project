import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import { patientCampusId, type PatientRecord } from "@/types/patientRecord"
import {
  ConsultationServiceError,
  consultationFromJson,
  type Consultation,
  type ConsultationJson,
} from "@/types/consultation"
import {
  MEDICAL_DOCUMENT_TYPES,
  MEDICAL_DOCUMENT_STATUSES,
  normalizeDocumentStatus,
  type MedicalDocument,
  type MedicalDocumentType,
  type MedicalDocumentStatus,
} from "@/types/medicalDocument"

const CONSULTATION_SELECT = `
  id,
  patient_id,
  chief_complaint,
  symptoms,
  assessment,
  diagnosis,
  treatment,
  prescription,
  provider_name,
  provider_role,
  station,
  status,
  priority,
  consultation_date,
  follow_up_date,
  notes,
  queue_ticket_id,
  consultation_request_id,
  appointment_id,
  provider_type,
  vitals,
  created_at,
  updated_at,
  patient_records (
    id,
    patient_type,
    first_name,
    last_name,
    student_id,
    employee_id
  )
`

const DOCUMENT_SELECT = `
  id,
  patient_id,
  certificate_number,
  certificate_type,
  document_type,
  purpose,
  doctor_name,
  remarks,
  status,
  issued_at,
  valid_until,
  issued_by,
  consultation_id,
  patient_record_id,
  payload,
  template_version,
  voided_by,
  voided_at,
  void_reason,
  replaces_document_id,
  created_at,
  updated_at,
  patients (
    id,
    full_name,
    student_id,
    email
  )
`

const CHUNK_SIZE = 80

type DocumentRow = {
  id: string
  patient_id: string
  certificate_number: string
  certificate_type: string
  document_type: string | null
  purpose: string | null
  doctor_name: string | null
  remarks: string | null
  status: string
  issued_at: string | null
  valid_until: string | null
  issued_by: string | null
  consultation_id: string | null
  patient_record_id: string | null
  payload: Record<string, unknown> | null
  template_version: string | null
  voided_by: string | null
  voided_at: string | null
  void_reason: string | null
  replaces_document_id: string | null
  created_at: string
  updated_at: string
  patients:
    | {
        id: string
        full_name: string
        student_id: string | null
        email: string | null
      }
    | {
        id: string
        full_name: string
        student_id: string | null
        email: string | null
      }[]
    | null
}

function chunkIds(ids: string[]): string[][] {
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CHUNK_SIZE))
  }
  return chunks
}

function mapExportDocument(row: DocumentRow): MedicalDocument | null {
  const docType = row.document_type ?? "medical_certification"
  if (!(MEDICAL_DOCUMENT_TYPES as readonly string[]).includes(docType)) {
    return null
  }
  if (!(MEDICAL_DOCUMENT_STATUSES as readonly string[]).includes(row.status)) {
    return null
  }
  if (row.status === "voided") return null

  const patientJoin = Array.isArray(row.patients)
    ? row.patients[0]
    : row.patients

  return {
    id: row.id,
    documentNumber: row.certificate_number,
    documentType: docType as MedicalDocumentType,
    patientId: row.patient_id,
    consultationId: row.consultation_id,
    patientRecordId: row.patient_record_id,
    purpose: row.purpose,
    doctorName: row.doctor_name,
    remarks: row.remarks,
    status: normalizeDocumentStatus(row.status) as MedicalDocumentStatus,
    issuedAt: row.issued_at,
    validUntil: row.valid_until,
    issuedBy: row.issued_by,
    templateVersion: row.template_version ?? "1",
    payload: row.payload ?? {},
    voidedBy: row.voided_by,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
    replacesDocumentId: row.replaces_document_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    certificateType: row.certificate_type,
    patient: {
      id: patientJoin?.id ?? row.patient_id,
      fullName: patientJoin?.full_name ?? "Unknown patient",
      studentId: patientJoin?.student_id ?? null,
      email: patientJoin?.email ?? null,
    },
  }
}

async function listConsultationsForPatientRecordIds(
  patientRecordIds: string[],
  client: SupabaseClient
): Promise<Consultation[]> {
  if (patientRecordIds.length === 0) return []

  const rows: ConsultationJson[] = []
  for (const chunk of chunkIds(patientRecordIds)) {
    const { data, error } = await client
      .from("consultations")
      .select(CONSULTATION_SELECT)
      .in("patient_id", chunk)
      .order("consultation_date", { ascending: false })

    if (error) {
      throw new ConsultationServiceError(
        "database",
        error.message || "Could not load consultations for export."
      )
    }
    rows.push(...((data ?? []) as ConsultationJson[]))
  }

  return rows.flatMap((row) => {
    try {
      return [consultationFromJson(row)]
    } catch {
      return []
    }
  })
}

async function listDocumentsForExport(input: {
  patientRecordIds: string[]
  consultationIds: string[]
  patients: PatientRecord[]
  client: SupabaseClient
}): Promise<MedicalDocument[]> {
  const byId = new Map<string, MedicalDocument>()

  const upsert = (docs: MedicalDocument[]) => {
    for (const doc of docs) {
      byId.set(doc.id, doc)
    }
  }

  const mapRows = (data: DocumentRow[] | null) =>
    (data ?? [])
      .map(mapExportDocument)
      .filter((doc): doc is MedicalDocument => doc != null)

  for (const chunk of chunkIds(input.patientRecordIds)) {
    if (chunk.length === 0) continue
    const { data, error } = await input.client
      .from("medical_certificates")
      .select(DOCUMENT_SELECT)
      .in("patient_record_id", chunk)
      .neq("status", "voided")

    if (error) {
      throw new Error(error.message || "Could not load documents for export.")
    }
    upsert(mapRows(data as DocumentRow[] | null))
  }

  for (const chunk of chunkIds(input.consultationIds)) {
    if (chunk.length === 0) continue
    const { data, error } = await input.client
      .from("medical_certificates")
      .select(DOCUMENT_SELECT)
      .in("consultation_id", chunk)
      .neq("status", "voided")

    if (error) {
      throw new Error(error.message || "Could not load documents for export.")
    }
    upsert(mapRows(data as DocumentRow[] | null))
  }

  // Soft-link legacy certificates via operational patients campus IDs.
  const campusToRecordId = new Map<string, string>()
  for (const patient of input.patients) {
    const campus = patientCampusId(patient)?.trim()
    if (campus) campusToRecordId.set(campus, patient.id)
  }
  const campusIds = Array.from(campusToRecordId.keys())

  if (campusIds.length > 0) {
    const operationalToRecord = new Map<string, string>()

    for (const chunk of chunkIds(campusIds)) {
      const [byStudent, byEmployee] = await Promise.all([
        input.client
          .from("patients")
          .select("id, student_id, employee_id")
          .in("student_id", chunk),
        input.client
          .from("patients")
          .select("id, student_id, employee_id")
          .in("employee_id", chunk),
      ])

      if (byStudent.error) {
        throw new Error(
          byStudent.error.message ||
            "Could not resolve patient links for export."
        )
      }
      if (byEmployee.error) {
        throw new Error(
          byEmployee.error.message ||
            "Could not resolve patient links for export."
        )
      }

      for (const row of [...(byStudent.data ?? []), ...(byEmployee.data ?? [])]) {
        const studentId = (row.student_id as string | null)?.trim() || ""
        const employeeId = (row.employee_id as string | null)?.trim() || ""
        const recordId =
          (studentId && campusToRecordId.get(studentId)) ||
          (employeeId && campusToRecordId.get(employeeId)) ||
          null
        if (!recordId) continue
        operationalToRecord.set(row.id as string, recordId)
      }
    }

    const operationalIds = Array.from(operationalToRecord.keys())
    for (const chunk of chunkIds(operationalIds)) {
      if (chunk.length === 0) continue
      const { data, error } = await input.client
        .from("medical_certificates")
        .select(DOCUMENT_SELECT)
        .in("patient_id", chunk)
        .neq("status", "voided")

      if (error) {
        throw new Error(error.message || "Could not load documents for export.")
      }

      upsert(
        mapRows(data as DocumentRow[] | null).map((doc) => {
          if (doc.patientRecordId) return doc
          const linked = operationalToRecord.get(doc.patientId)
          return linked ? { ...doc, patientRecordId: linked } : doc
        })
      )
    }
  }

  return Array.from(byId.values())
}

/**
 * Batch-load consultations and documents for an export patient set.
 * Caller must already have authorized the patient list.
 */
export async function loadPatientRecordsExportAssociations(
  patients: PatientRecord[],
  client?: SupabaseClient
): Promise<{
  consultations: Consultation[]
  documents: MedicalDocument[]
}> {
  const supabase = client ?? (await createClient())
  const patientRecordIds = patients.map((patient) => patient.id)

  const consultations = await listConsultationsForPatientRecordIds(
    patientRecordIds,
    supabase
  )

  const documents = await listDocumentsForExport({
    patientRecordIds,
    consultationIds: consultations.map((c) => c.id),
    patients,
    client: supabase,
  })

  return { consultations, documents }
}
