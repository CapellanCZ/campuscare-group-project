import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import { createAdminClient } from "@/lib/supabase/admin"

type AdminClient = SupabaseClient

const STAFF_WEB_ROLES = new Set([
  "admin",
  "nurse",
  "physician",
  "dentist",
  "queue_display",
])

const PROVISION_CONCURRENCY = 8

export type ProvisionPatientAuthResult = {
  userId: string
  authCreated: boolean
  linked: boolean
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function buildAuthEmailToUserIdMap(
  admin: AdminClient = createAdminClient()
) {
  const map = new Map<string, string>()
  let page = 1

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) throw error

    const users = data.users ?? []
    for (const user of users) {
      const email = normalizeEmail(user.email ?? "")
      if (email && user.id) map.set(email, user.id)
    }

    if (users.length < 200) break
    page += 1
  }

  return map
}

async function ensurePatientAuthUser(params: {
  admin: AdminClient
  emailToUserId: Map<string, string>
  email: string
  fullName: string
}): Promise<{ userId: string; created: boolean }> {
  const email = normalizeEmail(params.email)
  if (!email) {
    throw new Error("Patient email is required for mobile authentication.")
  }

  const existing = params.emailToUserId.get(email)
  if (existing) return { userId: existing, created: false }

  const { data, error } = await params.admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { primary_role: "patient" },
    user_metadata: params.fullName
      ? { full_name: params.fullName, primary_role: "patient" }
      : { primary_role: "patient" },
  })

  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      const refreshed = await buildAuthEmailToUserIdMap(params.admin)
      const id = refreshed.get(email)
      if (id) {
        params.emailToUserId.set(email, id)
        return { userId: id, created: false }
      }
    }
    throw error
  }

  if (!data.user?.id) {
    throw new Error(`No auth user id returned for ${email}`)
  }

  params.emailToUserId.set(email, data.user.id)
  return { userId: data.user.id, created: true }
}

async function userHasStaffRole(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("users")
    .select("primary_role")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw error
  return Boolean(
    data?.primary_role && STAFF_WEB_ROLES.has(data.primary_role)
  )
}

/**
 * Insert public.users for a new patient auth id.
 * Never overwrites an existing profile, role, or settings.
 */
async function ensurePatientUserRow(params: {
  admin: AdminClient
  userId: string
  email: string
  fullName: string
}) {
  const email = normalizeEmail(params.email)
  const fullName = params.fullName.trim() || email.split("@")[0] || "Patient"

  const { data: existing, error: readError } = await params.admin
    .from("users")
    .select("id, primary_role")
    .eq("id", params.userId)
    .maybeSingle()

  if (readError) throw readError

  if (existing) {
    if (existing.primary_role && STAFF_WEB_ROLES.has(existing.primary_role)) {
      return false
    }
    // Existing account — leave role, name, and settings untouched.
    return false
  }

  const { error } = await params.admin.from("users").insert({
    id: params.userId,
    email,
    full_name: fullName,
    primary_role: "patient",
    is_active: true,
    invite_pending: false,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    // Concurrent insert of the same auth id — treat as already provisioned.
    if (error.code === "23505") return false
    throw error
  }
  return true
}

/**
 * Creates or reuses an Auth user with primary_role = patient, ensures public.users,
 * and links public.patients.auth_user_id for mobile OTP sign-in.
 */
export async function provisionPatientAuth(params: {
  patientId: string
  email: string
  fullName: string
  admin?: AdminClient
  emailToUserId?: Map<string, string>
}): Promise<ProvisionPatientAuthResult> {
  const admin = params.admin ?? createAdminClient()
  const email = normalizeEmail(params.email)
  if (!email) {
    throw new Error("Patient email is required for mobile authentication.")
  }

  const emailToUserId =
    params.emailToUserId ?? (await buildAuthEmailToUserIdMap(admin))

  const { userId, created } = await ensurePatientAuthUser({
    admin,
    emailToUserId,
    email,
    fullName: params.fullName,
  })

  if (await userHasStaffRole(admin, userId)) {
    throw new Error(
      "Email belongs to a staff account and cannot be linked as a patient."
    )
  }

  await ensurePatientUserRow({
    admin,
    userId,
    email,
    fullName: params.fullName,
  })

  const { data: existingPatient, error: patientReadError } = await admin
    .from("patients")
    .select("auth_user_id")
    .eq("id", params.patientId)
    .maybeSingle()

  if (patientReadError) throw patientReadError

  if (
    existingPatient?.auth_user_id &&
    existingPatient.auth_user_id !== userId
  ) {
    throw new Error("Patient is already linked to another auth account.")
  }

  if (existingPatient?.auth_user_id === userId) {
    return {
      userId,
      authCreated: created,
      linked: true,
    }
  }

  const { data: linked, error } = await admin
    .from("patients")
    .update({
      auth_user_id: userId,
      email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.patientId)
    .select("id")
    .maybeSingle()

  if (error) throw error
  if (!linked) {
    throw new Error(`Patient ${params.patientId} was not linked to auth user.`)
  }

  return {
    userId,
    authCreated: created,
    linked: true,
  }
}

export type PatientAuthSyncContext = {
  admin: AdminClient
  emailToUserId: Map<string, string>
}

export async function createPatientAuthSyncContext(): Promise<PatientAuthSyncContext> {
  const admin = createAdminClient()
  const emailToUserId = await buildAuthEmailToUserIdMap(admin)
  return { admin, emailToUserId }
}

export async function provisionPatientAuthIfNeeded(params: {
  patientId: string | null | undefined
  email: string | null | undefined
  fullName: string
  admin?: AdminClient
  emailToUserId?: Map<string, string>
  syncContext?: PatientAuthSyncContext
}): Promise<ProvisionPatientAuthResult | null> {
  const email = (params.email ?? "").trim()
  if (!params.patientId || !email) return null

  const syncContext = params.syncContext
  const admin = params.admin ?? syncContext?.admin
  const emailToUserId = params.emailToUserId ?? syncContext?.emailToUserId

  return provisionPatientAuth({
    patientId: params.patientId,
    email,
    fullName: params.fullName,
    admin,
    emailToUserId,
  })
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

type UnlinkedPatientRow = {
  id: string
  full_name: string | null
  email: string | null
  student_id: string | null
  employee_id: string | null
  auth_user_id: string | null
}

async function resolveEmailsFromClinicalRecords(
  admin: AdminClient,
  rows: UnlinkedPatientRow[]
) {
  const studentIds = [
    ...new Set(
      rows
        .map((row) => row.student_id?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const employeeIds = [
    ...new Set(
      rows
        .map((row) => row.employee_id?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const byStudent = new Map<string, string>()
  const byEmployee = new Map<string, string>()

  for (const batch of chunk(studentIds, 200)) {
    if (batch.length === 0) continue
    const { data, error } = await admin
      .from("patient_records")
      .select("student_id, email")
      .in("student_id", batch)
    if (error) throw error
    for (const rec of data ?? []) {
      const sid = (rec.student_id || "").trim()
      const email = normalizeEmail(rec.email ?? "")
      if (sid && email) byStudent.set(sid, email)
    }
  }

  for (const batch of chunk(employeeIds, 200)) {
    if (batch.length === 0) continue
    const { data, error } = await admin
      .from("patient_records")
      .select("employee_id, email")
      .in("employee_id", batch)
    if (error) throw error
    for (const rec of data ?? []) {
      const eid = (rec.employee_id || "").trim()
      const email = normalizeEmail(rec.email ?? "")
      if (eid && email) byEmployee.set(eid, email)
    }
  }

  return { byStudent, byEmployee }
}

async function provisionUnlinkedPatientRows(params: {
  admin: AdminClient
  rows: UnlinkedPatientRow[]
}): Promise<{
  attempted: number
  linked: number
  created: number
  skippedNoEmail: number
  failures: string[]
}> {
  const { admin, rows } = params
  if (rows.length === 0) {
    return {
      attempted: 0,
      linked: 0,
      created: 0,
      skippedNoEmail: 0,
      failures: [],
    }
  }

  const { byStudent, byEmployee } = await resolveEmailsFromClinicalRecords(
    admin,
    rows
  )
  const emailToUserId = await buildAuthEmailToUserIdMap(admin)
  const failures: string[] = []
  let linked = 0
  let created = 0
  let skippedNoEmail = 0
  let attempted = 0

  const targets = rows.map((row) => {
    const email =
      normalizeEmail(row.email ?? "") ||
      (row.student_id ? byStudent.get(row.student_id.trim()) : undefined) ||
      (row.employee_id ? byEmployee.get(row.employee_id.trim()) : undefined) ||
      ""
    return { row, email }
  })

  await mapPool(targets, PROVISION_CONCURRENCY, async ({ row, email }) => {
    if (!email) {
      skippedNoEmail += 1
      return
    }
    attempted += 1
    try {
      // Persist email onto patients when it only existed on clinical records.
      if (!normalizeEmail(row.email ?? "")) {
        await admin
          .from("patients")
          .update({ email, updated_at: new Date().toISOString() })
          .eq("id", row.id)
      }

      const result = await provisionPatientAuth({
        admin,
        emailToUserId,
        patientId: row.id,
        email,
        fullName: row.full_name || email.split("@")[0] || "Patient",
      })
      if (result.linked) linked += 1
      if (result.authCreated) created += 1
    } catch (error) {
      failures.push(
        `${email}: ${error instanceof Error ? error.message : "provision failed"}`
      )
    }
  })

  return { attempted, linked, created, skippedNoEmail, failures }
}

/**
 * After roster import: provision Auth + public.users for operational patients
 * that have an email but are not yet linked. Skips staff emails and duplicates.
 */
export async function provisionAuthForImportedPatients(params: {
  studentIds?: string[]
  employeeIds?: string[]
  admin?: AdminClient
}): Promise<{ attempted: number; linked: number; failures: string[] }> {
  const admin = params.admin ?? createAdminClient()
  const studentIds = [...new Set((params.studentIds ?? []).map((id) => id.trim()).filter(Boolean))]
  const employeeIds = [
    ...new Set((params.employeeIds ?? []).map((id) => id.trim()).filter(Boolean)),
  ]

  if (studentIds.length === 0 && employeeIds.length === 0) {
    return { attempted: 0, linked: 0, failures: [] }
  }

  const rows: UnlinkedPatientRow[] = []

  for (const batch of chunk(studentIds, 200)) {
    if (batch.length === 0) continue
    const { data, error } = await admin
      .from("patients")
      .select("id, full_name, email, student_id, employee_id, auth_user_id")
      .in("student_id", batch)
      .is("auth_user_id", null)
    if (error) throw error
    rows.push(...((data as UnlinkedPatientRow[]) ?? []))
  }

  for (const batch of chunk(employeeIds, 200)) {
    if (batch.length === 0) continue
    const { data, error } = await admin
      .from("patients")
      .select("id, full_name, email, student_id, employee_id, auth_user_id")
      .in("employee_id", batch)
      .is("auth_user_id", null)
    if (error) throw error
    rows.push(...((data as UnlinkedPatientRow[]) ?? []))
  }

  const result = await provisionUnlinkedPatientRows({ admin, rows })
  return {
    attempted: result.attempted,
    linked: result.linked,
    failures: result.failures,
  }
}

/**
 * Backfill: every operational patient with null auth_user_id gets
 * Auth + public.users (patient role) and patients.auth_user_id set.
 */
export async function provisionAuthForUnlinkedPatients(
  admin: AdminClient = createAdminClient()
): Promise<{
  attempted: number
  linked: number
  created: number
  skippedNoEmail: number
  failures: string[]
}> {
  const rows: UnlinkedPatientRow[] = []
  let from = 0
  const pageSize = 500

  for (;;) {
    const { data, error } = await admin
      .from("patients")
      .select("id, full_name, email, student_id, employee_id, auth_user_id")
      .is("auth_user_id", null)
      .range(from, from + pageSize - 1)

    if (error) throw error
    const batch = (data as UnlinkedPatientRow[]) ?? []
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return provisionUnlinkedPatientRows({ admin, rows })
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return []
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

/**
 * Ensures Auth + public.users exist for a roster email before OTP.
 * Recreates the operational patients link when clinical/ops rows exist again.
 */
export async function ensurePatientSignInByEmail(
  email: string,
  admin: AdminClient = createAdminClient()
): Promise<ProvisionPatientAuthResult | null> {
  const normalized = normalizeEmail(email)
  if (!normalized) return null

  const { data: patient, error: patientError } = await admin
    .from("patients")
    .select("id, full_name, email, auth_user_id")
    .eq("email", normalized)
    .maybeSingle()

  if (patientError) throw patientError

  if (patient) {
    if (patient.auth_user_id) {
      await ensurePatientUserRow({
        admin,
        userId: patient.auth_user_id,
        email: normalized,
        fullName: patient.full_name || normalized.split("@")[0] || "Patient",
      })
      return {
        userId: patient.auth_user_id,
        authCreated: false,
        linked: true,
      }
    }

    return provisionPatientAuth({
      admin,
      patientId: patient.id,
      email: normalized,
      fullName: patient.full_name || normalized.split("@")[0] || "Patient",
    })
  }

  // Account survived clinical cleanup — allow OTP without recreating auth.
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id, full_name, primary_role, email")
    .eq("email", normalized)
    .maybeSingle()

  if (profileError) throw profileError

  if (profile?.primary_role && STAFF_WEB_ROLES.has(profile.primary_role)) {
    return null
  }

  if (profile?.id) {
    // Re-associate clinical/ops rows when a chart exists again after cleanup.
    const { data: record, error: recordError } = await admin
      .from("patient_records")
      .select(
        "first_name, last_name, email, student_id, employee_id, patient_type, phone, birth_date, gender"
      )
      .eq("email", normalized)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recordError) throw recordError

    if (record) {
      const fullName =
        [record.first_name, record.last_name].filter(Boolean).join(" ").trim() ||
        profile.full_name ||
        normalized.split("@")[0] ||
        "Patient"

      const studentId =
        record.patient_type === "student"
          ? (record.student_id ?? "").trim() || null
          : null
      const employeeId =
        record.patient_type === "faculty" || record.patient_type === "employee"
          ? (record.employee_id ?? "").trim() || null
          : null

      let opsId: string | null = null
      if (studentId) {
        const { data } = await admin
          .from("patients")
          .select("id")
          .eq("student_id", studentId)
          .maybeSingle()
        opsId = data?.id ?? null
      } else if (employeeId) {
        const { data } = await admin
          .from("patients")
          .select("id")
          .eq("employee_id", employeeId)
          .maybeSingle()
        opsId = data?.id ?? null
      }

      const now = new Date().toISOString()
      if (opsId) {
        await admin
          .from("patients")
          .update({
            auth_user_id: profile.id,
            email: normalized,
            full_name: fullName,
            updated_at: now,
          })
          .eq("id", opsId)
      } else if (studentId || employeeId) {
        const { data: inserted, error: insertError } = await admin
          .from("patients")
          .insert({
            clinic_id: CAMPUS_CLINIC_ID,
            timezone: "Asia/Manila",
            full_name: fullName,
            email: normalized,
            phone: record.phone,
            date_of_birth: record.birth_date,
            sex: record.gender,
            patient_type: record.patient_type,
            affiliation: record.patient_type,
            student_id: studentId,
            employee_id: employeeId,
            auth_user_id: profile.id,
            updated_at: now,
          })
          .select("id")
          .maybeSingle()
        if (insertError) throw insertError
        opsId = inserted?.id ?? null
      }

      return {
        userId: profile.id,
        authCreated: false,
        linked: Boolean(opsId),
      }
    }

    return {
      userId: profile.id,
      authCreated: false,
      linked: false,
    }
  }

  const { data: record, error: recordError } = await admin
    .from("patient_records")
    .select("first_name, last_name, email")
    .eq("email", normalized)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recordError) throw recordError
  if (!record) return null

  throw new Error(
    "Your patient profile is not ready for mobile sign-in yet. Ask the clinic to sync your record, then try again."
  )
}
