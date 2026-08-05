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

  const toStation = params.intake.toStation
  if (toStation !== "physician" && toStation !== "dentist") {
    return { ok: false, error: "Assign physician or dentist only." }
  }

  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id, station, status")
    .eq("id", params.ticketId)
    .maybeSingle()

  if (!ticket) return { ok: false, error: "Ticket not found." }

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

/**
 * Nurse approves a consultation request → patient enters the nurse queue
 * (auto queue number). After check-in + intake, nurse assigns physician/dentist
 * so the case appears on that doctor's station list.
 */
export async function approveConsultationRequest(params: {
  designation: ClinicDesignation
  requestId: string
  patientName: string
  studentId?: string
  service: string
  reason?: string
  staffName: string
}): Promise<HealthActionResult & { ticketCode?: string; suggestedSpecialty?: SpecialtyStationId }> {
  if (!canApproveConsultationRequest(params.designation)) {
    return { ok: false, error: "Only nurses can approve consultation requests." }
  }

  const openCheck = await assertCanAccommodate({ at: new Date() })
  if (!openCheck.ok) {
    return { ok: false, error: openCheck.error }
  }

  const name = params.patientName.trim()
  if (!name) return { ok: false, error: "Patient name is required." }

  const supabase = await createClient()
  const { ymd } = manilaDayBounds()
  const campusId = params.studentId?.trim() || null
  const suggestedSpecialty = suggestedSpecialtyFromService(params.service)

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
              : "Could not sync enrolled student for this request.",
        }
      }
    } else {
      const { data: byEmployee } = await supabase
        .from("patients")
        .select("id, full_name, employee_id")
        .eq("employee_id", campusId)
        .limit(1)
        .maybeSingle()

      if (byEmployee) {
        patientId = byEmployee.id
        resolvedName = byEmployee.full_name
        resolvedCampusId = byEmployee.employee_id
      }
      // Requests may use demo IDs — still allow queue ticket without patient FK.
    }
  }

  const { nextPos, nextNum } = await nextQueueSlot(supabase)
  const ticketCode = `CR-${String(nextNum).padStart(4, "0")}`
  const now = new Date().toISOString()
  const consultationType = `${params.service.trim() || "Consultation"} → ${suggestedSpecialty}`

  const { error } = await supabase.from("health_queue_tickets").insert({
    ticket_code: ticketCode,
    queue_position: nextPos,
    queue_number: nextNum,
    estimated_wait_minutes: nextPos * 10,
    status: "waiting",
    station: "nurse",
    checked_in_at: null,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    service_date: ymd,
    patient_id: patientId,
    patient_name: resolvedName,
    campus_id: resolvedCampusId,
    consultation_type: consultationType,
    chief_complaint: params.reason?.trim() || null,
    assigned_staff_name: params.staffName,
    intake_notes: `Approved request ${params.requestId}. Suggested specialty: ${suggestedSpecialty}.`,
  })

  if (error) return { ok: false, error: error.message }
  return {
    ok: true,
    ticketCode,
    suggestedSpecialty,
    message: `Request approved as ${ticketCode} (queue #${nextNum}). Complete check-in and intake, then assign ${suggestedSpecialty} so they appear on the doctor queue.`,
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
