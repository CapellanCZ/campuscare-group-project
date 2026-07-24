/** Idle before warning (ms). Default: 19 minutes. */
export const IDLE_TIMEOUT_MS = 19 * 60 * 1000

/** Warning window before forced logout (ms). Default: 1 minute. */
export const IDLE_WARNING_MS = 60 * 1000

/** Hard cap from login, even if active (ms). Default: 12 hours. */
export const ABSOLUTE_SESSION_MS = 12 * 60 * 60 * 1000

/** How often to re-check timers (ms). */
export const SESSION_CHECK_INTERVAL_MS = 1000

export const SESSION_STARTED_AT_KEY = "cc.sessionStartedAt"

export type SessionTimeoutPhase = "active" | "warning" | "expired"

export function idleDeadline(lastActivityAt: number) {
  return lastActivityAt + IDLE_TIMEOUT_MS + IDLE_WARNING_MS
}

export function warningDeadline(lastActivityAt: number) {
  return lastActivityAt + IDLE_TIMEOUT_MS
}

export function absoluteDeadline(sessionStartedAt: number) {
  return sessionStartedAt + ABSOLUTE_SESSION_MS
}

export function getSessionTimeoutPhase(input: {
  now: number
  lastActivityAt: number
  sessionStartedAt: number
}): SessionTimeoutPhase {
  const { now, lastActivityAt, sessionStartedAt } = input

  if (
    now >= absoluteDeadline(sessionStartedAt) ||
    now >= idleDeadline(lastActivityAt)
  ) {
    return "expired"
  }

  if (now >= warningDeadline(lastActivityAt)) {
    return "warning"
  }

  return "active"
}

export function secondsUntil(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

export function readSessionStartedAt(storage: Storage, now: number): number {
  const raw = storage.getItem(SESSION_STARTED_AT_KEY)
  if (raw) {
    const parsed = Number(raw)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  storage.setItem(SESSION_STARTED_AT_KEY, String(now))
  return now
}

export function markSessionStarted(storage: Storage, now: number) {
  storage.setItem(SESSION_STARTED_AT_KEY, String(now))
}

export function clearSessionStartedAt(storage: Storage) {
  storage.removeItem(SESSION_STARTED_AT_KEY)
}
