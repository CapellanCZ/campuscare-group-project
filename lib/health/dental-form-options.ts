import type { FormSelectOption } from "@/lib/health/form-options"

/** Dental chief complaints for dentist consultation mode. */
export const DENTAL_CHIEF_COMPLAINT_OPTIONS: FormSelectOption[] = [
  { value: "Toothache", label: "Toothache" },
  { value: "Cavities", label: "Cavities" },
  { value: "Swollen Gums", label: "Swollen Gums" },
  { value: "Bleeding Gums", label: "Bleeding Gums" },
  { value: "Broken Tooth", label: "Broken Tooth" },
  { value: "Oral Pain", label: "Oral Pain" },
]

export const DENTAL_DIAGNOSIS_OPTIONS: FormSelectOption[] = [
  { value: "Dental Caries", label: "Dental Caries" },
  { value: "Gingivitis", label: "Gingivitis" },
  { value: "Periodontitis", label: "Periodontitis" },
  { value: "Tooth Fracture", label: "Tooth Fracture" },
  { value: "Impacted Tooth", label: "Impacted Tooth" },
]

export const DENTAL_TREATMENT_OPTIONS: FormSelectOption[] = [
  { value: "Oral Examination", label: "Oral Examination" },
  { value: "Tooth Extraction", label: "Tooth Extraction" },
  { value: "Temporary Filling", label: "Temporary Filling" },
  { value: "Oral Prophylaxis (Cleaning)", label: "Oral Prophylaxis (Cleaning)" },
  { value: "Fluoride Application", label: "Fluoride Application" },
  { value: "Medication Advice", label: "Medication Advice" },
  {
    value: "Referral to External Dental Clinic",
    label: "Referral to External Dental Clinic",
  },
]

export const DENTAL_REFERRAL_TREATMENT = "Referral to External Dental Clinic"

export type DentalExamFields = {
  oralFindings: string
  teethCondition: string
  gumCondition: string
  softTissue: string
}

const EXAM_MARK = {
  oral: "Oral examination findings:",
  teeth: "Teeth condition:",
  gum: "Gum condition:",
  soft: "Oral soft tissue findings:",
} as const

/** Serialize dental exam fields into assessment text for storage. */
export function formatDentalAssessment(fields: DentalExamFields): string {
  return [
    `${EXAM_MARK.oral} ${fields.oralFindings.trim() || "—"}`,
    `${EXAM_MARK.teeth} ${fields.teethCondition.trim() || "—"}`,
    `${EXAM_MARK.gum} ${fields.gumCondition.trim() || "—"}`,
    `${EXAM_MARK.soft} ${fields.softTissue.trim() || "—"}`,
  ].join("\n")
}

/** Parse assessment text back into dental exam fields. */
export function parseDentalAssessment(assessment: string | null): DentalExamFields {
  const text = assessment ?? ""
  const pick = (label: string) => {
    const re = new RegExp(
      `${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*([^\\n]*)`,
      "i"
    )
    const match = text.match(re)
    const value = match?.[1]?.trim() ?? ""
    return value === "—" ? "" : value
  }
  if (
    !text.includes(EXAM_MARK.oral) &&
    !text.includes(EXAM_MARK.teeth)
  ) {
    return {
      oralFindings: text,
      teethCondition: "",
      gumCondition: "",
      softTissue: "",
    }
  }
  return {
    oralFindings: pick(EXAM_MARK.oral),
    teethCondition: pick(EXAM_MARK.teeth),
    gumCondition: pick(EXAM_MARK.gum),
    softTissue: pick(EXAM_MARK.soft),
  }
}

export type DentalPrescriptionFields = {
  medication: string
  dosage: string
  frequency: string
  duration: string
}

export function formatDentalPrescription(fields: DentalPrescriptionFields): string {
  const parts = [
    fields.medication.trim() && `Medication: ${fields.medication.trim()}`,
    fields.dosage.trim() && `Dosage: ${fields.dosage.trim()}`,
    fields.frequency.trim() && `Frequency: ${fields.frequency.trim()}`,
    fields.duration.trim() && `Duration: ${fields.duration.trim()}`,
  ].filter(Boolean)
  return parts.join("\n")
}

export function parseDentalPrescription(
  prescription: string | null
): DentalPrescriptionFields {
  const text = prescription ?? ""
  const pick = (label: string) => {
    const re = new RegExp(`${label}:\\s*([^\\n]*)`, "i")
    return text.match(re)?.[1]?.trim() ?? ""
  }
  if (!/Medication:/i.test(text)) {
    return {
      medication: text,
      dosage: "",
      frequency: "",
      duration: "",
    }
  }
  return {
    medication: pick("Medication"),
    dosage: pick("Dosage"),
    frequency: pick("Frequency"),
    duration: pick("Duration"),
  }
}

export function isDentalReferralTreatment(treatment: string | null | undefined) {
  if (!treatment) return false
  return /referral/i.test(treatment)
}
