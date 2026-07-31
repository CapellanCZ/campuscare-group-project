export const OTHER_SELECT_VALUE = "__other__" as const

export type FormSelectOption = {
  value: string
  label: string
}

/** Common campus clinic consultation / visit types. */
export const CONSULTATION_TYPE_OPTIONS: FormSelectOption[] = [
  { value: "General consultation", label: "General consultation" },
  { value: "Follow-up", label: "Follow-up" },
  { value: "Medical clearance", label: "Medical clearance" },
  { value: "Medical certificate", label: "Medical certificate" },
  { value: "Dental consultation", label: "Dental consultation" },
  { value: "First aid / wound care", label: "First aid / wound care" },
  { value: "Walk-in consultation", label: "Walk-in consultation" },
]

/** Frequent chief complaints for nurse intake / consult notes. */
export const CHIEF_COMPLAINT_OPTIONS: FormSelectOption[] = [
  { value: "Fever / flu-like symptoms", label: "Fever / flu-like" },
  { value: "Cough / cold", label: "Cough / cold" },
  { value: "Headache", label: "Headache" },
  { value: "Stomach pain", label: "Stomach pain" },
  { value: "Toothache", label: "Toothache" },
  { value: "Wound / injury", label: "Wound / injury" },
  { value: "Skin concern", label: "Skin concern" },
  { value: "Check-up / clearance", label: "Check-up / clearance" },
]

/** Typical reasons for issuing a medical certificate. */
export const CERTIFICATE_PURPOSE_OPTIONS: FormSelectOption[] = [
  { value: "Job application", label: "Job application" },
  { value: "School requirement", label: "School requirement" },
  { value: "Scholarship", label: "Scholarship" },
  { value: "Sports / varsity", label: "Sports / varsity" },
  { value: "OJT / internship", label: "OJT / internship" },
  { value: "Leave of absence", label: "Leave of absence" },
]

export function isPresetFormOption(
  options: readonly FormSelectOption[],
  value: string
) {
  return options.some((option) => option.value === value)
}
