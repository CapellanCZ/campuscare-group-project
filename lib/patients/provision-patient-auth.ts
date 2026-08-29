import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createAdminClient } from "@/lib/supabase/admin"

type AdminClient = SupabaseClient

const STAFF_WEB_ROLES = new Set([
  "admin",
  "nurse",
  "physician",
  "dentist",
  "queue_display",
])

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

async function upsertPatientUserRow(params: {
  admin: AdminClient
  userId: string
  email: string
  fullName: string
}) {
  const email = normalizeEmail(params.email)
  const fullName = params.fullName.trim() || email.split("@")[0] || "Patient"

  const { data: existing, error: readError } = await params.admin
    .from("users")
    .select("primary_role")
    .eq("id", params.userId)
    .maybeSingle()

  if (readError) throw readError

  if (
    existing?.primary_role &&
    STAFF_WEB_ROLES.has(existing.primary_role)
  ) {
    return false
  }

  const { error } = await params.admin.from("users").upsert(
    {
      id: params.userId,
      email,
      full_name: fullName,
      primary_role: "patient",
      is_active: true,
      invite_pending: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  )

  if (error) throw error
  return true
}

/**
 * Creates or reuses an Auth user with primary_role = patient, upserts public.users,
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

  await upsertPatientUserRow({
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

/**
 * Ensures Auth + public.users + patients.auth_user_id exist for a roster email.
 * Used before OTP sign-in when patients were imported before auth provisioning ran.
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
      await upsertPatientUserRow({
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
