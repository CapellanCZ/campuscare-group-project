import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import {
  isConsultationProviderType,
  type ConsultationProviderType,
} from "@/lib/health/consultation-workflow"
import { createClient } from "@/lib/supabase/server"

export type ClinicCapacityRow = {
  clinicId: string
  providerType: ConsultationProviderType
  maxDailySlots: number
}

export async function getClinicCapacities(
  clinicId: string = CAMPUS_CLINIC_ID,
  client?: SupabaseClient
): Promise<ClinicCapacityRow[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from("clinic_consultation_capacity")
    .select("clinic_id, provider_type, max_daily_slots")
    .eq("clinic_id", clinicId)

  if (error) throw error

  return (data ?? [])
    .filter((row) => isConsultationProviderType(row.provider_type))
    .map((row) => ({
      clinicId: row.clinic_id as string,
      providerType: row.provider_type as ConsultationProviderType,
      maxDailySlots: Number(row.max_daily_slots) || 20,
    }))
}

export async function getMaxDailySlots(
  providerType: ConsultationProviderType,
  clinicId: string = CAMPUS_CLINIC_ID,
  client?: SupabaseClient
): Promise<number> {
  const rows = await getClinicCapacities(clinicId, client)
  const match = rows.find((r) => r.providerType === providerType)
  return match?.maxDailySlots ?? 20
}

export async function upsertClinicCapacity(input: {
  providerType: ConsultationProviderType
  maxDailySlots: number
  clinicId?: string
  client?: SupabaseClient
}): Promise<void> {
  if (input.maxDailySlots < 1 || input.maxDailySlots > 500) {
    throw new Error("Daily capacity must be between 1 and 500.")
  }
  const supabase = input.client ?? (await createClient())
  const clinicId = input.clinicId ?? CAMPUS_CLINIC_ID
  const { error } = await supabase.from("clinic_consultation_capacity").upsert(
    {
      clinic_id: clinicId,
      provider_type: input.providerType,
      max_daily_slots: input.maxDailySlots,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clinic_id,provider_type" }
  )
  if (error) throw error
}

/** Statuses that hold a daily capacity slot before/after nurse approve. */
const CAPACITY_HOLDING_STATUSES = new Set([
  "pending",
  "rescheduled",
  "confirmed",
  "in_progress",
])

/**
 * Active appointment reservations for a Manila calendar day + provider.
 * Pending requests count toward capacity even before a queue ticket exists.
 * Waitlisted rows do not (they are overflow after capacity is full).
 */
export async function countActiveReservations(
  providerType: ConsultationProviderType,
  serviceDate: string,
  client?: SupabaseClient
): Promise<number> {
  const supabase = client ?? (await createClient())
  const startIso = new Date(`${serviceDate}T00:00:00+08:00`).toISOString()
  const endIso = new Date(`${serviceDate}T23:59:59.999+08:00`).toISOString()

  const { data, error } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("provider_type", providerType)
    .gte("starts_at", startIso)
    .lte("starts_at", endIso)
    .in("status", [...CAPACITY_HOLDING_STATUSES])

  if (error) throw error

  return (data ?? []).length
}

export async function nextReservedQueueNumber(
  providerType: ConsultationProviderType,
  serviceDate: string,
  client?: SupabaseClient
): Promise<{ nextNumber: number; used: number; max: number }> {
  const supabase = client ?? (await createClient())
  const startIso = new Date(`${serviceDate}T00:00:00+08:00`).toISOString()
  const endIso = new Date(`${serviceDate}T23:59:59.999+08:00`).toISOString()

  const [used, max, apptResult, ticketResult] = await Promise.all([
    countActiveReservations(providerType, serviceDate, supabase),
    getMaxDailySlots(providerType, CAMPUS_CLINIC_ID, supabase),
    // Include cancelled/no-show so freed capacity does not reuse their numbers.
    supabase
      .from("appointments")
      .select("queue_number")
      .eq("provider_type", providerType)
      .gte("starts_at", startIso)
      .lte("starts_at", endIso)
      .not("queue_number", "is", null),
    // Same specialty only — M and D sequences stay independent (M-001 + D-001 OK).
    supabase
      .from("health_queue_tickets")
      .select("queue_number, ticket_code, provider_type")
      .eq("service_date", serviceDate)
      .not("queue_number", "is", null),
  ])

  if (apptResult.error) throw apptResult.error
  if (ticketResult.error) throw ticketResult.error

  const prefix = providerType === "dentist" ? "D" : "M"
  const ticketNums = (ticketResult.data ?? [])
    .filter((row) => {
      const rowProvider = row.provider_type as string | null
      if (rowProvider === providerType) return true
      const code = (row.ticket_code as string | null)?.trim() ?? ""
      return code.toUpperCase().startsWith(`${prefix}-`)
    })
    .map((row) => Number(row.queue_number) || 0)

  const maxAssigned = Math.max(
    0,
    ...(apptResult.data ?? []).map((row) => Number(row.queue_number) || 0),
    ...ticketNums
  )

  return { nextNumber: maxAssigned + 1, used, max }
}
