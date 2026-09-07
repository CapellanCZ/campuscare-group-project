/**
 * Backfill queue tickets for consultations tagged demo-ops-seed-v2
 * that were created without tickets.
 *
 * Usage: node scripts/backfill-demo-tickets.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const TAG = "demo-ops-seed-v2"

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local")
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue
    const i = line.indexOf("=")
    if (i < 0) continue
    const key = line.slice(0, i).trim()
    let val = line.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function manilaYmd(iso) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso))
}

loadEnvLocal()
const { createClient } = require("@supabase/supabase-js")
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const { data: nurse } = await supabase
  .from("users")
  .select("id, full_name")
  .eq("primary_role", "nurse")
  .eq("is_active", true)
  .limit(1)
  .maybeSingle()

const { data: consults, error } = await supabase
  .from("consultations")
  .select(
    `
    id,
    provider_type,
    consultation_date,
    queue_ticket_id,
    patient_id,
    patient_records (
      id,
      patient_type,
      first_name,
      middle_name,
      last_name,
      student_id,
      employee_id
    )
  `
  )
  .ilike("notes", `%${TAG}%`)

if (error) {
  console.error(error)
  process.exit(1)
}

let created = 0
let skipped = 0
let queueNumber = 200

for (const consult of consults ?? []) {
  if (consult.queue_ticket_id) {
    skipped += 1
    continue
  }

  const pr = Array.isArray(consult.patient_records)
    ? consult.patient_records[0]
    : consult.patient_records
  if (!pr) {
    console.error("Missing patient_records for", consult.id)
    continue
  }

  const name = [pr.first_name, pr.middle_name, pr.last_name]
    .filter(Boolean)
    .join(" ")
  const campusId =
    pr.patient_type === "student" ? pr.student_id : pr.employee_id

  let operationalId = null
  if (pr.patient_type === "student" && pr.student_id) {
    const { data } = await supabase
      .from("patients")
      .select("id")
      .eq("student_id", pr.student_id)
      .maybeSingle()
    operationalId = data?.id ?? null
  } else if (pr.employee_id) {
    const { data } = await supabase
      .from("patients")
      .select("id")
      .eq("employee_id", pr.employee_id)
      .maybeSingle()
    operationalId = data?.id ?? null
  }

  queueNumber += 1
  const providerType =
    consult.provider_type === "dentist" ? "dentist" : "physician"
  const prefix = providerType === "dentist" ? "D" : "M"
  const waitMinutes = 10 + (created % 6) * 5

  const { data: ticket, error: ticketError } = await supabase
    .from("health_queue_tickets")
    .insert({
      ticket_code: `${prefix}-${String(queueNumber).padStart(3, "0")}`,
      queue_position: queueNumber,
      queue_number: queueNumber,
      estimated_wait_minutes: waitMinutes,
      status: "completed",
      station: providerType,
      service_date: manilaYmd(consult.consultation_date),
      patient_id: operationalId,
      patient_name: name,
      campus_id: campusId,
      patient_type: pr.patient_type,
      consultation_type:
        providerType === "dentist"
          ? "Dental consultation"
          : "Walk-in consultation",
      provider_type: providerType,
      consultation_id: consult.id,
      assigned_staff_name: nurse?.full_name ?? "Clinic Nurse",
      intake_notes: TAG,
      checked_in_at: consult.consultation_date,
    })
    .select("id")
    .single()

  if (ticketError) {
    console.error(name, ticketError.message)
    continue
  }

  await supabase
    .from("consultations")
    .update({ queue_ticket_id: ticket.id })
    .eq("id", consult.id)

  created += 1
  console.log("ticket", ticket.id, name)
}

console.log(JSON.stringify({ created, skipped, total: consults?.length ?? 0 }))
