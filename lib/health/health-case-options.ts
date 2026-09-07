/** Standardized Assessment / Diagnosis health-case checklists. */

export type HealthCaseOption = {
  id: string
  label: string
  isOthers?: boolean
}

export const PHYSICIAN_HEALTH_CASES: HealthCaseOption[] = [
  { id: "headache", label: "Headache" },
  { id: "wounds", label: "Wounds" },
  { id: "menstrual_cramps", label: "Menstrual Cramps" },
  { id: "cold", label: "Cold" },
  { id: "fever", label: "Fever" },
  { id: "stomach_ache", label: "Stomach Ache" },
  { id: "muscle_pain", label: "Muscle Pain / Body Pain" },
  { id: "allergy", label: "Allergy" },
  { id: "anxiety", label: "Anxiety" },
  { id: "dizziness", label: "Dizziness" },
  { id: "gerd", label: "GERD" },
  { id: "injury", label: "Injury" },
  { id: "lbm", label: "Loose Bowel Movement" },
  { id: "increased_bp", label: "Increased BP" },
  { id: "asthma", label: "Asthma" },
  { id: "chickenpox", label: "Chickenpox" },
  { id: "cough", label: "Cough" },
  { id: "eye_irritation", label: "Eye Irritation" },
  { id: "nausea_vomiting", label: "Nausea / Vomiting" },
  { id: "nosebleed", label: "Nosebleed" },
  { id: "others", label: "Others", isOthers: true },
]

export const DENTIST_HEALTH_CASES: HealthCaseOption[] = [
  { id: "toothache", label: "Toothache" },
  { id: "dental_caries", label: "Dental Caries / Tooth Decay" },
  { id: "gingivitis", label: "Gingivitis" },
  { id: "periodontitis", label: "Periodontitis" },
  { id: "oral_ulcer", label: "Oral Ulcer / Canker Sore" },
  { id: "tooth_sensitivity", label: "Tooth Sensitivity" },
  { id: "impacted_tooth", label: "Impacted Tooth" },
  { id: "dental_abscess", label: "Dental Abscess" },
  { id: "broken_tooth", label: "Broken / Fractured Tooth" },
  { id: "others", label: "Others", isOthers: true },
]

export type HealthCaseSelection = {
  selectedIds: string[]
  othersText: string
}

export function healthCaseOptions(
  catalog: "physician" | "dentist"
): HealthCaseOption[] {
  return catalog === "dentist" ? DENTIST_HEALTH_CASES : PHYSICIAN_HEALTH_CASES
}

/** Display/save lines — Others outputs only the custom text (no "Others:" prefix). */
export function formatHealthCaseLines(
  catalog: "physician" | "dentist",
  selection: HealthCaseSelection
): string[] {
  const options = healthCaseOptions(catalog)
  const selected = new Set(selection.selectedIds)
  const lines: string[] = []
  for (const option of options) {
    if (!selected.has(option.id)) continue
    if (option.isOthers) {
      const custom = selection.othersText.trim()
      if (custom) lines.push(custom)
      continue
    }
    lines.push(option.label)
  }
  return lines
}

export function formatHealthCaseText(
  catalog: "physician" | "dentist",
  selection: HealthCaseSelection
): string {
  return formatHealthCaseLines(catalog, selection).join("\n")
}

export function parseHealthCaseSelection(
  catalog: "physician" | "dentist",
  text: string | null | undefined
): HealthCaseSelection {
  const options = healthCaseOptions(catalog)
  const byLabel = new Map(
    options.filter((o) => !o.isOthers).map((o) => [o.label.toLowerCase(), o.id])
  )
  const lines = (text ?? "")
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)

  const selectedIds: string[] = []
  const othersParts: string[] = []

  for (const line of lines) {
    const id = byLabel.get(line.toLowerCase())
    if (id) {
      if (!selectedIds.includes(id)) selectedIds.push(id)
      continue
    }
    othersParts.push(line)
  }

  if (othersParts.length > 0) {
    if (!selectedIds.includes("others")) selectedIds.push("others")
  }

  return {
    selectedIds,
    othersText: othersParts.join(", "),
  }
}

export const STANDARD_PHYSICIAN_CASE_LABELS = PHYSICIAN_HEALTH_CASES.filter(
  (c) => !c.isOthers
).map((c) => c.label)

export const STANDARD_DENTIST_CASE_LABELS = DENTIST_HEALTH_CASES.filter(
  (c) => !c.isOthers
).map((c) => c.label)
