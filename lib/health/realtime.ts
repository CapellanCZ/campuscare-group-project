import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js"

export const QUEUE_REALTIME_CHANNEL = "campuscare-health-queue"

/** Common ops tables for staff silent refresh. */
export const STAFF_REALTIME_TABLES = {
  queue: ["health_queue_tickets", "appointments", "health_appointments"] as const,
  requests: ["appointments", "consultation_requests"] as const,
  announcements: ["announcements", "announcement_attachments"] as const,
  certificates: ["medical_certificates"] as const,
  consultations: ["consultations", "patient_records"] as const,
  patients: ["patient_records", "consultations"] as const,
  capacity: ["clinic_consultation_capacity"] as const,
  users: ["users", "clinic_members", "admin_accounts"] as const,
  notifications: ["notifications"] as const,
  duty: ["staff_break_status", "clinic_break_status"] as const,
  profile: ["users", "user_preferences"] as const,
  schedule: ["doctor_availability", "clinic_office_hours"] as const,
  clinicalVisit: [
    "consultations",
    "patient_records",
    "appointments",
    "medical_certificates",
  ] as const,
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

type PostgresChangesFilter = {
  event: "*"
  schema: "public"
  table: string
  filter?: string
}

/**
 * Subscribe to postgres_changes on multiple public tables.
 * Caller must removeChannel on cleanup.
 */
export function subscribeTables(
  client: SupabaseClient,
  channelName: string,
  tables: readonly string[],
  onChange: () => void,
  options?: {
    filters?: Record<string, string>
  }
): RealtimeChannel {
  let channel = client.channel(channelName)
  const unique = [...new Set(tables.filter(Boolean))]
  for (const table of unique) {
    const filter = options?.filters?.[table]
    if (filter) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        () => onChange()
      )
    } else {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => onChange()
      )
    }
  }
  return channel.subscribe()
}
