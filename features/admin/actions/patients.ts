"use server"

import {
  getAdminClientSafe,
  requireAdminAccess,
  type AdminActionResult,
} from "@/features/admin/lib/admin-access"
import { parseExcelRows } from "@/features/admin/lib/excel"
import { resolveCampusClinicId } from "@/lib/auth/campus-clinic"
import {
  normalizePatientType,
  type PatientType,
} from "@/types/patientRecord"

export type PatientAffiliation = PatientType

export type PatientRecord = {
  id: string
  fullName: string
  email: string | null
  studentId: string | null
  employeeId: string | null
  phone: string | null
  dateOfBirth: string | null
  sex: string | null
  patientType: PatientType | null
  /** @deprecated Prefer patientType */
  affiliation: PatientType | null
}

export type ListPatientsResult =
  | {
      ok: true
      patients: PatientRecord[]
      query: string
      patientType: PatientType | "all"
    }
  | { ok: false; error: string }

async function resolveClinicId() {
  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) return adminClientResult

  const clinicId = await resolveCampusClinicId(adminClientResult.client)
  if (!clinicId) {
    return {
      ok: false as const,
      error: "No campus clinic is set up yet. Ask a developer to seed the clinic.",
    }
  }
  return { ok: true as const, clinicId }
}

function campusIdsForType(input: {
  patientType: PatientType
  studentId?: string
  employeeId?: string
}) {
  if (input.patientType === "student") {
    const studentId = input.studentId?.trim() || ""
    if (!studentId) {
      return { ok: false as const, error: "Enter the student ID." }
    }
    return {
      ok: true as const,
      studentId,
      employeeId: null as string | null,
    }
  }

  const employeeId = input.employeeId?.trim() || ""
  if (!employeeId) {
    return { ok: false as const, error: "Enter the employee / faculty ID." }
  }
  return {
    ok: true as const,
    studentId: null as string | null,
    employeeId,
  }
}

export async function listPatients(input: {
  query?: string
  patientType?: PatientType | "all"
  /** @deprecated Prefer patientType */
  affiliation?: PatientType | "all"
} = {}): Promise<ListPatientsResult> {
  const authz = await requireAdminAccess()
  if (!authz.ok) return authz

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) return adminClientResult

  const query = (input.query ?? "").trim().toLowerCase()
  const patientType = input.patientType ?? input.affiliation ?? "all"

  const { data, error } = await adminClientResult.client
    .from("patients")
    .select(
      "id, full_name, email, student_id, employee_id, phone, date_of_birth, sex, patient_type, affiliation"
    )
    .order("full_name")

  if (error) {
    return { ok: false, error: `Could not load patients. ${error.message}` }
  }

  const patients = (data ?? [])
    .map((row) => {
      const type =
        normalizePatientType(row.patient_type as string | undefined) ??
        normalizePatientType(row.affiliation as string | undefined)
      return {
        id: row.id as string,
        fullName: row.full_name as string,
        email: (row.email as string | null) ?? null,
        studentId: (row.student_id as string | null) ?? null,
        employeeId: (row.employee_id as string | null) ?? null,
        phone: (row.phone as string | null) ?? null,
        dateOfBirth: (row.date_of_birth as string | null) ?? null,
        sex: (row.sex as string | null) ?? null,
        patientType: type,
        affiliation: type,
      }
    })
    .filter((patient) => {
      if (patientType !== "all" && patient.patientType !== patientType) {
        return false
      }
      if (!query) return true
      const target =
        `${patient.fullName} ${patient.email ?? ""} ${patient.studentId ?? ""} ${patient.employeeId ?? ""} ${patient.phone ?? ""} ${patient.patientType ?? ""}`.toLowerCase()
      return target.includes(query)
    })

  return {
    ok: true,
    patients,
    query: input.query?.trim() ?? "",
    patientType,
  }
}

export async function createPatient(input: {
  fullName: string
  email?: string
  studentId?: string
  employeeId?: string
  phone?: string
  dateOfBirth?: string
  sex?: string
  patientType?: string
  /** @deprecated Prefer patientType */
  affiliation?: string
}): Promise<AdminActionResult> {
  const authz = await requireAdminAccess()
  if (!authz.ok) return authz

  const fullName = input.fullName.trim()
  if (!fullName) return { ok: false, error: "Enter the patient full name." }

  const patientType = normalizePatientType(
    input.patientType ?? input.affiliation
  )
  if (!patientType) {
    return { ok: false, error: "Choose student or faculty." }
  }

  const ids = campusIdsForType({
    patientType,
    studentId: input.studentId,
    employeeId: input.employeeId,
  })
  if (!ids.ok) return ids

  const clinic = await resolveClinicId()
  if (!clinic.ok) return clinic

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) return adminClientResult

  const { error } = await adminClientResult.client.from("patients").insert({
    clinic_id: clinic.clinicId,
    full_name: fullName,
    email: input.email?.trim().toLowerCase() || null,
    student_id: ids.studentId,
    employee_id: ids.employeeId,
    phone: input.phone?.trim() || null,
    date_of_birth: input.dateOfBirth?.trim() || null,
    sex: input.sex?.trim() || null,
    patient_type: patientType,
    affiliation: patientType,
    timezone: "Asia/Manila",
  })

  if (error) {
    return { ok: false, error: `Could not create patient. ${error.message}` }
  }

  return { ok: true, message: `Patient “${fullName}” created.` }
}

export async function updatePatient(input: {
  patientId: string
  fullName: string
  email?: string
  studentId?: string
  employeeId?: string
  phone?: string
  dateOfBirth?: string
  sex?: string
  patientType?: string
  /** @deprecated Prefer patientType */
  affiliation?: string
}): Promise<AdminActionResult> {
  const authz = await requireAdminAccess()
  if (!authz.ok) return authz

  const fullName = input.fullName.trim()
  if (!input.patientId) return { ok: false, error: "Missing patient id." }
  if (!fullName) return { ok: false, error: "Enter the patient full name." }

  const patientType = normalizePatientType(
    input.patientType ?? input.affiliation
  )
  if (!patientType) {
    return { ok: false, error: "Choose student or faculty." }
  }

  const ids = campusIdsForType({
    patientType,
    studentId: input.studentId,
    employeeId: input.employeeId,
  })
  if (!ids.ok) return ids

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) return adminClientResult

  const { error } = await adminClientResult.client
    .from("patients")
    .update({
      full_name: fullName,
      email: input.email?.trim().toLowerCase() || null,
      student_id: ids.studentId,
      employee_id: ids.employeeId,
      phone: input.phone?.trim() || null,
      date_of_birth: input.dateOfBirth?.trim() || null,
      sex: input.sex?.trim() || null,
      patient_type: patientType,
      affiliation: patientType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.patientId)

  if (error) {
    return { ok: false, error: `Could not update patient. ${error.message}` }
  }

  return { ok: true, message: `Patient “${fullName}” updated.` }
}

export async function deletePatient(input: {
  patientId: string
}): Promise<AdminActionResult> {
  const authz = await requireAdminAccess()
  if (!authz.ok) return authz

  if (!input.patientId) return { ok: false, error: "Missing patient id." }

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) return adminClientResult

  const { error } = await adminClientResult.client
    .from("patients")
    .delete()
    .eq("id", input.patientId)

  if (error) {
    return { ok: false, error: `Could not delete patient. ${error.message}` }
  }

  return { ok: true, message: "Patient deleted." }
}

export async function importPatientsFromExcel(
  formData: FormData
): Promise<AdminActionResult> {
  const authz = await requireAdminAccess()
  if (!authz.ok) return authz

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an Excel file to import." }
  }

  const rows = await parseExcelRows(await file.arrayBuffer())
  if (rows.length === 0) {
    return { ok: false, error: "No rows found in the spreadsheet." }
  }

  const clinic = await resolveClinicId()
  if (!clinic.ok) return clinic

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) return adminClientResult
  const admin = adminClientResult.client

  let created = 0
  const failures: string[] = []

  for (const [index, row] of rows.entries()) {
    const fullName = (row.full_name || row.name || "").trim()
    const patientType =
      normalizePatientType(
        row.patient_type || row.affiliation || row.type || row.category
      ) ?? "student"

    if (!fullName) {
      failures.push(`Row ${index + 2}: missing full_name`)
      continue
    }

    const studentId = (row.student_id || "").trim()
    const employeeId = (row.employee_id || row.id_number || "").trim()
    const ids = campusIdsForType({
      patientType,
      studentId:
        patientType === "student"
          ? studentId || employeeId
          : studentId,
      employeeId:
        patientType === "faculty"
          ? employeeId || studentId
          : employeeId,
    })
    if (!ids.ok) {
      failures.push(`Row ${index + 2}: ${ids.error}`)
      continue
    }

    const { error } = await admin.from("patients").insert({
      clinic_id: clinic.clinicId,
      full_name: fullName,
      email: (row.email || "").trim().toLowerCase() || null,
      student_id: ids.studentId,
      employee_id: ids.employeeId,
      phone: (row.phone || "").trim() || null,
      date_of_birth: (row.date_of_birth || row.dob || "").trim() || null,
      sex: (row.sex || "").trim() || null,
      patient_type: patientType,
      affiliation: patientType,
      timezone: "Asia/Manila",
    })

    if (error) {
      failures.push(`Row ${index + 2}: ${error.message}`)
      continue
    }
    created += 1
  }

  if (created === 0) {
    return {
      ok: false,
      error:
        failures[0] ??
        "No patients imported. Headers: full_name, email, student_id, employee_id, phone, date_of_birth, sex, patient_type",
    }
  }

  return {
    ok: true,
    message: `Imported ${created} patient${created === 1 ? "" : "s"}.`,
    warning:
      failures.length > 0
        ? `${failures.length} row(s) failed. ${failures.slice(0, 3).join(" · ")}`
        : undefined,
  }
}
