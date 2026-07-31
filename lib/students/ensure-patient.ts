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
  const payload = patientRecordToJson(input)

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

export function clinicalName(patient: PatientRecord): string {
  return patientFullName(patient)
}
