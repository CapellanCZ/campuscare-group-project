import { DENTAL_CHIEF_COMPLAINT_OPTIONS } from "@/lib/health/dental-form-options"
import { CHIEF_COMPLAINT_OPTIONS } from "@/lib/health/form-options"

const OTHER_LABEL = "Other"

const MEDICAL_ALIASES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /headache|migraine/i, label: "Headache" },
  { pattern: /wound|laceration|\bcut\b|abrasion/i, label: "Wound / injury" },
  { pattern: /injur/i, label: "Wound / injury" },
  { pattern: /menstrual|dysmenorrhea|cramp/i, label: "Menstrual Cramps" },
  { pattern: /\bcold\b|flu-like|influenza/i, label: "Cough / cold" },
  { pattern: /fever/i, label: "Fever / flu-like symptoms" },
  { pattern: /stomach|abdomen|abdominal|tummy/i, label: "Stomach pain" },
  { pattern: /muscle pain|body pain|myalgia|body ache/i, label: "Muscle Pain / Body Pain" },
  { pattern: /allerg/i, label: "Allergy" },
  { pattern: /anxi/i, label: "Anxiety" },
  { pattern: /dizz|vertigo/i, label: "Dizziness" },
  { pattern: /\bgerd\b|acid reflux|heartburn/i, label: "GERD" },
  { pattern: /blood pressure|\bbp\b|hypertension/i, label: "Increased BP" },
  { pattern: /toothache|tooth ache|dental pain/i, label: "Toothache" },
  { pattern: /asthma/i, label: "Asthma" },
  { pattern: /\bcough\b/i, label: "Cough / cold" },
  { pattern: /eye irritat|sore eye|conjunctiv/i, label: "Eye Irritation" },
  { pattern: /nause|vomit/i, label: "Nausea / Vomiting" },
  { pattern: /nosebleed|epistaxis/i, label: "Nosebleed" },
  { pattern: /skin|rash|dermat/i, label: "Skin concern" },
  { pattern: /check-?up|clearance/i, label: "Check-up / clearance" },
]

function presetLabels(): string[] {
  return [
    ...CHIEF_COMPLAINT_OPTIONS.map((option) => option.value),
    ...DENTAL_CHIEF_COMPLAINT_OPTIONS.map((option) => option.value),
  ]
}

function exactPreset(text: string): string | null {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return null
  return (
    presetLabels().find((label) => label.toLowerCase() === normalized) ?? null
  )
}

export function normalizeHealthCase(
  text: string | null | undefined,
  consultationType: "medical" | "dental" = "medical"
): string {
  const raw = (text ?? "").replace(/\s+/g, " ").trim()
  if (!raw || raw === "—") return OTHER_LABEL

  const exact = exactPreset(raw)
  if (exact) return exact

  const aliases =
    consultationType === "dental"
      ? MEDICAL_ALIASES.filter((alias) => /tooth|gum|oral|cavit/i.test(alias.label))
      : MEDICAL_ALIASES
  for (const alias of aliases) {
    if (alias.pattern.test(raw)) return alias.label
  }
  if (consultationType === "dental") {
    for (const alias of MEDICAL_ALIASES) {
      if (alias.pattern.test(raw)) return alias.label
    }
  }
  return OTHER_LABEL
}

export type HealthCaseBucket = {
  label: string
  student: number
  faculty: number
  employee: number
  total: number
}

export function rankHealthCases(
  buckets: HealthCaseBucket[],
  topN = 8
): HealthCaseBucket[] {
  const ranked = [...buckets]
    .filter((bucket) => bucket.total > 0)
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))

  if (ranked.length <= topN) return ranked

  const head = ranked.slice(0, topN)
  const tail = ranked.slice(topN)
  const other: HealthCaseBucket = {
    label: OTHER_LABEL,
    student: 0,
    faculty: 0,
    employee: 0,
    total: 0,
  }
  for (const bucket of tail) {
    other.student += bucket.student
    other.faculty += bucket.faculty
    other.employee += bucket.employee
    other.total += bucket.total
  }
  const existingOther = head.findIndex((bucket) => bucket.label === OTHER_LABEL)
  if (existingOther >= 0) {
    head[existingOther] = {
      label: OTHER_LABEL,
      student: head[existingOther].student + other.student,
      faculty: head[existingOther].faculty + other.faculty,
      employee: head[existingOther].employee + other.employee,
      total: head[existingOther].total + other.total,
    }
    return head
  }
  return other.total > 0 ? [...head, other] : head
}

/** Standard medical case rows for official HSO health-case reporting tables. */
export const STANDARD_MEDICAL_CASE_LABELS = [
  "Headache",
  "Wound / injury",
  "Menstrual Cramps",
  "Cough / cold",
  "Fever / flu-like symptoms",
  "Stomach pain",
  "Muscle Pain / Body Pain",
  "Allergy",
  "Anxiety",
  "Dizziness",
  "GERD",
  "Increased BP",
  "Toothache",
  "Asthma",
  "Eye Irritation",
  "Nausea / Vomiting",
  "Nosebleed",
] as const

export const STANDARD_DENTAL_CASE_LABELS = [
  "Toothache",
  "Oral prophylaxis",
  "Tooth extraction",
  "Dental check-up",
  "Gum concern",
] as const
