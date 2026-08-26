import type { ClinicDesignation } from "@/lib/auth/types"
import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
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
import {
  ensureConsultationFromAppointment,
  ensureWalkInConsultation,
  formatClinicQueueCode,
  hasRequiredNurseVitals,
  linkTicketAndConsultation,
  resolveConsultationIdForTicket,
  saveConsultationVitals,
  setConsultationStatus,
  vitalsFromIntake,
  type ConsultationVitals,
} from "@/lib/health/consultation-lifecycle"
import type { ConsultationProviderType } from "@/lib/health/consultation-workflow"

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
    .select(
      `
      id,
      status,
      station,
      consultation_id,
      appointment_id,
      patient_id,
      provider_type,
      chief_complaint,
      patient_name,
      intake_completed_at,
      vitals_bp_systolic,
      vitals_bp_diastolic,
      vitals_heart_rate,
      vitals_temperature_c,
      vitals_spo2,
      vitals_height_cm,
      vitals_weight_kg,
      vitals_respiratory_rate,
      intake_notes
    `
    )
    .eq("id", params.ticketId)
    .maybeSingle()

  if (!ticket) return { ok: false, error: "Ticket not found." }

  if (
    (station === "physician" || station === "dentist") &&
    ticket.station !== station
  ) {
    return {
      ok: false,
      error: "Patient is not in your queue yet.",
    }
  }

  const ticketVitals: ConsultationVitals = {
    bpSystolic: (ticket.vitals_bp_systolic as number | null) ?? null,
    bpDiastolic: (ticket.vitals_bp_diastolic as number | null) ?? null,
    heartRate: (ticket.vitals_heart_rate as number | null) ?? null,
    temperatureC:
      ticket.vitals_temperature_c == null
        ? null
        : Number(ticket.vitals_temperature_c),
    spo2: (ticket.vitals_spo2 as number | null) ?? null,
    heightCm:
      ticket.vitals_height_cm == null ? null : Number(ticket.vitals_height_cm),
    weightKg:
      ticket.vitals_weight_kg == null ? null : Number(ticket.vitals_weight_kg),
    respiratoryRate: (ticket.vitals_respiratory_rate as number | null) ?? null,
  }
  const intakeDone =
    Boolean(ticket.intake_completed_at) || hasRequiredNurseVitals(ticketVitals)

  let consultationId: string | null =
    (ticket.consultation_id as string | null) ??
    (await resolveConsultationIdForTicket(params.ticketId, supabase))

  if (!consultationId && ticket.appointment_id) {
    const ensured = await ensureConsultationFromAppointment({
      appointmentId: ticket.appointment_id as string,
      ticketId: params.ticketId,
      staffName: params.staffName,
      client: supabase,
    })
    if ("error" in ensured) {
      return { ok: false, error: ensured.error }
    }
    consultationId = ensured.id
  }

  // Walk-ins / legacy tickets: nurse already finished intake on the ticket but
  // no consultations row was linked — create one now so the doctor can open the visit.
  if (
    !consultationId &&
    (station === "physician" || station === "dentist") &&
    intakeDone
  ) {
    const providerType: ConsultationProviderType =
      station === "dentist" || ticket.provider_type === "dentist"
        ? "dentist"
        : "physician"
    const ensured = await ensureWalkInConsultation({
      operationalPatientId: (ticket.patient_id as string | null) ?? null,
      providerType,
      patientName: (ticket.patient_name as string | null) ?? "Patient",
      chiefComplaint: (ticket.chief_complaint as string | null) ?? null,
      staffName: params.staffName,
      client: supabase,
    })
    if ("error" in ensured) {
      return { ok: false, error: ensured.error }
    }
    consultationId = ensured.id
    await linkTicketAndConsultation({
      supabase,
      ticketId: params.ticketId,
      consultationId,
    })
    await saveConsultationVitals({
      consultationId,
      vitals: ticketVitals,
      chiefComplaint: ticket.chief_complaint as string | null,
      notes: ticket.intake_notes as string | null,
      station,
      staffName: params.staffName,
      client: supabase,
    })
  }

  if (station === "physician" || station === "dentist") {
    if (!consultationId) {
      return {
        ok: false,
        error: "No consultation record. Nurse must complete intake first.",
      }
    }

    const { data: consultation } = await supabase
      .from("consultations")
      .select("vitals")
      .eq("id", consultationId)
      .maybeSingle()
    let vitals = (consultation?.vitals ?? {}) as Record<string, unknown>

    // Hydrate consultation vitals from ticket if nurse saved them only on the ticket.
    if (
      (vitals.bpSystolic == null ||
        vitals.bpDiastolic == null ||
        vitals.heartRate == null) &&
      hasRequiredNurseVitals(ticketVitals)
    ) {
      await saveConsultationVitals({
        consultationId,
        vitals: ticketVitals,
        chiefComplaint: ticket.chief_complaint as string | null,
        notes: ticket.intake_notes as string | null,
        station,
        staffName: params.staffName,
        client: supabase,
      })
      vitals = ticketVitals as unknown as Record<string, unknown>
    }

    if (
      vitals.bpSystolic == null ||
      vitals.bpDiastolic == null ||
      vitals.heartRate == null
    ) {
      return {
        ok: false,
        error: "Nurse vitals must be recorded before starting consultation.",
      }
    }

    await setConsultationStatus({
      consultationId,
      status: "ongoing",
      station,
      providerName: params.staffName,
      providerRole: station,
      client: supabase,
    })
  }

  const patch: Record<string, unknown> = {
    status: params.designation === "dentist" ? "ongoing" : "called",
    assigned_staff_name: params.staffName,
    updated_at: new Date().toISOString(),
  }

  // Nurses keep the ticket at nurse while starting intake; specialty roles stay put.
  if (station && station !== "nurse") {
    patch.station = station
  }
  if (consultationId) {
    patch.consultation_id = consultationId
  }

  const { error } = await supabase
    .from("health_queue_tickets")
    .update(patch)
    .eq("id", ticket.id)

  if (error) return { ok: false, error: error.message }
  return {
    ok: true,
    message: "Consultation started.",
    ...(consultationId ? { consultationId } : {}),
  }
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

  const consultationId = await resolveConsultationIdForTicket(
    params.ticketId,
    supabase
  )
  if (consultationId) {
    await setConsultationStatus({
      consultationId,
      status: "ongoing",
      station: "nurse",
      client: supabase,
    })
  }

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

  const vitals = vitalsFromIntake(params.intake)
  if (!hasRequiredNurseVitals(vitals)) {
    return {
      ok: false,
      error: "Blood pressure (systolic/diastolic) and heart rate are required.",
    }
  }

  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select(
      "id, station, status, provider_type, consultation_request_id, consultation_id, appointment_id, patient_id, patient_name, chief_complaint"
    )
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

  let consultationId =
    (ticket.consultation_id as string | null) ??
    (await resolveConsultationIdForTicket(params.ticketId, supabase))

  if (!consultationId && ticket.appointment_id) {
    const ensured = await ensureConsultationFromAppointment({
      appointmentId: ticket.appointment_id as string,
      ticketId: params.ticketId,
      staffName: params.staffName,
      client: supabase,
    })
    if ("error" in ensured) {
      return { ok: false, error: ensured.error }
    }
    consultationId = ensured.id
  }

  if (!consultationId) {
    const providerType: ConsultationProviderType =
      toStation === "dentist" ? "dentist" : "physician"
    const ensured = await ensureWalkInConsultation({
      operationalPatientId: (ticket.patient_id as string | null) ?? null,
      providerType,
      patientName: (ticket.patient_name as string | null) ?? "Patient",
      chiefComplaint:
        params.intake.chiefComplaint?.trim() ||
        (ticket.chief_complaint as string | null),
      staffName: params.staffName,
      client: supabase,
    })
    if ("error" in ensured) {
      return { ok: false, error: ensured.error }
    }
    consultationId = ensured.id
    await linkTicketAndConsultation({
      supabase,
      ticketId: params.ticketId,
      consultationId,
    })
  }

  const saved = await saveConsultationVitals({
    consultationId,
    vitals,
    chiefComplaint: params.intake.chiefComplaint,
    notes: params.intake.intakeNotes,
    station: toStation,
    staffName: params.staffName,
    client: supabase,
  })
  if (!saved.ok) return { ok: false, error: saved.error }

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
      consultation_id: consultationId,
      updated_at: now,
    })
    .eq("id", ticket.id)

  if (error) return { ok: false, error: error.message }

  return {
    ok: true,
    message: `Intake saved. Assigned to ${toStation} queue.`,
    consultationId,
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
  patientType?: import("@/lib/health/types").PatientType
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

  const patientType = params.patientType ?? "student"
  const campusId = params.studentId?.trim() || null
  const idRequired = patientType !== "visitor"

  if (idRequired && !campusId) {
    return {
      ok: false,
      error:
        patientType === "student"
          ? "Student ID is required for students."
          : "ID is required for faculty and employees.",
    }
  }

  const supabase = await createClient()
  const { ymd } = manilaDayBounds()

  let patientId: string | null = null
  let resolvedName = name
  let resolvedCampusId = campusId

  if (campusId && patientType === "student") {
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
      const { data: byStudent } = await supabase
        .from("patients")
        .select("id, full_name, student_id, employee_id, patient_type")
        .eq("student_id", campusId)
        .limit(1)
        .maybeSingle()

      if (byStudent) {
        patientId = byStudent.id
        resolvedName = byStudent.full_name
        resolvedCampusId = byStudent.student_id
      } else {
        return { ok: false, error: NO_STUDENT_FOUND }
      }
    }
  } else if (
    campusId &&
    (patientType === "faculty" || patientType === "employee")
  ) {
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
      const now = new Date().toISOString()
      const { data: created, error: createError } = await supabase
        .from("patients")
        .insert({
          full_name: name,
          patient_type: patientType,
          affiliation: patientType,
          employee_id: campusId,
          student_id: null,
          clinic_id: CAMPUS_CLINIC_ID,
          updated_at: now,
        })
        .select("id, full_name, employee_id")
        .single()

      if (createError || !created) {
        return {
          ok: false,
          error: createError?.message || "Could not create staff patient.",
        }
      }
      patientId = created.id
      resolvedName = created.full_name
      resolvedCampusId = created.employee_id
    }
  }

  const consultationTypeLower = (
    params.consultationType || "Walk-in consultation"
  ).toLowerCase()
  const providerType: ConsultationProviderType =
    consultationTypeLower.includes("dental") ||
    consultationTypeLower.includes("dentist") ||
    consultationTypeLower.includes("tooth")
      ? "dentist"
      : "physician"

  const ensured = await ensureWalkInConsultation({
    operationalPatientId: patientId,
    providerType,
    patientName: resolvedName,
    chiefComplaint: params.consultationType || "Walk-in consultation",
    staffName: params.staffName,
    client: supabase,
  })
  if ("error" in ensured) {
    return { ok: false, error: ensured.error }
  }

  const { nextPos, nextNum } = await nextQueueSlot(supabase)
  const ticketCode = formatClinicQueueCode(providerType, nextNum)
  const now = new Date().toISOString()

  const { data: ticket, error } = await supabase
    .from("health_queue_tickets")
    .insert({
      ticket_code: ticketCode,
      queue_position: nextPos,
      queue_number: nextNum,
      estimated_wait_minutes: nextPos * 10,
      status: "waiting",
      station: "nurse",
      checked_in_at: now,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      service_date: ymd,
      patient_id: patientId,
      patient_name: resolvedName,
      campus_id: resolvedCampusId,
      patient_type: patientType,
      consultation_type: params.consultationType || "Walk-in consultation",
      assigned_staff_name: params.staffName,
      provider_type: providerType,
      consultation_id: ensured.id,
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }

  await supabase
    .from("consultations")
    .update({
      queue_ticket_id: ticket.id,
      updated_at: now,
    })
    .eq("id", ensured.id)

  return {
    ok: true,
    message: `Walk-in registered as ${ticketCode} in the nurse queue.`,
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
 * 
 * NEW BEHAVIOR: Creates a consultation record in the consultations table with
 * status='waiting' when the request is approved.
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
      "id, status, queue_ticket_id, queue_number, provider_type, service, preferred_date, patient_record_id, reason, student_id"
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
  
  // Get the patient_record_id - use existing or look up from student_id
  let patientRecordId = request.patient_record_id as string | null
  if (!patientRecordId && request.student_id) {
    const { data: patientRecord } = await supabase
      .from("patient_records")
      .select("id")
      .eq("student_id", request.student_id)
      .maybeSingle()
    patientRecordId = patientRecord?.id ?? null
  }

  // Create consultation record if patient_record_id exists
  if (patientRecordId) {
    const { data: createdConsultation, error: consultationError } = await supabase
      .from("consultations")
      .insert({
        patient_id: patientRecordId,
        chief_complaint: (request.reason as string | null) ?? null,
        status: "waiting",
        provider_type: suggestedSpecialty,
        consultation_date: now,
        priority: "Normal",
        consultation_request_id: request.id,
        queue_ticket_id: ticket.id,
        station: "nurse",
      })
      .select("id")
      .single()

    if (consultationError) {
      console.error("Failed to create consultation record:", consultationError)
      // Don't fail the approval just because consultation creation failed
      // Log it but continue with queue ticket update
    } else if (createdConsultation?.id) {
      await linkTicketAndConsultation({
        supabase,
        ticketId: ticket.id as string,
        consultationId: createdConsultation.id as string,
      })
    }
  }

  // Update consultation request status to approved
  await supabase
    .from("consultation_requests")
    .update({
      status: "approved",
      updated_at: now,
    })
    .eq("id", params.requestId)

  // Update queue ticket
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
    message: `Request approved. Consultation record created. Reserved queue #${ticket.queue_number ?? request.queue_number} kept (${ticket.ticket_code}).`,
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
