/** Canonical patient-type colors for Reports (consistent across charts & KPIs). */
export const REPORT_PATIENT_TYPE_COLORS = {
  student: "#3B82F6",
  faculty: "#8B5CF6",
  employee: "#10B981",
} as const

export type ReportPatientTypeColorKey = keyof typeof REPORT_PATIENT_TYPE_COLORS

export function reportPatientTypeColor(
  type: string | null | undefined
): string | null {
  const key = (type ?? "").trim().toLowerCase()
  if (key === "student") return REPORT_PATIENT_TYPE_COLORS.student
  if (key === "faculty") return REPORT_PATIENT_TYPE_COLORS.faculty
  if (key === "employee") return REPORT_PATIENT_TYPE_COLORS.employee
  return null
}

/** Resolve patient type from a chart label such as "Student", "Faculty Medical". */
export function patientTypeFromReportLabel(
  label: string | null | undefined
): ReportPatientTypeColorKey | null {
  const text = (label ?? "").trim().toLowerCase()
  if (!text) return null
  if (text.includes("student")) return "student"
  if (text.includes("faculty")) return "faculty"
  if (text.includes("employee")) return "employee"
  return null
}

export function colorForReportLabel(label: string): string {
  const type = patientTypeFromReportLabel(label)
  return type ? REPORT_PATIENT_TYPE_COLORS[type] : "var(--chart-1)"
}

/** Accent for KPI cards keyed by patient type (e.g. student_medical_consultations). */
export function reportKpiAccentColor(key: string): string | undefined {
  const lower = key.toLowerCase()
  if (lower.startsWith("student_")) return REPORT_PATIENT_TYPE_COLORS.student
  if (lower.startsWith("faculty_")) return REPORT_PATIENT_TYPE_COLORS.faculty
  if (lower.startsWith("employee_")) return REPORT_PATIENT_TYPE_COLORS.employee
  return undefined
}

/** Charts that break down or compare patient types (not overall totals). */
export function isPatientTypeBreakdownChart(chartKey: string): boolean {
  return (
    chartKey === "health_cases_by_patient_type" ||
    chartKey === "patient_type_distribution" ||
    chartKey === "patient_type_bar" ||
    chartKey === "service_utilization"
  )
}
