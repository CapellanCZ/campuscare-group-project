export type TicketStatus =
  | "waiting"
  | "called"
  | "ongoing"
  | "completed"
  | "expired"
  | "no_show"

export type StationId = "nurse" | "physician" | "dentist"

export type SpecialtyStationId = Exclude<StationId, "nurse">

export type PatientType = "student" | "faculty" | "employee" | "visitor"

export type QueueVitals = {
  bpSystolic: number | null
  bpDiastolic: number | null
  heartRate: number | null
  temperatureC: number | null
  spo2: number | null
  heightCm: number | null
  weightKg: number | null
  respiratoryRate: number | null
}

export type PatientVitalsRecord = {
  ticketId: string
  recordedAt: string
  ticketCode: string
  queueNumber: number | null
  vitals: QueueVitals
  chiefComplaint: string | null
}

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
  patientId: string | null
  patientName: string
  patientType: PatientType | null
  studentId: string | null
  campusId: string | null
  consultationType: string | null
  service: string | null
  providerQueue: StationId | null
  workflowStatus: string | null
  assignedPersonnel: string | null
  station: StationId
  callCount: number
  rejoinCount: number
  canRejoin: boolean
  intakeCompletedAt: string | null
  chiefComplaint: string | null
  vitals: QueueVitals
  intakeNotes: string | null
  priority: "normal" | "urgent"
  consultationRequestId: string | null
  consultationId: string | null
  providerType: SpecialtyStationId | null
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
  status: "active" | "idle" | "on_break"
  waitingCount: number
  averageWaitMinutes: number
  nowServing: string | null
  upcoming: string[]
  /** ISO resume time when status is on_break */
  resumesAt?: string | null
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
  /** Status shown beside relative time (e.g. Waiting). */
  statusLabel?: string
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
  | { ok: true; message?: string; consultationId?: string }
  | { ok: false; error: string }

export type NurseIntakeInput = {
  chiefComplaint?: string
  bpSystolic?: number | null
  bpDiastolic?: number | null
  heartRate?: number | null
  temperatureC?: number | null
  spo2?: number | null
  heightCm?: number | null
  weightKg?: number | null
  respiratoryRate?: number | null
  intakeNotes?: string
  /** Defaults from ticket.providerType when omitted. */
  toStation?: SpecialtyStationId
}
