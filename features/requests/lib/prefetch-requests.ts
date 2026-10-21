"use client"

import { loadRequestsPageAction } from "@/features/requests/actions"
import type { RequestsPageBundle } from "@/features/requests/lib/requests-page-types"
import type { ClinicDesignation } from "@/lib/auth/types"
import {
  requestsCacheKey,
  staffCacheGet,
  staffCacheLoad,
  staffCacheSet,
} from "@/lib/ui/staff-data-cache"

export type { RequestsPageBundle }

/** Fired whenever the shared requests cache is written (nav badge listens). */
export const REQUESTS_STATS_EVENT = "campuscare:requests-stats"

export function getCachedRequests(
  role: ClinicDesignation
): RequestsPageBundle | null {
  return staffCacheGet<RequestsPageBundle>(requestsCacheKey(role))
}

export function saveRequestsCache(
  role: ClinicDesignation,
  bundle: RequestsPageBundle
) {
  staffCacheSet(requestsCacheKey(role), bundle)
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent(REQUESTS_STATS_EVENT, {
      detail: {
        role,
        pending: bundle.stats.pending ?? 0,
      },
    })
  )
}

export async function loadRequestsBundle(
  role: ClinicDesignation,
  options?: { force?: boolean }
): Promise<RequestsPageBundle> {
  return staffCacheLoad(
    requestsCacheKey(role),
    async () => {
      const result = await loadRequestsPageAction()
      if (!result.ok) throw new Error(result.error)
      // Use saveRequestsCache so the nav badge hears the write.
      saveRequestsCache(role, result.data)
      return result.data
    },
    options
  )
}

export function prefetchRequestsPage(role: ClinicDesignation) {
  void loadRequestsBundle(role)
}
