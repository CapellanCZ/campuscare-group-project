"use client"

/**
 * Single-flight client loader for duty/break status.
 * DutyStatusProvider and BreakModeProvider both need the same payload —
 * without this, every mount and DUTY_REFRESH_EVENT doubles server work.
 */

import { loadMyBreakBundle } from "@/features/availability/actions/availability"
import {
  getSessionBreakBundle,
  saveSessionBreakBundle,
  type SessionBreakBundle,
} from "@/lib/availability/session-duty-cache"

const EMPTY_BUNDLE: SessionBreakBundle = {
  clinicBreak: null,
  staffBreak: null,
  dutyStatus: {
    status: "not_available",
    dutyStartedAt: null,
    dutyEndedAt: null,
    updatedAt: null,
  },
  role: null,
}

let inflight: Promise<SessionBreakBundle> | null = null

/** Always coalesces concurrent callers into one server round-trip. */
export async function loadBreakBundleOnce(): Promise<SessionBreakBundle> {
  if (inflight) return inflight

  const request = loadMyBreakBundle()
    .then((bundle) => {
      saveSessionBreakBundle(bundle)
      return bundle
    })
    .catch((error) => {
      // Avoid unhandledRejection when the flight payload is interrupted
      // (auth blip, stale Fast Refresh, etc.). Prefer last good session cache.
      console.warn("[duty] loadMyBreakBundle failed", error)
      return getSessionBreakBundle() ?? EMPTY_BUNDLE
    })
    .finally(() => {
      if (inflight === request) inflight = null
    })

  inflight = request
  return request
}
