import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js"

export const QUEUE_REALTIME_CHANNEL = "campuscare-health-queue"

/** Common ops tables for staff silent refresh. */
export const STAFF_REALTIME_TABLES = {
  queue: ["health_queue_tickets", "appointments", "health_appointments"] as const,
  requests: ["appointments"] as const,
  announcements: ["announcements", "announcement_attachments"] as const,
  certificates: ["medical_certificates"] as const,
  consultations: ["consultations", "patient_records"] as const,
  patients: ["patient_records", "consultations"] as const,
  capacity: ["clinic_consultation_capacity"] as const,
  officeHours: [
    "clinic_office_hours",
    "doctor_availability",
    "clinic_break_status",
    "staff_break_status",
  ] as const,
  reports: [
    "appointments",
    "health_queue_tickets",
    "consultations",
    "medical_certificates",
    "patient_records",
  ] as const,
  dashboard: [
    "appointments",
    "health_queue_tickets",
    "health_appointments",
    "announcements",
    "clinic_consultation_capacity",
    "consultations",
    "medical_certificates",
  ] as const,
} as const

export function subscribeQueueChanges(
  client: SupabaseClient,
  onChange: () => void
): RealtimeChannel {
  return subscribeTables(
    client,
    QUEUE_REALTIME_CHANNEL,
    [...STAFF_REALTIME_TABLES.queue],
    onChange
  )
}

/** Public display: queue tickets + clinic/staff breaks. */
export function subscribeDisplayChanges(
  client: SupabaseClient,
  onChange: () => void
): RealtimeChannel {
  return subscribeTables(
    client,
    "campuscare-queue-display",
    [
      ...STAFF_REALTIME_TABLES.queue,
      "clinic_break_status",
      "staff_break_status",
    ],
    onChange
  )
}

/**
 * Subscribe to postgres_changes on multiple public tables.
 * Caller must removeChannel on cleanup.
 */
export function subscribeTables(
  client: SupabaseClient,
  channelName: string,
  tables: readonly string[],
  onChange: () => void
): RealtimeChannel {
  let channel = client.channel(channelName)
  const unique = [...new Set(tables.filter(Boolean))]
  for (const table of unique) {
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      () => onChange()
    )
  }
  return channel.subscribe()
}
