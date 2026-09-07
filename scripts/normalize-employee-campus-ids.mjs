import fs from "node:fs"
import path from "node:path"

const envPath = path.join(process.cwd(), ".env.local")
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=")
      return [line.slice(0, i), line.slice(i + 1)]
    })
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

function normalizeEmployeeCampusId(raw) {
  const trimmed = String(raw ?? "").trim()
  if (!trimmed) return trimmed
  if (/^\d{4}-\d{5}$/.test(trimmed)) return trimmed
  if (/^\d{2}-\d{5}$/.test(trimmed)) return `20${trimmed}`
  const digits = trimmed.replace(/\D/g, "")
  if (/^\d{7}$/.test(digits)) {
    return `20${digits.slice(0, 2)}-${digits.slice(2)}`
  }
  if (/^\d{9}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }
  return trimmed
}

function needsNormalize(value) {
  const next = normalizeEmployeeCampusId(value)
  return Boolean(next && next !== value)
}

async function rest(pathname, init = {}) {
  const res = await fetch(`${url}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: init.prefer || "return=representation",
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${pathname} ${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}

const records = await rest(
  "patient_records?select=id,patient_type,employee_id,student_id&patient_type=in.(faculty,employee)&employee_id=not.is.null"
)
let recordsUpdated = 0
for (const row of records) {
  if (!needsNormalize(row.employee_id)) continue
  const next = normalizeEmployeeCampusId(row.employee_id)
  await rest(`patient_records?id=eq.${row.id}`, {
    method: "PATCH",
    body: JSON.stringify({ employee_id: next }),
  })
  recordsUpdated += 1
  console.log(
    `patient_records ${row.employee_id} -> ${next} (${row.patient_type})`
  )
}

const patients = await rest(
  "patients?select=id,patient_type,employee_id,student_id&patient_type=in.(faculty,employee)&employee_id=not.is.null"
)
let patientsUpdated = 0
for (const row of patients) {
  if (!needsNormalize(row.employee_id)) continue
  const next = normalizeEmployeeCampusId(row.employee_id)
  await rest(`patients?id=eq.${row.id}`, {
    method: "PATCH",
    body: JSON.stringify({ employee_id: next }),
  })
  patientsUpdated += 1
  console.log(`patients ${row.employee_id} -> ${next} (${row.patient_type})`)
}

const tickets = await rest(
  "health_queue_tickets?select=id,campus_id,patient_type&campus_id=not.is.null"
)
let ticketsUpdated = 0
for (const row of tickets || []) {
  const id = String(row.campus_id || "")
  // Never touch student YYYY-######
  if (/^\d{4}-\d{6}$/.test(id)) continue
  if (!needsNormalize(id)) continue
  if (!/^\d{2}-\d{5}$/.test(id) && !/^\d{7}$/.test(id.replace(/\D/g, ""))) {
    continue
  }
  const next = normalizeEmployeeCampusId(id)
  await rest(`health_queue_tickets?id=eq.${row.id}`, {
    method: "PATCH",
    body: JSON.stringify({ campus_id: next }),
  })
  ticketsUpdated += 1
}

let usersUpdated = 0
try {
  const users = await rest("users?select=id,employee_id&employee_id=not.is.null")
  for (const row of users || []) {
    if (!needsNormalize(row.employee_id)) continue
    const next = normalizeEmployeeCampusId(row.employee_id)
    await rest(`users?id=eq.${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ employee_id: next }),
    })
    usersUpdated += 1
  }
} catch (error) {
  console.log("users skip:", error instanceof Error ? error.message : error)
}

const verify = await rest(
  "patient_records?select=id,first_name,last_name,patient_type,employee_id,student_id&patient_type=in.(faculty,employee)&or=(employee_id.eq.26-00001,employee_id.eq.2026-00001,last_name.ilike.*Flores*)&limit=10"
)

const leftoverLegacy = await rest(
  "patient_records?select=id,employee_id,patient_type&patient_type=in.(faculty,employee)&employee_id=like.??-*****"
).catch(() => [])

console.log(
  JSON.stringify(
    {
      recordsUpdated,
      patientsUpdated,
      ticketsUpdated,
      usersUpdated,
      verify,
      leftoverSample: leftoverLegacy?.slice?.(0, 5) ?? leftoverLegacy,
    },
    null,
    2
  )
)
