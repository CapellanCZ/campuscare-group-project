import type { ClinicDesignation } from "@/lib/auth/types"
import type { RoleReportsCatalog } from "@/features/reports/types"

export const ROLE_REPORTS_CATALOG: Record<
  Exclude<ClinicDesignation, "queue_display">,
  RoleReportsCatalog
> = {
  admin: {
    kpiKeys: [
      "patients_served",
      "total_consultations",
      "medical_consultations",
      "dental_consultations",
      "certs_issued",
    ],
    chartKeys: [
      "consult_volume_trend",
      "service_utilization",
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
    kpiKeys: [
      "patients_served",
      "total_consultations",
      "medical_consultations",
      "dental_consultations",
      "avg_wait",
    ],
    chartKeys: [
      "consult_volume_trend",
      "service_utilization",
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
      "medical_consultations",
      "patients_treated",
      "completed_consultations",
      "follow_up_cases",
    ],
    chartKeys: [
      "consultation_trend",
      "common_health_complaints",
      "patient_type_distribution",
      "service_utilization",
    ],
    reportKinds: [
      "daily_consultation",
      "health_cases",
      "patient_service_statistics",
      "service_utilization",
    ],
    defaultConsultationType: "medical",
    lockConsultationType: true,
  },
  dentist: {
    kpiKeys: [
      "dental_consultations",
      "patients_treated",
      "completed_consultations",
      "follow_up_cases",
    ],
    chartKeys: [
      "dental_consult_trend",
      "common_dental_cases",
      "patient_type_distribution",
      "service_utilization",
    ],
    reportKinds: [
      "daily_dental",
      "health_cases",
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
