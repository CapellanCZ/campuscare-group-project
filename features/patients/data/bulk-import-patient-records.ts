import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  PatientRecordServiceError,
  patientFullName,
  patientRecordToJson,
  type CreatePatientRecordInput,
  type PatientType,
} from "@/types/patientRecord"

const CLINICAL_BATCH = 400
const OPERATIONAL_BATCH = 400
const UPDATE_CONCURRENCY = 40

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return []
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
) {
  if (items.length === 0) return
  let index = 0
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (index < items.length) {
        const current = index
        index += 1
        await worker(items[current]!)
      }
    }
  )
  await Promise.all(runners)
}

function demographicUpdatePayload(input: CreatePatientRecordInput) {
  const json = patientRecordToJson(input)
  return {
    patient_type: json.patient_type,
    student_id: json.student_id,
    employee_id: json.employee_id,
    first_name: json.first_name,
    middle_name: json.middle_name,
    last_name: json.last_name,
    course: json.course,
    year_level: json.year_level,
    gender: json.gender,
    birth_date: json.birth_date,
    civil_status: json.civil_status,
    religion: json.religion,
    nationality: json.nationality,
    blood_type: json.blood_type,
    phone: json.phone,
    email: json.email,
    address: json.address,
    emergency_contact_name: json.emergency_contact_name,
    emergency_contact_phone: json.emergency_contact_phone,
    family_background: json.family_background ?? null,
    // Roster import only fills these when provided; keep null out of updates
    // so existing clinical chart fields are not wiped (handled by not sending
    // medical_history / physical_exam / allergies / medical_conditions / notes).
  }
}

function mapError(error: { message?: string; code?: string }): never {
  throw new PatientRecordServiceError(
    "database",
    error.message || "Patient import failed."
  )
}

/**
 * High-throughput roster import:
 * - batch insert new clinical rows
 * - concurrent demographic updates for existing rows (preserves medical chart)
 * - batch mirror into operational `patients`
 * - skips per-row auth provisioning (too slow for thousands of rows)
 */
export async function bulkImportPatientRecords(
  inputs: CreatePatientRecordInput[],
  client?: SupabaseClient
): Promise<{
  created: number
  updated: number
  typeCounts: Record<PatientType, number>
}> {
  const supabase = client ?? (await createClient())
  const admin = createAdminClient()

  const typeCounts: Record<PatientType, number> = {
    student: 0,
    faculty: 0,
    employee: 0,
    visitor: 0,
  }
  for (const input of inputs) {
    typeCounts[input.patientType] += 1
  }

  let created = 0
  let updated = 0

  const students = inputs.filter(
    (row) => row.patientType === "student" && row.studentId?.trim()
  )
  const employees = inputs.filter(
    (row) =>
      (row.patientType === "faculty" || row.patientType === "employee") &&
      row.employeeId?.trim()
  )
  const visitors = inputs.filter((row) => row.patientType === "visitor")

  async function upsertByCampusId(
    rows: CreatePatientRecordInput[],
    key: "student_id" | "employee_id",
    getId: (row: CreatePatientRecordInput) => string
  ) {
    for (const batch of chunk(rows, CLINICAL_BATCH)) {
      const ids = batch.map(getId)
      const { data: existingRows, error: findError } = await supabase
        .from("patient_records")
        .select(`id, ${key}`)
        .in(key, ids)
      if (findError) mapError(findError)

      const existingByCampus = new Map(
        (existingRows ?? []).map((row) => [
          String((row as Record<string, unknown>)[key] ?? ""),
          String((row as { id: string }).id),
        ])
      )

      const toInsert = batch.filter((row) => !existingByCampus.has(getId(row)))
      const toUpdate = batch.filter((row) => existingByCampus.has(getId(row)))

      if (toInsert.length > 0) {
        const payload = toInsert.map((row) => patientRecordToJson(row))
        const { error } = await supabase.from("patient_records").insert(payload)
        if (error) mapError(error)
        created += toInsert.length
      }

      if (toUpdate.length > 0) {
        await mapPool(toUpdate, UPDATE_CONCURRENCY, async (row) => {
          const campusId = getId(row)
          const { error } = await supabase
            .from("patient_records")
            .update(demographicUpdatePayload(row))
            .eq(key, campusId)
          if (error) mapError(error)
        })
        updated += toUpdate.length
      }
    }
  }

  await upsertByCampusId(students, "student_id", (row) =>
    (row.studentId ?? "").trim()
  )
  await upsertByCampusId(employees, "employee_id", (row) =>
    (row.employeeId ?? "").trim()
  )

  // Visitors have no stable campus unique key — insert only.
  for (const batch of chunk(visitors, CLINICAL_BATCH)) {
    if (batch.length === 0) continue
    const payload = batch.map((row) => patientRecordToJson(row))
    const { error } = await supabase.from("patient_records").insert(payload)
    if (error) mapError(error)
    created += batch.length
  }

  // Mirror into operational patients (no auth provisioning — keeps large imports fast).
  const mirrorRows = [...students, ...employees]
  for (const batch of chunk(mirrorRows, OPERATIONAL_BATCH)) {
    const studentIds = batch
      .filter((row) => row.patientType === "student")
      .map((row) => (row.studentId ?? "").trim())
      .filter(Boolean)
    const employeeIds = batch
      .filter(
        (row) =>
          row.patientType === "faculty" || row.patientType === "employee"
      )
      .map((row) => (row.employeeId ?? "").trim())
      .filter(Boolean)

    const existingOps: Array<{
      id: string
      student_id: string | null
      employee_id: string | null
    }> = []

    if (studentIds.length > 0) {
      const { data, error } = await admin
        .from("patients")
        .select("id, student_id, employee_id")
        .in("student_id", studentIds)
      if (error) mapError(error)
      existingOps.push(...((data as typeof existingOps) ?? []))
    }
    if (employeeIds.length > 0) {
      const { data, error } = await admin
        .from("patients")
        .select("id, student_id, employee_id")
        .in("employee_id", employeeIds)
      if (error) mapError(error)
      existingOps.push(...((data as typeof existingOps) ?? []))
    }

    const byStudent = new Map(
      existingOps
        .filter((row) => row.student_id)
        .map((row) => [row.student_id as string, row.id])
    )
    const byEmployee = new Map(
      existingOps
        .filter((row) => row.employee_id)
        .map((row) => [row.employee_id as string, row.id])
    )

    const now = new Date().toISOString()
    const toInsertOps: Record<string, unknown>[] = []
    const toUpdateOps: Array<{ id: string; body: Record<string, unknown> }> =
      []

    for (const row of batch) {
      const isStudent = row.patientType === "student"
      const studentId = isStudent ? (row.studentId ?? "").trim() || null : null
      const employeeId =
        row.patientType === "faculty" || row.patientType === "employee"
          ? (row.employeeId ?? "").trim() || null
          : null
      const body = {
        full_name: patientFullName(row),
        email: row.email,
        phone: row.phone,
        date_of_birth: row.birthDate,
        sex: row.gender,
        patient_type: row.patientType,
        affiliation: row.patientType,
        student_id: studentId,
        employee_id: employeeId,
        updated_at: now,
      }
      const existingId = studentId
        ? byStudent.get(studentId)
        : employeeId
          ? byEmployee.get(employeeId)
          : undefined
      if (existingId) {
        toUpdateOps.push({ id: existingId, body })
      } else {
        toInsertOps.push({
          clinic_id: CAMPUS_CLINIC_ID,
          timezone: "Asia/Manila",
          ...body,
        })
      }
    }

    if (toInsertOps.length > 0) {
      for (const insertBatch of chunk(toInsertOps, OPERATIONAL_BATCH)) {
        const { error } = await admin.from("patients").insert(insertBatch)
        if (error) mapError(error)
      }
    }

    if (toUpdateOps.length > 0) {
      await mapPool(toUpdateOps, UPDATE_CONCURRENCY, async (item) => {
        const { error } = await admin
          .from("patients")
          .update(item.body)
          .eq("id", item.id)
        if (error) mapError(error)
      })
    }
  }

  return { created, updated, typeCounts }
}
