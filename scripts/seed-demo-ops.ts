/**
 * Seed operational demo data (appointments, consultations, queue tickets, vitals).
 * Resolves staff by role — does not create auth users.
 *
 * Usage: npx tsx scripts/seed-demo-ops.ts
 */
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import path from "node:path"

const require = createRequire(import.meta.url)

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local")
  try {
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
  } catch {
    // optional .env.local
  }
}

async function main() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const { createClient } = require("@supabase/supabase-js") as typeof import(
    "@supabase/supabase-js"
  )
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const clinicId = "34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b"
  const tag = "demo-ops-seed"

  const { data: staff } = await supabase
    .from("users")
    .select("id, primary_role, full_name, email")
    .in("primary_role", ["nurse", "physician", "dentist"])
    .eq("is_active", true)

  const nurse = staff?.find((u) => u.primary_role === "nurse")
  const physician = staff?.find((u) => u.primary_role === "physician")
  const dentist = staff?.find((u) => u.primary_role === "dentist")

  if (!nurse || !physician) {
    console.error("Need at least one active nurse and physician in public.users")
    process.exit(1)
  }

  const { data: patients } = await supabase
    .from("patient_records")
    .select("id, student_id, first_name, last_name")
    .limit(6)

  if (!patients?.length) {
    console.error("No patient_records rows to attach demo consultations")
    process.exit(1)
  }

  const now = new Date()
  const ymd = now.toISOString().slice(0, 10)
  let ticketNum = 1

  for (let i = 0; i < Math.min(4, patients.length); i++) {
    const patient = patients[i]
    const providerType = i % 2 === 0 ? "physician" : "dentist"
    const doctorId = providerType === "dentist" ? dentist?.id : physician.id
    const statusCycle = ["waiting", "ongoing", "completed", "waiting"][i] ?? "waiting"
    const prefix = providerType === "dentist" ? "D" : "M"
    const code = `${prefix}-${String(ticketNum).padStart(3, "0")}`
    ticketNum += 1

    const startsAt = new Date(now)
    startsAt.setHours(9 + i, 0, 0, 0)

    const { data: appt } = await supabase
      .from("appointments")
      .insert({
        clinic_id: clinicId,
        patient_id: patient.id,
        doctor_id: doctorId ?? physician.id,
        provider_type: providerType,
        status: statusCycle === "waiting" ? "confirmed" : "completed",
        reason: `${tag} demo visit ${i + 1}`,
        starts_at: startsAt.toISOString(),
        ends_at: new Date(startsAt.getTime() + 30 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single()

    if (!appt?.id) continue

    const vitals =
      statusCycle !== "waiting"
        ? {
            bpSystolic: 120 + i,
            bpDiastolic: 80,
            heartRate: 72 + i,
            temperatureC: 36.6,
            spo2: 98,
          }
        : {}

    const { data: consult } = await supabase
      .from("consultations")
      .insert({
        patient_id: patient.id,
        appointment_id: appt.id,
        provider_type: providerType,
        station: statusCycle === "waiting" ? "nurse" : providerType,
        status: statusCycle,
        priority: "Normal",
        chief_complaint: `${tag} chief complaint`,
        provider_name: nurse.full_name,
        provider_role: "nurse",
        consultation_date: startsAt.toISOString(),
        vitals,
        diagnosis: statusCycle === "completed" ? "Demo diagnosis" : null,
      })
      .select("id")
      .single()

    if (!consult?.id) continue

    const { data: ticket } = await supabase.from("health_queue_tickets").insert({
      ticket_code: code,
      queue_position: i + 1,
      queue_number: i + 1,
      estimated_wait_minutes: (i + 1) * 10,
      status: statusCycle === "completed" ? "completed" : "waiting",
      station: statusCycle === "waiting" ? "nurse" : providerType,
      service_date: ymd,
      patient_name: `${patient.first_name} ${patient.last_name}`.trim(),
      campus_id: patient.student_id,
      consultation_type: "General consultation",
      provider_type: providerType,
      appointment_id: appt.id,
      consultation_id: consult.id,
      assigned_staff_name: nurse.full_name,
      intake_notes: tag,
    })
    .select("id")
    .single()

    if (ticket?.id) {
      await supabase
        .from("consultations")
        .update({ queue_ticket_id: ticket.id })
        .eq("id", consult.id)
    }
  }

  console.log(`Seeded demo operational rows tagged "${tag}".`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
