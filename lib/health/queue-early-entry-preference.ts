/** Nurse-selectable auto-move windows (minutes before appointment start). */
export const QUEUE_EARLY_ENTRY_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const

export type QueueEarlyEntryMinutes = (typeof QUEUE_EARLY_ENTRY_OPTIONS)[number]

/** Matches QUEUE_EARLY_ENTRY_MINUTES in appointment-queue-eligibility. */
export const DEFAULT_QUEUE_EARLY_ENTRY_MINUTES: QueueEarlyEntryMinutes = 15

export const QUEUE_EARLY_ENTRY_STORAGE_KEY =
  "campuscare:queue-early-entry-minutes"

export function isQueueEarlyEntryMinutes(
  value: number
): value is QueueEarlyEntryMinutes {
  return (QUEUE_EARLY_ENTRY_OPTIONS as readonly number[]).includes(value)
}

export function readQueueEarlyEntryMinutes(
  fallback: QueueEarlyEntryMinutes = DEFAULT_QUEUE_EARLY_ENTRY_MINUTES
): QueueEarlyEntryMinutes {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(QUEUE_EARLY_ENTRY_STORAGE_KEY)
    const n = Number(raw)
    if (isQueueEarlyEntryMinutes(n)) return n
  } catch {
    /* ignore */
  }
  return fallback
}

export function writeQueueEarlyEntryMinutes(minutes: QueueEarlyEntryMinutes) {
  try {
    window.localStorage.setItem(QUEUE_EARLY_ENTRY_STORAGE_KEY, String(minutes))
  } catch {
    /* ignore */
  }
}
