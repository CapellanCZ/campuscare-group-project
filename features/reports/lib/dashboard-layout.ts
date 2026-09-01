import type {
  ReportChartKey,
  ReportKind,
} from "@/features/reports/types"
import type { ClinicDesignation } from "@/lib/auth/types"

export type DashboardSlot = {
  placement: "primary" | "secondary" | "full"
  chartKey: ReportChartKey
  tableKind?: ReportKind
  title?: string
}

export function dashboardSlotsFor(
  designation: ClinicDesignation
): DashboardSlot[] {
  if (designation === "physician") {
    return [
      {
        placement: "primary",
        chartKey: "consultation_trend",
        tableKind: "daily_consultation",
        title: "Medical Consultation Trend",
      },
      {
        placement: "secondary",
        chartKey: "common_health_complaints",
        tableKind: "health_cases",
        title: "Common Health Cases",
      },
      {
        placement: "secondary",
        chartKey: "patient_type_distribution",
        tableKind: "patient_service_statistics",
        title: "Patient Service Statistics",
      },
      {
        placement: "full",
        chartKey: "service_utilization",
        tableKind: "service_utilization",
        title: "Medical Service Utilization",
      },
    ]
  }

  if (designation === "dentist") {
    return [
      {
        placement: "primary",
        chartKey: "dental_consult_trend",
        tableKind: "daily_dental",
        title: "Dental Consultation Trend",
      },
      {
        placement: "secondary",
        chartKey: "common_dental_cases",
        tableKind: "health_cases",
        title: "Common Dental Cases",
      },
      {
        placement: "secondary",
        chartKey: "patient_type_distribution",
        tableKind: "patient_service_statistics",
        title: "Patient Service Statistics",
      },
      {
        placement: "full",
        chartKey: "service_utilization",
        tableKind: "service_utilization",
        title: "Dental Service Utilization",
      },
    ]
  }

  return [
    {
      placement: "primary",
      chartKey: "consult_volume_trend",
      tableKind: "daily_consultation",
      title: "Consultation Trend",
    },
    {
      placement: "secondary",
      chartKey: "service_utilization",
      tableKind: "service_utilization",
      title: "Service Utilization",
    },
    {
      placement: "secondary",
      chartKey: "patient_type_distribution",
      tableKind: "patient_service_statistics",
      title: "Patient Service Statistics",
    },
    {
      placement: "full",
      chartKey: "health_cases",
      tableKind: "health_cases",
      title: "Health Cases",
    },
    {
      placement: "full",
      chartKey: "health_cases_by_patient_type",
      tableKind: "health_cases_by_patient_type",
      title: "Health Cases by Patient Type",
    },
  ]
}

export function reportsPageDescription(
  designation: ClinicDesignation,
  periodLabel: string
): string {
  if (designation === "physician") {
    return `Medical consultation analytics for ${periodLabel}.`
  }
  if (designation === "dentist") {
    return `Dental consultation analytics for ${periodLabel}.`
  }
  return `HSO operational summary for ${periodLabel}. Aggregated counts only.`
}
