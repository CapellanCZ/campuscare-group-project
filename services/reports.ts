import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import {
  REPORT_RANGES,
  ReportServiceError,
  type ClinicReportBundle,
  type ReportAnalytics,
  type ReportPeriodRow,
  type ReportRange,
  type ReportStats,
} from "@/types/report"

const DAY_MS = 24 * 60 * 60 * 1000

function mapError(error: { message: string; code?: string }): never {
  const message = error.message.toLowerCase()
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    throw new ReportServiceError(
      "offline",
      "Unable to reach the database. Check your connection and try again."
    )
  }
  if (
    error.code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    throw new ReportServiceError(
      "permission",
      "You do not have permission to view reports."
    )
  }
  throw new ReportServiceError(
    "database",
    error.message || "A database error occurred while loading reports."
  )
}

function isMissingTable(error: { message: string }) {
  const message = error.message.toLowerCase()
  return (
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("could not find the table")
  )
}

async function getClient(client?: SupabaseClient) {
  return client ?? (await createClient())
}

function assertRange(range: string): ReportRange {
  if ((REPORT_RANGES as readonly string[]).includes(range)) {
    return range as ReportRange
  }
  throw new ReportServiceError("validation", "Invalid report range.")
}

function rangeDays(range: ReportRange) {
  if (range === "7d") return 7
  if (range === "90d") return 90
  return 30
}

function rangeLabel(range: ReportRange) {
  if (range === "7d") return "Last 7 days"
  if (range === "90d") return "Last 90 days"
  return "Last 30 days"
}

function manilaYmd(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function manilaWeekday(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
  }).format(date)
}

function formatPeriodLabel(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  return `${fmt.format(start)}–${fmt.format(end)}`
}

function rangeBounds(range: ReportRange) {
  const days = rangeDays(range)
  const end = new Date()
  const start = new Date(end.getTime() - (days - 1) * DAY_MS)
  const startYmd = manilaYmd(start)
  const endYmd = manilaYmd(end)

  return {
    startIso: new Date(`${startYmd}T00:00:00+08:00`).toISOString(),
    endIso: new Date(`${endYmd}T23:59:59.999+08:00`).toISOString(),
    startYmd,
    endYmd,
  }
}

function buildBuckets(range: ReportRange, startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const buckets: { id: string; label: string; start: Date; end: Date }[] = []

  if (range === "7d") {
    for (let i = 0; i < 7; i += 1) {
      const dayStart = new Date(start.getTime() + i * DAY_MS)
      const ymd = manilaYmd(dayStart)
      const bucketStart = new Date(`${ymd}T00:00:00+08:00`)
      const bucketEnd = new Date(`${ymd}T23:59:59.999+08:00`)
      buckets.push({
        id: `day-${ymd}`,
        label: formatPeriodLabel(bucketStart, bucketEnd),
        start: bucketStart,
        end: bucketEnd,
      })
    }
    return buckets
  }

  const weekMs = 7 * DAY_MS
  let cursor = new Date(start)
  let index = 1
  while (cursor.getTime() <= end.getTime()) {
    const bucketEnd = new Date(
      Math.min(cursor.getTime() + weekMs - 1, end.getTime())
    )
    buckets.push({
      id: `week-${index}`,
      label: formatPeriodLabel(cursor, bucketEnd),
      start: new Date(cursor),
      end: bucketEnd,
    })
    cursor = new Date(cursor.getTime() + weekMs)
    index += 1
  }

  return buckets
}

function inRange(iso: string | null | undefined, start: Date, end: Date) {
  if (!iso) return false
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return false
  return time >= start.getTime() && time <= end.getTime()
}

function stationLabel(station: string | null | undefined) {
  const value = (station ?? "").trim().toLowerCase()
  if (value === "physician") return "Physician"
  if (value === "dentist") return "Dentist"
  if (value === "nurse") return "Nurse"
  if (!value) return "Unassigned"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export async function getClinicReport(
  rangeInput: ReportRange = "30d",
  client?: SupabaseClient
): Promise<ClinicReportBundle> {
  const range = assertRange(rangeInput)
  const supabase = await getClient(client)
  const { startIso, endIso } = rangeBounds(range)

  const [
    consultationsResult,
    certificatesResult,
    ticketsResult,
  ] = await Promise.all([
    supabase
      .from("consultations")
      .select("id, station, consultation_date, status, created_at")
      .gte("consultation_date", startIso)
      .lte("consultation_date", endIso),
    supabase
      .from("medical_certificates")
      .select("id, certificate_type, status, issued_at, created_at")
      .or(
        `and(issued_at.gte.${startIso},issued_at.lte.${endIso}),and(issued_at.is.null,created_at.gte.${startIso},created_at.lte.${endIso})`
      ),
    supabase
      .from("health_queue_tickets")
      .select(
        "id, estimated_wait_minutes, created_at, appointment_id, health_appointment_id"
      )
      .gte("created_at", startIso)
      .lte("created_at", endIso),
  ])

  if (consultationsResult.error && !isMissingTable(consultationsResult.error)) {
    mapError(consultationsResult.error)
  }
  if (certificatesResult.error && !isMissingTable(certificatesResult.error)) {
    mapError(certificatesResult.error)
  }
  if (ticketsResult.error && !isMissingTable(ticketsResult.error)) {
    mapError(ticketsResult.error)
  }

  const consultations = consultationsResult.data ?? []
  const certificates = (certificatesResult.data ?? []).filter((row) => {
    const status = (row.status as string | null) ?? ""
    return status === "issued" || status === "printed"
  })
  const tickets = ticketsResult.data ?? []

  const appointmentIds = [
    ...new Set(
      tickets
        .map((t) => t.health_appointment_id ?? t.appointment_id)
        .filter(Boolean) as string[]
    ),
  ]

  const appointmentsById = new Map<
    string,
    { consultation_type: string | null; service: string | null; notes: string | null }
  >()

  if (appointmentIds.length) {
    const { data: appointments, error } = await supabase
      .from("health_appointments")
      .select("id, consultation_type, service, notes")
      .in("id", appointmentIds)

    if (error && !isMissingTable(error)) mapError(error)

    for (const appointment of appointments ?? []) {
      appointmentsById.set(appointment.id as string, {
        consultation_type: appointment.consultation_type as string | null,
        service: appointment.service as string | null,
        notes: appointment.notes as string | null,
      })
    }
  }

  const walkInTicketIds = new Set<string>()
  for (const ticket of tickets) {
    const appointmentId =
      (ticket.health_appointment_id as string | null) ??
      (ticket.appointment_id as string | null)
    const appointment = appointmentId
      ? appointmentsById.get(appointmentId)
      : null
    const haystack = [
      appointment?.consultation_type ?? "",
      appointment?.service ?? "",
      appointment?.notes ?? "",
    ]
      .join(" ")
      .toLowerCase()
    if (haystack.includes("walk")) {
      walkInTicketIds.add(ticket.id as string)
    }
  }

  const waits = tickets
    .map((t) => t.estimated_wait_minutes as number | null)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))

  const stats: ReportStats = {
    consultations: consultations.length,
    certificates: certificates.length,
    walkIns: walkInTicketIds.size,
    avgWaitMinutes:
      waits.length > 0
        ? Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length)
        : 0,
  }

  const dayCounts = new Map<string, number>()
  for (const row of consultations) {
    const key = manilaWeekday(new Date(row.consultation_date as string))
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
  }

  let peakDayLabel = "—"
  let peakDayCount = 0
  for (const [label, count] of dayCounts) {
    if (count > peakDayCount) {
      peakDayLabel = label
      peakDayCount = count
    }
  }

  const stationCounts = new Map<string, number>()
  for (const row of consultations) {
    const label = stationLabel(row.station as string | null)
    stationCounts.set(label, (stationCounts.get(label) ?? 0) + 1)
  }

  let topStationLabel = "—"
  let topStationCount = 0
  for (const [label, count] of stationCounts) {
    if (count > topStationCount) {
      topStationLabel = label
      topStationCount = count
    }
  }

  const analytics: ReportAnalytics = {
    peakDayLabel,
    peakDayCount,
    topStationLabel,
    topStationShare:
      stats.consultations > 0 ? topStationCount / stats.consultations : 0,
  }

  const buckets = buildBuckets(range, startIso, endIso)
  const periodRows: ReportPeriodRow[] = buckets.map((bucket) => {
    const bucketConsults = consultations.filter((row) =>
      inRange(row.consultation_date as string, bucket.start, bucket.end)
    )
    const bucketCerts = certificates.filter((row) =>
      inRange(
        (row.issued_at as string | null) ?? (row.created_at as string),
        bucket.start,
        bucket.end
      )
    )
    const bucketTickets = tickets.filter((row) =>
      inRange(row.created_at as string, bucket.start, bucket.end)
    )
    const bucketWalkIns = bucketTickets.filter((row) =>
      walkInTicketIds.has(row.id as string)
    ).length
    const bucketWaits = bucketTickets
      .map((t) => t.estimated_wait_minutes as number | null)
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n))

    const serviceCounts = new Map<string, number>()
    for (const cert of bucketCerts) {
      const type = ((cert.certificate_type as string) || "Certificate").trim()
      serviceCounts.set(type, (serviceCounts.get(type) ?? 0) + 1)
    }
    for (const consult of bucketConsults) {
      const type = stationLabel(consult.station as string | null)
      serviceCounts.set(type, (serviceCounts.get(type) ?? 0) + 1)
    }

    let topService = "—"
    let topServiceCount = 0
    for (const [label, count] of serviceCounts) {
      if (count > topServiceCount) {
        topService = label
        topServiceCount = count
      }
    }

    return {
      id: bucket.id,
      period: bucket.label,
      startIso: bucket.start.toISOString(),
      endIso: bucket.end.toISOString(),
      consultations: bucketConsults.length,
      certificates: bucketCerts.length,
      walkIns: bucketWalkIns,
      avgWaitMinutes:
        bucketWaits.length > 0
          ? Math.round(
              bucketWaits.reduce((sum, value) => sum + value, 0) /
                bucketWaits.length
            )
          : 0,
      topService,
    }
  })

  return {
    range,
    rangeLabel: rangeLabel(range),
    startIso,
    endIso,
    stats,
    analytics,
    periodRows,
  }
}
