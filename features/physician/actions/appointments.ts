"use server"

import { revalidatePath } from "next/cache"

import { getStaffAccess } from "@/lib/auth/access"
import { assertCanAccommodate } from "@/lib/availability/queries"
import { createClient } from "@/lib/supabase/server"
import { rangesOverlap } from "@/lib/physician/timezone"
import type { AppointmentStatus } from "@/features/physician/types"

export type ActionResult = { ok: true } | { ok: false; error: string }

const PHYSICIAN_PATHS = [
  "/physician",
  "/physician/dashboard",
  "/physician/patients",
  "/physician/consultations",
  "/physician/settings",
  "/physician/reports",
  "/physician/profile",
]

function revalidatePhysician() {
  for (const path of PHYSICIAN_PATHS) {
    revalidatePath(path)
  }
}

async function requirePhysician() {
  const access = await getStaffAccess()
  if (!access || access.primaryRole !== "physician") {
    return null
  }
  return access
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  cancellationReason?: string
): Promise<ActionResult> {
  const access = await requirePhysician()
  if (!access) {
    return { ok: false, error: "Unauthorized. Physician access required." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("appointments")
    .update({
      status,
      cancellation_reason:
        status === "cancelled" ? cancellationReason ?? "Cancelled by physician" : null,
    })
    .eq("id", appointmentId)
    .eq("doctor_id", access.userId)

  if (error) {
    if (error.code === "23P01") {
      return {
        ok: false,
        error: "Schedule conflict: this slot overlaps another appointment.",
      }
    }
    return { ok: false, error: error.message }
  }

  revalidatePhysician()
  revalidatePath(`/physician/consultation/${appointmentId}`)
  return { ok: true }
}

export async function rescheduleAppointment(
  appointmentId: string,
  startsAt: string,
  endsAt: string
): Promise<ActionResult> {
  const access = await requirePhysician()
  if (!access) {
    return { ok: false, error: "Unauthorized. Physician access required." }
  }

  if (new Date(endsAt) <= new Date(startsAt)) {
    return { ok: false, error: "End time must be after start time." }
  }

  if (new Date(startsAt) < new Date()) {
    return { ok: false, error: "Cannot reschedule into the past." }
  }

  const hoursCheck = await assertCanAccommodate({
    at: startsAt,
    clinicianUserId: access.userId,
    staffLabel: "You",
  })
  if (!hoursCheck.ok) {
    return { ok: false, error: hoursCheck.error }
  }

  const endCheck = await assertCanAccommodate({
    at: endsAt,
    clinicianUserId: access.userId,
    staffLabel: "You",
  })
  if (!endCheck.ok) {
    return {
      ok: false,
      error: `Appointment end is outside open hours: ${endCheck.error}`,
    }
  }

  const supabase = await createClient()

  const { data: others } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status")
    .eq("doctor_id", access.userId)
    .neq("id", appointmentId)
    .not("status", "in", "(cancelled,no_show)")

  const conflict = others?.find((row) =>
    rangesOverlap(startsAt, endsAt, row.starts_at, row.ends_at)
  )
  if (conflict) {
    return {
      ok: false,
      error: "Double booking prevented: another appointment overlaps this time.",
    }
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      starts_at: startsAt,
      ends_at: endsAt,
      status: "rescheduled",
    })
    .eq("id", appointmentId)
    .eq("doctor_id", access.userId)

  if (error) {
    if (error.code === "23P01") {
      return {
        ok: false,
        error: "Double booking prevented by the database schedule constraint.",
      }
    }
    return { ok: false, error: error.message }
  }

  revalidatePhysician()
  return { ok: true }
}

export async function startConsultation(
  appointmentId: string
): Promise<ActionResult & { consultationId?: string }> {
  const access = await requirePhysician()
  if (!access) {
    return { ok: false, error: "Unauthorized. Physician access required." }
  }

  const supabase = await createClient()

  const { data: appointment, error: aptError } = await supabase
    .from("appointments")
    .select("id, clinic_id, doctor_id, patient_id, status")
    .eq("id", appointmentId)
    .eq("doctor_id", access.userId)
    .maybeSingle()

  if (aptError || !appointment) {
    return { ok: false, error: "Appointment not found." }
  }

  if (
    appointment.status === "cancelled" ||
    appointment.status === "no_show" ||
    appointment.status === "completed"
  ) {
    return {
      ok: false,
      error: `Cannot start consultation for a ${appointment.status.replace("_", " ")} appointment.`,
    }
  }

  await supabase
    .from("appointments")
    .update({ status: "in_progress" })
    .eq("id", appointmentId)

  // Open existing consultation — do not insert a duplicate row
  const { data: existing } = await supabase
    .from("consultations")
    .select("id, status, vitals")
    .eq("appointment_id", appointmentId)
    .maybeSingle()

  if (existing?.id) {
    const vitals = (existing.vitals ?? {}) as Record<string, unknown>
    if (
      existing.status === "waiting" &&
      vitals.bpSystolic != null &&
      vitals.bpDiastolic != null &&
      vitals.heartRate != null
    ) {
      await supabase
        .from("consultations")
        .update({
          status: "ongoing",
          station: "physician",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
    }
    revalidatePhysician()
    revalidatePath(`/physician/consultation/${existing.id}`)
    return { ok: true, consultationId: existing.id as string }
  }

  return { ok: false, error: "No consultation record for this appointment. Nurse must approve first." }
}

export async function saveConsultation(input: {
  consultationId?: string
  appointmentId?: string
  symptoms: string
  diagnosis: string
  clinicalNotes: string
  prescription: string
  complete?: boolean
}): Promise<ActionResult> {
  const access = await requirePhysician()
  if (!access) {
    return { ok: false, error: "Unauthorized. Physician access required." }
  }

  const supabase = await createClient()

  let consultationId = input.consultationId
  if (!consultationId && input.appointmentId) {
    const { data: row } = await supabase
      .from("consultations")
      .select("id")
      .eq("appointment_id", input.appointmentId)
      .maybeSingle()
    consultationId = row?.id as string | undefined
  }

  if (!consultationId) {
    return { ok: false, error: "Consultation not found." }
  }

  const { saveClinicalVisit } = await import(
    "@/features/clinical/actions/consultation-visit"
  )
  return saveClinicalVisit({
    consultationId,
    role: "physician",
    symptoms: input.symptoms,
    diagnosis: input.diagnosis,
    clinicalNotes: input.clinicalNotes,
    prescription: input.prescription,
    complete: input.complete,
  })
}

