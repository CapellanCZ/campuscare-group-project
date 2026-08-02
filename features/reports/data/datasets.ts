import type {
  ReportConsultationType,
  ReportKind,
  ReportPatientType,
  ReportTableRow,
} from "@/features/reports/types"

export type SeedConsultRow = {
  id: string
  date: string
  period: string
  patientName: string
  campusId: string
  patientType: Exclude<ReportPatientType, "all">
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
  patientType: Exclude<ReportPatientType, "all">
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
  patientType: Exclude<ReportPatientType, "all">
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

function d(offset: number): string {
  const date = new Date()
  date.setDate(date.getDate() - offset)
  return date.toISOString().slice(0, 10)
}

function monthKey(offsetDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() - offsetDays)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export const SEED_CONSULTS: SeedConsultRow[] = [
  {
    id: "c-1",
    date: d(0),
    period: monthKey(0),
    patientName: "Maria Santos",
    campusId: "2021-04521",
    patientType: "student",
    consultationType: "medical",
    service: "General consultation",
    complaint: "Headache",
    diagnosis: "Tension headache",
    station: "physician",
    assignedPersonnel: "Dr. Reyes",
    status: "Completed",
    waitMinutes: 18,
    walkIn: false,
  },
  {
    id: "c-2",
    date: d(0),
    period: monthKey(0),
    patientName: "Juan Dela Cruz",
    campusId: "EMP-118",
    patientType: "faculty",
    consultationType: "dental",
    service: "Dental check-up",
    complaint: "Tooth sensitivity",
    diagnosis: "Dental caries",
    station: "dentist",
    assignedPersonnel: "Dr. Lim",
    status: "Completed",
    waitMinutes: 22,
    walkIn: true,
  },
  {
    id: "c-3",
    date: d(1),
    period: monthKey(1),
    patientName: "Aisha Rahman",
    campusId: "2022-06714",
    patientType: "student",
    consultationType: "medical",
    service: "Follow-up",
    complaint: "Fever",
    diagnosis: "Viral infection",
    station: "physician",
    assignedPersonnel: "Dr. Reyes",
    status: "Completed",
    waitMinutes: 12,
    walkIn: false,
  },
  {
    id: "c-4",
    date: d(2),
    period: monthKey(2),
    patientName: "Carlos Mendoza",
    campusId: "2020-03301",
    patientType: "student",
    consultationType: "dental",
    service: "Tooth extraction",
    complaint: "Toothache",
    diagnosis: "Impacted molar",
    station: "dentist",
    assignedPersonnel: "Dr. Lim",
    status: "Completed",
    waitMinutes: 35,
    walkIn: true,
  },
  {
    id: "c-5",
    date: d(3),
    period: monthKey(3),
    patientName: "Liza Cruz",
    campusId: "EMP-204",
    patientType: "faculty",
    consultationType: "medical",
    service: "General consultation",
    complaint: "Cough",
    diagnosis: "Upper respiratory infection",
    station: "physician",
    assignedPersonnel: "Dr. Santos",
    status: "In Progress",
    waitMinutes: 9,
    walkIn: false,
  },
  {
    id: "c-6",
    date: d(5),
    period: monthKey(5),
    patientName: "Ben Torres",
    campusId: "2023-01120",
    patientType: "student",
    consultationType: "medical",
    service: "Medical certificate",
    complaint: "Clearance",
    diagnosis: "Fit to work",
    station: "physician",
    assignedPersonnel: "Dr. Reyes",
    status: "Completed",
    waitMinutes: 15,
    walkIn: false,
  },
  {
    id: "c-7",
    date: d(8),
    period: monthKey(8),
    patientName: "Nina Gomez",
    campusId: "2021-08812",
    patientType: "student",
    consultationType: "dental",
    service: "Cleaning",
    complaint: "Plaque",
    diagnosis: "Gingivitis",
    station: "dentist",
    assignedPersonnel: "Dr. Lim",
    status: "Completed",
    waitMinutes: 20,
    walkIn: false,
  },
  {
    id: "c-8",
    date: d(12),
    period: monthKey(12),
    patientName: "Omar Sy",
    campusId: "EMP-077",
    patientType: "faculty",
    consultationType: "medical",
    service: "General consultation",
    complaint: "Back pain",
    diagnosis: "Musculoskeletal strain",
    station: "physician",
    assignedPersonnel: "Dr. Santos",
    status: "Completed",
    waitMinutes: 27,
    walkIn: true,
  },
  {
    id: "c-9",
    date: d(18),
    period: monthKey(18),
    patientName: "Grace Tan",
    campusId: "2022-01990",
    patientType: "student",
    consultationType: "dental",
    service: "Filling",
    complaint: "Cavity",
    diagnosis: "Dental caries",
    station: "dentist",
    assignedPersonnel: "Dr. Lim",
    status: "Completed",
    waitMinutes: 30,
    walkIn: false,
  },
  {
    id: "c-10",
    date: d(25),
    period: monthKey(25),
    patientName: "Paolo Rivera",
    campusId: "2020-05555",
    patientType: "student",
    consultationType: "medical",
    service: "General consultation",
    complaint: "Allergy",
    diagnosis: "Allergic rhinitis",
    station: "physician",
    assignedPersonnel: "Dr. Reyes",
    status: "Completed",
    waitMinutes: 14,
    walkIn: false,
  },
  {
    id: "c-11",
    date: d(32),
    period: monthKey(32),
    patientName: "Helen Uy",
    campusId: "EMP-301",
    patientType: "faculty",
    consultationType: "medical",
    service: "Follow-up",
    complaint: "Hypertension check",
    diagnosis: "Controlled hypertension",
    station: "physician",
    assignedPersonnel: "Dr. Santos",
    status: "Completed",
    waitMinutes: 11,
    walkIn: false,
  },
  {
    id: "c-12",
    date: d(40),
    period: monthKey(40),
    patientName: "Mark Villanueva",
    campusId: "2023-04444",
    patientType: "student",
    consultationType: "dental",
    service: "Dental check-up",
    complaint: "Bleeding gums",
    diagnosis: "Gingivitis",
    station: "dentist",
    assignedPersonnel: "Dr. Lim",
    status: "Completed",
    waitMinutes: 19,
    walkIn: true,
  },
]

export const SEED_CERTS: SeedCertRow[] = [
  {
    id: "cert-1",
    date: d(0),
    patientName: "Ben Torres",
    campusId: "2023-01120",
    patientType: "student",
    consultationType: "medical",
    certificateType: "Fit to work",
    doctorName: "Dr. Reyes",
    status: "Issued",
  },
  {
    id: "cert-2",
    date: d(2),
    patientName: "Maria Santos",
    campusId: "2021-04521",
    patientType: "student",
    consultationType: "medical",
    certificateType: "Medical leave",
    doctorName: "Dr. Reyes",
    status: "Issued",
  },
  {
    id: "cert-3",
    date: d(4),
    patientName: "Juan Dela Cruz",
    campusId: "EMP-118",
    patientType: "faculty",
    consultationType: "dental",
    certificateType: "Dental clearance",
    doctorName: "Dr. Lim",
    status: "Issued",
  },
  {
    id: "cert-4",
    date: d(7),
    patientName: "Nina Gomez",
    campusId: "2021-08812",
    patientType: "student",
    consultationType: "dental",
    certificateType: "Dental clearance",
    doctorName: "Dr. Lim",
    status: "Draft",
  },
  {
    id: "cert-5",
    date: d(15),
    patientName: "Omar Sy",
    campusId: "EMP-077",
    patientType: "faculty",
    consultationType: "medical",
    certificateType: "Fit to work",
    doctorName: "Dr. Santos",
    status: "Pending",
  },
]

export const SEED_REQUESTS: SeedRequestRow[] = [
  {
    id: "req-1",
    submittedAt: d(0),
    patientName: "Maria Santos",
    campusId: "2021-04521",
    patientType: "student",
    service: "General consultation",
    preferredDate: d(-1),
    status: "Pending",
    assignedPersonnel: "Nurse Cruz",
  },
  {
    id: "req-2",
    submittedAt: d(1),
    patientName: "Juan Dela Cruz",
    campusId: "EMP-118",
    patientType: "faculty",
    service: "Dental check-up",
    preferredDate: d(0),
    status: "Approved",
    assignedPersonnel: "Nurse Cruz",
  },
  {
    id: "req-3",
    submittedAt: d(2),
    patientName: "Aisha Rahman",
    campusId: "2022-06714",
    patientType: "student",
    service: "Medical certificate",
    preferredDate: d(1),
    status: "Pending",
    assignedPersonnel: "Nurse Cruz",
  },
  {
    id: "req-4",
    submittedAt: d(3),
    patientName: "Carlos Mendoza",
    campusId: "2020-03301",
    patientType: "student",
    service: "Dental check-up",
    preferredDate: d(2),
    status: "Rescheduled",
    assignedPersonnel: "Nurse Cruz",
  },
  {
    id: "req-5",
    submittedAt: d(5),
    patientName: "Liza Cruz",
    campusId: "EMP-204",
    patientType: "faculty",
    service: "General consultation",
    preferredDate: d(4),
    status: "Declined",
    assignedPersonnel: "Nurse Cruz",
  },
]

export const SEED_QUEUE_DAYS: SeedQueueDay[] = Array.from({ length: 14 }).map(
  (_, i) => ({
    id: `q-${i}`,
    date: d(i),
    station: (["nurse", "physician", "dentist"] as const)[i % 3],
    waiting: 4 + (i % 5),
    served: 12 + (i % 8),
    avgWaitMinutes: 10 + (i % 20),
    walkIns: 2 + (i % 4),
    peakHour: `${8 + (i % 6)}:00`,
  })
)

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
    if (input.status !== "all" && row.status !== input.status) return false
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
      type: row.patientType === "faculty" ? "Faculty / Employee" : "Student",
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
      "Patient type":
        row.patientType === "faculty" ? "Faculty / Employee" : "Student",
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
