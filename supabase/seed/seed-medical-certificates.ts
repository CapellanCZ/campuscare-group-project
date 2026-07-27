/**
 * Seed medical certificates into Supabase.
 *
 * Usage:
 *   npx tsx supabase/seed/seed-medical-certificates.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), ".env.local")
    const raw = readFileSync(envPath, "utf8")
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  } catch {
    // .env.local may be absent in CI; rely on process.env
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const seeds = [
  {
    studentId: "2021-04521",
    certificateNumber: "MC-SEED-001",
    certificateType: "Medical excuse",
    purpose: "Absence due to acute gastroenteritis",
    doctorName: "Dr. Ramon Villanueva",
    remarks: "Rest recommended for 3 days.",
    status: "issued",
    issuedAt: "2026-07-25T00:55:00.000Z",
    validUntil: "2026-07-28",
  },
  {
    studentId: "2022-00311",
    certificateNumber: "MC-SEED-002",
    certificateType: "Fitness for internship",
    purpose: "Clearance for off-campus internship placement",
    doctorName: "Dr. Ramon Villanueva",
    remarks: "Fit for light-to-moderate physical activity.",
    status: "issued",
    issuedAt: "2026-07-24T02:20:00.000Z",
    validUntil: "2026-10-24",
  },
  {
    studentId: "2019-55201",
    certificateNumber: "MC-SEED-003",
    certificateType: "Medical excuse",
    purpose: "Missed classes due to migraine",
    doctorName: "Dr. Elise Torres",
    remarks: null,
    status: "printed",
    issuedAt: "2026-07-22T06:10:00.000Z",
    validUntil: "2026-07-29",
  },
  {
    studentId: "2020-11802",
    certificateNumber: "MC-SEED-004",
    certificateType: "Dental clearance",
    purpose: "Dental fitness for athletic tryouts",
    doctorName: "Dr. Elise Torres",
    remarks: "Oral exam completed; no active infection.",
    status: "issued",
    issuedAt: "2026-07-20T03:40:00.000Z",
    validUntil: "2026-08-20",
  },
  {
    studentId: "2023-172077",
    certificateNumber: "MC-SEED-005",
    certificateType: "Medical excuse",
    purpose: "Pending review of lab results",
    doctorName: null,
    remarks: "Awaiting CBC results before issue.",
    status: "pending",
    issuedAt: null,
    validUntil: null,
  },
  {
    studentId: "FAC-7781",
    certificateNumber: "MC-SEED-006",
    certificateType: "Fitness for duty",
    purpose: "Annual faculty health clearance",
    doctorName: "Dr. Ramon Villanueva",
    remarks: null,
    status: "printed",
    issuedAt: "2026-07-18T01:05:00.000Z",
    validUntil: "2027-07-18",
  },
  {
    studentId: "2021-04521",
    certificateNumber: "MC-SEED-007",
    certificateType: "Medical certificate",
    purpose: "Request for sports participation clearance",
    doctorName: null,
    remarks: "Draft started from consultation notes.",
    status: "draft",
    issuedAt: null,
    validUntil: null,
  },
  {
    studentId: "2022-00311",
    certificateNumber: "MC-SEED-008",
    certificateType: "Dental clearance",
    purpose: "Clearance prior to orthodontic referral",
    doctorName: "Dr. Elise Torres",
    remarks: "Issued today for registrar copy.",
    status: "issued",
    issuedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
  },
  {
    studentId: "2019-55201",
    certificateNumber: "MC-SEED-009",
    certificateType: "Fitness for internship",
    purpose: "Internship medical requirements packet",
    doctorName: null,
    remarks: "Patient photos and vitals incomplete.",
    status: "draft",
    issuedAt: null,
    validUntil: null,
  },
  {
    studentId: "2020-11802",
    certificateNumber: "MC-SEED-010",
    certificateType: "Medical excuse",
    purpose: "Follow-up certificate request from consultation",
    doctorName: "Dr. Ramon Villanueva",
    remarks: "Nurse flagged for physician countersign.",
    status: "pending",
    issuedAt: null,
    validUntil: null,
  },
] as const

async function main() {
  const { data: patients, error: patientsError } = await supabase
    .from("patients")
    .select("id, student_id")

  if (patientsError) {
    throw new Error(`Failed to load patients: ${patientsError.message}`)
  }

  const byStudentId = new Map(
    (patients ?? []).map((row) => [row.student_id as string, row.id as string])
  )

  await supabase
    .from("medical_certificates")
    .delete()
    .like("certificate_number", "MC-SEED-%")

  const rows = seeds
    .map((seed) => {
      const patientId = byStudentId.get(seed.studentId)
      if (!patientId) {
        console.warn(`Skipping ${seed.certificateNumber}: patient ${seed.studentId} not found`)
        return null
      }
      return {
        patient_id: patientId,
        certificate_number: seed.certificateNumber,
        certificate_type: seed.certificateType,
        purpose: seed.purpose,
        doctor_name: seed.doctorName,
        remarks: seed.remarks,
        status: seed.status,
        issued_at: seed.issuedAt,
        valid_until: seed.validUntil,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const { error } = await supabase.from("medical_certificates").insert(rows)
  if (error) {
    throw new Error(`Failed to seed certificates: ${error.message}`)
  }

  console.log(`Seeded ${rows.length} medical certificates.`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
