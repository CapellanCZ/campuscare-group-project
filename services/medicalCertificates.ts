import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import { ensureOperationalPatientForCertificateId } from "@/lib/students/ensure-patient"
import {
  MEDICAL_CERTIFICATE_STATUSES,
  MedicalCertificateServiceError,
  type CreateMedicalCertificateInput,
  type MedicalCertificate,
  type MedicalCertificateListParams,
  type MedicalCertificateListResult,
  type MedicalCertificatePatient,
  type MedicalCertificateStats,
  type MedicalCertificateStatus,
  type UpdateMedicalCertificateInput,
} from "@/types/medicalCertificate"
import { PatientRecordServiceError } from "@/types/patientRecord"

type PatientJoin = {
  id: string
  full_name: string
  student_id: string | null
  email: string | null
}

type CertificateRow = {
  id: string
  patient_id: string
  certificate_number: string
  certificate_type: string
  purpose: string | null
  doctor_name: string | null
  remarks: string | null
  status: string
  issued_at: string | null
  valid_until: string | null
  issued_by?: string | null
  created_at: string
  updated_at: string
  patients: PatientJoin | PatientJoin[] | null
}

const DEFAULT_PAGE_SIZE = 10
const SELECT_WITH_PATIENT = `
  id,
  patient_id,
  certificate_number,
  certificate_type,
  purpose,
  doctor_name,
  remarks,
  status,
  issued_at,
  valid_until,
  issued_by,
  created_at,
  updated_at,
  patients (
    id,
    full_name,
    student_id,
    email
  )
`

function isStatus(value: string): value is MedicalCertificateStatus {
  return (MEDICAL_CERTIFICATE_STATUSES as readonly string[]).includes(value)
}

function mapError(error: { message: string; code?: string }): never {
  const message = error.message.toLowerCase()
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    throw new MedicalCertificateServiceError(
      "offline",
      "Unable to reach the database. Check your connection and try again."
    )
  }
  if (
    error.code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    throw new MedicalCertificateServiceError(
      "permission",
      "You do not have permission to access medical certificates."
    )
  }
  if (error.code === "PGRST116" || message.includes("0 rows")) {
    throw new MedicalCertificateServiceError(
      "not_found",
      "Medical certificate not found."
    )
  }
  throw new MedicalCertificateServiceError(
    "database",
    error.message || "A database error occurred while loading certificates."
  )
}

function patientJoin(value: PatientJoin | PatientJoin[] | null): PatientJoin | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapCertificate(row: CertificateRow): MedicalCertificate {
  if (!isStatus(row.status)) {
    throw new MedicalCertificateServiceError(
      "database",
      `Unexpected certificate status: ${row.status}`
    )
  }

  const patient = patientJoin(row.patients)

  return {
    id: row.id,
    patientId: row.patient_id,
    certificateNumber: row.certificate_number,
    certificateType: row.certificate_type,
    purpose: row.purpose,
    doctorName: row.doctor_name,
    remarks: row.remarks,
    status:
      row.status === "printed" ? "issued" : row.status,
    issuedAt: row.issued_at,
    validUntil: row.valid_until,
    issuedBy: row.issued_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    patient: {
      id: patient?.id ?? row.patient_id,
      fullName: patient?.full_name ?? "Unknown patient",
      studentId: patient?.student_id ?? null,
      email: patient?.email ?? null,
    },
  }
}

function manilaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value ?? "1970"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const day = parts.find((part) => part.type === "day")?.value ?? "01"

  return { year, month, day, isoDate: `${year}-${month}-${day}` }
}

async function getClient(client?: SupabaseClient) {
  return client ?? (await createClient())
}

async function generateCertificateNumber(
  client: SupabaseClient
): Promise<string> {
  const { data, error } = await client.rpc("next_medical_certificate_number")

  if (!error && typeof data === "string" && data.trim()) {
    return data.trim()
  }

  // Fallback if RPC is unavailable: still prefer unique-ish value over colliding "0001".
  const { year } = manilaDateParts()
  const prefix = `MC-${year}-`
  const stamp = String(Date.now()).slice(-6)
  return `${prefix}${stamp}`
}

function isUniqueCertificateNumberViolation(error: {
  message: string
  code?: string
}): boolean {
  const message = error.message.toLowerCase()
  return (
    error.code === "23505" ||
    message.includes("medical_certificates_certificate_number_key") ||
    (message.includes("duplicate key") && message.includes("certificate_number"))
  )
}

export async function getMedicalCertificates(
  params: MedicalCertificateListParams = {},
  client?: SupabaseClient
): Promise<MedicalCertificateListResult> {
  const supabase = await getClient(client)
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))
  const sortBy = params.sortBy ?? "issued_at"
  const sortDirection = params.sortDirection ?? "desc"
  const query = params.query?.trim() ?? ""
  const status = params.status ?? "all"
  const ascending = sortDirection === "asc"

  let request = supabase
    .from("medical_certificates")
    .select(SELECT_WITH_PATIENT, { count: "exact" })

  if (status !== "all") {
    request = request.eq("status", status)
  }
  if (params.issuedBy) {
    request = request.eq("issued_by", params.issuedBy)
  }

  if (query) {
    const escaped = query.replace(/[%_,]/g, "")
    if (escaped) {
      const pattern = `%${escaped}%`
      const { data: patientHits, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .or(
          [
            `full_name.ilike.${pattern}`,
            `student_id.ilike.${pattern}`,
            `employee_id.ilike.${pattern}`,
            `email.ilike.${pattern}`,
          ].join(",")
        )
        .limit(200)

      if (patientError) mapError(patientError)

      const patientIds = (patientHits ?? []).map((row) => row.id as string)
      const orParts = [
        `certificate_number.ilike.${pattern}`,
        `purpose.ilike.${pattern}`,
        `doctor_name.ilike.${pattern}`,
      ]
      if (patientIds.length > 0) {
        orParts.push(`patient_id.in.(${patientIds.join(",")})`)
      }
      request = request.or(orParts.join(","))
    }
  }

  if (sortBy === "status") {
    request = request.order("status", { ascending })
  } else if (sortBy === "created_at") {
    request = request.order("created_at", { ascending })
  } else if (sortBy === "certificate_type") {
    request = request.order("certificate_type", { ascending })
  } else if (sortBy === "certificate_number") {
    request = request.order("certificate_number", { ascending })
  } else {
    request = request.order("issued_at", {
      ascending,
      nullsFirst: false,
    })
  }
  request = request.order("created_at", { ascending: false })

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await request.range(from, to)

  if (error) mapError(error)

  const items = ((data ?? []) as CertificateRow[]).map(mapCertificate)
  const total = count ?? items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
  }
}

export async function searchMedicalCertificates(
  query: string,
  params: Omit<MedicalCertificateListParams, "query"> = {},
  client?: SupabaseClient
): Promise<MedicalCertificateListResult> {
  return getMedicalCertificates({ ...params, query }, client)
}

export async function getMedicalCertificateById(
  id: string,
  client?: SupabaseClient
): Promise<MedicalCertificate> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("medical_certificates")
    .select(SELECT_WITH_PATIENT)
    .eq("id", id)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new MedicalCertificateServiceError(
      "not_found",
      "Medical certificate not found."
    )
  }

  return mapCertificate(data as CertificateRow)
}

export async function getMedicalCertificateStats(
  issuedBy?: string | null,
  client?: SupabaseClient
): Promise<MedicalCertificateStats> {
  const supabase = await getClient(client)
  const { year, month, isoDate } = manilaDateParts()
  const monthPrefix = `${year}-${month}`
  const dayStart = `${isoDate}T00:00:00+08:00`
  const dayEnd = `${isoDate}T23:59:59.999+08:00`
  const monthStart = `${monthPrefix}-01T00:00:00+08:00`

  let draftsQ = supabase
    .from("medical_certificates")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft")
  let pendingQ = supabase
    .from("medical_certificates")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
  let monthQ = supabase
    .from("medical_certificates")
    .select("id", { count: "exact", head: true })
    .eq("status", "issued")
    .gte("issued_at", monthStart)
  let todayQ = supabase
    .from("medical_certificates")
    .select("id", { count: "exact", head: true })
    .eq("status", "issued")
    .gte("issued_at", dayStart)
    .lte("issued_at", dayEnd)

  if (issuedBy) {
    draftsQ = draftsQ.eq("issued_by", issuedBy)
    pendingQ = pendingQ.eq("issued_by", issuedBy)
    monthQ = monthQ.eq("issued_by", issuedBy)
    todayQ = todayQ.eq("issued_by", issuedBy)
  }

  const [draftsRes, pendingRes, monthRes, todayRes] = await Promise.all([
    draftsQ,
    pendingQ,
    monthQ,
    todayQ,
  ])

  for (const result of [draftsRes, pendingRes, monthRes, todayRes]) {
    if (result.error) mapError(result.error)
  }

  return {
    issuedThisMonth: monthRes.count ?? 0,
    issuedToday: todayRes.count ?? 0,
    drafts: draftsRes.count ?? 0,
    pending: pendingRes.count ?? 0,
  }
}

export async function createMedicalCertificate(
  input: CreateMedicalCertificateInput,
  client?: SupabaseClient
): Promise<MedicalCertificate> {
  const supabase = await getClient(client)

  if (!input.patientId.trim()) {
    throw new MedicalCertificateServiceError(
      "validation",
      "A patient is required to create a certificate."
    )
  }
  if (!input.issuedBy?.trim()) {
    throw new MedicalCertificateServiceError(
      "validation",
      "Issuer is required to create a certificate."
    )
  }
  if (!input.certificateType.trim()) {
    throw new MedicalCertificateServiceError(
      "validation",
      "Certificate type is required."
    )
  }

  const hasDoctor = Boolean(input.doctorName?.trim())
  const hasType = Boolean(input.certificateType.trim())
  const status =
    hasDoctor && hasType
      ? ("issued" as const)
      : ("draft" as const)
  const providedNumber = input.certificateNumber?.trim() || null

  const issuedAt =
    status === "issued"
      ? (input.issuedAt ?? new Date().toISOString())
      : (input.issuedAt ?? null)

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
      throw new MedicalCertificateServiceError(code, error.message)
    }
    throw error
  }

  const maxAttempts = providedNumber ? 1 : 3
  let lastError: { message: string; code?: string } | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const certificateNumber =
      providedNumber ?? (await generateCertificateNumber(supabase))

    const { data, error } = await supabase
      .from("medical_certificates")
      .insert({
        patient_id: operationalPatientId,
        certificate_number: certificateNumber,
        certificate_type: input.certificateType.trim(),
        purpose: input.purpose?.trim() || null,
        doctor_name: input.doctorName?.trim() || null,
        remarks: input.remarks?.trim() || null,
        status,
        issued_at: issuedAt,
        valid_until: input.validUntil ?? null,
        issued_by: input.issuedBy.trim(),
      })
      .select(SELECT_WITH_PATIENT)
      .single()

    if (!error) {
      return mapCertificate(data as CertificateRow)
    }

    lastError = error
    if (providedNumber || !isUniqueCertificateNumberViolation(error)) {
      mapError(error)
    }
  }

  if (lastError) mapError(lastError)
  throw new MedicalCertificateServiceError(
    "database",
    "Could not allocate a unique certificate number. Please try again."
  )
}

export async function updateMedicalCertificate(
  input: UpdateMedicalCertificateInput,
  client?: SupabaseClient
): Promise<MedicalCertificate> {
  const supabase = await getClient(client)

  if (!input.id) {
    throw new MedicalCertificateServiceError(
      "validation",
      "Certificate id is required."
    )
  }

  const patch: Record<string, string | null> = {}
  if (input.patientId !== undefined) {
    try {
      const operational = await ensureOperationalPatientForCertificateId(
        input.patientId
      )
      patch.patient_id = operational.id
    } catch (error) {
      if (error instanceof PatientRecordServiceError) {
        const code =
          error.code === "duplicate" ? "validation" : error.code
        throw new MedicalCertificateServiceError(code, error.message)
      }
      throw error
    }
  }
  if (input.certificateNumber !== undefined) {
    patch.certificate_number = input.certificateNumber.trim()
  }
  if (input.certificateType !== undefined) {
    patch.certificate_type = input.certificateType.trim()
  }
  if (input.purpose !== undefined) {
    patch.purpose = input.purpose?.trim() || null
  }
  if (input.doctorName !== undefined) {
    patch.doctor_name = input.doctorName?.trim() || null
  }
  if (input.remarks !== undefined) {
    patch.remarks = input.remarks?.trim() || null
  }
  if (input.issuedAt !== undefined) patch.issued_at = input.issuedAt
  if (input.validUntil !== undefined) patch.valid_until = input.validUntil

  // Derive status server-side when completing a certificate.
  const doctorName =
    input.doctorName !== undefined
      ? input.doctorName?.trim() || null
      : undefined
  const certificateType =
    input.certificateType !== undefined
      ? input.certificateType.trim()
      : undefined
  if (
    (doctorName !== undefined && doctorName) ||
    (certificateType !== undefined && certificateType)
  ) {
    patch.status = "issued"
    if (!patch.issued_at) {
      patch.issued_at = input.issuedAt ?? new Date().toISOString()
    }
  }

  if (Object.keys(patch).length === 0) {
    return getMedicalCertificateById(input.id, supabase)
  }

  const { data, error } = await supabase
    .from("medical_certificates")
    .update(patch)
    .eq("id", input.id)
    .select(SELECT_WITH_PATIENT)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new MedicalCertificateServiceError(
      "not_found",
      "Medical certificate not found."
    )
  }

  return mapCertificate(data as CertificateRow)
}

export async function listCertificatePatients(
  client?: SupabaseClient
): Promise<MedicalCertificatePatient[]> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, student_id, email")
    .order("full_name", { ascending: true })

  if (error) mapError(error)

  return (data ?? []).map((row) => ({
    id: row.id as string,
    fullName: row.full_name as string,
    studentId: (row.student_id as string | null) ?? null,
    email: (row.email as string | null) ?? null,
  }))
}

/**
 * Certificates for a clinical patient_records row (soft-linked via campus ID).
 */
export async function getMedicalCertificatesForPatientRecord(
  input: {
    studentId?: string | null
    employeeId?: string | null
  },
  client?: SupabaseClient
): Promise<MedicalCertificate[]> {
  const supabase = await getClient(client)
  const studentId = input.studentId?.trim() || null
  const employeeId = input.employeeId?.trim() || null

  if (!studentId && !employeeId) return []

  let patientQuery = supabase.from("patients").select("id").limit(1)
  if (studentId) {
    patientQuery = patientQuery.eq("student_id", studentId)
  } else if (employeeId) {
    patientQuery = patientQuery.eq("employee_id", employeeId)
  }

  const { data: patient, error: patientError } = await patientQuery.maybeSingle()
  if (patientError) mapError(patientError)
  if (!patient?.id) return []

  const { data, error } = await supabase
    .from("medical_certificates")
    .select(SELECT_WITH_PATIENT)
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false })

  if (error) mapError(error)
  return ((data ?? []) as CertificateRow[])
    .map(mapCertificate)
    .sort((a, b) => {
      const left = a.issuedAt ? Date.parse(a.issuedAt) : Date.parse(a.createdAt)
      const right = b.issuedAt ? Date.parse(b.issuedAt) : Date.parse(b.createdAt)
      return right - left
    })
}

export async function countMedicalCertificates(
  client?: SupabaseClient
): Promise<number> {
  const supabase = await getClient(client)
  const { count, error } = await supabase
    .from("medical_certificates")
    .select("id", { count: "exact", head: true })

  if (error) mapError(error)
  return count ?? 0
}

export async function deleteMedicalCertificate(
  id: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = await getClient(client)
  const { error, count } = await supabase
    .from("medical_certificates")
    .delete({ count: "exact" })
    .eq("id", id)

  if (error) mapError(error)
  if (!count) {
    throw new MedicalCertificateServiceError(
      "not_found",
      "Medical certificate not found."
    )
  }
}
