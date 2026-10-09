/**
 * Offline verification of role-scoped Patient Records Excel sheets.
 * Run: npx tsx scripts/verify-patient-records-export.ts
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { buildPatientRecordsExportWorkbook } from "../features/patients/lib/export-patient-records"
import type { Consultation } from "../types/consultation"
import type { MedicalDocument } from "../types/medicalDocument"
import {
  EMPTY_MEDICAL_HISTORY,
  EMPTY_PHYSICAL_EXAM,
  type PatientRecord,
} from "../types/patientRecord"

const root = dirname(fileURLToPath(import.meta.url))
const outDir = join(root, "..", ".tmp", "patient-export-verify")

function basePatient(overrides: Partial<PatientRecord>): PatientRecord {
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
    ...overrides,
  }
}

function baseConsultation(
  overrides: Partial<Consultation> & Pick<Consultation, "id" | "providerType">
): Consultation {
  return {
    id: overrides.id,
    patientId: "pr-1",
    chiefComplaint: "Headache",
    symptoms: "Fever",
    assessment: "Viral",
    diagnosis: "URI",
    treatment: "Rest",
    prescription: "Paracetamol",
    providerName: "Dr. Reyes",
    providerRole: "physician",
    station: overrides.providerType === "dentist" ? "dentist" : "physician",
    status: "completed",
    priority: "Normal",
    consultationDate: "2026-03-01T09:00:00.000Z",
    followUpDate: null,
    notes: "Advise hydration",
    queueTicketId: "qt-1",
    consultationRequestId: null,
    appointmentId: null,
    providerType: overrides.providerType,
    queueNumber: "M-001",
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
    ...overrides,
  }
}

function baseDocument(
  overrides: Partial<MedicalDocument> & Pick<MedicalDocument, "id" | "documentType">
): MedicalDocument {
  return {
    id: overrides.id,
    documentNumber: "RX-0001",
    documentType: overrides.documentType,
    patientId: "op-1",
    consultationId: "c-med-1",
    patientRecordId: "pr-1",
    purpose: "Treatment",
    doctorName: "Dr. Reyes",
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
    certificateType:
      overrides.documentType === "prescription"
        ? "Prescription"
        : "Medical Certification",
    patient: {
      id: "op-1",
      fullName: "Ana Santos",
      studentId: "2026-00001",
      email: "ana@example.com",
    },
    ...overrides,
  }
}

async function writeWorkbook(
  designation: string,
  patients: PatientRecord[],
  consultations: Consultation[],
  documents: MedicalDocument[]
) {
  const workbook = buildPatientRecordsExportWorkbook({
    designation,
    patients,
    consultations,
    documents,
    patientTypeFilter: "all",
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
  const path = join(outDir, workbook.filename)
  writeFileSync(path, XLSX.write(book, { type: "buffer", bookType: "xlsx" }))
  return {
    designation,
    filename: workbook.filename,
    sheetNames: workbook.sheets.map((s) => s.name),
    sheetRows: Object.fromEntries(
      workbook.sheets.map((s) => [s.name, s.rows.length])
    ),
    path,
  }
}

async function main() {
  mkdirSync(outDir, { recursive: true })

  const patients = [basePatient({})]
  const consultations = [
    baseConsultation({ id: "c-med-1", providerType: "physician" }),
    baseConsultation({
      id: "c-dent-1",
      providerType: "dentist",
      chiefComplaint: "Toothache",
      diagnosis: "Caries",
      providerName: "Dr. Cruz",
      providerRole: "dentist",
      station: "dentist",
      queueNumber: "D-001",
    }),
  ]
  const documents = [
    baseDocument({ id: "d-rx", documentType: "prescription", consultationId: "c-med-1" }),
    baseDocument({
      id: "d-dent",
      documentType: "prescription",
      consultationId: "c-dent-1",
      documentNumber: "RX-0002",
      certificateType: "Dental Prescription",
    }),
  ]

  const results = []
  for (const role of ["nurse", "physician", "dentist"] as const) {
    results.push(await writeWorkbook(role, patients, consultations, documents))
  }

  // Role isolation assertions
  const physician = results.find((r) => r.designation === "physician")!
  const dentist = results.find((r) => r.designation === "dentist")!
  const nurse = results.find((r) => r.designation === "nurse")!

  const assert = (cond: boolean, message: string) => {
    if (!cond) throw new Error(message)
  }

  assert(nurse.sheetNames.includes("Dental Consultations"), "nurse missing dental")
  assert(nurse.sheetNames.includes("Medical Consultations"), "nurse missing medical")
  assert(!physician.sheetNames.includes("Dental Consultations"), "physician leaked dental")
  assert(physician.sheetNames.includes("Medical Consultations"), "physician missing medical")
  assert(!dentist.sheetNames.includes("Medical Consultations"), "dentist leaked medical")
  assert(!dentist.sheetNames.includes("Medical Profile"), "dentist leaked medical profile")
  assert(dentist.sheetNames.includes("Dental Consultations"), "dentist missing dental")
  assert(physician.sheetRows["Medical Consultations"] === 1, "physician consult count")
  assert(dentist.sheetRows["Dental Consultations"] === 1, "dentist consult count")
  assert(nurse.sheetRows["Medical Consultations"] === 1, "nurse medical count")
  assert(nurse.sheetRows["Dental Consultations"] === 1, "nurse dental count")

  console.log(JSON.stringify({ ok: true, outDir, results }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
