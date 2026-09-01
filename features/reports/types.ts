import type { ClinicDesignation } from "@/lib/auth/types"
import type { ReportPeriodPreset } from "@/features/reports/lib/report-period"

export type ReportConsultationType = "all" | "medical" | "dental"
export type ReportPatientType = "all" | "student" | "faculty" | "employee"

export type ReportKind =
  | "daily_consultation"
  | "monthly_consultation"
  | "daily_dental"
  | "monthly_dental"
  | "patient_list"
  | "queue_performance"
  | "medical_certificate"
  | "dental_certificate"
  | "consultation_request"
  | "patient_consultation_history"
  | "patient_dental_history"
  | "service_utilization"
  | "health_cases"
  | "health_cases_by_patient_type"
  | "patient_service_statistics"

export type ReportKpiKey =
  | "total_consultations"
  | "patients_served"
  | "certs_issued"
  | "avg_wait"
  | "patients_served_today"
  | "pending_requests"
  | "walk_ins"
  | "consultations_today"
  | "patients_treated"
  | "dental_consultations_today"
  | "dental_certs_issued"
  | "follow_up_cases"
  | "medical_consultations"
  | "dental_consultations"
  | "completed_consultations"

export type ReportChartKey =
  | "monthly_consult_trend"
  | "common_health_complaints"
  | "common_dental_cases"
  | "patient_type_distribution"
  | "queue_performance"
  | "daily_patient_volume"
  | "consultation_request_trend"
  | "consultation_trend"
  | "common_diagnoses"
  | "dental_consult_trend"
  | "consult_volume_trend"
  | "service_utilization"
  | "health_cases"
  | "health_cases_by_patient_type"
  | "patient_type_bar"
  | "medical_dental_donut"

export type ReportFilters = {
  reportPeriod: ReportPeriodPreset
  dateFrom: string
  dateTo: string
  consultationType: ReportConsultationType
  patientType: ReportPatientType
  assignedPersonnel: string | "all"
  status: string | "all"
  reportKind: ReportKind
  query: string
}

export type ReportKpi = {
  key: ReportKpiKey
  label: string
  value: string
  description?: string
}

export type ReportChartPoint = {
  label: string
  value: number
  secondary?: number
  tertiary?: number
}

export type ReportChartKind =
  | "line"
  | "bar"
  | "pie"
  | "hbar"
  | "multiline"
  | "stackedBar"

export type ReportChartSeries = {
  key: ReportChartKey
  title: string
  description?: string
  kind: ReportChartKind
  points: ReportChartPoint[]
  valueLabel?: string
  secondaryLabel?: string
  tertiaryLabel?: string
}

export type ReportTableColumn = {
  key: string
  label: string
  sortable?: boolean
}

export type ReportTableRow = {
  id: string
  cells: Record<string, string | number>
  details?: Record<string, string>
}

export type ReportTableBundle = {
  kind: ReportKind
  title: string
  columns: ReportTableColumn[]
  rows: ReportTableRow[]
}

export type ReportsBundle = {
  designation: ClinicDesignation
  generatedAt: string
  filters: ReportFilters
  kpis: ReportKpi[]
  charts: ReportChartSeries[]
  tables: ReportTableBundle[]
  personnelOptions: string[]
  statusOptions: string[]
  source: "live"
  live: {
    completedToday: number
    walkIns: number
    avgWait: number
    pendingRequests: number
    certsToday: number
  }
  dataset: import("@/features/reports/data/datasets").ReportsDataset
  error?: string | null
}

export type RoleReportsCatalog = {
  kpiKeys: ReportKpiKey[]
  chartKeys: ReportChartKey[]
  reportKinds: ReportKind[]
  defaultConsultationType: ReportConsultationType
  lockConsultationType?: boolean
}

export const REPORT_KIND_LABELS: Record<ReportKind, string> = {
  daily_consultation: "Daily Consultation Report",
  monthly_consultation: "Monthly Consultation Report",
  daily_dental: "Consultation Reports",
  monthly_dental: "Dental Treatment Summary",
  patient_list: "Patient List Report",
  queue_performance: "Queue Performance Report",
  medical_certificate: "Medical Certificate Report",
  dental_certificate: "Medical Certificate Reports",
  consultation_request: "Consultation Request Report",
  patient_consultation_history: "Patient Consultation History",
  patient_dental_history: "Patient Visit History",
  service_utilization: "Service Utilization",
  health_cases: "Health Cases",
  health_cases_by_patient_type: "Health Cases by Patient Type",
  patient_service_statistics: "Patient Service Statistics",
}
