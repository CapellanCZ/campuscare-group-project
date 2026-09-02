import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import { ensureOperationalPatientForCertificateId } from "@/lib/students/ensure-patient"
import {
  DOCUMENT_NUMBER_PREFIX,
  MedicalDocumentServiceError,
  type IssueMedicalDocumentInput,
  type MedicalDocument,
  type MedicalDocumentListParams,
  type MedicalDocumentListResult,
  type MedicalDocumentStatus,
  type MedicalDocumentType,
  MEDICAL_DOCUMENT_STATUSES,
  MEDICAL_DOCUMENT_TYPES,
  normalizeDocumentStatus,
} from "@/types/medicalDocument"
import { PatientRecordServiceError } from "@/types/patientRecord"
import { formatMedicationsAsPrescriptionText } from "@/features/medical-documents/lib/map-consultation-context"
import type { PrescriptionPayload } from "@/types/medicalDocument"

type PatientJoin = {
  id: string
  full_name: string
  student_id: string | null
  email: string | null
}

type DocumentRow = {
  id: string
  patient_id: string
  certificate_number: string
  certificate_type: string
  document_type: string
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
  patients: PatientJoin | PatientJoin[] | null
}

const SELECT_WITH_PATIENT = `
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

function isDocumentType(value: string): value is MedicalDocumentType {
  return (MEDICAL_DOCUMENT_TYPES as readonly string[]).includes(value)
}

function isDocumentStatus(value: string): value is MedicalDocumentStatus {
  return (MEDICAL_DOCUMENT_STATUSES as readonly string[]).includes(value)
}

function patientJoin(value: PatientJoin | PatientJoin[] | null): PatientJoin | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapError(error: { message: string; code?: string }): never {
  const message = error.message.toLowerCase()
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    throw new MedicalDocumentServiceError(
      "offline",
      "Unable to reach the database. Check your connection and try again."
    )
  }
  if (
    error.code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    throw new MedicalDocumentServiceError(
      "permission",
      "You do not have permission to access medical documents."
    )
  }
  if (error.code === "PGRST116" || message.includes("0 rows")) {
    throw new MedicalDocumentServiceError(
      "not_found",
      "Medical document not found."
    )
  }
  throw new MedicalDocumentServiceError(
    "database",
    error.message || "A database error occurred while loading documents."
  )
}

function mapDocument(row: DocumentRow): MedicalDocument {
  const docType = row.document_type ?? "medical_certification"
  if (!isDocumentType(docType)) {
    throw new MedicalDocumentServiceError(
      "database",
      `Unexpected document type: ${docType}`
    )
  }
  const status = row.status
  if (!isDocumentStatus(status)) {
    throw new MedicalDocumentServiceError(
      "database",
      `Unexpected document status: ${status}`
    )
  }

  const patient = patientJoin(row.patients)

  return {
    id: row.id,
    documentNumber: row.certificate_number,
    documentType: docType,
    patientId: row.patient_id,
    consultationId: row.consultation_id,
    patientRecordId: row.patient_record_id,
    purpose: row.purpose,
    doctorName: row.doctor_name,
    remarks: row.remarks,
    status: normalizeDocumentStatus(status),
    issuedAt: row.issued_at,
    validUntil: row.valid_until,
    issuedBy: row.issued_by ?? null,
    templateVersion: row.template_version ?? "1",
    payload: (row.payload as Record<string, unknown>) ?? {},
    voidedBy: row.voided_by,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
    replacesDocumentId: row.replaces_document_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    certificateType: row.certificate_type,
    patient: {
      id: patient?.id ?? row.patient_id,
      fullName: patient?.full_name ?? "Unknown patient",
      studentId: patient?.student_id ?? null,
      email: patient?.email ?? null,
    },
  }
}

async function getClient(client?: SupabaseClient) {
  return client ?? (await createClient())
}

async function generateDocumentNumber(
  client: SupabaseClient,
  documentType: MedicalDocumentType
): Promise<string> {
  const prefix = DOCUMENT_NUMBER_PREFIX[documentType]
  const { data, error } = await client.rpc("next_medical_document_number", {
    p_prefix: prefix,
  })

  if (!error && typeof data === "string" && data.trim()) {
    return data.trim()
  }

  if (documentType === "medical_certification") {
    const { data: legacy, error: legacyError } = await client.rpc(
      "next_medical_certificate_number"
    )
    if (!legacyError && typeof legacy === "string" && legacy.trim()) {
      return legacy.trim()
    }
  }

  const year = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
  }).format(new Date())
  return `${prefix}-${year}-${String(Date.now()).slice(-6)}`
}

async function appendAudit(
  client: SupabaseClient,
  input: {
    documentId: string
    event: string
    actorId: string
    actorName?: string | null
    details?: Record<string, unknown>
  }
) {
  await client.from("medical_document_audit").insert({
    document_id: input.documentId,
    event: input.event,
    actor_id: input.actorId,
    actor_name: input.actorName?.trim() || null,
    details: input.details ?? {},
  })
}

function certificateTypeLabel(documentType: MedicalDocumentType): string {
  switch (documentType) {
    case "medical_certification":
      return "Medical certificate"
    case "go_home_slip":
      return "Go Home Slip"
    case "prescription":
      return "Prescription"
    case "nfg_medical_clearance":
      return "NFG Medical Clearance"
    default:
      return "Medical document"
  }
}

export async function getMedicalDocumentById(
  id: string,
  client?: SupabaseClient
): Promise<MedicalDocument> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("medical_certificates")
    .select(SELECT_WITH_PATIENT)
    .eq("id", id)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new MedicalDocumentServiceError(
      "not_found",
      "Medical document not found."
    )
  }

  return mapDocument(data as DocumentRow)
}

export async function getMedicalDocumentsByConsultation(
  consultationId: string,
  client?: SupabaseClient
): Promise<MedicalDocument[]> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("medical_certificates")
    .select(SELECT_WITH_PATIENT)
    .eq("consultation_id", consultationId)
    .neq("status", "voided")
    .order("issued_at", { ascending: false })

  if (error) mapError(error)
  return ((data ?? []) as DocumentRow[]).map(mapDocument)
}

export async function getIssuedPrescriptionForConsultation(
  consultationId: string,
  client?: SupabaseClient
): Promise<{ document: MedicalDocument; text: string } | null> {
  const documents = await getMedicalDocumentsByConsultation(consultationId, client)
  const issued = documents.find((doc) => {
    if (doc.documentType !== "prescription") return false
    const status = normalizeDocumentStatus(doc.status)
    return status === "issued" || status === "printed"
  })
  if (!issued) return null
  const payload = issued.payload as PrescriptionPayload
  const text = formatMedicationsAsPrescriptionText(payload.medications)
  return { document: issued, text }
}

export async function getMedicalDocuments(
  params: MedicalDocumentListParams = {},
  client?: SupabaseClient
): Promise<MedicalDocumentListResult> {
  const supabase = await getClient(client)
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10))

  let request = supabase.from("medical_certificates").select(SELECT_WITH_PATIENT)

  if (params.status && params.status !== "all") {
    if (params.status === "issued") {
      request = request.in("status", ["issued", "printed"])
    } else {
      request = request.eq("status", params.status)
    }
  }
  if (params.documentType && params.documentType !== "all") {
    request = request.eq("document_type", params.documentType)
  }
  if (params.consultationId) {
    request = request.eq("consultation_id", params.consultationId)
  }
  if (params.issuedBy) {
    request = request.eq("issued_by", params.issuedBy)
  }

  const { data, error } = await request
  if (error) mapError(error)

  let items = ((data ?? []) as DocumentRow[]).map(mapDocument)

  const query = params.query?.trim().toLowerCase() ?? ""
  if (query) {
    items = items.filter(
      (item) =>
        item.patient.fullName.toLowerCase().includes(query) ||
        (item.patient.studentId ?? "").toLowerCase().includes(query) ||
        item.documentNumber.toLowerCase().includes(query)
    )
  }

  if (params.dateFrom) {
    const from = Date.parse(params.dateFrom)
    items = items.filter((item) => {
      const issued = item.issuedAt ? Date.parse(item.issuedAt) : 0
      return issued >= from
    })
  }
  if (params.dateTo) {
    const to = Date.parse(params.dateTo)
    items = items.filter((item) => {
      const issued = item.issuedAt ? Date.parse(item.issuedAt) : 0
      return issued <= to
    })
  }

  items.sort((a, b) => {
    const left = a.issuedAt ? Date.parse(a.issuedAt) : Date.parse(a.createdAt)
    const right = b.issuedAt ? Date.parse(b.issuedAt) : Date.parse(b.createdAt)
    return right - left
  })

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  }
}

export async function issueMedicalDocument(
  input: IssueMedicalDocumentInput,
  client?: SupabaseClient
): Promise<MedicalDocument> {
  const supabase = await getClient(client)

  if (!input.consultationId?.trim()) {
    throw new MedicalDocumentServiceError(
      "validation",
      "A consultation is required to issue a medical document."
    )
  }
  if (!input.patientId?.trim()) {
    throw new MedicalDocumentServiceError(
      "validation",
      "A patient is required to issue a medical document."
    )
  }
  if (!input.issuedBy?.trim()) {
    throw new MedicalDocumentServiceError(
      "validation",
      "Issuer is required to issue a medical document."
    )
  }

  let operationalPatientId = input.patientId.trim()
  try {
    const operational = await ensureOperationalPatientForCertificateId(
      operationalPatientId
    )
    operationalPatientId = operational.id
  } catch (error) {
    if (error instanceof PatientRecordServiceError) {
      const code =
        error.code === "duplicate" ? "validation" : error.code
      throw new MedicalDocumentServiceError(code, error.message)
    }
    throw error
  }

  const documentNumber = await generateDocumentNumber(
    supabase,
    input.documentType
  )
  const issuedAt = new Date().toISOString()
  const payload = {
    ...input.payload,
    ...(input.licenseNumber
      ? { physicianLicenseNumber: input.licenseNumber }
      : {}),
  }

  const { data, error } = await supabase
    .from("medical_certificates")
    .insert({
      patient_id: operationalPatientId,
      certificate_number: documentNumber,
      certificate_type: certificateTypeLabel(input.documentType),
      document_type: input.documentType,
      purpose: input.purpose?.trim() || null,
      doctor_name: input.doctorName?.trim() || null,
      remarks: null,
      status: "issued",
      issued_at: issuedAt,
      issued_by: input.issuedBy.trim(),
      consultation_id: input.consultationId.trim(),
      patient_record_id: input.patientRecordId?.trim() || null,
      payload,
      template_version: input.templateVersion ?? "1",
    })
    .select(SELECT_WITH_PATIENT)
    .single()

  if (error) mapError(error)

  const document = mapDocument(data as DocumentRow)

  await appendAudit(supabase, {
    documentId: document.id,
    event: "ISSUE_MEDICAL_DOCUMENT",
    actorId: input.issuedBy,
    actorName: input.doctorName,
    details: {
      documentNumber: document.documentNumber,
      documentType: document.documentType,
      consultationId: document.consultationId,
    },
  })

  return document
}

export async function voidMedicalDocument(
  input: {
    id: string
    voidedBy: string
    voidedByName?: string | null
    reason: string
  },
  client?: SupabaseClient
): Promise<MedicalDocument> {
  const supabase = await getClient(client)
  const reason = input.reason.trim()
  if (!reason) {
    throw new MedicalDocumentServiceError(
      "validation",
      "A reason is required to void a document."
    )
  }

  const { data, error } = await supabase
    .from("medical_certificates")
    .update({
      status: "voided",
      voided_by: input.voidedBy,
      voided_at: new Date().toISOString(),
      void_reason: reason,
    })
    .eq("id", input.id)
    .neq("status", "voided")
    .select(SELECT_WITH_PATIENT)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new MedicalDocumentServiceError(
      "not_found",
      "Medical document not found or already voided."
    )
  }

  const document = mapDocument(data as DocumentRow)

  await appendAudit(supabase, {
    documentId: document.id,
    event: "VOID_MEDICAL_DOCUMENT",
    actorId: input.voidedBy,
    actorName: input.voidedByName,
    details: { reason },
  })

  return document
}

export async function logMedicalDocumentEvent(
  input: {
    documentId: string
    event: string
    actorId: string
    actorName?: string | null
    details?: Record<string, unknown>
  },
  client?: SupabaseClient
): Promise<void> {
  const supabase = await getClient(client)
  await appendAudit(supabase, input)
}
