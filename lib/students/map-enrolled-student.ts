import type { EnrolledStudent } from "@/lib/students/types"
import {
  enrolledVirtualId,
} from "@/lib/students/virtual-id"
import type {
  CreatePatientRecordInput,
  PatientRecord,
} from "@/types/patientRecord"
import {
  EMPTY_MEDICAL_HISTORY,
  EMPTY_PHYSICAL_EXAM,
  patientFullName,
} from "@/types/patientRecord"

export {
  enrolledVirtualId,
  isEnrolledVirtualId,
  studentIdFromVirtualId,
} from "@/lib/students/virtual-id"

export function enrolledToCreateInput(
  student: EnrolledStudent
): CreatePatientRecordInput {
  const course =
    student.course ||
    student.department ||
    "Enrolled student"

  return {
    patientType: "student",
    studentId: student.studentId,
    employeeId: null,
    firstName: student.firstName,
    middleName: student.middleName,
    lastName: student.lastName,
    course,
    yearLevel: null,
    gender: student.gender,
    birthDate: student.birthDate,
    civilStatus: student.civilStatus,
    religion: student.religion,
    nationality: null,
    bloodType: null,
    allergies: null,
    phone: student.mobile,
    email: student.email,
    address: student.presentAddress,
    emergencyContactName: student.familyBackground.guardianName,
    emergencyContactPhone: student.familyBackground.mobile,
    medicalConditions: null,
    notes: null,
    lastVisit: null,
  }
}

export function enrolledToPatientRecord(
  student: EnrolledStudent,
  clinical?: PatientRecord | null
): PatientRecord {
  const base = enrolledToCreateInput(student)
  const now = clinical?.updatedAt ?? clinical?.createdAt ?? new Date().toISOString()

  return {
    id: clinical?.id ?? enrolledVirtualId(student.studentId),
    patientType: "student",
    studentId: student.studentId,
    employeeId: null,
    firstName: base.firstName,
    middleName: base.middleName ?? null,
    lastName: base.lastName,
    course: clinical?.course ?? base.course ?? null,
    yearLevel: clinical?.yearLevel ?? null,
    gender: clinical?.gender ?? base.gender ?? null,
    birthDate: clinical?.birthDate ?? base.birthDate ?? null,
    civilStatus: clinical?.civilStatus ?? base.civilStatus ?? null,
    religion: clinical?.religion ?? base.religion ?? null,
    nationality: clinical?.nationality ?? null,
    bloodType: clinical?.bloodType ?? null,
    allergies: clinical?.allergies ?? null,
    phone: clinical?.phone ?? base.phone ?? null,
    email: clinical?.email ?? base.email ?? null,
    address: clinical?.address ?? base.address ?? null,
    emergencyContactName:
      clinical?.emergencyContactName ?? base.emergencyContactName ?? null,
    emergencyContactPhone:
      clinical?.emergencyContactPhone ?? base.emergencyContactPhone ?? null,
    medicalConditions: clinical?.medicalConditions ?? null,
    notes: clinical?.notes ?? null,
    lastVisit: clinical?.lastVisit ?? null,
    medicalHistory: clinical?.medicalHistory ?? { ...EMPTY_MEDICAL_HISTORY },
    physicalExam: clinical?.physicalExam ?? { ...EMPTY_PHYSICAL_EXAM },
    lastEditedAt: clinical?.lastEditedAt ?? null,
    lastEditedBy: clinical?.lastEditedBy ?? null,
    lastEditedByName: clinical?.lastEditedByName ?? null,
    createdAt: clinical?.createdAt ?? now,
    updatedAt: clinical?.updatedAt ?? now,
    consultationsCount: clinical?.consultationsCount ?? 0,
    documentsCount: clinical?.documentsCount ?? 0,
    familyBackground: student.familyBackground,
  }
}

export function enrolledDisplayName(student: EnrolledStudent): string {
  return patientFullName({
    firstName: student.firstName,
    middleName: student.middleName,
    lastName: student.lastName,
  })
}
