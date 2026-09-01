import type {
  ReportConsultationType,
  ReportKind,
  ReportPatientType,
  ReportTableRow,
} from "@/features/reports/types"
import { reportPatientTypeLabel } from "@/features/reports/lib/patient-type-label"

export type SeedConsultRow = {
  id: string
  date: string
  period: string
  patientName: string
  campusId: string
  patientType: "student" | "faculty" | "employee" | "visitor"
  consultationType: Exclude<ReportConsultationType, "all">
  service: string
  complaint: string
  diagnosis: string
  station: "nurse" | "physician" | "dentist"
  assignedPersonnel: string
  status: string
  waitMinutes: number
  walkIn: boolean
  followUpDate?: string | null
}

export type SeedCertRow = {
  id: string
  date: string
  patientName: string
  campusId: string
  patientType: "student" | "faculty" | "employee" | "visitor"
  consultationType: Exclude<ReportConsultationType, "all">
  certificateType: string
  doctorName: string
  status: string
}

export type SeedRequestRow = {
  id: string
  submittedAt: string
  patientName: string
  campusId: string
  patientType: "student" | "faculty" | "employee" | "visitor"
  service: string
  preferredDate: string
  status: string
  assignedPersonnel: string
}

export type SeedQueueDay = {
  id: string
  date: string
  station: "nurse" | "physician" | "dentist"
  waiting: number
  served: number
  avgWaitMinutes: number
  walkIns: number
  peakHour: string
}

export type ReportsDataset = {
  consults: SeedConsultRow[]
  certs: SeedCertRow[]
  requests: SeedRequestRow[]
  queueDays: SeedQueueDay[]
}

export const EMPTY_REPORTS_DATASET: ReportsDataset = {
  consults: [],
  certs: [],
  requests: [],
  queueDays: [],
}

export function inDateRange(
  date: string,
  dateFrom: string,
  dateTo: string
): boolean {
  return date >= dateFrom && date <= dateTo
}

export function filterConsults(
  rows: SeedConsultRow[],
  input: {
    dateFrom: string
    dateTo: string
    consultationType: ReportConsultationType
    patientType: ReportPatientType
    assignedPersonnel: string | "all"
    status: string | "all"
  }
): SeedConsultRow[] {
  return rows.filter((row) => {
    if (!inDateRange(row.date, input.dateFrom, input.dateTo)) return false
    if (
      input.consultationType !== "all" &&
      row.consultationType !== input.consultationType
    )
      return false
    if (input.patientType !== "all" && row.patientType !== input.patientType)
      return false
    if (
      input.assignedPersonnel !== "all" &&
      row.assignedPersonnel !== input.assignedPersonnel
    )
      return false
    if (
      input.status !== "all" &&
      input.status.toLowerCase() !== row.status.toLowerCase()
    )
      return false
    return true
  })
}

export function toTableRowsFromConsults(
  kind: ReportKind,
  rows: SeedConsultRow[]
): ReportTableRow[] {
  if (kind === "monthly_consultation" || kind === "monthly_dental") {
    const byPeriod = new Map<
      string,
      { count: number; patients: Set<string>; wait: number }
    >()
    for (const row of rows) {
      const entry = byPeriod.get(row.period) ?? {
        count: 0,
        patients: new Set<string>(),
        wait: 0,
      }
      entry.count += 1
      entry.patients.add(row.campusId)
      entry.wait += row.waitMinutes
      byPeriod.set(row.period, entry)
    }
    return [...byPeriod.entries()].map(([period, entry]) => ({
      id: period,
      cells: {
        period,
        consultations: entry.count,
        patients: entry.patients.size,
        avgWait: Math.round(entry.wait / Math.max(entry.count, 1)),
      },
      details: {
        Period: period,
        Consultations: String(entry.count),
        Patients: String(entry.patients.size),
        "Avg wait (min)": String(
          Math.round(entry.wait / Math.max(entry.count, 1))
        ),
      },
    }))
  }

  return rows.map((row) => ({
    id: row.id,
    cells: {
      date: row.date,
      patient: row.patientName,
      campusId: row.campusId,
      type: reportPatientTypeLabel(row.patientType),
      service: row.service,
      complaint: row.complaint,
      diagnosis: row.diagnosis,
      personnel: row.assignedPersonnel,
      status: row.status,
      wait: row.waitMinutes,
    },
    details: {
      Date: row.date,
      Patient: row.patientName,
      "Campus ID": row.campusId,
      "Patient type": reportPatientTypeLabel(row.patientType),
      Service: row.service,
      Complaint: row.complaint,
      Diagnosis: row.diagnosis,
      Personnel: row.assignedPersonnel,
      Status: row.status,
      "Wait (min)": String(row.waitMinutes),
      "Walk-in": row.walkIn ? "Yes" : "No",
    },
  }))
}
