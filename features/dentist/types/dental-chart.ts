/** NU HSO Dental Patient Chart (NUD-ADM-HSO-F010) — domain types. */

export const DENTAL_CONDITION_CODES = [
  "C",
  "CI",
  "C2",
  "X",
  "RF",
  "Am",
  "S",
  "GC",
  "ABT",
  "P",
  "GCL",
  "GI",
  "M",
  "Un",
] as const

export type DentalConditionCode = (typeof DENTAL_CONDITION_CODES)[number]

export const DENTAL_CONDITION_LEGEND: {
  code: DentalConditionCode
  label: string
}[] = [
  { code: "C", label: "Dental Caries" },
  { code: "CI", label: "Dental Carie with Vital Pulp Expose" },
  { code: "C2", label: "Dental Caries with Non–Vital Pulp Expose" },
  { code: "X", label: "Indicated for Extraction" },
  { code: "RF", label: "Retained Root Fragment" },
  { code: "Am", label: "Amalgam Filling" },
  { code: "S", label: "Silicate Filling" },
  { code: "GC", label: "Gold Crown" },
  { code: "ABT", label: "Bridge Abutment" },
  { code: "P", label: "Pontic" },
  { code: "GCL", label: "Gold Clasp" },
  { code: "GI", label: "Gold Inlay" },
  { code: "M", label: "Missing Due to Extraction" },
  { code: "Un", label: "Unerupted" },
]

/** Universal numbering: upper 1–16 L→R, lower 32–17 L→R (as on paper chart). */
export const UPPER_TEETH = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
] as const

export const LOWER_TEETH = [
  32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17,
] as const

export type ToothNumber =
  | (typeof UPPER_TEETH)[number]
  | (typeof LOWER_TEETH)[number]

/** Primary (deciduous) dentition — Universal lettering A–T. */
export const PRIMARY_UPPER_TEETH = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
] as const

export const PRIMARY_LOWER_TEETH = [
  "T",
  "S",
  "R",
  "Q",
  "P",
  "O",
  "N",
  "M",
  "L",
  "K",
] as const

export type PrimaryToothLetter =
  | (typeof PRIMARY_UPPER_TEETH)[number]
  | (typeof PRIMARY_LOWER_TEETH)[number]

/** Permanent number or primary letter on the clinical chart. */
export type ToothId = ToothNumber | PrimaryToothLetter

export const ALL_CHART_TOOTH_IDS: ToothId[] = [
  ...UPPER_TEETH,
  ...LOWER_TEETH,
  ...PRIMARY_UPPER_TEETH,
  ...PRIMARY_LOWER_TEETH,
]

export type ToothMarking = {
  code: DentalConditionCode | null
  note: string
}

export type DentalDemographics = {
  name: string
  age: string
  sex: string
  civilStatus: string
  studentId: string
  yearLevel: string
  strandProgram: string
  section: string
  officeAddress: string
  telNo: string
}

export type GingivaConsistency = "smooth" | "firm" | "hyperplastic" | ""
export type OralHygiene = "bad" | "good" | "fair" | ""
export type GingivalColor = "pink" | "bright_red" | ""
export type LymphNodes = "not_palpable" | "palpable" | ""
export type TongueFinding = "normal" | "coated" | ""
export type BloodSugarLevel = "normal" | "high" | "low" | ""

export type DentalClinicalExam = {
  caseHistory: string
  chiefComplaint: string
  gingivaConsistency: GingivaConsistency
  oralHygiene: OralHygiene
  gingivalColor: GingivalColor
  lymphNodes: LymphNodes
  tongue: TongueFinding
  occlusion: string
  classIType: string
  classIIDivision: string
  classIISubdivision: string
  classIIType: string
  classIIIDivision: string
  classIIISubdivision: string
  operations: string
  bloodSugar: BloodSugarLevel
  bleedingTime: string
  clottingTime: string
  radiographicInterpretation: string
  allergy: string
  bloodDiseases: string
  fainting: string
  bloodPressure: string
}

export type DentalPatientChart = {
  version: 1
  demographics: DentalDemographics
  teeth: Record<string, ToothMarking>
  clinical: DentalClinicalExam
  treatmentNotes: string
  diagnosis: string
  prescription: string
}

export function emptyToothMarking(): ToothMarking {
  return { code: null, note: "" }
}

export function emptyDemographics(): DentalDemographics {
  return {
    name: "",
    age: "",
    sex: "",
    civilStatus: "",
    studentId: "",
    yearLevel: "",
    strandProgram: "",
    section: "",
    officeAddress: "",
    telNo: "",
  }
}

export function emptyClinicalExam(): DentalClinicalExam {
  return {
    caseHistory: "",
    chiefComplaint: "",
    gingivaConsistency: "",
    oralHygiene: "",
    gingivalColor: "",
    lymphNodes: "",
    tongue: "",
    occlusion: "",
    classIType: "",
    classIIDivision: "",
    classIISubdivision: "",
    classIIType: "",
    classIIIDivision: "",
    classIIISubdivision: "",
    operations: "",
    bloodSugar: "",
    bleedingTime: "",
    clottingTime: "",
    radiographicInterpretation: "",
    allergy: "",
    bloodDiseases: "",
    fainting: "",
    bloodPressure: "",
  }
}

export function emptyDentalPatientChart(): DentalPatientChart {
  const teeth: Record<string, ToothMarking> = {}
  for (const id of ALL_CHART_TOOTH_IDS) {
    teeth[String(id)] = emptyToothMarking()
  }
  return {
    version: 1,
    demographics: emptyDemographics(),
    teeth,
    clinical: emptyClinicalExam(),
    treatmentNotes: "",
    diagnosis: "",
    prescription: "",
  }
}

export function isDentalConditionCode(
  value: string | null | undefined
): value is DentalConditionCode {
  return (
    !!value &&
    (DENTAL_CONDITION_CODES as readonly string[]).includes(value)
  )
}

export function parseDentalPatientChart(
  raw: unknown
): DentalPatientChart | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Partial<DentalPatientChart>
  if (row.version !== 1) return null
  const base = emptyDentalPatientChart()
  return {
    version: 1,
    demographics: { ...base.demographics, ...(row.demographics ?? {}) },
    teeth: { ...base.teeth, ...(row.teeth ?? {}) },
    clinical: { ...base.clinical, ...(row.clinical ?? {}) },
    treatmentNotes:
      typeof row.treatmentNotes === "string" ? row.treatmentNotes : "",
    diagnosis: typeof row.diagnosis === "string" ? row.diagnosis : "",
    prescription:
      typeof row.prescription === "string" ? row.prescription : "",
  }
}
