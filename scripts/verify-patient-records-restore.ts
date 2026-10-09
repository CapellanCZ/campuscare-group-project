/**
 * Offline verification: export package → parse → role-scoped restore plan.
 * Run: npx tsx scripts/verify-patient-records-restore.ts
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { parseExcelSheets } from "../features/admin/lib/excel"
import { buildPatientRecordsExportWorkbook } from "../features/patients/lib/export-patient-records"
import {
  isClinicalExportPackage,
  parseClinicalRestorePackage,
  planClinicalRestore,
} from "../features/patients/lib/restore-patient-records"
import type { Consultation } from "../types/consultation"
import type { MedicalDocument } from "../types/medicalDocument"
import {
  EMPTY_MEDICAL_HISTORY,
  EMPTY_PHYSICAL_EXAM,
  type PatientRecord,
} from "../types/patientRecord"

const root = dirname(fileURLToPath(import.meta.url))
const outDir = join(root, "..", ".tmp", "patient-restore-verify")

function basePatient(): PatientRecord {
  return {
    id: "pr-1",
    patientType: "student",
    studentId: "2026-00001",
    employeeId: null,
    firstName: "Ana",
    middleName: "M",
    lastName: "Santos",
    course: "BSIT",
    yearLevel: "3",
    gender: "Female",
    birthDate: "2004-01-15",
    civilStatus: "Single",
    religion: null,
    nationality: "Filipino",
    bloodType: "O+",
    allergies: "Penicillin",
    phone: "09171234567",
    email: "ana@example.com",
    address: "Dasmariñas",
    emergencyContactName: "Maria Santos",
    emergencyContactPhone: "09170000000",
    medicalConditions: null,
    notes: null,
    lastVisit: "2026-03-01T08:00:00.000Z",
    medicalHistory: {
      ...EMPTY_MEDICAL_HISTORY,
      allergy: true,
      asthma: true,
      previousIllnessOrSurgery: "Appendectomy 2018",
    },
    physicalExam: {
      ...EMPTY_PHYSICAL_EXAM,
      bloodPressure: "110/70",
      pulseRate: "78",
      temperature: "36.5",
    },
    lastEditedAt: null,
    lastEditedBy: null,
    lastEditedByName: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    consultationsCount: 2,
    documentsCount: 1,
    archivedAt: null,
  }
}

function consult(
  id: string,
  providerType: "physician" | "dentist"
): Consultation {
  return {
    id,
    patientId: "pr-1",
    chiefComplaint: providerType === "dentist" ? "Toothache" : "Headache",
    symptoms: "Pain",
    assessment: "Assessment",
    diagnosis: providerType === "dentist" ? "Caries" : "URI",
    treatment: "Care",
    prescription: "Rx",
    providerName: "Dr. Test",
    providerRole: providerType,
    station: providerType,
    status: "completed",
    priority: "Normal",
    consultationDate: "2026-03-01T09:00:00.000Z",
    followUpDate: null,
    notes: "Notes",
    queueTicketId: null,
    consultationRequestId: null,
    appointmentId: null,
    providerType,
    queueNumber: null,
    vitals: {
      bpSystolic: 110,
      bpDiastolic: 70,
      heartRate: 78,
      temperatureC: 36.5,
      spo2: 98,
      heightCm: 160,
      weightKg: 55,
      respiratoryRate: 16,
    },
    createdAt: "2026-03-01T09:00:00.000Z",
    updatedAt: "2026-03-01T09:00:00.000Z",
    patient: {
      id: "pr-1",
      firstName: "Ana",
      lastName: "Santos",
      studentId: "2026-00001",
      employeeId: null,
      patientType: "student",
      fullName: "Ana Santos",
    },
  }
}

function doc(
  id: string,
  consultationId: string,
  certificateType: string
): MedicalDocument {
  return {
    id,
    documentNumber: id === "d-med" ? "RX-1001" : "RX-1002",
    documentType: "prescription",
    patientId: "op-1",
    consultationId,
    patientRecordId: "pr-1",
    purpose: "Care",
    doctorName: "Dr. Test",
    remarks: null,
    status: "issued",
    issuedAt: "2026-03-01T10:00:00.000Z",
    validUntil: null,
    issuedBy: "user-1",
    templateVersion: "1",
    payload: {},
    voidedBy: null,
    voidedAt: null,
    voidReason: null,
    replacesDocumentId: null,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    certificateType,
    patient: {
      id: "op-1",
      fullName: "Ana Santos",
      studentId: "2026-00001",
      email: "ana@example.com",
    },
  }
}

async function main() {
  mkdirSync(outDir, { recursive: true })

  const workbook = buildPatientRecordsExportWorkbook({
    designation: "nurse",
    patients: [basePatient()],
    consultations: [consult("c-med", "physician"), consult("c-dent", "dentist")],
    documents: [
      doc("d-med", "c-med", "Prescription"),
      doc("d-dent", "c-dent", "Dental Prescription"),
    ],
  })

  const XLSX = await import("xlsx")
  const book = XLSX.utils.book_new()
  for (const sheet of workbook.sheets) {
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]),
      sheet.name.slice(0, 31)
    )
  }
  const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  writeFileSync(join(outDir, workbook.filename), Buffer.from(buffer))

  const sheets = await parseExcelSheets(buffer)
  if (!isClinicalExportPackage(sheets)) {
    throw new Error("Package detection failed")
  }

  const parsed = parseClinicalRestorePackage(sheets)
  const nursePlan = planClinicalRestore({ designation: "nurse", package: parsed })
  const physicianPlan = planClinicalRestore({
    designation: "physician",
    package: parsed,
  })
  const dentistPlan = planClinicalRestore({
    designation: "dentist",
    package: parsed,
  })

  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(msg)
  }

  assert(nursePlan.counts.medicalConsultations === 1, "nurse medical")
  assert(nursePlan.counts.dentalConsultations === 1, "nurse dental")
  assert(nursePlan.counts.documents === 2, "nurse docs")
  assert(physicianPlan.counts.dentalConsultations === 0, "physician no dental")
  assert(physicianPlan.counts.medicalConsultations === 1, "physician medical")
  assert(dentistPlan.counts.medicalConsultations === 0, "dentist no medical")
  assert(dentistPlan.counts.medicalProfiles === 0, "dentist no profile")
  assert(dentistPlan.counts.dentalConsultations === 1, "dentist dental")
  assert(nursePlan.blockingErrors.length === 0, "nurse blocking")
  assert(parsed.patients.length === 1, "patients parsed")
  assert(parsed.medicalProfiles.length === 1, "profiles parsed")

  console.log(
    JSON.stringify(
      {
        ok: true,
        filename: workbook.filename,
        sheetNames: workbook.sheets.map((s) => s.name),
        nurse: nursePlan.counts,
        physician: physicianPlan.counts,
        dentist: dentistPlan.counts,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
