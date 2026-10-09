"use client"

import {
  loadDashboardPageAction,
  type DashboardPageBundle,
} from "@/features/dashboard/actions"
import type { ClinicDesignation } from "@/lib/auth/types"
import {
  dashboardCacheKey,
  staffCacheGet,
  staffCacheLoad,
  staffCacheSet,
} from "@/lib/ui/staff-data-cache"

export function getCachedDashboard(
  role: ClinicDesignation
): DashboardPageBundle | null {
  return staffCacheGet<DashboardPageBundle>(dashboardCacheKey(role))
}

export function saveDashboardCache(
  role: ClinicDesignation,
  bundle: DashboardPageBundle
) {
  staffCacheSet(dashboardCacheKey(role), bundle)
}

export async function loadDashboardBundle(
  role: ClinicDesignation,
  options?: { force?: boolean }
): Promise<DashboardPageBundle> {
  return staffCacheLoad(
    dashboardCacheKey(role),
    async () => {
      const result = await loadDashboardPageAction()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    options
  )
}

/** Warm dashboard payload before the nav click lands. */
export function prefetchDashboardPage(role: ClinicDesignation) {
  void loadDashboardBundle(role)
}
