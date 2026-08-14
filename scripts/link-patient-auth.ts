/**
 * Link patient row(s) to Auth users by email (creates Auth user if missing).
 *
 * Usage:
 *   npx tsx scripts/link-patient-auth.ts <email> [full name]
 *   npx tsx scripts/link-patient-auth.ts --all
 */
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import path from "node:path"

const require = createRequire(import.meta.url)

type AdminClient = ReturnType<
  typeof import("@supabase/supabase-js").createClient
>

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local")
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const key = m[1].trim()
    let val = m[2].trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function buildEmailToUserId(admin: AdminClient) {
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
      const email = (user.email || "").trim().toLowerCase()
      if (email && user.id) map.set(email, user.id)
    }
    if (users.length < 200) break
    page += 1
  }
  return map
}

async function ensureAuthUser(params: {
  admin: AdminClient
  emailToUserId: Map<string, string>
  email: string
  fullName: string
}): Promise<{ userId: string; created: boolean }> {
  const email = params.email.trim().toLowerCase()
  const existing = params.emailToUserId.get(email)
  if (existing) return { userId: existing, created: false }

  const { data, error } = await params.admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: params.fullName
      ? { full_name: params.fullName }
      : undefined,
  })
  if (error) {
    // Race / already exists
    if (/already|registered|exists/i.test(error.message)) {
      const refreshed = await buildEmailToUserId(params.admin)
      const id = refreshed.get(email)
      if (id) {
        params.emailToUserId.set(email, id)
        return { userId: id, created: false }
      }
    }
    throw error
  }
  if (!data.user?.id) throw new Error(`No auth user id for ${email}`)
  params.emailToUserId.set(email, data.user.id)
  return { userId: data.user.id, created: true }
}

async function linkOne(params: {
  admin: AdminClient
  emailToUserId: Map<string, string>
  patientId: string
  email: string
  fullName: string
}) {
  const { userId, created } = await ensureAuthUser({
    admin: params.admin,
    emailToUserId: params.emailToUserId,
    email: params.email,
    fullName: params.fullName,
  })

  const { data, error } = await params.admin
    .from("patients")
    .update({
      auth_user_id: userId,
      email: params.email.trim().toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.patientId)
    .select("id, email, auth_user_id, student_id, full_name")
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error(`Patient ${params.patientId} not updated`)
  return { created, linked: data }
}

async function linkAll(admin: AdminClient) {
  // Backfill patients.email from patient_records when possible
  const { data: unlinked, error } = await admin
    .from("patients")
    .select("id, full_name, email, student_id, employee_id, auth_user_id")
    .is("auth_user_id", null)

  if (error) throw error

  const rows = unlinked ?? []
  const studentIds = rows
    .map((r) => r.student_id)
    .filter((id): id is string => Boolean(id))

  const emailByStudentId = new Map<string, string>()
  if (studentIds.length > 0) {
    const { data: records, error: recErr } = await admin
      .from("patient_records")
      .select("student_id, email")
      .in("student_id", studentIds)
    if (recErr) throw recErr
    for (const rec of records ?? []) {
      const sid = (rec.student_id || "").trim()
      const email = (rec.email || "").trim().toLowerCase()
      if (sid && email) emailByStudentId.set(sid, email)
    }
  }

  const emailToUserId = await buildEmailToUserId(admin)
  let created = 0
  let linked = 0
  let skippedNoEmail = 0
  const failures: string[] = []

  for (const row of rows) {
    const fromPatient = (row.email || "").trim().toLowerCase()
    const fromRecord = row.student_id
      ? emailByStudentId.get(row.student_id) || ""
      : ""
    const email = fromPatient || fromRecord
    if (!email) {
      skippedNoEmail += 1
      continue
    }

    try {
      const result = await linkOne({
        admin,
        emailToUserId,
        patientId: row.id,
        email,
        fullName: row.full_name || "",
      })
      if (result.created) created += 1
      linked += 1
      console.log(
        `${result.created ? "created+linked" : "linked"}`,
        result.linked.email,
        result.linked.student_id || result.linked.id
      )
      // Soft rate-limit Auth Admin creates
      await sleep(120)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      failures.push(`${email}: ${message}`)
      console.error("failed", email, message)
    }
  }

  console.log(
    JSON.stringify(
      {
        linked,
        created,
        skippedNoEmail,
        failures: failures.length,
        failureSamples: failures.slice(0, 10),
      },
      null,
      2
    )
  )

  if (failures.length > 0) process.exitCode = 1
}

async function linkSingle(
  admin: AdminClient,
  email: string,
  fullName: string
) {
  const emailToUserId = await buildEmailToUserId(admin)
  const { data: patient, error } = await admin
    .from("patients")
    .select("id, full_name, email")
    .eq("email", email)
    .maybeSingle()

  if (error) throw error
  if (!patient) throw new Error(`No patients row found for email ${email}`)

  const result = await linkOne({
    admin,
    emailToUserId,
    patientId: patient.id,
    email,
    fullName: fullName || patient.full_name || "",
  })
  console.log(
    result.created ? "created_auth_user" : "existing_auth_user",
    result.linked.auth_user_id
  )
  console.log("linked_patient", result.linked)
}

async function main() {
  loadEnvLocal()
  const arg = (process.argv[2] || "").trim()
  if (!arg) {
    throw new Error(
      "Usage:\n  npx tsx scripts/link-patient-auth.ts <email> [full name]\n  npx tsx scripts/link-patient-auth.ts --all"
    )
  }

  const { createClient } =
    require("@supabase/supabase-js") as typeof import("@supabase/supabase-js")
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    )
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  if (arg === "--all") {
    await linkAll(admin)
    return
  }

  await linkSingle(admin, arg.toLowerCase(), (process.argv[3] || "").trim())
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
