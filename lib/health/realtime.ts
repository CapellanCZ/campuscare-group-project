import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js"

export const QUEUE_REALTIME_CHANNEL = "campuscare-health-queue"

/**
 * Common ops tables for staff silent refresh.
 * Prefer tables that actually drive each UI. Avoid legacy/optional tables that
 * may be missing from `supabase_realtime` — a bad table used to kill the whole
 * multi-table channel (see subscribeTables).
 */
export const STAFF_REALTIME_TABLES = {
  queue: ["health_queue_tickets", "appointments"] as const,
  // Nurse / staff request queue reads `appointments` (not legacy consultation_requests).
  requests: ["appointments"] as const,
  announcements: ["announcements", "announcement_attachments"] as const,
  certificates: ["medical_certificates"] as const,
  consultations: ["consultations", "appointments"] as const,
  patients: ["patient_records", "consultations"] as const,
  capacity: ["clinic_consultation_capacity"] as const,
  users: ["users", "clinic_members", "admin_accounts"] as const,
  notifications: ["notifications"] as const,
  duty: ["staff_duty_status", "staff_break_status", "clinic_break_status"] as const,
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
  // Keep to tables that drive home KPIs / queue — avoid reload storms from
  // certificates, announcements, or directory edits while on dashboard.
  dashboard: [
    "appointments",
    "health_queue_tickets",
    "consultations",
  ] as const,
} as const

export type RealtimeSubscription = {
  channels: RealtimeChannel[]
  unsubscribe: (client: SupabaseClient) => void
}

function emptySubscription(): RealtimeSubscription {
  return {
    channels: [],
    unsubscribe: () => undefined,
  }
}

export function subscribeQueueChanges(
  client: SupabaseClient,
  onChange: () => void
): RealtimeSubscription {
  return subscribeTables(
    client,
    QUEUE_REALTIME_CHANNEL,
    [...STAFF_REALTIME_TABLES.queue],
    onChange
  )
}

/** Public display: duty/break only — ticket PHI comes from sanitized view on refresh. */
export function subscribeDisplayChanges(
  client: SupabaseClient,
  onChange: () => void
): RealtimeSubscription {
  return subscribeTables(
    client,
    "campuscare-queue-display",
    ["staff_duty_status", "clinic_break_status", "staff_break_status"],
    onChange
  )
}

/**
 * Subscribe to postgres_changes on multiple public tables.
 * Each table gets its own channel so one unpublished/missing table cannot
 * poison the rest (Supabase fails the whole multi-table channel).
 * Caller must unsubscribe on cleanup.
 */
export function subscribeTables(
  client: SupabaseClient,
  channelName: string,
  tables: readonly string[],
  onChange: () => void,
  options?: {
    filters?: Record<string, string>
  }
): RealtimeSubscription {
  const unique = [...new Set(tables.filter(Boolean))]
  if (unique.length === 0) return emptySubscription()

  const channels = unique.map((table) => {
    const filter = options?.filters?.[table]
    const config = filter
      ? ({
          event: "*" as const,
          schema: "public" as const,
          table,
          filter,
        } as const)
      : ({
          event: "*" as const,
          schema: "public" as const,
          table,
        } as const)

    return client
      .channel(`${channelName}:${table}`)
      .on("postgres_changes", config, () => onChange())
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            `[realtime] ${channelName}:${table} ${status}`,
            err ?? ""
          )
        }
      })
  })

  return {
    channels,
    unsubscribe: (supabase) => {
      for (const channel of channels) {
        void supabase.removeChannel(channel)
      }
    },
  }
}
