import type { ClinicDesignation } from "@/lib/auth/types"
import { assertCanAccommodate } from "@/lib/availability/queries"
import {
  canApproveConsultationRequest,
  canMutateQueue,
  canRegisterWalkIn,
  canTransferQueue,
  canVerifyCheckIn,
  isReadOnlyQueue,
  stationForDesignation,
} from "@/lib/health/roles"
import { manilaDayBounds } from "@/lib/health/time"
import type {
  HealthActionResult,
  NurseIntakeInput,
  SpecialtyStationId,
  StationId,
} from "@/lib/health/types"
import { createClient } from "@/lib/supabase/server"
import { lookupEnrolledStudentById } from "@/lib/students/enrolled-dataset"
import { ensurePatientFromEnrollment } from "@/lib/students/ensure-patient"
import { NO_STUDENT_FOUND } from "@/lib/students/types"

async function requireMutable(designation: ClinicDesignation) {
  if (isReadOnlyQueue(designation) || !canMutateQueue(designation)) {
    return "You do not have permission to change the queue." as const
  }
  return null
}

async function nextQueueSlot(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: posRows } = await supabase
    .from("health_queue_tickets")
    .select("queue_position, queue_number")
    .in("status", ["waiting", "called"])

  const nextPos =
    Math.max(0, ...(posRows ?? []).map((r) => r.queue_position ?? 0)) + 1
  const nextNum =
    Math.max(0, ...(posRows ?? []).map((r) => r.queue_number ?? 0)) + 1

  return { nextPos, nextNum }
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
    .select("id, call_count, queue_position")
    .eq("status", "waiting")
    .eq("station", station)
    .order("queue_position", { ascending: true })
    .limit(1)

  const chosen = waiting?.[0]
  if (!chosen) {
    return { ok: false, error: `No waiting patients in the ${station} queue.` }
  }

  const nextCount = (chosen.call_count ?? 0) + 1
  const { error } = await supabase
    .from("health_queue_tickets")
    .update({
      status: "called",
      call_count: nextCount,
      assigned_staff_name: params.staffName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chosen.id)

  if (error) return { ok: false, error: error.message }

  return {
    ok: true,
    message:
      nextCount >= 2
        ? `Patient called (call ${nextCount}). Eligible for no-show if still absent.`
        : `Patient called (call ${nextCount} of 2).`,
  }
}

export async function recallTicket(params: {
  designation: ClinicDesignation
  ticketId: string
  staffName: string
}): Promise<HealthActionResult> {
  const denied = await requireMutable(params.designation)
  if (denied) return { ok: false, error: denied }

  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id, status, call_count, station")
    .eq("id", params.ticketId)
    .maybeSingle()

  if (!ticket) return { ok: false, error: "Ticket not found." }
  if (ticket.status !== "called" && ticket.status !== "waiting") {
    return { ok: false, error: "Only waiting or called tickets can be recalled." }
  }

  const nextCount = (ticket.call_count ?? 0) + 1
  const { error } = await supabase
    .from("health_queue_tickets")
    .update({
      status: "called",
      call_count: nextCount,
      assigned_staff_name: params.staffName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticket.id)

  if (error) return { ok: false, error: error.message }

  return {
    ok: true,
    message:
      nextCount >= 2
        ? `Second call placed. You can mark no-show if the patient is absent.`
        : `Call ${nextCount} of 2 placed.`,
  }
}

export async function startConsultation(params: {
  designation: ClinicDesignation
  ticketId: string
  staffName: string
}): Promise<HealthActionResult> {
  const denied = await requireMutable(params.designation)
  if (denied) return { ok: false, error: denied }

  const supabase = await createClient()
  const station = stationForDesignation(params.designation)
  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id, status, station")
    .eq("id", params.ticketId)
    .maybeSingle()

  if (!ticket) return { ok: false, error: "Ticket not found." }

  const patch: Record<string, unknown> = {
    status: params.designation === "dentist" ? "ongoing" : "called",
    assigned_staff_name: params.staffName,
    updated_at: new Date().toISOString(),
  }

  // Nurses keep the ticket at nurse while starting intake; specialty roles stay put.
  if (station && station !== "nurse") {
    patch.station = station
  }

  const { error } = await supabase
    .from("health_queue_tickets")
    .update(patch)
    .eq("id", ticket.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, message: "Consultation started." }
}

export async function completeTicket(params: {
  designation: ClinicDesignation
  ticketId: string
}): Promise<HealthActionResult> {
  const denied = await requireMutable(params.designation)
  if (denied) return { ok: false, error: denied }

  const supabase = await createClient()
  const { error } = await supabase
    .from("health_queue_tickets")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.ticketId)

  if (error) return { ok: false, error: error.message }
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

  if (params.reason === "no_show") {
    const { data: ticket } = await supabase
      .from("health_queue_tickets")
      .select("id, call_count, status")
      .eq("id", params.ticketId)
      .maybeSingle()

    if (!ticket) return { ok: false, error: "Ticket not found." }
    if ((ticket.call_count ?? 0) < 2) {
      return {
        ok: false,
        error: "Call the patient twice before marking no-show.",
      }
    }

    const { error } = await supabase
      .from("health_queue_tickets")
      .update({
        status: "no_show",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id)

    if (error) return { ok: false, error: error.message }
    return { ok: true, message: "Marked no-show." }
  }

  const { error } = await supabase
    .from("health_queue_tickets")
    .update({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.ticketId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, message: "Patient skipped." }
}

export async function rejoinQueue(params: {
  designation: ClinicDesignation
  ticketId: string
}): Promise<HealthActionResult> {
  const denied = await requireMutable(params.designation)
  if (denied) return { ok: false, error: denied }

  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id, status, rejoin_count, station, service_date")
    .eq("id", params.ticketId)
    .maybeSingle()

  if (!ticket) return { ok: false, error: "Ticket not found." }
  if (ticket.status !== "no_show") {
    return { ok: false, error: "Only no-show tickets can rejoin." }
  }
  if ((ticket.rejoin_count ?? 0) >= 1) {
    return {
      ok: false,
      error: "Already rejoined once today. Patient must re-register.",
    }
  }

  const { nextPos } = await nextQueueSlot(supabase)
  const now = new Date().toISOString()

  const { error } = await supabase
    .from("health_queue_tickets")
    .update({
      status: "waiting",
      queue_position: nextPos,
      call_count: 0,
      rejoin_count: (ticket.rejoin_count ?? 0) + 1,
      last_rejoined_at: now,
      estimated_wait_minutes: nextPos * 10,
      updated_at: now,
    })
    .eq("id", ticket.id)

  if (error) return { ok: false, error: error.message }
  return {
    ok: true,
    message: `Rejoined at the end of the ${ticket.station} queue.`,
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
  const { error } = await supabase
    .from("health_queue_tickets")
    .update({
      checked_in_at: now,
      status: "waiting",
      station: "nurse",
      updated_at: now,
    })
    .eq("id", params.ticketId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, message: "Check-in verified — patient is in the nurse queue." }
}

export async function completeNurseIntakeAndAssign(params: {
  designation: ClinicDesignation
  ticketId: string
  staffName: string
  intake: NurseIntakeInput
}): Promise<HealthActionResult> {
  if (!canTransferQueue(params.designation)) {
    return { ok: false, error: "Only nurses can complete intake and assign specialty." }
  }

  const openCheck = await assertCanAccommodate({ at: new Date() })
  if (!openCheck.ok) {
    return { ok: false, error: openCheck.error }
  }

  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id, station, status, provider_type, consultation_request_id")
    .eq("id", params.ticketId)
    .maybeSingle()

  if (!ticket) return { ok: false, error: "Ticket not found." }

  let toStation: SpecialtyStationId | null =
    params.intake.toStation === "physician" || params.intake.toStation === "dentist"
      ? params.intake.toStation
      : null

  if (!toStation) {
    if (ticket.provider_type === "physician" || ticket.provider_type === "dentist") {
      toStation = ticket.provider_type
    } else if (ticket.consultation_request_id) {
      const { data: req } = await supabase
        .from("consultation_requests")
        .select("provider_type")
        .eq("id", ticket.consultation_request_id)
        .maybeSingle()
      if (req?.provider_type === "physician" || req?.provider_type === "dentist") {
        toStation = req.provider_type
      }
    }
  }

  if (!toStation) {
    return { ok: false, error: "Assign physician or dentist only." }
  }

  const { nextPos } = await nextQueueSlot(supabase)
  const now = new Date().toISOString()

  const { error } = await supabase
    .from("health_queue_tickets")
    .update({
      station: toStation,
      status: "waiting",
      queue_position: nextPos,
      call_count: 0,
      assigned_staff_name: params.staffName,
      chief_complaint: params.intake.chiefComplaint?.trim() || null,
      vitals_bp_systolic: params.intake.bpSystolic ?? null,
      vitals_bp_diastolic: params.intake.bpDiastolic ?? null,
      vitals_heart_rate: params.intake.heartRate ?? null,
      vitals_temperature_c: params.intake.temperatureC ?? null,
      vitals_spo2: params.intake.spo2 ?? null,
      vitals_height_cm: params.intake.heightCm ?? null,
      vitals_weight_kg: params.intake.weightKg ?? null,
      vitals_respiratory_rate: params.intake.respiratoryRate ?? null,
      intake_notes: params.intake.intakeNotes?.trim() || null,
      intake_completed_at: now,
      estimated_wait_minutes: nextPos * 10,
      updated_at: now,
    })
    .eq("id", ticket.id)

  if (error) return { ok: false, error: error.message }
  return {
    ok: true,
    message: `Intake saved. Assigned to ${toStation} queue.`,
  }
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
    .select("id")
    .eq("id", params.ticketId)
    .maybeSingle()

  if (!ticket) return { ok: false, error: "Ticket not found." }

  const { nextPos } = await nextQueueSlot(supabase)
  const { error } = await supabase
    .from("health_queue_tickets")
    .update({
      station: params.toStation,
      status: "waiting",
      queue_position: nextPos,
      call_count: 0,
      estimated_wait_minutes: nextPos * 10,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticket.id)

  if (error) return { ok: false, error: error.message }
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

  const openCheck = await assertCanAccommodate({ at: new Date() })
  if (!openCheck.ok) {
    return { ok: false, error: openCheck.error }
  }

  const name = params.patientName.trim()
  if (!name) return { ok: false, error: "Enter a patient name." }

  const supabase = await createClient()
  const { ymd } = manilaDayBounds()
  const campusId = params.studentId?.trim() || null

  let patientId: string | null = null
  let resolvedName = name
  let resolvedCampusId = campusId

  if (campusId) {
    const enrolled = await lookupEnrolledStudentById(campusId)
    if (enrolled) {
      try {
        const ensured = await ensurePatientFromEnrollment(enrolled)
        patientId = ensured.operational.id
        resolvedName = ensured.operational.fullName || name
        resolvedCampusId = ensured.operational.studentId ?? campusId
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not sync enrolled student for walk-in.",
        }
      }
    } else {
      const { data: byEmployee } = await supabase
        .from("patients")
        .select("id, full_name, student_id, employee_id, patient_type")
        .eq("employee_id", campusId)
        .limit(1)
        .maybeSingle()

      if (byEmployee) {
        patientId = byEmployee.id
        resolvedName = byEmployee.full_name
        resolvedCampusId = byEmployee.employee_id
      } else {
        return { ok: false, error: NO_STUDENT_FOUND }
      }
    }
  }

  const station: StationId =
    params.providerQueue === "physician" || params.providerQueue === "dentist"
      ? params.providerQueue
      : "nurse"

  const { nextPos, nextNum } = await nextQueueSlot(supabase)
  const ticketCode = `WI-${String(nextNum).padStart(4, "0")}`
  const now = new Date().toISOString()
  const providerType: SpecialtyStationId | null =
    station === "physician" || station === "dentist" ? station : null

  const { error } = await supabase.from("health_queue_tickets").insert({
    ticket_code: ticketCode,
    queue_position: nextPos,
    queue_number: nextNum,
    estimated_wait_minutes: nextPos * 10,
    status: "waiting",
    station,
    checked_in_at: now,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    service_date: ymd,
    patient_id: patientId,
    patient_name: resolvedName,
    campus_id: resolvedCampusId,
    consultation_type: params.consultationType || "Walk-in consultation",
    assigned_staff_name: params.staffName,
    provider_type: providerType,
  })

  if (error) return { ok: false, error: error.message }
  return {
    ok: true,
    message: `Walk-in registered as ${ticketCode} in the ${station} queue.`,
  }
}

function suggestedSpecialtyFromService(service: string): SpecialtyStationId {
  const s = service.toLowerCase()
  if (s.includes("dental") || s.includes("tooth") || s.includes("dentist")) {
    return "dentist"
  }
  return "physician"
}

export async function releaseConsultationReservation(params: {
  requestId: string
  ticketId?: string | null
}): Promise<HealthActionResult> {
  const supabase = await createClient()
  const ticketId = params.ticketId
  if (!ticketId) {
    const { data: req } = await supabase
      .from("consultation_requests")
      .select("queue_ticket_id")
      .eq("id", params.requestId)
      .maybeSingle()
    if (!req?.queue_ticket_id) return { ok: true, message: "No reservation to release." }
    return releaseConsultationReservation({
      requestId: params.requestId,
      ticketId: req.queue_ticket_id as string,
    })
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("health_queue_tickets")
    .update({
      status: "expired",
      updated_at: now,
    })
    .eq("id", ticketId)

  if (error) return { ok: false, error: error.message }

  await supabase
    .from("consultation_requests")
    .update({
      queue_ticket_id: null,
      queue_number: null,
      updated_at: now,
    })
    .eq("id", params.requestId)

  return { ok: true, message: "Reservation released." }
}

/**
 * Nurse approves a consultation request that already holds a reserved queue
 * number from patient submit. Does not create a second ticket.
 */
export async function approveConsultationRequest(params: {
  designation: ClinicDesignation
  requestId: string
  patientName: string
  studentId?: string
  service: string
  reason?: string
  staffName: string
}): Promise<
  HealthActionResult & {
    ticketCode?: string
    suggestedSpecialty?: SpecialtyStationId
    queueNumber?: number | null
  }
> {
  if (!canApproveConsultationRequest(params.designation)) {
    return { ok: false, error: "Only nurses can approve consultation requests." }
  }

  const supabase = await createClient()
  const { data: request } = await supabase
    .from("consultation_requests")
    .select(
      "id, status, queue_ticket_id, queue_number, provider_type, service, preferred_date"
    )
    .eq("id", params.requestId)
    .maybeSingle()

  if (!request) return { ok: false, error: "Consultation request not found." }
  if (request.status === "waitlisted") {
    return {
      ok: false,
      error: "This request is waitlisted. Use Admit to place it in the queue.",
    }
  }

  const suggestedSpecialty: SpecialtyStationId =
    request.provider_type === "dentist" || request.provider_type === "physician"
      ? request.provider_type
      : suggestedSpecialtyFromService(params.service)

  if (!request.queue_ticket_id) {
    return {
      ok: false,
      error:
        "No reserved queue number on this request. Ask the patient to resubmit or use Admit.",
    }
  }

  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id, ticket_code, queue_number, status")
    .eq("id", request.queue_ticket_id)
    .maybeSingle()

  if (!ticket) {
    return { ok: false, error: "Reserved queue ticket is missing." }
  }

  const now = new Date().toISOString()
  await supabase
    .from("health_queue_tickets")
    .update({
      assigned_staff_name: params.staffName,
      intake_notes: `Approved request ${params.requestId}. Specialty: ${suggestedSpecialty}.`,
      status: ticket.status === "expired" ? "waiting" : ticket.status,
      updated_at: now,
    })
    .eq("id", ticket.id)

  return {
    ok: true,
    ticketCode: ticket.ticket_code as string,
    suggestedSpecialty,
    queueNumber: (ticket.queue_number as number | null) ?? request.queue_number,
    message: `Request approved. Reserved queue #${ticket.queue_number ?? request.queue_number} kept (${ticket.ticket_code}).`,
  }
}

/**
 * Nurse admits a waitlisted request into the daily queue (may exceed soft cap).
 */
export async function admitWaitlistedConsultationRequest(params: {
  designation: ClinicDesignation
  requestId: string
  staffName: string
  force?: boolean
}): Promise<
  HealthActionResult & { ticketCode?: string; queueNumber?: number }
> {
  if (!canApproveConsultationRequest(params.designation)) {
    return { ok: false, error: "Only nurses can admit waitlisted requests." }
  }

  const supabase = await createClient()
  const { data: request } = await supabase
    .from("consultation_requests")
    .select("*")
    .eq("id", params.requestId)
    .maybeSingle()

  if (!request) return { ok: false, error: "Consultation request not found." }
  if (request.status !== "waitlisted" && !params.force) {
    return { ok: false, error: "Only waitlisted requests can be admitted." }
  }

  const providerType: SpecialtyStationId =
    request.provider_type === "dentist" ? "dentist" : "physician"
  const serviceDate =
    (request.preferred_date as string | null) || manilaDayBounds().ymd

  const { nextReservedQueueNumber } = await import(
    "@/services/consultation-capacity"
  )
  const { nextNumber, used, max } = await nextReservedQueueNumber(
    providerType,
    serviceDate,
    supabase
  )

  if (used >= max && !params.force) {
    return {
      ok: false,
      error: `Daily capacity full (${used}/${max}). Retry with force to override.`,
    }
  }

  const queueNumber = nextNumber
  const ticketCode = `CR-${String(queueNumber).padStart(4, "0")}`
  const now = new Date().toISOString()

  const { data: ticket, error } = await supabase
    .from("health_queue_tickets")
    .insert({
      ticket_code: ticketCode,
      queue_position: queueNumber,
      queue_number: queueNumber,
      estimated_wait_minutes: queueNumber * 10,
      status: "waiting",
      station: "nurse",
      checked_in_at: null,
      service_date: serviceDate,
      patient_name: request.patient_name,
      campus_id: request.student_id,
      consultation_type: request.service,
      chief_complaint: request.reason,
      consultation_request_id: request.id,
      provider_type: providerType,
      assigned_staff_name: params.staffName,
      intake_notes: params.force
        ? `Admitted over capacity by nurse (${used}/${max}).`
        : "Admitted from waitlist.",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }

  await supabase
    .from("consultation_requests")
    .update({
      status: "pending",
      queue_ticket_id: ticket.id,
      queue_number: queueNumber,
      waitlisted_at: null,
      updated_at: now,
    })
    .eq("id", request.id)

  return {
    ok: true,
    ticketCode,
    queueNumber,
    message: `Admitted as ${ticketCode} (queue #${queueNumber}). Approve when ready.`,
  }
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

export type { SpecialtyStationId }
