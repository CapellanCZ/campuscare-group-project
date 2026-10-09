"use client"

import {
  fetchAnnouncementStatsAction,
  searchAnnouncementsAction,
} from "@/features/announcements/actions"
import type { ClinicDesignation } from "@/lib/auth/types"
import { canMutate } from "@/lib/auth/permissions"
import {
  announcementsCacheKey,
  staffCacheGet,
  staffCacheLoad,
  staffCacheSet,
} from "@/lib/ui/staff-data-cache"
import type {
  AnnouncementListResult,
  AnnouncementStats,
} from "@/types/announcement"

export type AnnouncementsPageBundle = {
  feed: AnnouncementListResult
  list: AnnouncementListResult
  stats: AnnouncementStats
}

const FEED_PAGE_SIZE = 6
const PAGE_SIZE = 10

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
      const canManage = canMutate(role, "announcements.add")
      const [feedResult, listResult, statsResult] = await Promise.all([
        searchAnnouncementsAction("", {
          page: 1,
          pageSize: FEED_PAGE_SIZE,
          sortBy: "updated_at",
          sortDirection: "desc",
          feed: true,
        }),
        canManage
          ? searchAnnouncementsAction("", {
              page: 1,
              pageSize: PAGE_SIZE,
              sortBy: "updated_at",
              sortDirection: "desc",
            })
          : Promise.resolve({
              ok: true as const,
              data: {
                items: [],
                total: 0,
                page: 1,
                pageSize: PAGE_SIZE,
                totalPages: 1,
              } satisfies AnnouncementListResult,
            }),
        fetchAnnouncementStatsAction(),
      ])
      if (!feedResult.ok) throw new Error(feedResult.error)
      if (!listResult.ok) throw new Error(listResult.error)
      if (!statsResult.ok) throw new Error(statsResult.error)
      return {
        feed: feedResult.data,
        list: listResult.data,
        stats: statsResult.data,
      }
    },
    options
  )
}

export function prefetchAnnouncementsPage(role: ClinicDesignation) {
  void loadAnnouncementsBundle(role)
}
