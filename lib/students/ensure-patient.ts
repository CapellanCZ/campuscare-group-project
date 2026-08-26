import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import {
  lookupEnrolledStudentById,
  normalizeStudentId,
} from "@/lib/students/enrolled-dataset"
import {
  enrolledDisplayName,
  enrolledToCreateInput,
  enrolledToPatientRecord,
} from "@/lib/students/map-enrolled-student"
import { PATIENT_RECORD_SELECT_COLUMNS } from "@/lib/students/patient-record-select"
import type { EnrolledStudent } from "@/lib/students/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  PatientRecordServiceError,
  patientFullName,
  patientRecordFromJson,
  patientRecordToJson,
  type PatientRecord,
  type PatientRecordJson,
} from "@/types/patientRecord"

const SELECT_COLUMNS = PATIENT_RECORD_SELECT_COLUMNS

type CountJoin = { count: number | null } | { count: number | null }[] | null

type PatientRow = PatientRecordJson & {
  consultations?: CountJoin
}

function consultationCount(value: CountJoin): number {
  if (!value) return 0
  if (Array.isArray(value)) return value[0]?.count ?? 0
  return value.count ?? 0
}

function mapClinical(row: PatientRow): PatientRecord {
  return patientRecordFromJson({
    ...row,
    consultations_count: consultationCount(row.consultations ?? null),
    documents_count: 0,
  })
}

async function getUserClient(client?: SupabaseClient) {
  return client ?? (await createClient())
}

async function upsertPatientRecord(
  student: EnrolledStudent,
  client: SupabaseClient
): Promise<PatientRecord> {
  const input = enrolledToCreateInput(student)
  const base = patientRecordToJson(input)
  const payload = {
    patient_type: base.patient_type,
    student_id: base.student_id,
    employee_id: base.employee_id,
    first_name: base.first_name,
    middle_name: base.middle_name,
    last_name: base.last_name,
    course: base.course,
    year_level: base.year_level,
    gender: base.gender,
    birth_date: base.birth_date,
    civil_status: base.civil_status,
    religion: base.religion,
    nationality: base.nationality,
    blood_type: base.blood_type,
    allergies: base.allergies,
    phone: base.phone,
    email: base.email,
    address: base.address,
    emergency_contact_name: base.emergency_contact_name,
    emergency_contact_phone: base.emergency_contact_phone,
    medical_conditions: base.medical_conditions,
    notes: base.notes,
    last_visit: base.last_visit,
    family_background: student.familyBackground,
  }

  const { data: existing, error: findError } = await client
    .from("patient_records")
    .select(`${SELECT_COLUMNS}, consultations(count)`)
    .eq("student_id", student.studentId)
    .maybeSingle()

  if (findError) {
    throw new PatientRecordServiceError(
      "database",
      findError.message || "Could not look up patient record."
    )
  }

  if (existing) {
    // Keep clinic-only fields; refresh demographics from enrollment
    const { data, error } = await client
      .from("patient_records")
      .update({
        first_name: payload.first_name,
        middle_name: payload.middle_name,
        last_name: payload.last_name,
        course: payload.course,
        gender: payload.gender,
        birth_date: payload.birth_date,
        civil_status: payload.civil_status,
        religion: payload.religion,
        phone: payload.phone,
        email: payload.email,
        address: payload.address,
        emergency_contact_name: payload.emergency_contact_name,
        emergency_contact_phone: payload.emergency_contact_phone,
        family_background: student.familyBackground,
        patient_type: "student",
        employee_id: null,
      })
      .eq("id", (existing as PatientRow).id)
      .select(`${SELECT_COLUMNS}, consultations(count)`)
      .single()

    if (error) {
      throw new PatientRecordServiceError(
        "database",
        error.message || "Could not update patient record."
      )
    }

    return mapClinical(data as PatientRow)
  }

  const { data, error } = await client
    .from("patient_records")
    .insert(payload)
    .select(`${SELECT_COLUMNS}, consultations(count)`)
    .single()

  if (error) {
    throw new PatientRecordServiceError(
      "database",
      error.message || "Could not create patient record."
    )
  }

  return mapClinical(data as PatientRow)
}

async function upsertOperationalPatient(student: EnrolledStudent) {
  const admin = createAdminClient()
  const fullName = enrolledDisplayName(student)

  const { data: existing, error: findError } = await admin
    .from("patients")
    .select("id")
    .eq("student_id", student.studentId)
    .limit(1)
    .maybeSingle()

  if (findError) {
    throw new PatientRecordServiceError(
      "database",
      findError.message || "Could not look up operational patient."
    )
  }

  if (existing?.id) {
    const { data, error } = await admin
      .from("patients")
      .update({
        full_name: fullName,
        email: student.email,
        phone: student.mobile,
        date_of_birth: student.birthDate,
        sex: student.gender,
        patient_type: "student",
        affiliation: "student",
        employee_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id, full_name, student_id, email")
      .single()

    if (error) {
      throw new PatientRecordServiceError(
        "database",
        error.message || "Could not update operational patient."
      )
    }

    return {
      id: data.id as string,
      fullName: data.full_name as string,
      studentId: (data.student_id as string | null) ?? student.studentId,
      email: (data.email as string | null) ?? student.email,
    }
  }

  const { data, error } = await admin
    .from("patients")
    .insert({
      clinic_id: CAMPUS_CLINIC_ID,
      full_name: fullName,
      email: student.email,
      student_id: student.studentId,
      employee_id: null,
      phone: student.mobile,
      date_of_birth: student.birthDate,
      sex: student.gender,
      patient_type: "student",
      affiliation: "student",
      timezone: "Asia/Manila",
    })
    .select("id, full_name, student_id, email")
    .single()

  if (error) {
    throw new PatientRecordServiceError(
      "database",
      error.message || "Could not create operational patient."
    )
  }

  return {
    id: data.id as string,
    fullName: data.full_name as string,
    studentId: (data.student_id as string | null) ?? student.studentId,
    email: (data.email as string | null) ?? student.email,
  }
}

export type EnsurePatientResult = {
  clinical: PatientRecord
  operational: {
    id: string
    fullName: string
    studentId: string | null
    email: string | null
  }
}

export async function ensurePatientFromEnrollment(
  student: EnrolledStudent,
  client?: SupabaseClient
): Promise<EnsurePatientResult> {
  const supabase = await getUserClient(client)
  const [clinical, operational] = await Promise.all([
    upsertPatientRecord(student, supabase),
    upsertOperationalPatient(student),
  ])

  return {
    clinical: enrolledToPatientRecord(student, clinical),
    operational,
  }
}

export async function ensurePatientFromStudentId(
  studentId: string,
  client?: SupabaseClient
): Promise<EnsurePatientResult | null> {
  const id = normalizeStudentId(studentId)
  if (!id) return null
  const student = await lookupEnrolledStudentById(id)
  if (!student) return null
  return ensurePatientFromEnrollment(student, client)
}

/**
 * Resolve either a `patients.id` or `patient_records.id` to an operational
 * `patients` row (required for medical_certificates FK).
 */
export async function ensureOperationalPatientForCertificateId(
  patientId: string
): Promise<{
  id: string
  fullName: string
  studentId: string | null
  email: string | null
}> {
  const id = patientId.trim()
  if (!id) {
    throw new PatientRecordServiceError("validation", "Patient is required.")
  }

  const admin = createAdminClient()

  const { data: existingPatient, error: patientError } = await admin
    .from("patients")
    .select("id, full_name, student_id, employee_id, email")
    .eq("id", id)
    .maybeSingle()

  if (patientError) {
    throw new PatientRecordServiceError(
      "database",
      patientError.message || "Could not look up patient."
    )
  }

  if (existingPatient?.id) {
    return {
      id: existingPatient.id as string,
      fullName: existingPatient.full_name as string,
      studentId:
        (existingPatient.student_id as string | null) ??
        (existingPatient.employee_id as string | null),
      email: (existingPatient.email as string | null) ?? null,
    }
  }

  const { data: record, error: recordError } = await admin
    .from("patient_records")
    .select(
      "id, patient_type, student_id, employee_id, first_name, middle_name, last_name, email, phone, birth_date, gender"
    )
    .eq("id", id)
    .maybeSingle()

  if (recordError) {
    throw new PatientRecordServiceError(
      "database",
      recordError.message || "Could not look up patient record."
    )
  }

  if (!record) {
    throw new PatientRecordServiceError("not_found", "Patient not found.")
  }

  const isFaculty = record.patient_type === "faculty"
  const campusId = isFaculty
    ? ((record.employee_id as string | null)?.trim() ?? null)
    : ((record.student_id as string | null)?.trim() ?? null)

  if (campusId) {
    const byCampus = isFaculty
      ? await admin
          .from("patients")
          .select("id, full_name, student_id, employee_id, email")
          .eq("employee_id", campusId)
          .limit(1)
          .maybeSingle()
      : await admin
          .from("patients")
          .select("id, full_name, student_id, employee_id, email")
          .eq("student_id", campusId)
          .limit(1)
          .maybeSingle()

    if (byCampus.error) {
      throw new PatientRecordServiceError(
        "database",
        byCampus.error.message || "Could not look up operational patient."
      )
    }

    if (byCampus.data?.id) {
      return {
        id: byCampus.data.id as string,
        fullName: byCampus.data.full_name as string,
        studentId:
          (byCampus.data.student_id as string | null) ??
          (byCampus.data.employee_id as string | null),
        email: (byCampus.data.email as string | null) ?? null,
      }
    }

    // Prefer enrollment sync when the campus ID is in the roster.
    const fromEnrollment = await ensurePatientFromStudentId(campusId)
    if (fromEnrollment) {
      return fromEnrollment.operational
    }
  }

  const fullName = [record.first_name, record.middle_name, record.last_name]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim() || "Patient"

  const { data: created, error: createError } = await admin
    .from("patients")
    .insert({
      clinic_id: CAMPUS_CLINIC_ID,
      full_name: fullName,
      email: (record.email as string | null) ?? null,
      student_id: isFaculty ? null : campusId,
      employee_id: isFaculty ? campusId : null,
      phone: (record.phone as string | null) ?? null,
      date_of_birth: (record.birth_date as string | null) ?? null,
      sex: (record.gender as string | null) ?? null,
      patient_type: isFaculty ? "faculty" : "student",
      affiliation: isFaculty ? "faculty" : "student",
      timezone: "Asia/Manila",
    })
    .select("id, full_name, student_id, employee_id, email")
    .single()

  if (createError || !created?.id) {
    throw new PatientRecordServiceError(
      "database",
      createError?.message || "Could not create operational patient."
    )
  }

  return {
    id: created.id as string,
    fullName: created.full_name as string,
    studentId:
      (created.student_id as string | null) ??
      (created.employee_id as string | null),
    email: (created.email as string | null) ?? null,
  }
}

export function clinicalName(patient: PatientRecord): string {
  return patientFullName(patient)
}
