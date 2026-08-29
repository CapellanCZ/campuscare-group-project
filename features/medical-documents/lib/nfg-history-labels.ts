const NFG_MEDICAL_HISTORY_LABELS: Record<string, string> = {
  asthma: "Asthma",
  heartAilment: "Heart ailment",
  diabetesMellitus: "Diabetes mellitus",
  allergy: "Allergy",
  tb: "Tuberculosis (TB)",
}

export function nfgMedicalHistoryLabel(key: string): string {
  return (
    NFG_MEDICAL_HISTORY_LABELS[key] ??
    key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
  )
}
