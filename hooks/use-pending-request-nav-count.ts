"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useOptionalStaffAccess } from "@/components/staff-access-provider"
import { fetchConsultationRequestStatsAction } from "@/features/requests/actions"
import {
  getCachedRequests,
  loadRequestsBundle,
  REQUESTS_STATS_EVENT,
} from "@/features/requests/lib/prefetch-requests"
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"
import {
  requestsCacheKey,
  staffCacheIsFresh,
} from "@/lib/ui/staff-data-cache"

/**
 * Live pending consultation-request count for sidebar nav badges.
 * Seeds from the shared requests page cache so shell mount does not add an
 * extra stats POST when the requests bundle is already warm / in-flight.
 */
export function usePendingRequestNavCount(enabled: boolean) {
  const access = useOptionalStaffAccess()
  const role = access?.designation
  const [count, setCount] = useState(() =>
    role ? (getCachedRequests(role)?.stats.pending ?? 0) : 0
  )
  const [bumped, setBumped] = useState(false)
  const previous = useRef<number | null>(
    role ? (getCachedRequests(role)?.stats.pending ?? null) : null
  )
  const bumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyCount = useCallback((next: number) => {
    if (previous.current != null && next > previous.current) {
      setBumped(true)
      if (bumpTimer.current) clearTimeout(bumpTimer.current)
      bumpTimer.current = setTimeout(() => setBumped(false), 900)
    }
    previous.current = next
    setCount(next)
  }, [])

  const refresh = useCallback(
    async (options?: { force?: boolean }) => {
      if (!enabled || !role) return

      if (!options?.force && staffCacheIsFresh(requestsCacheKey(role))) {
        const hit = getCachedRequests(role)
        if (hit) {
          applyCount(hit.stats.pending ?? 0)
          return
        }
      }

      try {
        const bundle = await loadRequestsBundle(role, {
          force: options?.force,
        })
        applyCount(bundle.stats.pending ?? 0)
      } catch {
        try {
          const result = await fetchConsultationRequestStatsAction()
          if (!result.ok) return
          applyCount(result.data.pending ?? 0)
        } catch {
          // Auth/network blip — keep last painted count.
        }
      }
    },
    [applyCount, enabled, role]
  )

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

  // Keep badge in sync when the requests page optimistically updates cache.
  useEffect(() => {
    if (!enabled || !role) return
    const onStats = (event: Event) => {
      const detail = (event as CustomEvent<{ role?: string; pending?: number }>)
        .detail
      if (detail?.role && detail.role !== role) return
      if (typeof detail?.pending === "number") {
        applyCount(detail.pending)
        return
      }
      const hit = getCachedRequests(role)
      if (hit) applyCount(hit.stats.pending ?? 0)
    }
    window.addEventListener(REQUESTS_STATS_EVENT, onStats)
    return () => window.removeEventListener(REQUESTS_STATS_EVENT, onStats)
  }, [applyCount, enabled, role])

  useStaffRealtimeRefresh(
    "nav-pending-requests",
    enabled ? STAFF_REALTIME_TABLES.requests : [],
    () => {
      void refresh({ force: true })
    },
    450
  )

  return { count, bumped }
}
