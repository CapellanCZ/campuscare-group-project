"use client"

/**
 * Single-flight client loader for duty/break status.
 * DutyStatusProvider and BreakModeProvider both need the same payload —
 * without this, every mount and DUTY_REFRESH_EVENT doubles server work.
 */

import { loadMyBreakBundle } from "@/features/availability/actions/availability"
import {
  saveSessionBreakBundle,
  type SessionBreakBundle,
} from "@/lib/availability/session-duty-cache"

let inflight: Promise<SessionBreakBundle> | null = null

/** Always coalesces concurrent callers into one server round-trip. */
export async function loadBreakBundleOnce(): Promise<SessionBreakBundle> {
  if (inflight) return inflight

  const request = loadMyBreakBundle()
    .then((bundle) => {
      saveSessionBreakBundle(bundle)
      return bundle
    })
    .finally(() => {
      if (inflight === request) inflight = null
    })

  inflight = request
  return request
}
