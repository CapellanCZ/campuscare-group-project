export const REPORT_RANGES = ["7d", "30d", "90d"] as const

export type ReportRange = (typeof REPORT_RANGES)[number]

export type ReportStats = {
  consultations: number
  certificates: number
  walkIns: number
  avgWaitMinutes: number
}

export type ReportAnalytics = {
  peakDayLabel: string
  peakDayCount: number
  topStationLabel: string
  topStationShare: number
}

export type ReportPeriodRow = {
  id: string
  period: string
  startIso: string
  endIso: string
  consultations: number
  certificates: number
  walkIns: number
  avgWaitMinutes: number
  topService: string
}

export type ClinicReportBundle = {
  range: ReportRange
  rangeLabel: string
  startIso: string
  endIso: string
  stats: ReportStats
  analytics: ReportAnalytics
  periodRows: ReportPeriodRow[]
}

export type ReportServiceErrorCode =
  | "offline"
  | "permission"
  | "validation"
  | "database"
  | "unknown"

export class ReportServiceError extends Error {
  readonly code: ReportServiceErrorCode

  constructor(code: ReportServiceErrorCode, message: string) {
    super(message)
    this.name = "ReportServiceError"
    this.code = code
  }
}
