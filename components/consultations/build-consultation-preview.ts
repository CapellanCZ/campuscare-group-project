import type { ClinicalVisitWorkspace } from "@/features/clinical/data/load-consultation-workspace"
import { serializeVisitDentalValue } from "@/features/clinical/components/visit-dental-form"
import type { VisitDentalFormValue } from "@/features/clinical/components/visit-dental-form"
import type { DentalPatientChart } from "@/features/dentist/types/dental-chart"
import type { NurseVisitVitals } from "@/features/physician/types-visit"
import type { Consultation } from "@/types/consultation"
import type { QueueVitals } from "@/lib/health/types"
import { patientFullName } from "@/types/patientRecord"

function nurseVitalsToQueueVitals(vitals: NurseVisitVitals): QueueVitals | null {
  const bp = vitals.bloodPressure?.trim()
  let bpSystolic: number | null = null
  let bpDiastolic: number | null = null
  if (bp) {
    const match = bp.match(/(\d+)\s*\/\s*(\d+)/)
    if (match) {
      bpSystolic = Number(match[1])
      bpDiastolic = Number(match[2])
    }
  }
  const hasAny =
    bpSystolic != null ||
    vitals.pulseRate?.trim() ||
    vitals.temperature?.trim() ||
    vitals.o2?.trim()
  if (!hasAny) return null
  return {
    bpSystolic,
    bpDiastolic,
    heartRate: vitals.pulseRate ? Number(vitals.pulseRate) : null,
    temperatureC: vitals.temperature ? Number(vitals.temperature) : null,
    spo2: vitals.o2 ? Number(vitals.o2) : null,
    heightCm: vitals.height ? Number(vitals.height) : null,
    weightKg: vitals.weight ? Number(vitals.weight) : null,
    respiratoryRate: null,
  }
}

function patientFromWorkspace(workspace: ClinicalVisitWorkspace) {
  const record = workspace.medicalRecord
  if (record) {
    return {
      id: record.id,
      firstName: record.firstName,
      lastName: record.lastName,
      studentId: record.studentId ?? "",
      employeeId: record.employeeId,
      patientType: record.patientType,
      fullName: patientFullName(record),
    }
  }
  const parts = workspace.patientName.trim().split(/\s+/).filter(Boolean)
  return {
    id: workspace.patientRecordId,
    firstName: parts.slice(0, -1).join(" ") || workspace.patientName,
    lastName: parts.at(-1) ?? "",
    studentId: workspace.campusId ?? "",
    employeeId: null,
    patientType: "student" as const,
    fullName: workspace.patientName,
  }
}

function basePreviewVisit(
  workspace: Pick<
    ClinicalVisitWorkspace,
    | "consultationId"
    | "patientRecordId"
    | "consultationDate"
    | "appointmentId"
    | "chiefComplaint"
    | "role"
  >,
  patch: Partial<Consultation>
): Consultation {
  const role = workspace.role
  return {
    id: workspace.consultationId,
    patientId: workspace.patientRecordId,
    chiefComplaint: workspace.chiefComplaint,
    symptoms: null,
    assessment: null,
    diagnosis: null,
    treatment: null,
    prescription: null,
    providerName: null,
    providerRole: role,
    station: role,
    status: "ongoing",
    priority: "Normal",
    consultationDate: workspace.consultationDate,
    followUpDate: null,
    notes: null,
    queueTicketId: null,
    consultationRequestId: null,
    appointmentId: workspace.appointmentId,
    providerType: role,
    queueNumber: null,
    vitals: {},
    createdAt: workspace.consultationDate,
    updatedAt: new Date().toISOString(),
    patient: {
      id: workspace.patientRecordId,
      firstName: "",
      lastName: "",
      studentId: "",
      employeeId: null,
      patientType: "student",
      fullName: "",
    },
    ...patch,
  }
}

export function buildPhysicianConsultationPreview(params: {
  workspace: ClinicalVisitWorkspace
  symptoms: string
  diagnosis: string
  clinicalNotes: string
  prescription: string
  followUpDate?: string | null
}): { visit: Consultation; ticketVitals: QueueVitals | null } {
  const { workspace } = params
  return {
    visit: basePreviewVisit(workspace, {
      symptoms: params.symptoms || null,
      diagnosis: params.diagnosis || null,
      assessment: params.clinicalNotes || null,
      prescription: params.prescription || null,
      followUpDate: params.followUpDate || null,
      providerType: "physician",
      providerRole: "physician",
      station: "physician",
      patient: patientFromWorkspace(workspace),
      vitals: (workspace.nurseVitals as unknown as Record<string, unknown>) ?? {},
    }),
    ticketVitals: nurseVitalsToQueueVitals(workspace.nurseVitals),
  }
}

export function buildDentalFormConsultationPreview(params: {
  workspace: ClinicalVisitWorkspace
  dentalForm: VisitDentalFormValue
  prescription?: string
}): { visit: Consultation; ticketVitals: QueueVitals | null } {
  const payload = serializeVisitDentalValue(params.dentalForm)
  return {
    visit: basePreviewVisit(params.workspace, {
      chiefComplaint: payload.symptoms || params.workspace.chiefComplaint,
      symptoms: payload.symptoms || null,
      diagnosis: payload.diagnosis || null,
      assessment: payload.clinicalNotes || null,
      prescription: params.prescription || payload.prescription || null,
      treatment: payload.treatment || null,
      followUpDate: payload.followUpDate,
      providerType: "dentist",
      providerRole: "dentist",
      station: "dentist",
      patient: patientFromWorkspace(params.workspace),
    }),
    ticketVitals: nurseVitalsToQueueVitals(params.workspace.nurseVitals),
  }
}

export function buildDentalChartConsultationPreview(params: {
  consultationId?: string | null
  appointmentId: string
  patientName: string
  campusId: string | null
  chart: DentalPatientChart
}): Consultation {
  const nameParts = params.patientName.trim().split(/\s+/).filter(Boolean)
  return {
    id: params.consultationId ?? params.appointmentId,
    patientId: params.appointmentId,
    chiefComplaint: params.chart.clinical.chiefComplaint || null,
    symptoms: params.chart.clinical.chiefComplaint || null,
    assessment: params.chart.clinical.caseHistory || null,
    diagnosis: params.chart.diagnosis || null,
    treatment: params.chart.treatmentNotes || null,
    prescription: params.chart.prescription || null,
    providerName: null,
    providerRole: "dentist",
    station: "dentist",
    status: "ongoing",
    priority: "Normal",
    consultationDate: new Date().toISOString(),
    followUpDate: null,
    notes: null,
    queueTicketId: null,
    consultationRequestId: null,
    appointmentId: params.appointmentId,
    providerType: "dentist",
    queueNumber: null,
    vitals: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    patient: {
      id: params.appointmentId,
      firstName: nameParts.slice(0, -1).join(" ") || params.patientName,
      lastName: nameParts.at(-1) ?? "",
      studentId: params.campusId ?? params.chart.demographics.studentId,
      employeeId: null,
      patientType: "student",
      fullName: params.patientName,
    },
  }
}
