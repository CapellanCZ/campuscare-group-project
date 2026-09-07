export type DiagnosticRequestCatalog = "physician" | "dentist"

export type DiagnosticRequestOption = {
  id: string
  label: string
  /** When true, selecting this option unlocks a free-text field. */
  isOthers?: boolean
}

export const PHYSICIAN_DIAGNOSTIC_REQUESTS: DiagnosticRequestOption[] = [
  { id: "cbc", label: "Complete Blood Count (CBC)" },
  { id: "ua", label: "Urinalysis (UA)" },
  { id: "fecalysis", label: "Fecalysis / Stool Examination" },
  { id: "fbs", label: "Fasting Blood Sugar (FBS)" },
  { id: "blood_glucose", label: "Blood Glucose" },
  { id: "lipid_profile", label: "Lipid Profile" },
  { id: "blood_typing", label: "Blood Typing" },
  { id: "pregnancy_test", label: "Pregnancy Test" },
  { id: "chest_xray", label: "Chest X-ray" },
  { id: "ecg", label: "Electrocardiogram (ECG)" },
  { id: "ultrasound", label: "Ultrasound" },
  { id: "others", label: "Others", isOthers: true },
]

export const DENTIST_DIAGNOSTIC_REQUESTS: DiagnosticRequestOption[] = [
  { id: "periapical_xray", label: "Periapical X-ray" },
  { id: "bitewing_xray", label: "Bitewing X-ray" },
  { id: "panoramic_xray", label: "Panoramic X-ray" },
  { id: "others", label: "Others", isOthers: true },
]

export function diagnosticRequestOptions(
  catalog: DiagnosticRequestCatalog
): DiagnosticRequestOption[] {
  return catalog === "dentist"
    ? DENTIST_DIAGNOSTIC_REQUESTS
    : PHYSICIAN_DIAGNOSTIC_REQUESTS
}

export function formatDiagnosticRequestLines(input: {
  catalog: DiagnosticRequestCatalog
  selectedIds: string[]
  othersText?: string | null
}): string[] {
  const options = diagnosticRequestOptions(input.catalog)
  const selected = new Set(input.selectedIds)
  const lines: string[] = []

  for (const option of options) {
    if (!selected.has(option.id)) continue
    if (option.isOthers) {
      const custom = input.othersText?.trim()
      if (custom) lines.push(custom)
      continue
    }
    lines.push(option.label)
  }

  return lines
}
