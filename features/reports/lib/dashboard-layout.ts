import type {
  ReportChartKey,
  ReportKind,
} from "@/features/reports/types"
import type { ClinicDesignation } from "@/lib/auth/types"

/** Chart widgets render in a balanced 2-column grid (never a full-bleed hero). */
export type DashboardChartSlot = {
  chartKey: ReportChartKey
  title?: string
}

/** Detail tables render below the chart grid. */
export type DashboardTableSlot = {
  tableKind: ReportKind
  title?: string
}

export type DashboardLayout = {
  charts: DashboardChartSlot[]
  tables: DashboardTableSlot[]
}

export function dashboardLayoutFor(
  designation: ClinicDesignation
): DashboardLayout {
  if (designation === "physician") {
    return {
      charts: [
        {
          chartKey: "consultation_trend",
          title: "Medical Consultation Trend",
        },
        {
          chartKey: "service_utilization",
          title: "Medical Service Utilization",
        },
        {
          chartKey: "health_cases",
          title: "Most Common Health Cases",
        },
        {
          chartKey: "health_cases_by_patient_type",
          title: "Health Cases by Patient Type",
        },
        {
          chartKey: "waiting_time_trend",
          title: "Waiting Time Trend",
        },
      ],
      tables: [
        {
          tableKind: "daily_consultation",
          title: "Daily Medical Consultations",
        },
        {
          tableKind: "health_cases",
          title: "Health Cases Detail",
        },
        {
          tableKind: "health_cases_by_patient_type",
          title: "Health Cases by Patient Type",
        },
        {
          tableKind: "service_utilization",
          title: "Medical Service Utilization",
        },
      ],
    }
  }

  if (designation === "dentist") {
    return {
      charts: [
        {
          chartKey: "dental_consult_trend",
          title: "Dental Consultation Trend",
        },
        {
          chartKey: "service_utilization",
          title: "Dental Service Utilization",
        },
        {
          chartKey: "health_cases",
          title: "Most Common Dental Cases",
        },
        {
          chartKey: "health_cases_by_patient_type",
          title: "Health Cases by Patient Type",
        },
        {
          chartKey: "waiting_time_trend",
          title: "Waiting Time Trend",
        },
      ],
      tables: [
        {
          tableKind: "daily_dental",
          title: "Daily Dental Consultations",
        },
        {
          tableKind: "health_cases",
          title: "Dental Cases Detail",
        },
        {
          tableKind: "health_cases_by_patient_type",
          title: "Health Cases by Patient Type",
        },
        {
          tableKind: "service_utilization",
          title: "Dental Service Utilization",
        },
      ],
    }
  }

  // Nurse / admin HSO summary
  return {
    charts: [
      {
        chartKey: "consult_volume_trend",
        title: "Consultation Trend",
      },
      {
        chartKey: "service_utilization",
        title: "Medical vs Dental by Patient Type",
      },
      {
        chartKey: "health_cases",
        title: "Most Common Health Cases",
      },
      {
        chartKey: "health_cases_by_patient_type",
        title: "Health Cases by Patient Type",
      },
      {
        chartKey: "waiting_time_trend",
        title: "Waiting Time Trend",
      },
      {
        chartKey: "patient_type_distribution",
        title: "Patient Type Distribution",
      },
    ],
    tables: [
      {
        tableKind: "daily_consultation",
        title: "Daily Consultations",
      },
      {
        tableKind: "health_cases",
        title: "Health Cases Detail",
      },
      {
        tableKind: "health_cases_by_patient_type",
        title: "Health Cases by Patient Type",
      },
      {
        tableKind: "service_utilization",
        title: "Service Utilization",
      },
    ],
  }
}

export function reportsPageDescription(
  _designation: ClinicDesignation,
  _periodLabel: string
): string {
  return "View and analyze health service activities and performance."
}

