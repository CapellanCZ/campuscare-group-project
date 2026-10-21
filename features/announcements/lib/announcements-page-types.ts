import type {
  AnnouncementListResult,
  AnnouncementStats,
} from "@/types/announcement"

export type AnnouncementsPageBundle = {
  feed: AnnouncementListResult
  list: AnnouncementListResult
  stats: AnnouncementStats
}
