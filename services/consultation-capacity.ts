import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import {
  isConsultationProviderType,
  type ConsultationProviderType,
} from "@/lib/health/consultation-workflow"
import { createClient } from "@/lib/supabase/server"

const INACTIVE_APPOINTMENT_STATUSES = [
  "cancelled",
  "no_show",
  "completed",
] as const

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

/**
 * Active appointment reservations for a Manila calendar day + provider.
 * Counts rows with a reserved queue_number, excluding terminal statuses.
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
    .select("id, status, queue_number")
    .eq("provider_type", providerType)
    .gte("starts_at", startIso)
    .lte("starts_at", endIso)
    .not("queue_number", "is", null)

  if (error) throw error

  return (data ?? []).filter(
    (row) =>
      !INACTIVE_APPOINTMENT_STATUSES.includes(
        row.status as (typeof INACTIVE_APPOINTMENT_STATUSES)[number]
      )
  ).length
}

export async function nextReservedQueueNumber(
  providerType: ConsultationProviderType,
  serviceDate: string,
  client?: SupabaseClient
): Promise<{ nextNumber: number; used: number; max: number }> {
  const supabase = client ?? (await createClient())
  const [used, max] = await Promise.all([
    countActiveReservations(providerType, serviceDate, supabase),
    getMaxDailySlots(providerType, CAMPUS_CLINIC_ID, supabase),
  ])
  return { nextNumber: used + 1, used, max }
}
