/**
 * Seed operational demo data from real patient_records for reports testing.
 *
 * - At least 5 students, 5 faculty, 5 employees
 * - Completed consultations + queue tickets (medical & dental mix)
 * - Issued medical documents: prescription, medical certification,
 *   NFG clearance, go-home slip
 *
 * Usage: node scripts/seed-demo-ops.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

const CLINIC_ID = "34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b"
const TAG = "demo-ops-seed-v2"
const PER_TYPE = 5

const MEDICAL_DIAGNOSES = [
  "Headache",
  "Fever",
  "Cold",
  "Stomach Ache",
  "Allergy",
  "Dizziness",
  "Cough",
  "Menstrual Cramps",
]

const DENTAL_DIAGNOSES = [
  "Toothache",
  "Dental Caries / Tooth Decay",
  "Gingivitis",
  "Tooth Sensitivity",
  "Impacted Tooth",
]

const DOC_TYPES = [
  "prescription",
  "medical_certification",
  "nfg_medical_clearance",
  "go_home_slip",
]

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

function manilaYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function daysAgoIso(days, hour = 10) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 15, 0, 0)
  return d.toISOString()
}

function fullName(row) {
  return [row.first_name, row.middle_name, row.last_name]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ")
}

function campusIdOf(row) {
  if (row.patient_type === "student") return row.student_id
  return row.employee_id
}

function docPrefix(type) {
  switch (type) {
    case "prescription":
      return "RX"
    case "medical_certification":
      return "MC"
    case "nfg_medical_clearance":
      return "NFG"
    case "go_home_slip":
      return "GH"
    default:
      return "DOC"
  }
}

function certificateTypeLabel(type) {
  switch (type) {
    case "prescription":
      return "Prescription"
    case "medical_certification":
      return "Medical certificate"
    case "nfg_medical_clearance":
      return "NFG Medical Clearance"
    case "go_home_slip":
      return "Go Home Slip"
    default:
      return "Certificate"
  }
}

function payloadFor(type) {
  switch (type) {
    case "prescription":
      return {
        medications: [
          {
            name: "Paracetamol",
            strength: "500 mg",
            quantity: "10",
            frequency: "every 6 hours as needed",
            route: "oral",
            instructions: "Take after meals",
            duration: "3 days",
          },
        ],
        patientAge: "21",
        patientSex: "Female",
      }
    case "medical_certification":
      return {
        purposeCategory: "Excuse from class / work",
        certificationStatus: "Fit to resume classes",
        restrictions: "Avoid strenuous activity for 24 hours",
        recommendations: "Rest and adequate hydration",
        dateOfExamination: manilaYmd(),
        treatmentSuggested: "Supportive care",
      }
    case "nfg_medical_clearance":
      return {
        campus: "NU Dasmariñas",
        sport: "Intramurals",
        clearanceStatus: "Cleared",
        physical: {
          height: "165",
          weight: "58",
          bloodPressure: "110/70",
          heartRate: "72",
        },
        recommendations: "May participate with usual precautions",
      }
    case "go_home_slip":
      return {
        reason: "Not feeling well — advised to rest at home",
        releaseDate: manilaYmd(),
        prescribedMedication: "Paracetamol 500 mg as needed",
      }
    default:
      return {}
  }
}

async function ensureOperationalPatient(supabase, record) {
  const name = fullName(record)
  const isStudent = record.patient_type === "student"
  const studentId = isStudent ? record.student_id : null
  const employeeId =
    record.patient_type === "faculty" || record.patient_type === "employee"
      ? record.employee_id
      : null

  let existing = null
  if (studentId) {
    const { data } = await supabase
      .from("patients")
      .select("id")
      .eq("student_id", studentId)
      .maybeSingle()
    existing = data
  } else if (employeeId) {
    const { data } = await supabase
      .from("patients")
      .select("id")
      .eq("employee_id", employeeId)
      .maybeSingle()
    existing = data
  }

  const body = {
    full_name: name,
    email: record.email,
    phone: record.phone,
    date_of_birth: record.birth_date,
    sex: record.gender,
    patient_type: record.patient_type,
    affiliation: record.patient_type,
    student_id: studentId,
    employee_id: employeeId,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    await supabase.from("patients").update(body).eq("id", existing.id)
    return existing.id
  }

  const { data, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: CLINIC_ID,
      timezone: "Asia/Manila",
      ...body,
    })
    .select("id")
    .single()

  if (error || !data?.id) {
    throw new Error(
      `Could not create operational patient for ${name}: ${error?.message}`
    )
  }
  return data.id
}

async function nextDocumentNumber(supabase, type) {
  const prefix = docPrefix(type)
  const { data, error } = await supabase.rpc("next_medical_document_number", {
    p_prefix: prefix,
  })
  if (!error && typeof data === "string" && data.trim()) return data.trim()

  if (type === "medical_certification") {
    const { data: legacy, error: legacyError } = await supabase.rpc(
      "next_medical_certificate_number"
    )
    if (!legacyError && typeof legacy === "string" && legacy.trim()) {
      return legacy.trim()
    }
  }

  const year = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
  }).format(new Date())
  return `${prefix}-${year}-${String(Date.now()).slice(-6)}`
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const { createClient } = require("@supabase/supabase-js")
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: staff, error: staffError } = await supabase
  .from("users")
  .select("id, primary_role, full_name, email")
  .in("primary_role", ["nurse", "physician", "dentist"])
  .eq("is_active", true)

if (staffError) {
  console.error(staffError)
  process.exit(1)
}

const nurse = staff?.find((u) => u.primary_role === "nurse")
const physician = staff?.find((u) => u.primary_role === "physician")
const dentist = staff?.find((u) => u.primary_role === "dentist")

if (!nurse || !physician) {
  console.error("Need at least one active nurse and physician")
  process.exit(1)
}

async function fetchType(type) {
  const { data, error } = await supabase
    .from("patient_records")
    .select(
      "id, patient_type, first_name, middle_name, last_name, student_id, employee_id, email, phone, birth_date, gender"
    )
    .eq("patient_type", type)
    .limit(PER_TYPE)
  if (error) throw error
  return data ?? []
}

const students = await fetchType("student")
const faculty = await fetchType("faculty")
const employees = await fetchType("employee")

console.log(
  JSON.stringify(
    {
      students: students.length,
      faculty: faculty.length,
      employees: employees.length,
    },
    null,
    2
  )
)

if (
  students.length < PER_TYPE ||
  faculty.length < PER_TYPE ||
  employees.length < PER_TYPE
) {
  console.error(
    `Need at least ${PER_TYPE} of each patient type in patient_records`
  )
  process.exit(1)
}

const cohort = [...students, ...faculty, ...employees]
const today = manilaYmd()

let consultsCreated = 0
let ticketsCreated = 0
let docsCreated = 0
let queueNumber = 100

for (let i = 0; i < cohort.length; i++) {
  const record = cohort[i]
  const name = fullName(record)
  const campusId = campusIdOf(record)
  const isDental = i % 3 === 2
  const providerType = isDental ? "dentist" : "physician"
  const doctor = isDental && dentist ? dentist : physician
  const daysAgo = i % 7
  const consultAt = daysAgoIso(daysAgo, 9 + (i % 6))
  const diagnosis = isDental
    ? DENTAL_DIAGNOSES[i % DENTAL_DIAGNOSES.length]
    : MEDICAL_DIAGNOSES[i % MEDICAL_DIAGNOSES.length]
  const complaint = isDental
    ? "Tooth discomfort"
    : "Feeling unwell / clinic consultation"

  let operationalId
  try {
    operationalId = await ensureOperationalPatient(supabase, record)
  } catch (error) {
    console.error(error.message || error)
    continue
  }

  // Optional appointment (skip quietly if schema rejects patient_records id)
  let appointmentId = null
  {
    const startsAt = new Date(consultAt)
    const { data: appt, error: apptError } = await supabase
      .from("appointments")
      .insert({
        clinic_id: CLINIC_ID,
        patient_id: operationalId,
        doctor_id: doctor.id,
        provider_type: providerType,
        status: "completed",
        reason: `${TAG} ${complaint}`,
        starts_at: startsAt.toISOString(),
        ends_at: new Date(startsAt.getTime() + 30 * 60 * 1000).toISOString(),
        location: "HSO Clinic",
      })
      .select("id")
      .single()
    if (!apptError && appt?.id) appointmentId = appt.id
  }

  const { data: consult, error: consultError } = await supabase
    .from("consultations")
    .insert({
      patient_id: record.id,
      appointment_id: appointmentId,
      provider_type: providerType,
      station: providerType,
      status: "completed",
      priority: "Normal",
      chief_complaint: complaint,
      symptoms: complaint,
      diagnosis,
      assessment: diagnosis,
      treatment: isDental
        ? "Dental care advice and follow-up as needed"
        : "Supportive care; rest and hydration",
      prescription: "Paracetamol 500 mg as needed",
      provider_name: doctor.full_name,
      provider_role: providerType,
      consultation_date: consultAt,
      notes: `${TAG} walk-in completed visit`,
      vitals: {
        bpSystolic: 110 + (i % 20),
        bpDiastolic: 70 + (i % 10),
        heartRate: 70 + (i % 15),
        temperatureC: 36.5 + (i % 5) * 0.1,
        spo2: 97 + (i % 3),
      },
    })
    .select("id")
    .single()

  if (consultError || !consult?.id) {
    console.error(
      `Consultation failed for ${name}:`,
      consultError?.message || consultError
    )
    continue
  }
  consultsCreated += 1

  queueNumber += 1
  const prefix = providerType === "dentist" ? "D" : "M"
  const ticketCode = `${prefix}-${String(queueNumber).padStart(3, "0")}`
  const waitMinutes = 5 + (i % 8) * 5

  const { data: ticket, error: ticketError } = await supabase
    .from("health_queue_tickets")
    .insert({
      ticket_code: ticketCode,
      queue_position: queueNumber,
      queue_number: queueNumber,
      estimated_wait_minutes: waitMinutes,
      status: "completed",
      station: providerType,
      service_date: manilaYmd(new Date(consultAt)),
      patient_id: operationalId,
      patient_name: name,
      campus_id: campusId,
      patient_type: record.patient_type,
      consultation_type: isDental
        ? "Dental consultation"
        : "Walk-in consultation",
      provider_type: providerType,
      appointment_id: appointmentId,
      consultation_id: consult.id,
      assigned_staff_name: nurse.full_name,
      intake_notes: TAG,
      checked_in_at: consultAt,
    })
    .select("id")
    .single()

  if (ticketError) {
    console.error(`Ticket failed for ${name}:`, ticketError.message)
  } else if (ticket?.id) {
    ticketsCreated += 1
    await supabase
      .from("consultations")
      .update({ queue_ticket_id: ticket.id })
      .eq("id", consult.id)
  }

  // Update last_visit on patient record for realism
  await supabase
    .from("patient_records")
    .update({ last_visit: manilaYmd(new Date(consultAt)) })
    .eq("id", record.id)

  // Issue 1–2 document types per patient so all 4 types appear overall
  const docsForPatient = [
    DOC_TYPES[i % DOC_TYPES.length],
    DOC_TYPES[(i + 1) % DOC_TYPES.length],
  ]

  for (const docType of docsForPatient) {
    // Dental patients skip NFG (sports clearance) sometimes — still seed all types across cohort
    const documentNumber = await nextDocumentNumber(supabase, docType)
    const issuedAt = new Date(
      new Date(consultAt).getTime() + 20 * 60_000
    ).toISOString()

    const { error: docError } = await supabase.from("medical_certificates").insert({
      patient_id: operationalId,
      certificate_number: documentNumber,
      certificate_type: certificateTypeLabel(docType),
      document_type: docType,
      purpose:
        docType === "prescription"
          ? "Prescription"
          : docType === "go_home_slip"
            ? "May go home"
            : docType === "nfg_medical_clearance"
              ? "NFG / sports clearance"
              : "Medical certification",
      doctor_name: doctor.full_name,
      remarks: TAG,
      status: "issued",
      issued_at: issuedAt,
      issued_by: doctor.id,
      consultation_id: consult.id,
      patient_record_id: record.id,
      payload: payloadFor(docType),
      template_version: "1",
    })

    if (docError) {
      console.error(
        `Document ${docType} failed for ${name}:`,
        docError.message
      )
    } else {
      docsCreated += 1
    }
  }
}

console.log(
  JSON.stringify(
    {
      tag: TAG,
      asOf: today,
      consultsCreated,
      ticketsCreated,
      docsCreated,
      staff: {
        nurse: nurse.full_name,
        physician: physician.full_name,
        dentist: dentist?.full_name ?? null,
      },
      note: "Refresh Reports (Today / This Week / This Month) to see KPIs and charts.",
    },
    null,
    2
  )
)
