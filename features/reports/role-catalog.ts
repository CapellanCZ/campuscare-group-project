import type { ClinicDesignation } from "@/lib/auth/types"
import type { RoleReportsCatalog } from "@/features/reports/types"

const TRANSACTION_KPI_KEYS = [
  "faculty_medical_consultations",
  "faculty_dental_consultations",
  "employee_medical_consultations",
  "employee_dental_consultations",
  "student_medical_consultations",
  "student_dental_consultations",
  "avg_wait",
] as const

export const ROLE_REPORTS_CATALOG: Record<
  Exclude<ClinicDesignation, "queue_display">,
  RoleReportsCatalog
> = {
  admin: {
    kpiKeys: [...TRANSACTION_KPI_KEYS, "certs_issued"],
    chartKeys: [
      "consult_volume_trend",
      "service_utilization",
      "waiting_time_trend",
      "patient_type_distribution",
      "health_cases",
      "health_cases_by_patient_type",
    ],
    reportKinds: [
      "daily_consultation",
      "service_utilization",
      "patient_service_statistics",
      "health_cases",
      "health_cases_by_patient_type",
    ],
    defaultConsultationType: "all",
  },
  nurse: {
    kpiKeys: [...TRANSACTION_KPI_KEYS],
    chartKeys: [
      "consult_volume_trend",
      "service_utilization",
      "waiting_time_trend",
      "patient_type_distribution",
      "health_cases",
      "health_cases_by_patient_type",
    ],
    reportKinds: [
      "daily_consultation",
      "service_utilization",
      "patient_service_statistics",
      "health_cases",
      "health_cases_by_patient_type",
    ],
    defaultConsultationType: "all",
  },
  physician: {
    kpiKeys: [
      "student_medical_consultations",
      "faculty_medical_consultations",
      "employee_medical_consultations",
      "medical_consultations",
      "completed_consultations",
      "follow_up_cases",
      "avg_wait",
    ],
    chartKeys: [
      "consultation_trend",
      "health_cases",
      "health_cases_by_patient_type",
      "patient_type_distribution",
      "service_utilization",
      "waiting_time_trend",
    ],
    reportKinds: [
      "daily_consultation",
      "health_cases",
      "health_cases_by_patient_type",
      "patient_service_statistics",
      "service_utilization",
    ],
    defaultConsultationType: "medical",
    lockConsultationType: true,
  },
  dentist: {
    kpiKeys: [
      "student_dental_consultations",
      "faculty_dental_consultations",
      "employee_dental_consultations",
      "dental_consultations",
      "completed_consultations",
      "follow_up_cases",
      "avg_wait",
    ],
    chartKeys: [
      "dental_consult_trend",
      "health_cases",
      "health_cases_by_patient_type",
      "patient_type_distribution",
      "service_utilization",
      "waiting_time_trend",
    ],
    reportKinds: [
      "daily_dental",
      "health_cases",
      "health_cases_by_patient_type",
      "patient_service_statistics",
      "service_utilization",
    ],
    defaultConsultationType: "dental",
    lockConsultationType: true,
  },
}

export function catalogFor(
  designation: ClinicDesignation
): RoleReportsCatalog {
  if (designation === "queue_display") return ROLE_REPORTS_CATALOG.admin
  return ROLE_REPORTS_CATALOG[designation]
}
