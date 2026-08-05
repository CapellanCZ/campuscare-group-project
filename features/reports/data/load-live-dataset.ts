import "server-only"

import type {
  SeedCertRow,
  SeedConsultRow,
  SeedQueueDay,
  SeedRequestRow,
  ReportsDataset,
} from "@/features/reports/data/datasets"
import { createClient } from "@/lib/supabase/server"
import { manilaDayBounds } from "@/lib/health/time"

export type { ReportsDataset }

export type ReportsLiveMetrics = {
  completedToday: number
  walkIns: number
  avgWait: number
  pendingRequests: number
  certsToday: number
}

function manilaYmd(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function monthPeriod(ymd: string): string {
  return ymd.slice(0, 7)
}

function stationOf(
  value: string | null | undefined
): "nurse" | "physician" | "dentist" {
  const v = (value ?? "").toLowerCase()
  if (v === "dentist" || v.includes("dental")) return "dentist"
  if (v === "nurse") return "nurse"
  return "physician"
}

function consultationTypeOf(
  station: string | null | undefined,
  service?: string | null
): "medical" | "dental" {
  const hay = `${station ?? ""} ${service ?? ""}`.toLowerCase()
  return hay.includes("dent") ? "dental" : "medical"
}

function patientTypeOf(
  value: string | null | undefined
): "student" | "faculty" {
  return value === "faculty" ? "faculty" : "student"
}

function titleStatus(status: string): string {
  const trimmed = status.trim()
  if (!trimmed) return "Unknown"
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

function certDisplayStatus(status: string): string {
  const lower = status.toLowerCase()
  if (lower === "issued" || lower === "printed") return "Issued"
  if (lower === "pending") return "Pending"
  if (lower === "draft") return "Draft"
  return titleStatus(status)
}

function peakHourFrom(isos: string[]): string {
  if (!isos.length) return "—"
  const hours = new Map<number, number>()
  for (const iso of isos) {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) continue
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        hour12: false,
      }).format(date)
    )
    hours.set(hour, (hours.get(hour) ?? 0) + 1)
  }
  let bestHour = 0
  let bestCount = 0
  for (const [hour, count] of hours) {
    if (count > bestCount) {
      bestHour = hour
      bestCount = count
    }
  }
  return `${String(bestHour).padStart(2, "0")}:00`
}

function isMissingRelation(error: { message: string } | null) {
  if (!error) return false
  const message = error.message.toLowerCase()
  return (
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("could not find the relationship")
  )
}

export async function loadLiveReportsDataset(): Promise<{
  dataset: ReportsDataset
  live: ReportsLiveMetrics
}> {
  const supabase = await createClient()
  const today = manilaDayBounds()

  const [
    consultationsResult,
    certificatesResult,
    ticketsResult,
    healthAppointmentsResult,
    appointmentsResult,
  ] = await Promise.all([
    supabase
      .from("consultations")
      .select(
        `
        id,
        chief_complaint,
        diagnosis,
        provider_name,
        station,
        status,
        consultation_date,
        follow_up_date,
        notes,
        patient_records (
          patient_type,
          first_name,
          last_name,
          student_id,
          employee_id
        )
      `
      )
      .order("consultation_date", { ascending: false })
      .limit(2000),
    supabase
      .from("medical_certificates")
      .select(
        `
        id,
        certificate_type,
        doctor_name,
        status,
        issued_at,
        created_at,
        patients (
          full_name,
          student_id
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("health_queue_tickets")
      .select(
        `
        id,
        status,
        estimated_wait_minutes,
        created_at,
        appointment_id,
        health_appointment_id
      `
      )
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase
      .from("health_appointments")
      .select(
        `
        id,
        student_id,
        purpose,
        consultation_type,
        service,
        doctor,
        status,
        workflow_status,
        appointment_date,
        appointment_time,
        created_at,
        notes
      `
      )
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("appointments")
      .select(
        `
        id,
        title,
        date_scheduled,
        time_scheduled,
        advisor_name,
        status,
        created_at,
        user_id
      `
      )
      .order("created_at", { ascending: false })
      .limit(2000),
  ])

  if (
    consultationsResult.error &&
    !isMissingRelation(consultationsResult.error)
  ) {
    throw new Error(consultationsResult.error.message)
  }
  if (
    certificatesResult.error &&
    !isMissingRelation(certificatesResult.error)
  ) {
    throw new Error(certificatesResult.error.message)
  }
  if (ticketsResult.error && !isMissingRelation(ticketsResult.error)) {
    throw new Error(ticketsResult.error.message)
  }
  if (
    healthAppointmentsResult.error &&
    !isMissingRelation(healthAppointmentsResult.error)
  ) {
    throw new Error(healthAppointmentsResult.error.message)
  }
  if (
    appointmentsResult.error &&
    !isMissingRelation(appointmentsResult.error)
  ) {
    throw new Error(appointmentsResult.error.message)
  }

  const healthAppointments = healthAppointmentsResult.data ?? []
  const legacyAppointments = appointmentsResult.data ?? []

  const appointmentsById = new Map<
    string,
    {
      consultation_type?: string | null
      service?: string | null
      notes?: string | null
      purpose?: string | null
    }
  >()

  for (const row of healthAppointments) {
    appointmentsById.set(row.id as string, {
      consultation_type: row.consultation_type as string | null,
      service: row.service as string | null,
      notes: row.notes as string | null,
      purpose: row.purpose as string | null,
    })
  }
  for (const row of legacyAppointments) {
    if (!appointmentsById.has(row.id as string)) {
      appointmentsById.set(row.id as string, {
        consultation_type: null,
        service: (row.title as string | null) ?? null,
        notes: null,
        purpose: (row.title as string | null) ?? null,
      })
    }
  }

  const requestsFromHealth: SeedRequestRow[] = healthAppointments.map((row) => {
    const submittedAt = manilaYmd(row.created_at as string)
    const preferredDate =
      (row.appointment_date as string | null) ||
      manilaYmd(row.created_at as string)
    const workflow = ((row.workflow_status as string | null) ?? "").toLowerCase()
    const statusRaw = ((row.status as string | null) ?? "").toLowerCase()
    let status = "Pending"
    if (
      statusRaw.includes("cancel") ||
      workflow.includes("cancel") ||
      workflow.includes("declin")
    ) {
      status = "Declined"
    } else if (
      statusRaw.includes("complete") ||
      workflow.includes("complete") ||
      workflow.includes("done")
    ) {
      status = "Approved"
    } else if (workflow.includes("resched")) {
      status = "Rescheduled"
    } else if (statusRaw.includes("confirm") || workflow.includes("queue")) {
      status = "Approved"
    }

    return {
      id: row.id as string,
      submittedAt,
      patientName: (row.student_id as string | null) || "Walk-in",
      campusId: (row.student_id as string | null) || "—",
      patientType: "student" as const,
      service:
        (row.service as string | null) ||
        (row.consultation_type as string | null) ||
        (row.purpose as string | null) ||
        "Consultation",
      preferredDate,
      status,
      assignedPersonnel: (row.doctor as string | null) || "Unassigned",
    }
  })

  const requestsFromLegacy: SeedRequestRow[] = legacyAppointments.map((row) => {
    const submittedAt = manilaYmd(row.created_at as string)
    const preferredDate =
      (row.date_scheduled as string | null) || submittedAt
    const statusRaw = ((row.status as string | null) ?? "").toLowerCase()
    let status = "Pending"
    if (statusRaw.includes("cancel")) status = "Declined"
    else if (statusRaw.includes("complete")) status = "Approved"
    else if (statusRaw.includes("confirm") || statusRaw.includes("upcoming")) {
      status = "Approved"
    }

    return {
      id: `legacy-${row.id as string}`,
      submittedAt,
      patientName: (row.title as string | null) || "Patient",
      campusId: "—",
      patientType: "student" as const,
      service: (row.title as string | null) || "Consultation",
      preferredDate,
      status,
      assignedPersonnel: (row.advisor_name as string | null) || "Unassigned",
    }
  })

  const requests: SeedRequestRow[] =
    requestsFromHealth.length > 0 ? requestsFromHealth : requestsFromLegacy

  const consults: SeedConsultRow[] = (consultationsResult.data ?? []).map(
    (row) => {
      const patientJoin = Array.isArray(row.patient_records)
        ? row.patient_records[0]
        : row.patient_records
      const patientType = patientTypeOf(
        (patientJoin?.patient_type as string | null) ?? null
      )
      const campusId =
        patientType === "faculty"
          ? ((patientJoin?.employee_id as string | null) ??
            (patientJoin?.student_id as string | null) ??
            "—")
          : ((patientJoin?.student_id as string | null) ?? "—")
      const firstName = (patientJoin?.first_name as string | null) ?? ""
      const lastName = (patientJoin?.last_name as string | null) ?? ""
      const patientName =
        [firstName, lastName].filter(Boolean).join(" ") || "Unknown patient"
      const date = manilaYmd(row.consultation_date as string)
      const station = stationOf(row.station as string | null)
      const consultationType = consultationTypeOf(row.station as string | null)
      const notes = ((row.notes as string | null) ?? "").toLowerCase()
      return {
        id: row.id as string,
        date,
        period: monthPeriod(date),
        patientName,
        campusId,
        patientType,
        consultationType,
        service:
          consultationType === "dental"
            ? "Dental consultation"
            : "General consultation",
        complaint: (row.chief_complaint as string | null) || "—",
        diagnosis: (row.diagnosis as string | null) || "—",
        station,
        assignedPersonnel: (row.provider_name as string | null) || "Unassigned",
        status: titleStatus((row.status as string) || "Unknown"),
        waitMinutes: 0,
        walkIn: notes.includes("walk"),
        followUpDate: (row.follow_up_date as string | null) ?? null,
      }
    }
  )

  const certs: SeedCertRow[] = (certificatesResult.data ?? []).map((row) => {
    const patientJoin = Array.isArray(row.patients)
      ? row.patients[0]
      : row.patients
    const certificateType = (row.certificate_type as string) || "Certificate"
    const consultationType = consultationTypeOf(null, certificateType)
    const date = manilaYmd(
      (row.issued_at as string | null) ?? (row.created_at as string)
    )
    return {
      id: row.id as string,
      date,
      patientName: (patientJoin?.full_name as string | null) || "Unknown patient",
      campusId: (patientJoin?.student_id as string | null) || "—",
      patientType: "student",
      consultationType,
      certificateType,
      doctorName: (row.doctor_name as string | null) || "Unassigned",
      status: certDisplayStatus((row.status as string) || "draft"),
    }
  })

  const tickets = ticketsResult.data ?? []
  const queueBuckets = new Map<
    string,
    {
      id: string
      date: string
      station: "nurse" | "physician" | "dentist"
      waiting: number
      served: number
      waits: number[]
      walkIns: number
      createdAtList: string[]
    }
  >()

  for (const ticket of tickets) {
    const createdAt = ticket.created_at as string
    const date = manilaYmd(createdAt)
    const appointmentId =
      (ticket.health_appointment_id as string | null) ??
      (ticket.appointment_id as string | null)
    const appointment = appointmentId
      ? appointmentsById.get(appointmentId)
      : null
    const station = stationOf(
      (appointment?.consultation_type as string | null) ??
        (appointment?.service as string | null) ??
        "nurse"
    )
    const key = `${date}:${station}`
    const mutable = queueBuckets.get(key) ?? {
      id: key,
      date,
      station,
      waiting: 0,
      served: 0,
      waits: [] as number[],
      walkIns: 0,
      createdAtList: [] as string[],
    }

    const status = ((ticket.status as string) || "").toLowerCase()
    if (status === "waiting" || status === "called" || status === "ongoing") mutable.waiting += 1
    if (status === "completed") mutable.served += 1
    const wait = ticket.estimated_wait_minutes as number | null
    if (typeof wait === "number" && Number.isFinite(wait)) {
      mutable.waits.push(wait)
    }
    const haystack = [
      appointment?.consultation_type ?? "",
      appointment?.service ?? "",
      appointment?.notes ?? "",
      appointment?.purpose ?? "",
    ]
      .join(" ")
      .toLowerCase()
    if (haystack.includes("walk")) mutable.walkIns += 1
    mutable.createdAtList.push(createdAt)
    queueBuckets.set(key, mutable)
  }

  // Attach wait minutes onto consults by nearest same-day average when available.
  const waitByDate = new Map<string, number[]>()
  for (const bucket of queueBuckets.values()) {
    const list = waitByDate.get(bucket.date) ?? []
    list.push(...bucket.waits)
    waitByDate.set(bucket.date, list)
  }
  for (const consult of consults) {
    const waits = waitByDate.get(consult.date) ?? []
    if (waits.length) {
      consult.waitMinutes = Math.round(
        waits.reduce((sum, value) => sum + value, 0) / waits.length
      )
    }
  }

  const queueDays: SeedQueueDay[] = [...queueBuckets.values()]
    .map((bucket) => ({
      id: bucket.id,
      date: bucket.date,
      station: bucket.station,
      waiting: bucket.waiting,
      served: bucket.served,
      avgWaitMinutes: bucket.waits.length
        ? Math.round(
            bucket.waits.reduce((sum, value) => sum + value, 0) /
              bucket.waits.length
          )
        : 0,
      walkIns: bucket.walkIns,
      peakHour: peakHourFrom(bucket.createdAtList),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))

  const todayYmd = today.ymd
  const completedToday = consults.filter(
    (c) => c.date === todayYmd && c.status.toLowerCase() === "completed"
  ).length
  const walkInsToday = queueDays
    .filter((q) => q.date === todayYmd)
    .reduce((sum, q) => sum + q.walkIns, 0)
  const waitsToday = tickets
    .filter((t) => manilaYmd(t.created_at as string) === todayYmd)
    .map((t) => t.estimated_wait_minutes as number | null)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
  const certsToday = certs.filter(
    (c) => c.date === todayYmd && c.status === "Issued"
  ).length
  const pendingRequests = requests.filter((r) => r.status === "Pending").length

  return {
    dataset: {
      consults,
      certs,
      requests,
      queueDays,
    },
    live: {
      completedToday,
      walkIns: walkInsToday,
      avgWait: waitsToday.length
        ? Math.round(
            waitsToday.reduce((sum, value) => sum + value, 0) / waitsToday.length
          )
        : 0,
      pendingRequests,
      certsToday,
    },
  }
}
