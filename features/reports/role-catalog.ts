import type { ClinicDesignation } from "@/lib/auth/types"
import type { RoleReportsCatalog } from "@/features/reports/types"

export const ROLE_REPORTS_CATALOG: Record<
  Exclude<ClinicDesignation, "queue_display">,
  RoleReportsCatalog
> = {
  admin: {
    kpiKeys: [
      "total_consultations",
      "patients_served",
      "certs_issued",
      "avg_wait",
    ],
    chartKeys: [
      "monthly_consult_trend",
      "common_health_complaints",
      "common_dental_cases",
      "patient_type_distribution",
      "queue_performance",
    ],
    reportKinds: [
      "daily_consultation",
      "monthly_consultation",
      "patient_list",
      "queue_performance",
      "medical_certificate",
    ],
    defaultConsultationType: "all",
  },
  nurse: {
    kpiKeys: [
      "patients_served_today",
      "pending_requests",
      "walk_ins",
      "avg_wait",
    ],
    chartKeys: ["daily_patient_volume", "consultation_request_trend"],
    reportKinds: [
      "daily_consultation",
      "queue_performance",
      "consultation_request",
    ],
    defaultConsultationType: "all",
  },
  physician: {
    kpiKeys: ["consultations_today", "patients_treated", "certs_issued"],
    chartKeys: ["consultation_trend", "common_diagnoses"],
    reportKinds: [
      "daily_consultation",
      "monthly_consultation",
      "medical_certificate",
      "patient_consultation_history",
    ],
    defaultConsultationType: "medical",
  },
  dentist: {
    kpiKeys: [
      "dental_consultations_today",
      "patients_treated",
      "dental_certs_issued",
    ],
    chartKeys: ["dental_consult_trend", "common_dental_cases"],
    reportKinds: [
      "daily_dental",
      "monthly_dental",
      "dental_certificate",
      "patient_dental_history",
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
