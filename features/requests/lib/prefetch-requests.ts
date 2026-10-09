"use client"

import {
  fetchConsultationRequestsAction,
  fetchConsultationRequestStatsAction,
} from "@/features/requests/actions"
import type { ClinicDesignation } from "@/lib/auth/types"
import {
  requestsCacheKey,
  staffCacheGet,
  staffCacheLoad,
  staffCacheSet,
} from "@/lib/ui/staff-data-cache"
import { NURSE_REQUEST_TAB_STATUSES } from "@/types/appointmentRequest"
import type {
  AppointmentRequestListResult,
  AppointmentRequestStats,
} from "@/types/appointmentRequest"

export type RequestsPageBundle = {
  list: AppointmentRequestListResult
  stats: AppointmentRequestStats
}

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
}

export async function loadRequestsBundle(
  role: ClinicDesignation,
  options?: { force?: boolean }
): Promise<RequestsPageBundle> {
  return staffCacheLoad(
    requestsCacheKey(role),
    async () => {
      const [listResult, statsResult] = await Promise.all([
        fetchConsultationRequestsAction({
          query: "",
          status: "all",
          statuses: role === "nurse" ? NURSE_REQUEST_TAB_STATUSES : undefined,
          page: 1,
          pageSize: 50,
        }),
        fetchConsultationRequestStatsAction(),
      ])
      if (!listResult.ok) throw new Error(listResult.error)
      if (!statsResult.ok) throw new Error(statsResult.error)
      return { list: listResult.data, stats: statsResult.data }
    },
    options
  )
}

export function prefetchRequestsPage(role: ClinicDesignation) {
  void loadRequestsBundle(role)
}
