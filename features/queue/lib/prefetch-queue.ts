"use client"

import {
  loadQueuePageAction,
  type QueuePageBundle,
} from "@/features/queue/actions"
import type { ClinicDesignation } from "@/lib/auth/types"
import {
  queueCacheKey,
  staffCacheGet,
  staffCacheLoad,
  staffCacheSet,
} from "@/lib/ui/staff-data-cache"

export function getCachedQueue(
  role: ClinicDesignation
): QueuePageBundle | null {
  return staffCacheGet<QueuePageBundle>(queueCacheKey(role))
}

export function saveQueueCache(
  role: ClinicDesignation,
  bundle: QueuePageBundle
) {
  staffCacheSet(queueCacheKey(role), bundle)
}

export async function loadQueueBundle(
  role: ClinicDesignation,
  options?: { force?: boolean }
): Promise<QueuePageBundle> {
  return staffCacheLoad(
    queueCacheKey(role),
    async () => {
      const result = await loadQueuePageAction()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    options
  )
}

export function prefetchQueuePage(role: ClinicDesignation) {
  void loadQueueBundle(role)
}
