import {
  STANDARD_DENTIST_CASE_LABELS,
  STANDARD_PHYSICIAN_CASE_LABELS,
} from "@/lib/health/health-case-options"

const OTHER_LABEL = "Other"

const MEDICAL_ALIASES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /headache|migraine/i, label: "Headache" },
  { pattern: /\bwounds?\b|laceration|\bcut\b|abrasion/i, label: "Wounds" },
  { pattern: /\binjur/i, label: "Injury" },
  { pattern: /menstrual|dysmenorrhea|cramp/i, label: "Menstrual Cramps" },
  { pattern: /\bcold\b|flu-like|influenza/i, label: "Cold" },
  { pattern: /fever/i, label: "Fever" },
  { pattern: /stomach|abdomen|abdominal|tummy/i, label: "Stomach Ache" },
  {
    pattern: /muscle pain|body pain|myalgia|body ache/i,
    label: "Muscle Pain / Body Pain",
  },
  { pattern: /allerg/i, label: "Allergy" },
  { pattern: /anxi/i, label: "Anxiety" },
  { pattern: /dizz|vertigo/i, label: "Dizziness" },
  { pattern: /\bgerd\b|acid reflux|heartburn/i, label: "GERD" },
  { pattern: /loose bowel|diarrhea|lbm/i, label: "Loose Bowel Movement" },
  { pattern: /blood pressure|\bbp\b|hypertension/i, label: "Increased BP" },
  { pattern: /asthma/i, label: "Asthma" },
  { pattern: /chickenpox|varicella/i, label: "Chickenpox" },
  { pattern: /\bcough\b/i, label: "Cough" },
  { pattern: /eye irritat|sore eye|conjunctiv/i, label: "Eye Irritation" },
  { pattern: /nause|vomit/i, label: "Nausea / Vomiting" },
  { pattern: /nosebleed|epistaxis/i, label: "Nosebleed" },
]

const DENTAL_ALIASES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /toothache|tooth ache|dental pain/i, label: "Toothache" },
  {
    pattern: /caries|tooth decay|cavit/i,
    label: "Dental Caries / Tooth Decay",
  },
  { pattern: /gingivitis/i, label: "Gingivitis" },
  { pattern: /periodontitis|periodontal/i, label: "Periodontitis" },
  {
    pattern: /ulcer|canker|aphthous/i,
    label: "Oral Ulcer / Canker Sore",
  },
  { pattern: /sensitiv/i, label: "Tooth Sensitivity" },
  { pattern: /impacted/i, label: "Impacted Tooth" },
  { pattern: /abscess/i, label: "Dental Abscess" },
  {
    pattern: /broken|fractur/i,
    label: "Broken / Fractured Tooth",
  },
]

function presetLabels(consultationType: "medical" | "dental"): string[] {
  return consultationType === "dental"
    ? [...STANDARD_DENTIST_CASE_LABELS]
    : [...STANDARD_PHYSICIAN_CASE_LABELS]
}

function exactPreset(
  text: string,
  consultationType: "medical" | "dental"
): string | null {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return null
  return (
    presetLabels(consultationType).find(
      (label) => label.toLowerCase() === normalized
    ) ?? null
  )
}

export function normalizeHealthCase(
  text: string | null | undefined,
  consultationType: "medical" | "dental" = "medical"
): string {
  const raw = (text ?? "").replace(/\s+/g, " ").trim()
  if (!raw || raw === "—") return OTHER_LABEL

  const exact = exactPreset(raw, consultationType)
  if (exact) return exact

  const aliases =
    consultationType === "dental" ? DENTAL_ALIASES : MEDICAL_ALIASES
  for (const alias of aliases) {
    if (alias.pattern.test(raw)) return alias.label
  }

  // Preserve free-text "other" values so charts/tables list specific cases
  // instead of collapsing everything into a generic "Other" bucket.
  if (/^other(\b|:|-)/i.test(raw)) {
    const detail = raw.replace(/^other(\b|:|-)\s*/i, "").trim()
    return detail || OTHER_LABEL
  }
  return raw
}

/** Split multi-select diagnosis text into individual health-case labels. */
export function extractHealthCaseLabels(
  diagnosis: string | null | undefined,
  complaint: string | null | undefined,
  consultationType: "medical" | "dental"
): string[] {
  const primary =
    diagnosis && diagnosis.trim() && diagnosis.trim() !== "—"
      ? diagnosis
      : complaint && complaint.trim() && complaint.trim() !== "—"
        ? complaint
        : ""
  if (!primary) return [OTHER_LABEL]

  const lines = primary
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return [OTHER_LABEL]

  const labels = lines.map((line) =>
    normalizeHealthCase(line, consultationType)
  )
  return labels.length > 0 ? labels : [OTHER_LABEL]
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
  topN = 20
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
export const STANDARD_MEDICAL_CASE_LABELS = [...STANDARD_PHYSICIAN_CASE_LABELS]

export const STANDARD_DENTAL_CASE_LABELS = [...STANDARD_DENTIST_CASE_LABELS]

export const ALL_STANDARD_HEALTH_CASE_LABELS = [
  ...STANDARD_MEDICAL_CASE_LABELS,
  ...STANDARD_DENTAL_CASE_LABELS,
] as const
