import type { ClinicalVisitWorkspace } from "@/features/clinical/data/load-consultation-workspace"
import { EMPTY_MEDICAL_HISTORY, type MedicalHistory } from "@/types/patientRecord"
import type {
  GoHomeSlipPayload,
  MedicalCertificationPayload,
  NfgClearancePayload,
  PrescriptionMedication,
  PrescriptionPayload,
} from "@/types/medicalDocument"

export function formatMedicationsAsPrescriptionText(
  medications: PrescriptionMedication[] | null | undefined
): string {
  return (medications ?? [])
    .map((med) => {
      const parts = [
        med.name?.trim(),
        med.strength?.trim(),
        med.quantity?.trim() ? `Qty: ${med.quantity.trim()}` : null,
        med.frequency?.trim(),
        med.duration?.trim(),
        med.instructions?.trim(),
      ].filter(Boolean)
      return parts.join(" — ")
    })
    .filter(Boolean)
    .join("\n")
}

function parsePrescriptionLines(text: string | null): PrescriptionMedication[] {
  if (!text?.trim()) return []
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ name: line }))
}

function formatAge(birthDate: string | null | undefined): string | null {
  if (!birthDate) return null
  const born = Date.parse(birthDate)
  if (Number.isNaN(born)) return null
  const years = Math.floor(
    (Date.now() - born) / (365.25 * 24 * 60 * 60 * 1000)
  )
  return years >= 0 ? String(years) : null
}

export type ConsultationDocumentContext = {
  patientName: string
  patientId: string
  patientRecordId: string
  consultationId: string
  consultationDate: string
  campusId: string | null
  course: string | null
  address: string | null
  age: string | null
  sex: string | null
  birthDate: string | null
  phone: string | null
  prescriptionText: string | null
  medications: PrescriptionMedication[]
}

export function buildConsultationDocumentContext(
  workspace: ClinicalVisitWorkspace
): ConsultationDocumentContext {
  const record = workspace.medicalRecord
  const medications = parsePrescriptionLines(workspace.prescription)

  return {
    patientName: workspace.patientName,
    patientId: workspace.patientRecordId,
    patientRecordId: workspace.patientRecordId,
    consultationId: workspace.consultationId,
    consultationDate: workspace.consultationDate,
    campusId: workspace.campusId,
    course: record?.course ?? null,
    address: record?.address ?? null,
    age: formatAge(record?.birthDate ?? null),
    sex: record?.gender ?? null,
    birthDate: record?.birthDate ?? null,
    phone: record?.phone ?? null,
    prescriptionText: workspace.prescription,
    medications,
  }
}

export function defaultMedicalCertificationPayload(
  ctx: ConsultationDocumentContext
): MedicalCertificationPayload {
  return {
    purposeCategory: "others",
    purposeOther: null,
    certificationStatus: "fit_all",
    dateOfExamination: ctx.consultationDate.slice(0, 10),
    restrictions: null,
    recommendations: null,
    treatmentSuggested: null,
    treatmentOptional: null,
  }
}

export function defaultGoHomeSlipPayload(
  ctx: ConsultationDocumentContext
): GoHomeSlipPayload {
  return {
    reason: "",
    releaseDate: new Date().toISOString().slice(0, 10),
    medications: ctx.medications,
  }
}

export function defaultPrescriptionPayload(
  ctx: ConsultationDocumentContext
): PrescriptionPayload {
  return {
    medications:
      ctx.medications.length > 0
        ? ctx.medications
        : [{ name: "", strength: "", quantity: "", frequency: "", instructions: "" }],
    patientAddress: ctx.address,
    patientAge: ctx.age,
    patientSex: ctx.sex,
  }
}

export function defaultNfgClearancePayload(
  workspace: ClinicalVisitWorkspace,
  ctx: ConsultationDocumentContext
): NfgClearancePayload {
  const record = workspace.medicalRecord
  const vitals = workspace.nurseVitals
  const history: MedicalHistory =
    record?.medicalHistory ?? { ...EMPTY_MEDICAL_HISTORY }

  return {
    dateOfBirth: ctx.birthDate,
    gender: ctx.sex,
    phone: ctx.phone,
    sport: null,
    campus: ctx.course,
    emergencyContact: [record?.emergencyContactName, record?.emergencyContactPhone]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" — ") || null,
    physical: {
      height: record?.physicalExam?.height ?? vitals.height ?? null,
      weight: record?.physicalExam?.weight ?? vitals.weight ?? null,
      bloodPressure:
        vitals.bloodPressure || record?.physicalExam?.bloodPressure || null,
      heartRate: vitals.pulseRate || record?.physicalExam?.pulseRate || null,
      respiratoryRate: null,
      otherFindings: record?.physicalExam?.otherPertinentFindings ?? null,
    },
    medicalHistory: {
      asthma: Boolean(history.asthma),
      heartAilment: Boolean(history.heartAilment),
      diabetesMellitus: Boolean(history.diabetesMellitus),
      allergy: Boolean(history.allergy),
      tb: Boolean(history.tb),
    },
    historyDetails: history.previousIllnessOrSurgery ?? null,
    clearanceStatus: "cleared_full",
    restrictions: null,
    recommendations: null,
  }
}

export function purposeLabelFromPayload(payload: MedicalCertificationPayload): string {
  const categories: Record<string, string> = {
    internship_ojt: "Internship / OJT",
    off_campus_sports: "Off-Campus Activity — Sports Activity",
    off_campus_nfg: "Off-Campus Activity — Nationalian Friendship Games (NFG)",
    off_campus_seminars: "Off-Campus Activity — Seminars",
    off_campus_outreach: "Off-Campus Activity — Outreach",
    intramurals: "Intramurals",
    others: "Others",
  }
  const base = categories[payload.purposeCategory] ?? payload.purposeCategory
  if (payload.purposeCategory === "others" && payload.purposeOther?.trim()) {
    return payload.purposeOther.trim()
  }
  return base
}
