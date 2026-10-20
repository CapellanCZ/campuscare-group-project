"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { fetchConsultationRequestStatsAction } from "@/features/requests/actions"
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"

/**
 * Live pending consultation-request count for sidebar nav badges.
 * Refreshes when appointments change (mobile bookings, nurse actions).
 */
export function usePendingRequestNavCount(enabled: boolean) {
  const [count, setCount] = useState(0)
  const [bumped, setBumped] = useState(false)
  const previous = useRef<number | null>(null)
  const bumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    const result = await fetchConsultationRequestStatsAction()
    if (!result.ok) return
    const next = result.data.pending ?? 0
    if (previous.current != null && next > previous.current) {
      setBumped(true)
      if (bumpTimer.current) clearTimeout(bumpTimer.current)
      bumpTimer.current = setTimeout(() => setBumped(false), 900)
    }
    previous.current = next
    setCount(next)
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setCount(0)
      previous.current = null
      return
    }
    void refresh()
    return () => {
      if (bumpTimer.current) clearTimeout(bumpTimer.current)
    }
  }, [enabled, refresh])

  useStaffRealtimeRefresh(
    "nav-pending-requests",
    enabled ? STAFF_REALTIME_TABLES.requests : [],
    refresh,
    450
  )

  return { count, bumped }
}
