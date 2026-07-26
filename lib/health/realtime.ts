import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js"

export const QUEUE_REALTIME_CHANNEL = "campuscare-health-queue"

export function subscribeQueueChanges(
  client: SupabaseClient,
  onChange: () => void
): RealtimeChannel {
  return client
    .channel(QUEUE_REALTIME_CHANNEL)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "health_queue_tickets" },
      () => onChange()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "health_appointments" },
      () => onChange()
    )
    .subscribe()
}
