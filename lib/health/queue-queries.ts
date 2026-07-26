import { createClient } from "@/lib/supabase/server"
import { mapTicketRow, ticketLabel } from "@/lib/health/mappers"
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

async function fetchJoinedTickets(): Promise<QueueTicketRow[]> {
  const supabase = await createClient()
  const { startIso } = manilaDayBounds()

  // Today’s tickets + any still-active waiting/called rows (demo data may be older).
  const { data: tickets, error } = await supabase
    .from("health_queue_tickets")
    .select(
      "id, ticket_code, queue_position, queue_number, status, estimated_wait_minutes, checked_in_at, updated_at, created_at, appointment_id, health_appointment_id"
    )
    .or(`created_at.gte.${startIso},status.in.(waiting,called)`)
    .order("queue_position", { ascending: true })

  if (error) {
    // Queue tables may not be provisioned yet on this project.
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

  const rows = tickets ?? []
  const appointmentIds = [
    ...new Set(
      rows
        .map((t) => t.health_appointment_id ?? t.appointment_id)
        .filter(Boolean) as string[]
    ),
  ]

  const appointmentsById = new Map<
    string,
    {
      id: string
      student_id: string | null
      workflow_status: string | null
      provider_queue: string | null
      consultation_type: string | null
      service: string | null
      doctor: string | null
      purpose: string | null
      status: string | null
      consultation_completed_at: string | null
    }
  >()

  if (appointmentIds.length) {
    const { data: appointments } = await supabase
      .from("health_appointments")
      .select(
        "id, student_id, workflow_status, provider_queue, consultation_type, service, doctor, purpose, status, consultation_completed_at"
      )
      .in("id", appointmentIds)

    for (const a of appointments ?? []) {
      appointmentsById.set(a.id, a)
    }
  }

  const studentIds = [
    ...new Set(
      [...appointmentsById.values()]
        .map((a) => a.student_id)
        .filter(Boolean) as string[]
    ),
  ]

  const studentsById = new Map<
    string,
    { first_name: string | null; last_name: string | null; student_id: string }
  >()

  if (studentIds.length) {
    const { data: students } = await supabase
      .from("students")
      .select("student_id, first_name, last_name")
      .in("student_id", studentIds)

    for (const s of students ?? []) {
      studentsById.set(s.student_id, s)
    }
  }

  return rows.map((t) => {
    const appointmentId = t.health_appointment_id ?? t.appointment_id
    const appointment = appointmentId
      ? appointmentsById.get(appointmentId) ?? null
      : null
    const student = appointment?.student_id
      ? studentsById.get(appointment.student_id) ?? null
      : null

    return mapTicketRow({
      ...t,
      appointment,
      student,
    })
  })
}

export async function getTodayQueueTickets(filter?: {
  station?: StationId | null
}): Promise<QueueTicketRow[]> {
  const tickets = await fetchJoinedTickets()
  if (!filter?.station) return tickets
  return tickets.filter((t) => t.station === filter.station)
}

export function computeQueueStats(tickets: QueueTicketRow[]): QueueStats {
  const active = tickets.filter(
    (t) => t.status === "waiting" || t.status === "called"
  )
  const waiting = tickets.filter((t) => t.status === "waiting")
  const serving = tickets.filter((t) => t.status === "called")
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
    walkIns: walkIns.length || Math.max(0, active.length - checkedIn.length),
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

  return stations.map((station) => {
    const scoped = all.filter((t) => t.station === station)
    const waiting = scoped
      .filter((t) => t.status === "waiting")
      .sort((a, b) => a.queuePosition - b.queuePosition)
    const called = scoped.find((t) => t.status === "called")
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
      title: `${ticketLabel(t.queueNumber, t.ticketCode)} · ${t.status}`,
      description: `${t.patientName} · ${stationLabel(t.station)}`,
      at: t.updatedAt ?? t.createdAt ?? new Date().toISOString(),
    }))
}

/** Public display uses the SQL view (anon-readable). */
export async function getPublicQueueSnapshot() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("public_queue_display")
    .select("*")
    .order("queue_number", { ascending: true })

  if (error) {
    return {
      tickets: [] as QueueTicketRow[],
      boards: await getStationBoards([]),
      recentlyServed: [] as RecentlyServedItem[],
      totalWaiting: 0,
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
    consultation_completed_at: string | null
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
        appointment: {
          id: "",
          student_id: null,
          workflow_status: r.workflow_status,
          provider_queue: r.provider_queue ?? r.station,
          consultation_type: null,
          service: null,
          doctor: r.assigned_personnel,
          purpose: null,
          status: null,
        },
        student: {
          first_name: r.patient_display_name,
          last_name: null,
          student_id: null,
        },
      },
      { publicMode: true }
    )
  )

  return {
    tickets,
    boards: await getStationBoards(tickets),
    recentlyServed: await getRecentlyServed(8, tickets),
    totalWaiting: tickets.filter((t) => t.status === "waiting").length,
  }
}
