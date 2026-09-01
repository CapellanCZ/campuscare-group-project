import "server-only"

import type { AdminReportsAggregates } from "@/features/admin/types/ops"
import type {
  ReportConsultationType,
  ReportFilters,
} from "@/features/reports/types"
import {
  fetchAllRows,
  fetchInChunks,
} from "@/features/reports/data/fetch-all-rows"
import {
  normalizeHealthCase,
  rankHealthCases,
  type HealthCaseBucket,
} from "@/features/reports/lib/health-case-normalize"
import {
  matchesReportPatientType,
  reportPatientClass,
} from "@/features/reports/lib/patient-type-label"
import {
  isCancelledStatus,
  isCompletedStatus,
  matchesReportStatus,
} from "@/features/reports/lib/report-status"
import { createClient } from "@/lib/supabase/server"
import { manilaDayBounds } from "@/lib/health/time"

type PatientRecordJoin = { patient_type: string | null } | null

type ConsultRow = {
  id: string
  station: string | null
  status: string | null
  consultation_date: string
  patient_id: string | null
  provider_type: string | null
  chief_complaint: string | null
  diagnosis: string | null
  symptoms: string | null
  patient_records: PatientRecordJoin | PatientRecordJoin[]
}

type TicketRow = {
  id: string
  status: string | null
  created_at: string
  patient_id: string | null
  consultation_id: string | null
  estimated_wait_minutes: number | null
}

type CertRow = {
  id: string
  created_at: string
  issued_at: string | null
  status: string | null
}

function isDentalConsultation(row: {
  station?: string | null
  provider_type?: string | null
}): boolean {
  if (row.provider_type === "dentist") return true
  return (row.station ?? "").toLowerCase().includes("dent")
}

function unwrapRecordType(join: ConsultRow["patient_records"]): string | null {
  const record = Array.isArray(join) ? join[0] : join
  return record?.patient_type ?? null
}

function manilaYmd(iso: string | null | undefined): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso))
}

function manilaHour(iso: string | null | undefined): number | null {
  if (!iso) return null
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso))
  const hour = parts.find((p) => p.type === "hour")?.value
  if (hour == null) return null
  return Number(hour)
}

function inDateRange(ymd: string | null, from: string, to: string) {
  if (!ymd) return false
  return ymd >= from && ymd <= to
}

function matchesConsultType(
  row: { station?: string | null; provider_type?: string | null },
  type: ReportConsultationType
) {
  if (type === "all") return true
  const dental = isDentalConsultation(row)
  return type === "dental" ? dental : !dental
}

function daySpan(dateFrom: string, dateTo: string): number {
  const from = new Date(`${dateFrom}T12:00:00+08:00`).getTime()
  const to = new Date(`${dateTo}T12:00:00+08:00`).getTime()
  if (Number.isNaN(from) || Number.isNaN(to)) return 1
  return Math.max(1, Math.round((to - from) / 86_400_000) + 1)
}

function emptyBucket(): Omit<HealthCaseBucket, "label"> {
  return { student: 0, faculty: 0, employee: 0, total: 0 }
}

function addToBucket(
  bucket: Omit<HealthCaseBucket, "label">,
  patientType: string | null | undefined
) {
  const classified = reportPatientClass(patientType)
  if (classified === "student") bucket.student += 1
  else if (classified === "faculty") bucket.faculty += 1
  else if (classified === "employee") bucket.employee += 1
  bucket.total += 1
}

function healthCaseSource(row: ConsultRow): string {
  return [row.chief_complaint, row.symptoms, row.diagnosis]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .join(" ")
}

/**
 * Date-range HSO report aggregates. No PHI columns in the payload.
 */
export async function loadAdminReportsAggregates(
  filters: Pick<
    ReportFilters,
    "dateFrom" | "dateTo" | "consultationType" | "patientType" | "status"
  >,
  designation: "admin" | "nurse" = "admin"
): Promise<AdminReportsAggregates> {
  const dateFrom = filters.dateFrom
  const dateTo = filters.dateTo
  const empty: AdminReportsAggregates = {
    generatedAt: new Date().toISOString(),
    dateFrom,
    dateTo,
    kpis: [],
    charts: [],
    tables: [],
    statusOptions: ["Waiting", "Ongoing", "Completed"],
    error: null,
  }

  try {
    const supabase = await createClient()
    const fromBounds = manilaDayBounds(new Date(`${dateFrom}T12:00:00+08:00`))
    const toBounds = manilaDayBounds(new Date(`${dateTo}T12:00:00+08:00`))

    const [consultRows, ticketRows, certsByCreated, certsByIssued] =
      await Promise.all([
        fetchAllRows<ConsultRow>((from, to) =>
          supabase
            .from("consultations")
            .select(
              "id, station, status, consultation_date, patient_id, provider_type, chief_complaint, diagnosis, symptoms, patient_records ( patient_type )"
            )
            .gte("consultation_date", fromBounds.startIso)
            .lte("consultation_date", toBounds.endIso)
            .order("consultation_date", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to)
        ),
        fetchAllRows<TicketRow>((from, to) =>
          supabase
            .from("health_queue_tickets")
            .select("id, status, created_at, patient_id, consultation_id, estimated_wait_minutes")
            .gte("created_at", fromBounds.startIso)
            .lte("created_at", toBounds.endIso)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to)
        ),
        fetchAllRows<CertRow>((from, to) =>
          supabase
            .from("medical_certificates")
            .select("id, created_at, issued_at, status")
            .gte("created_at", fromBounds.startIso)
            .lte("created_at", toBounds.endIso)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to)
        ),
        fetchAllRows<CertRow>((from, to) =>
          supabase
            .from("medical_certificates")
            .select("id, created_at, issued_at, status")
            .gte("issued_at", fromBounds.startIso)
            .lte("issued_at", toBounds.endIso)
            .order("issued_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to)
        ),
      ])

    const certById = new Map<string, CertRow>()
    for (const cert of [...certsByCreated, ...certsByIssued]) {
      certById.set(cert.id, cert)
    }

    const typeByPatient = new Map<string, string>()
    for (const consult of consultRows) {
      const fromJoin = unwrapRecordType(consult.patient_records)
      if (fromJoin && consult.patient_id) {
        typeByPatient.set(consult.patient_id, fromJoin)
      }
    }

    const missingTypeIds = new Set<string>()
    for (const consult of consultRows) {
      if (consult.patient_id && !typeByPatient.has(consult.patient_id)) {
        missingTypeIds.add(consult.patient_id)
      }
    }
    for (const ticket of ticketRows) {
      if (ticket.patient_id && !typeByPatient.has(ticket.patient_id)) {
        missingTypeIds.add(ticket.patient_id)
      }
    }

    const lookupIds = [...missingTypeIds]
    const [patients, records] = await Promise.all([
      fetchInChunks<{ id: string; patient_type: string | null }>(
        lookupIds,
        (chunk) =>
          supabase.from("patients").select("id, patient_type").in("id", chunk)
      ),
      fetchInChunks<{ id: string; patient_type: string | null }>(
        lookupIds,
        (chunk) =>
          supabase
            .from("patient_records")
            .select("id, patient_type")
            .in("id", chunk)
      ),
    ])

    for (const patient of patients) {
      typeByPatient.set(patient.id, patient.patient_type ?? "student")
    }
    for (const record of records) {
      if (!typeByPatient.has(record.id)) {
        typeByPatient.set(record.id, record.patient_type ?? "student")
      }
    }

    const consults = consultRows.filter((consult) => {
      const ymd = manilaYmd(consult.consultation_date)
      if (!inDateRange(ymd, dateFrom, dateTo)) return false
      if (!matchesConsultType(consult, filters.consultationType)) return false
      if (!matchesReportStatus(consult.status, filters.status)) return false
      const patientType =
        unwrapRecordType(consult.patient_records) ??
        typeByPatient.get(consult.patient_id ?? "")
      return matchesReportPatientType(patientType, filters.patientType)
    })

    const tickets = ticketRows.filter((ticket) => {
      const ymd = manilaYmd(ticket.created_at)
      if (!inDateRange(ymd, dateFrom, dateTo)) return false
      if (!matchesReportStatus(ticket.status, filters.status)) return false
      const patientType = typeByPatient.get(ticket.patient_id ?? "")
      return matchesReportPatientType(patientType, filters.patientType)
    })

    const certs = [...certById.values()].filter((cert) => {
      const ymd = manilaYmd(cert.issued_at ?? cert.created_at)
      return inDateRange(ymd, dateFrom, dateTo)
    })

    const medicalConsults = consults.filter((c) => !isDentalConsultation(c))
    const dentalConsults = consults.filter((c) => isDentalConsultation(c))
    const completedTickets = tickets.filter((ticket) =>
      isCompletedStatus(ticket.status)
    )

    const servedIds = new Set<string>()
    for (const consult of consults) {
      if (isCancelledStatus(consult.status)) continue
      if (consult.patient_id) servedIds.add(consult.patient_id)
    }
    const consultIds = new Set(consults.map((consult) => consult.id))
    for (const ticket of completedTickets) {
      if (ticket.consultation_id && consultIds.has(ticket.consultation_id)) {
        continue
      }
      if (ticket.patient_id) servedIds.add(ticket.patient_id)
    }

    let student = 0
    let faculty = 0
    let employee = 0
    for (const id of servedIds) {
      const classified = reportPatientClass(typeByPatient.get(id))
      if (classified === "student") student += 1
      else if (classified === "faculty") faculty += 1
      else if (classified === "employee") employee += 1
    }

    const utilization = [
      {
        label: "Student Medical",
        value: medicalConsults.filter(
          (c) =>
            reportPatientClass(
              unwrapRecordType(c.patient_records) ??
                typeByPatient.get(c.patient_id ?? "")
            ) === "student"
        ).length,
      },
      {
        label: "Student Dental",
        value: dentalConsults.filter(
          (c) =>
            reportPatientClass(
              unwrapRecordType(c.patient_records) ??
                typeByPatient.get(c.patient_id ?? "")
            ) === "student"
        ).length,
      },
      {
        label: "Faculty Medical",
        value: medicalConsults.filter(
          (c) =>
            reportPatientClass(
              unwrapRecordType(c.patient_records) ??
                typeByPatient.get(c.patient_id ?? "")
            ) === "faculty"
        ).length,
      },
      {
        label: "Faculty Dental",
        value: dentalConsults.filter(
          (c) =>
            reportPatientClass(
              unwrapRecordType(c.patient_records) ??
                typeByPatient.get(c.patient_id ?? "")
            ) === "faculty"
        ).length,
      },
      {
        label: "Employee Medical",
        value: medicalConsults.filter(
          (c) =>
            reportPatientClass(
              unwrapRecordType(c.patient_records) ??
                typeByPatient.get(c.patient_id ?? "")
            ) === "employee"
        ).length,
      },
      {
        label: "Employee Dental",
        value: dentalConsults.filter(
          (c) =>
            reportPatientClass(
              unwrapRecordType(c.patient_records) ??
                typeByPatient.get(c.patient_id ?? "")
            ) === "employee"
        ).length,
      },
    ].filter((point) => point.value > 0)

    const span = daySpan(dateFrom, dateTo)
    const trendPoints: Array<{
      label: string
      value: number
      secondary: number
      tertiary: number
    }> = []

    if (span === 1) {
      const hours = Array.from({ length: 24 }, (_, hour) => ({
        label: `${String(hour).padStart(2, "0")}:00`,
        value: 0,
        secondary: 0,
        tertiary: 0,
      }))
      for (const c of consults) {
        const hour = manilaHour(c.consultation_date)
        if (hour == null) continue
        if (isDentalConsultation(c)) hours[hour].secondary += 1
        else hours[hour].value += 1
        hours[hour].tertiary += 1
      }
      trendPoints.push(
        ...(hours.some((h) => h.tertiary > 0)
          ? hours.filter((h) => h.tertiary > 0)
          : hours.slice(7, 18))
      )
    } else {
      const byDay = new Map<string, { medical: number; dental: number }>()
      const cursor = new Date(`${dateFrom}T12:00:00+08:00`)
      const end = new Date(`${dateTo}T12:00:00+08:00`)
      while (cursor <= end) {
        const ymd = manilaDayBounds(cursor).ymd
        byDay.set(ymd, { medical: 0, dental: 0 })
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }
      for (const c of consults) {
        const ymd = manilaYmd(c.consultation_date)
        if (!ymd || !byDay.has(ymd)) continue
        const row = byDay.get(ymd)!
        if (isDentalConsultation(c)) row.dental += 1
        else row.medical += 1
      }

      if (span <= 45) {
        for (const [ymd, counts] of byDay) {
          trendPoints.push({
            label: ymd.slice(5),
            value: counts.medical,
            secondary: counts.dental,
            tertiary: counts.medical + counts.dental,
          })
        }
      } else {
        const byWeek = new Map<string, { medical: number; dental: number }>()
        for (const [ymd, counts] of byDay) {
          const key = ymd.slice(0, 7)
          const cur = byWeek.get(key) ?? { medical: 0, dental: 0 }
          cur.medical += counts.medical
          cur.dental += counts.dental
          byWeek.set(key, cur)
        }
        for (const [label, counts] of byWeek) {
          trendPoints.push({
            label,
            value: counts.medical,
            secondary: counts.dental,
            tertiary: counts.medical + counts.dental,
          })
        }
      }
    }

    const caseMap = new Map<string, Omit<HealthCaseBucket, "label">>()
    for (const c of consults) {
      const dental = isDentalConsultation(c)
      const label = normalizeHealthCase(
        healthCaseSource(c),
        dental ? "dental" : "medical"
      )
      const bucket = caseMap.get(label) ?? emptyBucket()
      addToBucket(
        bucket,
        unwrapRecordType(c.patient_records) ??
          typeByPatient.get(c.patient_id ?? "")
      )
      caseMap.set(label, bucket)
    }
    const rankedCases = rankHealthCases(
      [...caseMap.entries()].map(([label, counts]) => ({
        label,
        ...counts,
      }))
    )

    const waitMinutes = tickets
      .map((ticket) => ticket.estimated_wait_minutes)
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value) && value > 0
      )
    const avgWait =
      waitMinutes.length > 0
        ? Math.round(
            waitMinutes.reduce((sum, value) => sum + value, 0) /
              waitMinutes.length
          )
        : 0

    const patientMixTotal = student + faculty + employee

    const kpis =
      designation === "nurse"
        ? [
            {
              key: "patients_served",
              label: "Total Patients Served",
              value: String(servedIds.size),
              description: "Unique patients in the selected period",
            },
            {
              key: "total_consultations",
              label: "Total Consultations",
              value: String(consults.length),
            },
            {
              key: "medical_consultations",
              label: "Medical Consultations",
              value: String(medicalConsults.length),
            },
            {
              key: "dental_consultations",
              label: "Dental Consultations",
              value: String(dentalConsults.length),
            },
            {
              key: "avg_wait",
              label: "Average Waiting Time",
              value: waitMinutes.length > 0 ? `${avgWait} min` : "—",
              description: "Minutes",
            },
          ]
        : [
            {
              key: "patients_served",
              label: "Total Patients Served",
              value: String(servedIds.size),
              description: "Unique patients in the selected period",
            },
            {
              key: "total_consultations",
              label: "Total Consultations",
              value: String(consults.length),
            },
            {
              key: "medical_consultations",
              label: "Medical Consultations",
              value: String(medicalConsults.length),
            },
            {
              key: "dental_consultations",
              label: "Dental Consultations",
              value: String(dentalConsults.length),
            },
            {
              key: "certs_issued",
              label: "Medical Certificates Issued",
              value: String(certs.length),
            },
          ]

    return {
      generatedAt: new Date().toISOString(),
      dateFrom,
      dateTo,
      kpis,
      charts: [
        {
          key: "consult_volume_trend",
          title: "Consultation Trend",
          description: "Medical, dental, and total over the selected period",
          kind: "multiline",
          points: trendPoints,
        },
        {
          key: "service_utilization",
          title: "Service Utilization",
          description: "Consultations by patient group and service",
          kind: "hbar",
          points: utilization,
        },
        {
          key: "patient_type_distribution",
          title: "Patient Service Statistics",
          description: "Share of patients served",
          kind: "pie",
          points: [
            { label: "Student", value: student },
            { label: "Faculty", value: faculty },
            { label: "Employee", value: employee },
          ].filter((point) => point.value > 0),
        },
        {
          key: "health_cases",
          title: "Health Cases",
          description: "Most common cases in the selected period",
          kind: "hbar",
          points: rankedCases.map((bucket) => ({
            label: bucket.label,
            value: bucket.total,
          })),
        },
        {
          key: "health_cases_by_patient_type",
          title: "Health Cases by Patient Type",
          description: "Student, Faculty, and Employee",
          kind: "stackedBar",
          points: rankedCases.map((bucket) => ({
            label: bucket.label,
            value: bucket.student,
            secondary: bucket.faculty,
            tertiary: bucket.employee,
          })),
        },
      ],
      tables: [
        {
          kind: "service_utilization",
          title: "Service Utilization",
          columns: [
            { key: "service", label: "Service", sortable: true },
            { key: "total", label: "Total", sortable: true },
          ],
          rows: utilization.map((point) => ({
            id: point.label,
            cells: { service: point.label, total: point.value },
          })),
        },
        {
          kind: "daily_consultation",
          title: "Consultation Trend",
          columns: [
            { key: "date", label: "Date", sortable: true },
            { key: "medical", label: "Medical", sortable: true },
            { key: "dental", label: "Dental", sortable: true },
            { key: "total", label: "Total", sortable: true },
          ],
          rows: trendPoints.map((point, index) => ({
            id: `trend-${index}`,
            cells: {
              date: point.label,
              medical: point.value,
              dental: point.secondary,
              total: point.tertiary,
            },
          })),
        },
        {
          kind: "health_cases",
          title: "Health Cases",
          columns: [
            { key: "case", label: "Health Case", sortable: true },
            { key: "total", label: "Total", sortable: true },
          ],
          rows: rankedCases.map((bucket) => ({
            id: bucket.label,
            cells: { case: bucket.label, total: bucket.total },
          })),
        },
        {
          kind: "health_cases_by_patient_type",
          title: "Health Cases by Patient Type",
          columns: [
            { key: "case", label: "Health Case", sortable: true },
            { key: "student", label: "Student", sortable: true },
            { key: "faculty", label: "Faculty", sortable: true },
            { key: "employee", label: "Employee", sortable: true },
            { key: "total", label: "Total", sortable: true },
          ],
          rows: rankedCases.map((bucket) => ({
            id: `type-${bucket.label}`,
            cells: {
              case: bucket.label,
              student: bucket.student,
              faculty: bucket.faculty,
              employee: bucket.employee,
              total: bucket.total,
            },
          })),
        },
        {
          kind: "patient_service_statistics",
          title: "Patient Service Statistics",
          columns: [
            { key: "type", label: "Patient Type", sortable: true },
            { key: "total", label: "Total", sortable: true },
            { key: "percent", label: "Percentage", sortable: true },
          ],
          rows: [
            { type: "Student", total: student },
            { type: "Faculty", total: faculty },
            { type: "Employee", total: employee },
          ].map((row) => ({
            id: row.type,
            cells: {
              type: row.type,
              total: row.total,
              percent:
                patientMixTotal > 0
                  ? `${Math.round((row.total / patientMixTotal) * 100)}%`
                  : "0%",
            },
          })),
        },
      ],
      statusOptions: ["Waiting", "Ongoing", "Completed"],
      error: null,
    }
  } catch (err) {
    return {
      ...empty,
      error:
        err instanceof Error
          ? err.message
          : "Could not load report data.",
    }
  }
}
