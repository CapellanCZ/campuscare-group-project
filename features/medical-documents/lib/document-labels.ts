import type { MedicalDocumentType } from "@/types/medicalDocument"

export const ISSUE_DOCUMENT_TYPE_OPTIONS: Array<{
  type: MedicalDocumentType
  title: string
  description: string
}> = [
  {
    type: "medical_certification",
    title: "Medical Certificate",
    description:
      "A medical document certifying a patient's medical fitness or condition for a specified university requirement, activity, or event.",
  },
  {
    type: "go_home_slip",
    title: "Go Home Slip",
    description:
      "A medical document issued by the Health Services Office authorizing a patient to leave the university and go home due to a medical condition, including the reason for release and any prescribed medication.",
  },
  {
    type: "prescription",
    title: "Prescription",
    description:
      "An official medical prescription containing the medications prescribed by the physician, including dosage, quantity, and instructions for use.",
  },
  {
    type: "nfg_medical_clearance",
    title: "NFG Medical Clearance Form",
    description:
      "A medical clearance form used to assess a student's physical fitness and eligibility to participate in the Nationalian Friendship Games, including medical history, physical examination, restrictions, and physician recommendations.",
  },
]

export const CERTIFICATION_PURPOSE_CATEGORIES = [
  { value: "internship_ojt", label: "Internship / OJT" },
  {
    value: "off_campus_sports",
    label: "Off-Campus Activity — Sports Activity",
  },
  {
    value: "off_campus_nfg",
    label: "Off-Campus Activity — Nationalian Friendship Games (NFG)",
  },
  {
    value: "off_campus_seminars",
    label: "Off-Campus Activity — Seminars",
  },
  {
    value: "off_campus_outreach",
    label: "Off-Campus Activity — Outreach",
  },
  { value: "intramurals", label: "Intramurals" },
  { value: "others", label: "Others" },
] as const

export const CERTIFICATION_STATUS_OPTIONS = [
  {
    value: "fit_all",
    label: "Physically fit for any activity of the University",
  },
  {
    value: "underdeveloped_fit",
    label:
      "Physically underdeveloped or with correctable defects, but otherwise fit for any school activity or event of the University",
  },
  {
    value: "special_placement",
    label:
      "Student but owing to certain impairments or conditions, requires special placement for school event/activity or limited duty in a specified or selected assignments requiring follow-up treatments/period evaluation",
  },
  {
    value: "unfit",
    label: "Unfit or unsafe for any type of university activity or event",
  },
  {
    value: "pending_clearance",
    label: "Pending Clearance",
  },
] as const

export const NFG_CLEARANCE_STATUS_OPTIONS = [
  {
    value: "cleared_full",
    label: "Cleared for full participation in sports/activities.",
  },
  {
    value: "cleared_restrictions",
    label: "Cleared with restrictions",
  },
  {
    value: "not_cleared",
    label: "Not cleared",
  },
  {
    value: "pending",
    label: "Pending further evaluation",
  },
] as const
