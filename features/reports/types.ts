import type { ClinicDesignation } from "@/lib/auth/types"

export type ReportConsultationType = "all" | "medical" | "dental"
export type ReportPatientType = "all" | "student" | "faculty"

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

export type ReportFilters = {
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
}

export type ReportChartSeries = {
  key: ReportChartKey
  title: string
  description?: string
  kind: "line" | "bar" | "pie"
  points: ReportChartPoint[]
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
  source: "live" | "live+seed" | "seed"
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
  daily_dental: "Daily Dental Consultation Report",
  monthly_dental: "Monthly Dental Consultation Report",
  patient_list: "Patient List Report",
  queue_performance: "Queue Performance Report",
  medical_certificate: "Medical Certificate Report",
  dental_certificate: "Dental Certificate Report",
  consultation_request: "Consultation Request Report",
  patient_consultation_history: "Patient Consultation History",
  patient_dental_history: "Patient Dental History",
}
