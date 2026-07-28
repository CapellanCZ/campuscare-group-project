import type { ClinicDesignation } from "@/lib/auth/types"
import {
  canMutateQueue,
  canRegisterWalkIn,
  canTransferQueue,
  canVerifyCheckIn,
  isReadOnlyQueue,
  stationForDesignation,
} from "@/lib/health/roles"
import type { HealthActionResult, StationId } from "@/lib/health/types"
import { createClient } from "@/lib/supabase/server"

async function requireMutable(designation: ClinicDesignation) {
  if (isReadOnlyQueue(designation) || !canMutateQueue(designation)) {
    return "You do not have permission to change the queue." as const
  }
  return null
}

export async function callNextTicket(params: {
  designation: ClinicDesignation
  station?: StationId
  staffName: string
}): Promise<HealthActionResult> {
  const denied = await requireMutable(params.designation)
  if (denied) return { ok: false, error: denied }

  const supabase = await createClient()
  const station =
    params.station ?? stationForDesignation(params.designation) ?? "nurse"

  const { data: waiting } = await supabase
    .from("health_queue_tickets")
    .select("id, appointment_id, health_appointment_id, status, queue_position")
    .eq("status", "waiting")
    .order("queue_position", { ascending: true })
    .limit(40)

  if (!waiting?.length) {
    return { ok: false, error: "No waiting patients in line." }
  }

  // Prefer tickets whose appointment matches station
  let chosen = waiting[0]
  for (const ticket of waiting) {
    const appointmentId = ticket.health_appointment_id ?? ticket.appointment_id
    if (!appointmentId) continue
    const { data: appt } = await supabase
      .from("health_appointments")
      .select("id, provider_queue, workflow_status")
      .eq("id", appointmentId)
      .maybeSingle()

    const pq = (appt?.provider_queue ?? "").toLowerCase()
    const wf = (appt?.workflow_status ?? "").toLowerCase()
    const isNurseStation =
      station === "nurse" &&
      (!pq || pq === "nurse" || wf.includes("nurse") || wf === "booked" || wf === "checkin_window_open" || wf === "queued_for_nurse")
    const isMatch =
      (station === "physician" && pq === "physician") ||
      (station === "dentist" && pq === "dentist") ||
      isNurseStation

    if (isMatch) {
      chosen = ticket
      break
    }
  }

  // Complete any currently called ticket at this station first is optional;
  // mark chosen as called.
  const appointmentId = chosen.health_appointment_id ?? chosen.appointment_id

  const { error: ticketErr } = await supabase
    .from("health_queue_tickets")
    .update({
      status: "called",
      updated_at: new Date().toISOString(),
    })
    .eq("id", chosen.id)

  if (ticketErr) return { ok: false, error: ticketErr.message }

  if (appointmentId) {
    await supabase
      .from("health_appointments")
      .update({
        workflow_status:
          station === "nurse" ? "queued_for_nurse" : "provider_in_progress",
        provider_queue: station === "nurse" ? null : station,
        doctor: params.staffName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
  }

  return { ok: true, message: "Next patient called." }
}

export async function startConsultation(params: {
  designation: ClinicDesignation
  ticketId: string
  staffName: string
}): Promise<HealthActionResult> {
  const denied = await requireMutable(params.designation)
  if (denied) return { ok: false, error: denied }

  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id, appointment_id, health_appointment_id, status")
    .eq("id", params.ticketId)
    .maybeSingle()

  if (!ticket) return { ok: false, error: "Ticket not found." }

  const appointmentId = ticket.health_appointment_id ?? ticket.appointment_id
  if (ticket.status !== "called") {
    await supabase
      .from("health_queue_tickets")
      .update({ status: "called", updated_at: new Date().toISOString() })
      .eq("id", ticket.id)
  }

  if (appointmentId) {
    const station = stationForDesignation(params.designation) ?? "physician"

    const { data: appt } = await supabase
      .from("health_appointments")
      .select("student_id, purpose, service")
      .eq("id", appointmentId)
      .maybeSingle()

    await supabase
      .from("health_appointments")
      .update({
        consultation_started_at: new Date().toISOString(),
        workflow_status: "provider_in_progress",
        provider_queue: station === "nurse" ? "physician" : station,
        doctor: params.staffName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)

    try {
      const { ensureConsultationForAppointment } = await import(
        "@/services/consultations"
      )
      await ensureConsultationForAppointment({
        appointmentId,
        studentId: appt?.student_id ?? null,
        station: station === "nurse" ? "nurse" : station,
        chiefComplaint: appt?.purpose ?? appt?.service ?? null,
        providerName: params.staffName,
      })
    } catch {
      // Consultation table may not be provisioned yet.
    }
  }

  return { ok: true, message: "Consultation started." }
}

export async function completeTicket(params: {
  designation: ClinicDesignation
  ticketId: string
}): Promise<HealthActionResult> {
  const denied = await requireMutable(params.designation)
  if (denied) return { ok: false, error: denied }

  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id, appointment_id, health_appointment_id")
    .eq("id", params.ticketId)
    .maybeSingle()

  if (!ticket) return { ok: false, error: "Ticket not found." }

  const { error } = await supabase
    .from("health_queue_tickets")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticket.id)

  if (error) return { ok: false, error: error.message }

  const appointmentId = ticket.health_appointment_id ?? ticket.appointment_id
  if (appointmentId) {
    await supabase
      .from("health_appointments")
      .update({
        status: "completed",
        workflow_status: "completed",
        consultation_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
  }

  return { ok: true, message: "Patient marked complete." }
}

export async function skipOrNoShow(params: {
  designation: ClinicDesignation
  ticketId: string
  reason: "skip" | "no_show"
}): Promise<HealthActionResult> {
  const denied = await requireMutable(params.designation)
  if (denied) return { ok: false, error: denied }

  const supabase = await createClient()
  const { error } = await supabase
    .from("health_queue_tickets")
    .update({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.ticketId)

  if (error) return { ok: false, error: error.message }
  return {
    ok: true,
    message: params.reason === "no_show" ? "Marked no-show." : "Patient skipped.",
  }
}

export async function verifyCheckIn(params: {
  designation: ClinicDesignation
  ticketId: string
}): Promise<HealthActionResult> {
  if (!canVerifyCheckIn(params.designation)) {
    return { ok: false, error: "Only nurses can verify check-in." }
  }

  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id, appointment_id, health_appointment_id")
    .eq("id", params.ticketId)
    .maybeSingle()

  if (!ticket) return { ok: false, error: "Ticket not found." }

  await supabase
    .from("health_queue_tickets")
    .update({
      checked_in_at: now,
      status: "waiting",
      updated_at: now,
    })
    .eq("id", ticket.id)

  const appointmentId = ticket.health_appointment_id ?? ticket.appointment_id
  if (appointmentId) {
    await supabase
      .from("health_appointments")
      .update({
        checked_in_at: now,
        workflow_status: "queued_for_nurse",
        updated_at: now,
      })
      .eq("id", appointmentId)
  }

  return { ok: true, message: "Check-in verified." }
}

export async function transferTicket(params: {
  designation: ClinicDesignation
  ticketId: string
  toStation: StationId
}): Promise<HealthActionResult> {
  if (!canTransferQueue(params.designation)) {
    return { ok: false, error: "Only nurses can transfer queues." }
  }

  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id, appointment_id, health_appointment_id")
    .eq("id", params.ticketId)
    .maybeSingle()

  if (!ticket) return { ok: false, error: "Ticket not found." }

  const appointmentId = ticket.health_appointment_id ?? ticket.appointment_id
  if (!appointmentId) {
    return { ok: false, error: "Ticket has no appointment to transfer." }
  }

  const { error } = await supabase
    .from("health_appointments")
    .update({
      provider_queue: params.toStation === "nurse" ? null : params.toStation,
      workflow_status:
        params.toStation === "nurse" ? "queued_for_nurse" : "provider_in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)

  if (error) return { ok: false, error: error.message }

  await supabase
    .from("health_queue_tickets")
    .update({ status: "waiting", updated_at: new Date().toISOString() })
    .eq("id", ticket.id)

  return { ok: true, message: `Transferred to ${params.toStation}.` }
}

export async function registerWalkIn(params: {
  designation: ClinicDesignation
  patientName: string
  studentId?: string
  consultationType: string
  providerQueue: StationId
  staffName: string
}): Promise<HealthActionResult> {
  if (!canRegisterWalkIn(params.designation)) {
    return { ok: false, error: "Only nurses can register walk-ins." }
  }

  const name = params.patientName.trim()
  if (!name) return { ok: false, error: "Enter a patient name." }

  const supabase = await createClient()
  const { ymd } = await import("@/lib/health/time").then((m) => ({
    ymd: m.manilaDayBounds().ymd,
  }))

  let studentId = params.studentId?.trim() || ""
  if (!studentId) {
    // Prefer matching by name; otherwise use a walk-in placeholder id
    const [first, ...rest] = name.split(/\s+/)
    const last = rest.join(" ")
    if (first) {
      const { data: match } = await supabase
        .from("students")
        .select("student_id")
        .ilike("first_name", first)
        .limit(1)
        .maybeSingle()
      studentId = match?.student_id ?? `WALK-IN-${Date.now()}`
      if (!match && last) {
        // keep placeholder
      }
    } else {
      studentId = `WALK-IN-${Date.now()}`
    }
  }

  const { data: appointment, error: apptErr } = await supabase
    .from("health_appointments")
    .insert({
      student_id: studentId,
      appointment_date: ymd,
      appointment_time: new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Manila",
      }),
      status: "confirmed",
      purpose: params.consultationType || "Walk-in consultation",
      consultation_type: params.consultationType || "Walk-in",
      service: params.consultationType || "Walk-in",
      workflow_status:
        params.providerQueue === "nurse" ? "queued_for_nurse" : "provider_in_progress",
      provider_queue:
        params.providerQueue === "nurse" ? null : params.providerQueue,
      doctor: params.staffName,
      checked_in_at: new Date().toISOString(),
      notes: `Walk-in: ${name}`,
    })
    .select("id")
    .single()

  if (apptErr || !appointment) {
    return {
      ok: false,
      error: apptErr?.message ?? "Could not create walk-in appointment.",
    }
  }

  const { data: posRows } = await supabase
    .from("health_queue_tickets")
    .select("queue_position, queue_number")
    .in("status", ["waiting", "called"])

  const nextPos =
    Math.max(0, ...(posRows ?? []).map((r) => r.queue_position ?? 0)) + 1
  const nextNum =
    Math.max(0, ...(posRows ?? []).map((r) => r.queue_number ?? 0)) + 1

  const ticketCode = `WI-${String(nextNum).padStart(4, "0")}`

  const { error: ticketErr } = await supabase.from("health_queue_tickets").insert({
    appointment_id: appointment.id,
    health_appointment_id: appointment.id,
    ticket_code: ticketCode,
    queue_position: nextPos,
    queue_number: nextNum,
    estimated_wait_minutes: nextPos * 10,
    status: "waiting",
    checked_in_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  })

  if (ticketErr) {
    return { ok: false, error: ticketErr.message }
  }

  return { ok: true, message: `Walk-in registered as ${ticketCode}.` }
}

export async function assignQueueNumber(params: {
  designation: ClinicDesignation
  ticketId: string
  queueNumber: number
}): Promise<HealthActionResult> {
  if (!canVerifyCheckIn(params.designation)) {
    return { ok: false, error: "Only nurses can assign queue numbers." }
  }
  if (!Number.isFinite(params.queueNumber) || params.queueNumber < 1) {
    return { ok: false, error: "Enter a valid queue number." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("health_queue_tickets")
    .update({
      queue_number: params.queueNumber,
      queue_position: params.queueNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.ticketId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, message: "Queue number assigned." }
}
