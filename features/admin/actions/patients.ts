"use server"

import {
  getAdminClientSafe,
  requireAdminAccess,
  type AdminActionResult,
} from "@/features/admin/lib/admin-access"
import { parseExcelRows } from "@/features/admin/lib/excel"

export type PatientAffiliation = "student" | "faculty"

export type PatientRecord = {
  id: string
  fullName: string
  email: string | null
  studentId: string | null
  phone: string | null
  dateOfBirth: string | null
  sex: string | null
  affiliation: PatientAffiliation | null
}

export type ListPatientsResult =
  | {
      ok: true
      patients: PatientRecord[]
      query: string
      affiliation: PatientAffiliation | "all"
    }
  | { ok: false; error: string }

async function resolveClinicId() {
  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) return adminClientResult

  const { data, error } = await adminClientResult.client
    .from("clinics")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { ok: false as const, error: `Could not resolve clinic. ${error.message}` }
  }
  if (!data?.id) {
    return {
      ok: false as const,
      error: "No clinic is set up yet. Ask a developer to seed the clinic record.",
    }
  }
  return { ok: true as const, clinicId: data.id as string }
}

function normalizeAffiliation(value?: string): PatientAffiliation | null {
  const raw = (value ?? "").trim().toLowerCase()
  if (raw === "student" || raw === "faculty") return raw
  return null
}

export async function listPatients(input: {
  query?: string
  affiliation?: PatientAffiliation | "all"
} = {}): Promise<ListPatientsResult> {
  const authz = await requireAdminAccess()
  if (!authz.ok) return authz

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) return adminClientResult

  const query = (input.query ?? "").trim().toLowerCase()
  const affiliation = input.affiliation ?? "all"

  const { data, error } = await adminClientResult.client
    .from("patients")
    .select(
      "id, full_name, email, student_id, phone, date_of_birth, sex, affiliation"
    )
    .order("full_name")

  if (error) {
    return { ok: false, error: `Could not load patients. ${error.message}` }
  }

  const patients = (data ?? [])
    .map((row) => ({
      id: row.id as string,
      fullName: row.full_name as string,
      email: (row.email as string | null) ?? null,
      studentId: (row.student_id as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      dateOfBirth: (row.date_of_birth as string | null) ?? null,
      sex: (row.sex as string | null) ?? null,
      affiliation: normalizeAffiliation(row.affiliation as string | undefined),
    }))
    .filter((patient) => {
      if (affiliation !== "all" && patient.affiliation !== affiliation) return false
      if (!query) return true
      const target =
        `${patient.fullName} ${patient.email ?? ""} ${patient.studentId ?? ""} ${patient.phone ?? ""}`.toLowerCase()
      return target.includes(query)
    })

  return {
    ok: true,
    patients,
    query: input.query?.trim() ?? "",
    affiliation,
  }
}

export async function createPatient(input: {
  fullName: string
  email?: string
  studentId?: string
  phone?: string
  dateOfBirth?: string
  sex?: string
  affiliation?: string
}): Promise<AdminActionResult> {
  const authz = await requireAdminAccess()
  if (!authz.ok) return authz

  const fullName = input.fullName.trim()
  if (!fullName) return { ok: false, error: "Enter the patient full name." }

  const affiliation = normalizeAffiliation(input.affiliation)
  if (!affiliation) {
    return { ok: false, error: "Choose student or faculty." }
  }

  const clinic = await resolveClinicId()
  if (!clinic.ok) return clinic

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) return adminClientResult

  const { error } = await adminClientResult.client.from("patients").insert({
    clinic_id: clinic.clinicId,
    full_name: fullName,
    email: input.email?.trim().toLowerCase() || null,
    student_id: input.studentId?.trim() || null,
    phone: input.phone?.trim() || null,
    date_of_birth: input.dateOfBirth?.trim() || null,
    sex: input.sex?.trim() || null,
    affiliation,
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
  phone?: string
  dateOfBirth?: string
  sex?: string
  affiliation?: string
}): Promise<AdminActionResult> {
  const authz = await requireAdminAccess()
  if (!authz.ok) return authz

  const fullName = input.fullName.trim()
  if (!input.patientId) return { ok: false, error: "Missing patient id." }
  if (!fullName) return { ok: false, error: "Enter the patient full name." }

  const affiliation = normalizeAffiliation(input.affiliation)
  if (!affiliation) {
    return { ok: false, error: "Choose student or faculty." }
  }

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) return adminClientResult

  const { error } = await adminClientResult.client
    .from("patients")
    .update({
      full_name: fullName,
      email: input.email?.trim().toLowerCase() || null,
      student_id: input.studentId?.trim() || null,
      phone: input.phone?.trim() || null,
      date_of_birth: input.dateOfBirth?.trim() || null,
      sex: input.sex?.trim() || null,
      affiliation,
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
    const affiliation =
      normalizeAffiliation(row.affiliation || row.type || row.category) ??
      "student"

    if (!fullName) {
      failures.push(`Row ${index + 2}: missing full_name`)
      continue
    }

    const { error } = await admin.from("patients").insert({
      clinic_id: clinic.clinicId,
      full_name: fullName,
      email: (row.email || "").trim().toLowerCase() || null,
      student_id: (row.student_id || row.id_number || "").trim() || null,
      phone: (row.phone || "").trim() || null,
      date_of_birth: (row.date_of_birth || row.dob || "").trim() || null,
      sex: (row.sex || "").trim() || null,
      affiliation,
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
        "No patients imported. Headers: full_name, email, student_id, phone, date_of_birth, sex, affiliation",
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
