"use client"

import { loadAnnouncementsPageAction } from "@/features/announcements/actions"
import type { AnnouncementsPageBundle } from "@/features/announcements/lib/announcements-page-types"
import type { ClinicDesignation } from "@/lib/auth/types"
import {
  announcementsCacheKey,
  staffCacheGet,
  staffCacheLoad,
  staffCacheSet,
} from "@/lib/ui/staff-data-cache"

export type { AnnouncementsPageBundle }

export function getCachedAnnouncements(
  role: ClinicDesignation
): AnnouncementsPageBundle | null {
  return staffCacheGet<AnnouncementsPageBundle>(announcementsCacheKey(role))
}

export function saveAnnouncementsCache(
  role: ClinicDesignation,
  bundle: AnnouncementsPageBundle
) {
  staffCacheSet(announcementsCacheKey(role), bundle)
}

export async function loadAnnouncementsBundle(
  role: ClinicDesignation,
  options?: { force?: boolean }
): Promise<AnnouncementsPageBundle> {
  return staffCacheLoad(
    announcementsCacheKey(role),
    async () => {
      const result = await loadAnnouncementsPageAction()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    options
  )
}

export function prefetchAnnouncementsPage(role: ClinicDesignation) {
  void loadAnnouncementsBundle(role)
}
