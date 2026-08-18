import { createClient } from "@/lib/supabase/server"
import {
  getActiveStaffBreaksByRole,
  getClinicBreakStatus,
} from "@/lib/availability/queries"
import type { BreakStatus } from "@/lib/availability/types"
import { mapTicketRow, ticketLabel, type RawQueueTicket } from "@/lib/health/mappers"
import { stationLabel } from "@/lib/health/roles"
import { manilaDayBounds } from "@/lib/health/time"
import type {
  ActivityItem,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
  StationBoard,
  StationId,
} from "@/lib/health/types"

const TICKET_SELECT = `
  id,
  ticket_code,
  queue_position,
  queue_number,
  status,
  estimated_wait_minutes,
  checked_in_at,
  updated_at,
  created_at,
  appointment_id,
  health_appointment_id,
  patient_id,
  station,
  call_count,
  rejoin_count,
  patient_name,
  campus_id,
  consultation_type,
  assigned_staff_name,
  chief_complaint,
  vitals_bp_systolic,
  vitals_bp_diastolic,
  vitals_heart_rate,
  vitals_temperature_c,
  vitals_spo2,
  intake_notes,
  intake_completed_at,
  consultation_request_id,
  consultation_id,
  provider_type,
  patients (
    id,
    full_name,
    student_id,
    employee_id,
    patient_type
  )
`

async function fetchJoinedTickets(): Promise<QueueTicketRow[]> {
  const supabase = await createClient()
  const { startIso } = manilaDayBounds()

  const { data: tickets, error } = await supabase
    .from("health_queue_tickets")
    .select(TICKET_SELECT)
    .or(`created_at.gte.${startIso},status.in.(waiting,called,ongoing,no_show)`)
    .order("queue_position", { ascending: true })

  if (error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes("schema cache") ||
      msg.includes("does not exist") ||
      msg.includes("could not find the table")
    ) {
      return []
    }
    throw new Error(error.message)
  }

  return ((tickets ?? []) as unknown as RawQueueTicket[]).map((t) =>
    mapTicketRow(t)
  )
}

export async function getTodayQueueTickets(filter?: {
  station?: StationId | null
}): Promise<QueueTicketRow[]> {
  const tickets = await fetchJoinedTickets()
  if (!filter?.station) return tickets
  return tickets.filter((t) => t.station === filter.station)
}

export function computeQueueStats(tickets: QueueTicketRow[]): QueueStats {
  const waiting = tickets.filter((t) => t.status === "waiting")
  const serving = tickets.filter(
    (t) => t.status === "called" || t.status === "ongoing"
  )
  const completed = tickets.filter((t) => t.status === "completed")
  const checkedIn = tickets.filter((t) => Boolean(t.checkedInAt))
  const walkIns = tickets.filter((t) =>
    (t.consultationType ?? "").toLowerCase().includes("walk")
  )

  const waits = waiting
    .map((t) => t.estimatedWaitMinutes)
    .filter((n): n is number => typeof n === "number")

  return {
    totalWaiting: waiting.length,
    currentlyServing: serving.length,
    completedToday: completed.length,
    checkedIn: checkedIn.length,
    walkIns: walkIns.length,
    averageWaitMinutes:
      waits.length > 0
        ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length)
        : 0,
  }
}

export async function getStationBoards(
  tickets?: QueueTicketRow[]
): Promise<StationBoard[]> {
  const all = tickets ?? (await fetchJoinedTickets())
  const stations: StationId[] = ["nurse", "physician", "dentist"]

  const boards: StationBoard[] = stations.map((station) => {
    const scoped = all.filter((t) => t.station === station)
    const waiting = scoped
      .filter((t) => t.status === "waiting")
      .sort((a, b) => a.queuePosition - b.queuePosition)
    const called = scoped.find(
      (t) => t.status === "called" || t.status === "ongoing"
    )
    const waits = waiting
      .map((t) => t.estimatedWaitMinutes)
      .filter((n): n is number => typeof n === "number")

    return {
      station,
      label: stationLabel(station),
      status: waiting.length || called ? "active" : "idle",
      waitingCount: waiting.length,
      averageWaitMinutes:
        waits.length > 0
          ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length)
          : station === "nurse"
            ? 8
            : 10,
      nowServing: called
        ? ticketLabel(called.queueNumber, called.ticketCode)
        : null,
      upcoming: waiting
        .slice(0, 3)
        .map((t) => ticketLabel(t.queueNumber, t.ticketCode)),
    }
  })

  return applyBreakStatusToBoards(boards)
}

async function applyBreakStatusToBoards(
  boards: StationBoard[]
): Promise<StationBoard[]> {
  const [clinicBreak, staffByRole] = await Promise.all([
    getClinicBreakStatus(),
    getActiveStaffBreaksByRole(),
  ])

  return boards.map((board) => {
    if (clinicBreak.isOnBreak) {
      return {
        ...board,
        status: "on_break",
        resumesAt: clinicBreak.resumesAt,
      }
    }
    const roleBreak = staffByRole[board.station]
    if (roleBreak?.isOnBreak) {
      return {
        ...board,
        status: "on_break",
        resumesAt: roleBreak.resumesAt,
      }
    }
    return { ...board, resumesAt: null }
  })
}

export async function getRecentlyServed(
  limit = 8,
  tickets?: QueueTicketRow[]
): Promise<RecentlyServedItem[]> {
  const all = tickets ?? (await fetchJoinedTickets())
  return all
    .filter((t) => t.status === "completed")
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, limit)
    .map((t) => ({
      ticketId: t.ticketId,
      ticketLabel: `Ticket ${ticketLabel(t.queueNumber, t.ticketCode)}`,
      patientName: t.patientName,
      stationLabel: stationLabel(t.station),
      assignedPersonnel: t.assignedPersonnel || stationLabel(t.station),
      servedAt: t.updatedAt,
    }))
}

/** Nurse Recently Served — completed consultation requests from today (Manila). */
export async function getRecentlyServedFromConsultationRequests(
  limit = 8
): Promise<RecentlyServedItem[]> {
  const supabase = await createClient()
  const { startIso, endIso } = manilaDayBounds()

  const { data, error } = await supabase
    .from("consultation_requests")
    .select(
      "id, patient_name, student_id, service, assigned_nurse_name, assigned_doctor_name, updated_at, status"
    )
    .eq("status", "completed")
    .gte("updated_at", startIso)
    .lte("updated_at", endIso)
    .order("updated_at", { ascending: false })
    .limit(limit)

  if (error) return []

  return (data ?? []).map((row) => {
    const service = (row.service as string | null)?.trim() || "Consultation"
    const nurse = (row.assigned_nurse_name as string | null)?.trim()
    const doctor = (row.assigned_doctor_name as string | null)?.trim()
    return {
      ticketId: row.id as string,
      ticketLabel: service,
      patientName: (row.patient_name as string) || "Patient",
      stationLabel: service,
      assignedPersonnel: doctor || nurse || "Clinic",
      servedAt: (row.updated_at as string | null) ?? null,
    }
  })
}

/** Merge ticket completions with request completions; prefer newer timestamps. */
export async function getNurseRecentlyServed(
  limit = 8,
  tickets?: QueueTicketRow[]
): Promise<RecentlyServedItem[]> {
  const [fromTickets, fromRequests] = await Promise.all([
    getRecentlyServed(limit, tickets),
    getRecentlyServedFromConsultationRequests(limit),
  ])

  const seen = new Set<string>()
  const merged: RecentlyServedItem[] = []

  const keyed = [...fromRequests, ...fromTickets].sort((a, b) =>
    (b.servedAt ?? "").localeCompare(a.servedAt ?? "")
  )

  for (const item of keyed) {
    const key = `${item.patientName.trim().toLowerCase()}|${(item.servedAt ?? "").slice(0, 16)}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
    if (merged.length >= limit) break
  }

  return merged
}

export async function getQueueActivity(
  limit = 8,
  tickets?: QueueTicketRow[]
): Promise<ActivityItem[]> {
  const all = tickets ?? (await fetchJoinedTickets())
  return all
    .slice()
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, limit)
    .map((t) => ({
      id: t.ticketId,
      title: t.patientName || t.campusId || "Patient",
      description: `${ticketLabel(t.queueNumber, t.ticketCode)} · ${stationLabel(t.station)}`,
      statusLabel: t.status,
      at: t.updatedAt ?? t.createdAt ?? new Date().toISOString(),
    }))
}

/** Public display uses the SQL view (anon-readable). */
export async function getPublicQueueSnapshot(): Promise<{
  tickets: QueueTicketRow[]
  boards: StationBoard[]
  recentlyServed: RecentlyServedItem[]
  totalWaiting: number
  clinicBreak: BreakStatus
}> {
  const supabase = await createClient()
  const clinicBreakPromise = getClinicBreakStatus(supabase)

  const { data, error } = await supabase
    .from("public_queue_display")
    .select("*")
    .order("queue_number", { ascending: true })

  if (error) {
    const [boards, clinicBreak] = await Promise.all([
      getStationBoards([]),
      clinicBreakPromise,
    ])
    return {
      tickets: [] as QueueTicketRow[],
      boards,
      recentlyServed: [] as RecentlyServedItem[],
      totalWaiting: 0,
      clinicBreak,
    }
  }

  type ViewRow = {
    ticket_id: string
    queue_number: number | null
    ticket_code: string
    ticket_status: string
    estimated_wait_minutes: number | null
    ticket_updated_at: string | null
    patient_display_name: string | null
    station: string | null
    assigned_personnel: string | null
    provider_queue: string | null
    workflow_status: string | null
    consultation_type: string | null
  }

  const rows = (data ?? []) as ViewRow[]
  const tickets: QueueTicketRow[] = rows.map((r) =>
    mapTicketRow(
      {
        id: r.ticket_id,
        ticket_code: r.ticket_code,
        queue_position: r.queue_number ?? 0,
        queue_number: r.queue_number,
        status: r.ticket_status,
        estimated_wait_minutes: r.estimated_wait_minutes,
        checked_in_at: null,
        updated_at: r.ticket_updated_at,
        created_at: r.ticket_updated_at,
        appointment_id: null,
        health_appointment_id: null,
        patient_id: null,
        station: r.station,
        call_count: 0,
        rejoin_count: 0,
        patient_name: null,
        campus_id: r.patient_display_name,
        consultation_type: r.consultation_type,
        assigned_staff_name: r.assigned_personnel,
        chief_complaint: null,
        vitals_bp_systolic: null,
        vitals_bp_diastolic: null,
        vitals_heart_rate: null,
        vitals_temperature_c: null,
        vitals_spo2: null,
        intake_notes: null,
        intake_completed_at: null,
      },
      { publicMode: true }
    )
  )

  const [boards, clinicBreak] = await Promise.all([
    getStationBoards(tickets),
    clinicBreakPromise,
  ])

  return {
    tickets,
    boards,
    recentlyServed: await getRecentlyServed(8, tickets),
    totalWaiting: tickets.filter((t) => t.status === "waiting").length,
    clinicBreak,
  }
}
