export type TicketStatus = "waiting" | "called" | "completed" | "expired"

export type StationId = "nurse" | "physician" | "dentist"

export type QueueTicketRow = {
  ticketId: string
  appointmentId: string | null
  ticketCode: string
  queueNumber: number | null
  queuePosition: number
  status: TicketStatus
  estimatedWaitMinutes: number | null
  checkedInAt: string | null
  updatedAt: string | null
  createdAt: string | null
  patientName: string
  studentId: string | null
  consultationType: string | null
  service: string | null
  providerQueue: StationId | null
  workflowStatus: string | null
  assignedPersonnel: string | null
  station: StationId
  priority: "normal" | "urgent"
}

export type QueueStats = {
  totalWaiting: number
  currentlyServing: number
  completedToday: number
  checkedIn: number
  walkIns: number
  averageWaitMinutes: number
}

export type StationBoard = {
  station: StationId
  label: string
  status: "active" | "idle"
  waitingCount: number
  averageWaitMinutes: number
  nowServing: string | null
  upcoming: string[]
}

export type RecentlyServedItem = {
  ticketId: string
  ticketLabel: string
  patientName: string
  stationLabel: string
  assignedPersonnel: string
  servedAt: string | null
}

export type ActivityItem = {
  id: string
  title: string
  description: string
  at: string
}

export type DashboardKpis = {
  cards: Array<{
    key: string
    label: string
    value: string
    description: string
    delta?: number
    lowerIsBetter?: boolean
  }>
}

export type HealthActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }
