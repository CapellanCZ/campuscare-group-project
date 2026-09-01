/** Admin ops aggregates only — never include patient names or clinical fields. */

export type AdminChartPoint = {
  label: string
  value: number
  secondary?: number
  tertiary?: number
}

export type AdminStaffStatusCard = {
  id: string
  fullName: string
  role: "nurse" | "physician" | "dentist"
  status: "active" | "invited" | "inactive"
  lastSignInAt: string | null
}

export type AdminOpsSummary = {
  consultationsToday: number
  consultationsYesterday: number
  patientsServedToday: number
  pendingRequests: number
  patientsInQueue: number
  medicalToday: number
  dentalToday: number
  certsIssuedToday: number
  announcementsPublished: number
}

export type AdminOpsQueue = {
  avgWaitMinutes: number
  avgServiceMinutes: number
  waiting: number
  served: number
  hourlyVolume: AdminChartPoint[]
  peakHourLabel: string | null
}

export type AdminOpsSnapshot = {
  generatedAt: string
  summary: AdminOpsSummary
  consultationTrend: {
    daily: AdminChartPoint[]
    weekly: AdminChartPoint[]
    monthly: AdminChartPoint[]
  }
  patientType: AdminChartPoint[]
  queue: AdminOpsQueue
  requestStatus: AdminChartPoint[]
  utilization: AdminChartPoint[]
  staff: AdminStaffStatusCard[]
  error: string | null
}

export type AdminReportsAggregates = {
  generatedAt: string
  dateFrom: string
  dateTo: string
  kpis: Array<{
    key: string
    label: string
    value: string
    description?: string
  }>
  charts: Array<{
    key: string
    title: string
    description?: string
    kind: "line" | "bar" | "pie" | "hbar" | "multiline" | "stackedBar"
    points: AdminChartPoint[]
  }>
  tables: Array<{
    kind: string
    title: string
    columns: Array<{ key: string; label: string; sortable?: boolean }>
    rows: Array<{ id: string; cells: Record<string, string | number> }>
  }>
  statusOptions: string[]
  error: string | null
}
