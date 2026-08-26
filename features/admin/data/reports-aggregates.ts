import "server-only"

import type { AdminReportsAggregates } from "@/features/admin/types/ops"
import type {
  ReportConsultationType,
  ReportFilters,
  ReportPatientType,
} from "@/features/reports/types"
import { createClient } from "@/lib/supabase/server"
import { manilaDayBounds } from "@/lib/health/time"

function isDentalStation(station: string | null | undefined): boolean {
  const v = (station ?? "").toLowerCase()
  return v.includes("dent")
}

function isDentalConsultation(row: {
  station?: string | null
  provider_type?: string | null
}): boolean {
  if (row.provider_type === "dentist") return true
  return isDentalStation(row.station as string | null)
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

function mapRequestLabel(status: string): string | null {
  switch (status) {
    case "pending":
    case "waitlisted":
      return "Pending"
    case "confirmed":
      return "Approved"
    case "rescheduled":
      return "Rescheduled"
    case "cancelled":
      return "Declined"
    case "completed":
      return "Completed"
    default:
      return null
  }
}

function inDateRange(ymd: string | null, from: string, to: string) {
  if (!ymd) return false
  return ymd >= from && ymd <= to
}

function matchesConsultType(
  station: string | null | undefined,
  type: ReportConsultationType
) {
  if (type === "all") return true
  const dental = isDentalStation(station)
  return type === "dental" ? dental : !dental
}

function matchesPatientType(
  patientType: string | null | undefined,
  filter: ReportPatientType
) {
  if (filter === "all") return true
  if (filter === "faculty") return patientType === "faculty"
  return patientType !== "faculty"
}

/**
 * Date-range admin report aggregates. No PHI columns in the payload.
 */
export async function loadAdminReportsAggregates(
  filters: Pick<
    ReportFilters,
    "dateFrom" | "dateTo" | "consultationType" | "patientType" | "status"
  >
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
    statusOptions: [
      "Pending",
      "Approved",
      "Rescheduled",
      "Declined",
      "Completed",
    ],
    error: null,
  }

  try {
    const supabase = await createClient()
    const fromBounds = manilaDayBounds(new Date(`${dateFrom}T12:00:00+08:00`))
    const toBounds = manilaDayBounds(new Date(`${dateTo}T12:00:00+08:00`))

    const [consultRes, ticketRes, apptRes, certRes] = await Promise.all([
      supabase
        .from("consultations")
        .select("id, station, status, consultation_date, patient_id, provider_type")
        .gte("consultation_date", fromBounds.startIso)
        .lte("consultation_date", toBounds.endIso),
      supabase
        .from("health_queue_tickets")
        .select(
          "id, status, estimated_wait_minutes, checked_in_at, created_at, updated_at, patient_id"
        )
        .gte("created_at", fromBounds.startIso)
        .lte("created_at", toBounds.endIso),
      supabase
        .from("appointments")
        .select("id, status, provider_type, created_at, patient_id")
        .gte("created_at", fromBounds.startIso)
        .lte("created_at", toBounds.endIso),
      supabase
        .from("medical_certificates")
        .select("id, created_at, status")
        .gte("created_at", fromBounds.startIso)
        .lte("created_at", toBounds.endIso),
    ])

    if (consultRes.error) throw consultRes.error
    if (ticketRes.error) throw ticketRes.error
    if (apptRes.error) throw apptRes.error
    if (certRes.error) throw certRes.error

    const patientIds = new Set<string>()
    for (const c of consultRes.data ?? []) {
      if (c.patient_id) patientIds.add(c.patient_id as string)
    }
    for (const t of ticketRes.data ?? []) {
      if (t.patient_id) patientIds.add(t.patient_id as string)
    }
    for (const a of apptRes.data ?? []) {
      if (a.patient_id) patientIds.add(a.patient_id as string)
    }

    const typeByPatient = new Map<string, string>()
    const ids = [...patientIds].slice(0, 2000)
    if (ids.length > 0) {
      const { data: patients } = await supabase
        .from("patients")
        .select("id, patient_type")
        .in("id", ids)
      for (const p of patients ?? []) {
        typeByPatient.set(p.id as string, (p.patient_type as string) ?? "student")
      }
    }

    const consults = (consultRes.data ?? []).filter((c) => {
      const ymd = manilaYmd(c.consultation_date as string)
      if (!inDateRange(ymd, dateFrom, dateTo)) return false
      if (!matchesConsultType(c.station as string, filters.consultationType))
        return false
      const pt = typeByPatient.get(c.patient_id as string)
      return matchesPatientType(pt, filters.patientType)
    })

    const tickets = (ticketRes.data ?? []).filter((t) => {
      const ymd = manilaYmd(t.created_at as string)
      if (!inDateRange(ymd, dateFrom, dateTo)) return false
      const pt = typeByPatient.get(t.patient_id as string)
      return matchesPatientType(pt, filters.patientType)
    })

    const appointments = (apptRes.data ?? []).filter((a) => {
      const ymd = manilaYmd(a.created_at as string)
      if (!inDateRange(ymd, dateFrom, dateTo)) return false
      if (filters.consultationType !== "all") {
        const dental = (a.provider_type as string) === "dentist"
        if (filters.consultationType === "dental" ? !dental : dental) return false
      }
      const pt = typeByPatient.get(a.patient_id as string)
      if (!matchesPatientType(pt, filters.patientType)) return false
      if (filters.status && filters.status !== "all") {
        const label = mapRequestLabel(a.status as string)
        if (label !== filters.status) return false
      }
      return true
    })

    const certs = (certRes.data ?? []).filter((c) => {
      const ymd = manilaYmd(c.created_at as string)
      return inDateRange(ymd, dateFrom, dateTo)
    })

    const medical = consults.filter((c) => !isDentalConsultation(c)).length
    const dental = consults.filter((c) => isDentalConsultation(c)).length
    const completedTickets = tickets.filter((t) => t.status === "completed")

    let student = 0
    let faculty = 0
    for (const t of completedTickets) {
      const pt = typeByPatient.get(t.patient_id as string)
      if (pt === "faculty") faculty += 1
      else student += 1
    }

    const waits = tickets
      .map((t) => t.estimated_wait_minutes as number | null)
      .filter((n): n is number => typeof n === "number")
    const avgWait =
      waits.length > 0
        ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length)
        : 0

    const serviceMins = completedTickets
      .map((t) => {
        const end = t.updated_at ? new Date(t.updated_at as string).getTime() : NaN
        const start = new Date(
          (t.checked_in_at as string | null) ||
            (t.created_at as string | null) ||
            ""
        ).getTime()
        if (Number.isNaN(end) || Number.isNaN(start) || end < start) return null
        return Math.round((end - start) / 60000)
      })
      .filter((n): n is number => n != null && n >= 0 && n < 24 * 60)
    const avgService =
      serviceMins.length > 0
        ? Math.round(serviceMins.reduce((a, b) => a + b, 0) / serviceMins.length)
        : 0

    // Series by date
    const dayMap = new Map<
      string,
      { medical: number; dental: number; waitSum: number; waitN: number; volume: number }
    >()
    const cursor = new Date(`${dateFrom}T12:00:00+08:00`)
    const end = new Date(`${dateTo}T12:00:00+08:00`)
    while (cursor <= end) {
      const ymd = manilaDayBounds(cursor).ymd
      dayMap.set(ymd, { medical: 0, dental: 0, waitSum: 0, waitN: 0, volume: 0 })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    for (const c of consults) {
      const ymd = manilaYmd(c.consultation_date as string)
      if (!ymd || !dayMap.has(ymd)) continue
      const row = dayMap.get(ymd)!
      if (isDentalConsultation(c)) row.dental += 1
      else row.medical += 1
    }
    for (const t of tickets) {
      const ymd = manilaYmd(t.created_at as string)
      if (!ymd || !dayMap.has(ymd)) continue
      const row = dayMap.get(ymd)!
      row.volume += 1
      if (typeof t.estimated_wait_minutes === "number") {
        row.waitSum += t.estimated_wait_minutes
        row.waitN += 1
      }
    }

    const consultTrend = [...dayMap.entries()].map(([date, v]) => ({
      label: date.slice(5),
      value: v.medical,
      secondary: v.dental,
      tertiary: v.medical + v.dental,
    }))

    const waitTrend = [...dayMap.entries()].map(([date, v]) => ({
      label: date.slice(5),
      value: v.waitN > 0 ? Math.round(v.waitSum / v.waitN) : 0,
    }))

    const hourly = Array.from({ length: 24 }, (_, h) => ({
      label: `${String(h).padStart(2, "0")}:00`,
      value: 0,
    }))
    for (const t of tickets) {
      const h = manilaHour(t.created_at as string)
      if (h == null || h < 0 || h > 23) continue
      hourly[h].value += 1
    }
    const peak = [...hourly].sort((a, b) => b.value - a.value)[0]

    const requestBuckets: Record<string, number> = {
      Pending: 0,
      Approved: 0,
      Rescheduled: 0,
      Declined: 0,
      Completed: 0,
    }
    for (const a of appointments) {
      const label = mapRequestLabel(a.status as string)
      if (!label) continue
      requestBuckets[label] += 1
    }

    const requestByDay = new Map<string, Record<string, number>>()
    for (const a of appointments) {
      const ymd = manilaYmd(a.created_at as string)
      const label = mapRequestLabel(a.status as string)
      if (!ymd || !label) continue
      const cur = requestByDay.get(ymd) ?? {
        Pending: 0,
        Approved: 0,
        Rescheduled: 0,
        Declined: 0,
        Completed: 0,
      }
      cur[label] += 1
      requestByDay.set(ymd, cur)
    }

    const dailyTableRows = [...dayMap.entries()].map(([date, v]) => ({
      id: date,
      cells: {
        date,
        medical: v.medical,
        dental: v.dental,
        total: v.medical + v.dental,
      },
    }))

    return {
      generatedAt: new Date().toISOString(),
      dateFrom,
      dateTo,
      kpis: [
        {
          key: "total_consultations",
          label: "Total consultations",
          value: String(consults.length),
        },
        {
          key: "patients_served",
          label: "Patients served",
          value: String(completedTickets.length),
        },
        {
          key: "certs_issued",
          label: "Certificates issued",
          value: String(certs.length),
        },
        {
          key: "avg_wait",
          label: "Average waiting time",
          value: `${avgWait} min`,
        },
        {
          key: "avg_service",
          label: "Average service time",
          value: `${avgService} min`,
        },
        {
          key: "peak_queue",
          label: "Peak queue period",
          value: peak && peak.value > 0 ? peak.label : "—",
        },
      ],
      charts: [
        {
          key: "consult_volume_trend",
          title: "Consultation volume",
          description: "Medical, dental, and total over the selected range",
          kind: "multiline",
          points: consultTrend,
        },
        {
          key: "medical_dental_donut",
          title: "Medical vs dental",
          description: "Share of consultations in range",
          kind: "pie",
          points: [
            { label: "Medical", value: medical },
            { label: "Dental", value: dental },
          ],
        },
        {
          key: "patient_type_distribution",
          title: "Patient type distribution",
          description: "Students vs faculty/employees served",
          kind: "pie",
          points: [
            { label: "Students", value: student },
            { label: "Faculty / Employees", value: faculty },
          ],
        },
        {
          key: "patient_type_bar",
          title: "Patients served by type",
          kind: "bar",
          points: [
            { label: "Students", value: student },
            { label: "Faculty / Employees", value: faculty },
          ],
        },
        {
          key: "utilization_hbar",
          title: "Medical vs dental utilization",
          kind: "hbar",
          points: [
            { label: "Medical", value: medical },
            { label: "Dental", value: dental },
          ],
        },
        {
          key: "avg_wait_trend",
          title: "Average waiting time",
          description: "Minutes by day",
          kind: "line",
          points: waitTrend,
        },
        {
          key: "hourly_queue_volume",
          title: "Queue volume by hour",
          kind: "bar",
          points: hourly.filter((h) => h.value > 0).length
            ? hourly.filter((h) => h.value > 0)
            : hourly.slice(7, 19),
        },
        {
          key: "request_status_bar",
          title: "Consultation request status",
          kind: "bar",
          points: Object.entries(requestBuckets).map(([label, value]) => ({
            label,
            value,
          })),
        },
      ],
      tables: [
        {
          kind: "daily_consultation",
          title: "Daily consultations",
          columns: [
            { key: "date", label: "Date", sortable: true },
            { key: "medical", label: "Medical", sortable: true },
            { key: "dental", label: "Dental", sortable: true },
            { key: "total", label: "Total", sortable: true },
          ],
          rows: dailyTableRows,
        },
        {
          kind: "queue_performance",
          title: "Queue performance by day",
          columns: [
            { key: "date", label: "Date", sortable: true },
            { key: "volume", label: "Tickets", sortable: true },
            { key: "avgWait", label: "Avg wait (min)", sortable: true },
          ],
          rows: [...dayMap.entries()].map(([date, v]) => ({
            id: `q-${date}`,
            cells: {
              date,
              volume: v.volume,
              avgWait: v.waitN > 0 ? Math.round(v.waitSum / v.waitN) : 0,
            },
          })),
        },
        {
          kind: "consultation_request",
          title: "Requests by day",
          columns: [
            { key: "date", label: "Date", sortable: true },
            { key: "pending", label: "Pending", sortable: true },
            { key: "approved", label: "Approved", sortable: true },
            { key: "rescheduled", label: "Rescheduled", sortable: true },
            { key: "declined", label: "Declined", sortable: true },
            { key: "completed", label: "Completed", sortable: true },
          ],
          rows: [...requestByDay.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, v]) => ({
              id: `r-${date}`,
              cells: {
                date,
                pending: v.Pending,
                approved: v.Approved,
                rescheduled: v.Rescheduled,
                declined: v.Declined,
                completed: v.Completed,
              },
            })),
        },
        {
          kind: "medical_certificate",
          title: "Certificates issued",
          columns: [
            { key: "date", label: "Date", sortable: true },
            { key: "count", label: "Issued", sortable: true },
          ],
          rows: (() => {
            const m = new Map<string, number>()
            for (const c of certs) {
              const ymd = manilaYmd(c.created_at as string)
              if (!ymd) continue
              m.set(ymd, (m.get(ymd) ?? 0) + 1)
            }
            return [...m.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, count]) => ({
                id: `c-${date}`,
                cells: { date, count },
              }))
          })(),
        },
      ],
      statusOptions: [
        "Pending",
        "Approved",
        "Rescheduled",
        "Declined",
        "Completed",
      ],
      error: null,
    }
  } catch (err) {
    return {
      ...empty,
      error:
        err instanceof Error
          ? err.message
          : "Could not load admin report aggregates.",
    }
  }
}
