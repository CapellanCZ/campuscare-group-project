import type { SupabaseClient } from "@supabase/supabase-js"

import {
  appointmentNotYetEligibleMessage,
  isAppointmentEligibleForQueue,
  manilaPreferredStartsAtIso,
} from "@/lib/health/appointment-queue-eligibility"

export async function resolveTicketScheduledStartsAt(
  supabase: SupabaseClient,
  ticket: {
    appointment_id?: string | null
    health_appointment_id?: string | null
    consultation_request_id?: string | null
  }
): Promise<string | null> {
  const appointmentId =
    ticket.health_appointment_id ?? ticket.appointment_id ?? null

  if (appointmentId) {
    const { data } = await supabase
      .from("appointments")
      .select("starts_at")
      .eq("id", appointmentId)
      .maybeSingle()
    if (data?.starts_at) return String(data.starts_at)
  }

  if (ticket.consultation_request_id) {
    const { data } = await supabase
      .from("consultation_requests")
      .select("preferred_date, preferred_time")
      .eq("id", ticket.consultation_request_id)
      .maybeSingle()
    return manilaPreferredStartsAtIso(
      data?.preferred_date as string | null | undefined,
      data?.preferred_time as string | null | undefined
    )
  }

  return null
}

/**
 * Trusted gate: reject queue entry / verify / call when scheduled start is in the future.
 * Walk-ins (no schedule) pass. Uses server clock, never a client-provided "now".
 */
export async function assertTicketEligibleForQueueEntry(
  supabase: SupabaseClient,
  ticket: {
    appointment_id?: string | null
    health_appointment_id?: string | null
    consultation_request_id?: string | null
  },
  now: Date = new Date()
): Promise<{ ok: true; startsAt: string | null } | { ok: false; error: string }> {
  const startsAt = await resolveTicketScheduledStartsAt(supabase, ticket)
  if (!isAppointmentEligibleForQueue(startsAt, now)) {
    return { ok: false, error: appointmentNotYetEligibleMessage(startsAt) }
  }
  return { ok: true, startsAt }
}

export async function assertAppointmentEligibleForQueueEntry(
  startsAt: string | null | undefined,
  now: Date = new Date()
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isAppointmentEligibleForQueue(startsAt, now)) {
    return { ok: false, error: appointmentNotYetEligibleMessage(startsAt) }
  }
  return { ok: true }
}
