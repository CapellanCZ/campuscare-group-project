import "server-only"

import { listStaffUsers } from "@/features/admin/actions/user-management"
import { STAFF_DIRECTORY_ROLES } from "@/features/admin/types/user-management"
import type {
  AdminChartPoint,
  AdminOpsSnapshot,
  AdminStaffStatusCard,
} from "@/features/admin/types/ops"
import { createClient } from "@/lib/supabase/server"
import { manilaDayBounds } from "@/lib/health/time"

function isDentalStation(station: string | null | undefined): boolean {
  const v = (station ?? "").toLowerCase()
  return v.includes("dent")
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

function manilaYmd(iso: string | null | undefined): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso))
}

function shiftManilaDays(days: number): { ymd: string; startIso: string; endIso: string } {
  const base = new Date()
  base.setUTCDate(base.getUTCDate() + days)
  return manilaDayBounds(base)
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

function bucketTrend(
  rows: Array<{ date: string; medical: number; dental: number }>,
  mode: "daily" | "weekly" | "monthly"
): AdminChartPoint[] {
  if (mode === "daily") {
    return rows.map((r) => ({
      label: r.date.slice(5),
      value: r.medical,
      secondary: r.dental,
    }))
  }

  const map = new Map<string, { medical: number; dental: number }>()
  for (const r of rows) {
    const d = new Date(`${r.date}T12:00:00+08:00`)
    let key: string
    if (mode === "monthly") {
      key = r.date.slice(0, 7)
    } else {
      const day = d.getUTCDay()
      const mondayOffset = day === 0 ? -6 : 1 - day
      const monday = new Date(d)
      monday.setUTCDate(d.getUTCDate() + mondayOffset)
      key = monday.toISOString().slice(0, 10)
    }
    const cur = map.get(key) ?? { medical: 0, dental: 0 }
    cur.medical += r.medical
    cur.dental += r.dental
    map.set(key, cur)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, v]) => ({
      label: mode === "monthly" ? label : label.slice(5),
      value: v.medical,
      secondary: v.dental,
    }))
}

/**
 * Aggregated clinic snapshot for the Admin dashboard.
 * Selects only operational columns — no names, complaints, vitals, or notes.
 */
export async function loadAdminOpsSnapshot(): Promise<AdminOpsSnapshot> {
  const empty: AdminOpsSnapshot = {
    generatedAt: new Date().toISOString(),
    summary: {
      consultationsToday: 0,
      consultationsYesterday: 0,
      patientsServedToday: 0,
      pendingRequests: 0,
      patientsInQueue: 0,
      medicalToday: 0,
      dentalToday: 0,
      certsIssuedToday: 0,
      announcementsPublished: 0,
    },
    consultationTrend: { daily: [], weekly: [], monthly: [] },
    patientType: [],
    queue: {
      avgWaitMinutes: 0,
      avgServiceMinutes: 0,
      waiting: 0,
      served: 0,
      hourlyVolume: [],
      peakHourLabel: null,
    },
    requestStatus: [
      { label: "Pending", value: 0 },
      { label: "Approved", value: 0 },
      { label: "Rescheduled", value: 0 },
      { label: "Declined", value: 0 },
      { label: "Completed", value: 0 },
    ],
    utilization: [
      { label: "Medical", value: 0 },
      { label: "Dental", value: 0 },
    ],
    staff: [],
    error: null,
  }

  try {
    const supabase = await createClient()
    const today = manilaDayBounds()
    const yesterday = shiftManilaDays(-1)
    const rangeStart = shiftManilaDays(-89)

    const [
      consultRowsRes,
      ticketRowsRes,
      appointmentRowsRes,
      certTodayRes,
      announceRes,
      staffRes,
    ] = await Promise.all([
      supabase
        .from("consultations")
        .select("id, station, status, consultation_date, patient_id, created_at")
        .gte("consultation_date", rangeStart.startIso)
        .lte("consultation_date", today.endIso),
      supabase
        .from("health_queue_tickets")
        .select(
          "id, status, estimated_wait_minutes, checked_in_at, created_at, updated_at, patient_id, service_date"
        )
        .gte("created_at", today.startIso)
        .lte("created_at", today.endIso),
      supabase
        .from("appointments")
        .select("id, status, provider_type, created_at")
        .gte("created_at", rangeStart.startIso)
        .lte("created_at", today.endIso),
      supabase
        .from("medical_certificates")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today.startIso)
        .lte("created_at", today.endIso),
      supabase
        .from("announcements")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      listStaffUsers({
        status: "all",
        roles: STAFF_DIRECTORY_ROLES,
      }),
    ])

    if (consultRowsRes.error) throw consultRowsRes.error
    if (ticketRowsRes.error) throw ticketRowsRes.error
    if (appointmentRowsRes.error) throw appointmentRowsRes.error

    const consults = consultRowsRes.data ?? []
    const tickets = ticketRowsRes.data ?? []
    const appointments = appointmentRowsRes.data ?? []

    const consultsToday = consults.filter((c) => {
      const ymd = manilaYmd(c.consultation_date as string)
      return ymd === today.ymd
    })
    const consultsYesterday = consults.filter((c) => {
      const ymd = manilaYmd(c.consultation_date as string)
      return ymd === yesterday.ymd
    })

    const medicalToday = consultsToday.filter(
      (c) => !isDentalStation(c.station as string | null)
    ).length
    const dentalToday = consultsToday.filter((c) =>
      isDentalStation(c.station as string | null)
    ).length

    const completedTickets = tickets.filter((t) => t.status === "completed")
    const waitingTickets = tickets.filter((t) => t.status === "waiting")
    const waits = waitingTickets
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

    const hourly = Array.from({ length: 24 }, (_, h) => ({
      label: `${String(h).padStart(2, "0")}:00`,
      value: 0,
    }))
    for (const t of tickets) {
      const h = manilaHour(t.created_at as string)
      if (h == null || h < 0 || h > 23) continue
      hourly[h].value += 1
    }
    const activeHours = hourly.filter((h) => h.value > 0)
    const peak = [...hourly].sort((a, b) => b.value - a.value)[0]

    const pendingRequests = appointments.filter(
      (a) => a.status === "pending" || a.status === "waitlisted"
    ).length

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

    // Patient type for completed visits today via patients join on ticket patient_id
    const patientIds = [
      ...new Set(
        completedTickets
          .map((t) => t.patient_id as string | null)
          .filter((id): id is string => Boolean(id))
      ),
    ]
    let student = 0
    let faculty = 0
    if (patientIds.length > 0) {
      const { data: patients } = await supabase
        .from("patients")
        .select("id, patient_type")
        .in("id", patientIds.slice(0, 500))
      for (const p of patients ?? []) {
        if ((p.patient_type as string) === "faculty") faculty += 1
        else student += 1
      }
    }

    // Daily consult trend last 30 days
    const byDay = new Map<string, { medical: number; dental: number }>()
    for (let i = 29; i >= 0; i--) {
      const b = shiftManilaDays(-i)
      byDay.set(b.ymd, { medical: 0, dental: 0 })
    }
    for (const c of consults) {
      const ymd = manilaYmd(c.consultation_date as string)
      if (!ymd || !byDay.has(ymd)) continue
      const cur = byDay.get(ymd)!
      if (isDentalStation(c.station as string | null)) cur.dental += 1
      else cur.medical += 1
    }
    const dailyRows = [...byDay.entries()].map(([date, v]) => ({
      date,
      medical: v.medical,
      dental: v.dental,
    }))

    const staff: AdminStaffStatusCard[] =
      staffRes.ok
        ? staffRes.users
            .filter(
              (u) =>
                u.role === "nurse" ||
                u.role === "physician" ||
                u.role === "dentist"
            )
            .map((u) => ({
              id: u.id,
              fullName: u.fullName,
              role: u.role as "nurse" | "physician" | "dentist",
              status: u.status,
              lastSignInAt: u.lastSignInAt,
            }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName))
        : []

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        consultationsToday: consultsToday.length,
        consultationsYesterday: consultsYesterday.length,
        patientsServedToday: completedTickets.length,
        pendingRequests,
        patientsInQueue: waitingTickets.length,
        medicalToday,
        dentalToday,
        certsIssuedToday: certTodayRes.count ?? 0,
        announcementsPublished: announceRes.count ?? 0,
      },
      consultationTrend: {
        daily: bucketTrend(dailyRows, "daily"),
        weekly: bucketTrend(dailyRows, "weekly"),
        monthly: bucketTrend(dailyRows, "monthly"),
      },
      patientType: [
        { label: "Students", value: student },
        { label: "Faculty / Employees", value: faculty },
      ],
      queue: {
        avgWaitMinutes: avgWait,
        avgServiceMinutes: avgService,
        waiting: waitingTickets.length,
        served: completedTickets.length,
        hourlyVolume: activeHours.length > 0 ? activeHours : hourly.slice(7, 19),
        peakHourLabel:
          peak && peak.value > 0 ? peak.label : null,
      },
      requestStatus: Object.entries(requestBuckets).map(([label, value]) => ({
        label,
        value,
      })),
      utilization: [
        { label: "Medical", value: medicalToday },
        { label: "Dental", value: dentalToday },
      ],
      staff,
      error: null,
    }
  } catch (err) {
    return {
      ...empty,
      error:
        err instanceof Error
          ? err.message
          : "Could not load admin operations snapshot.",
    }
  }
}
