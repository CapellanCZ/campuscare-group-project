import type { ReportPatientType } from "@/features/reports/types"

export const REPORT_PATIENT_TYPE_LABELS = {
  student: "Student",
  faculty: "Faculty",
  employee: "Employee",
} as const

export type ReportPatientClass = keyof typeof REPORT_PATIENT_TYPE_LABELS

export function reportPatientClass(
  value: string | null | undefined
): ReportPatientClass | null {
  if (value === "student" || value === "faculty" || value === "employee") {
    return value
  }
  return null
}

export function reportPatientTypeLabel(
  value: string | null | undefined
): string {
  const classified = reportPatientClass(value)
  if (classified) return REPORT_PATIENT_TYPE_LABELS[classified]
  if (value === "visitor") return "Visitor"
  if (value === "all") return "All"
  return value?.trim() || "—"
}

export function matchesReportPatientType(
  patientType: string | null | undefined,
  filter: ReportPatientType
): boolean {
  if (filter === "all") return true
  return reportPatientClass(patientType) === filter
}
