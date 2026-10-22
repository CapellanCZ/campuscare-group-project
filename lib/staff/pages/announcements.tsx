import { AnnouncementsPage } from "@/components/announcements/announcements-demo-page"
import { requireStaffModule } from "@/lib/auth/require-module"
import type { AnnouncementListResult } from "@/types/announcement"

/**
 * Auth-only RSC — paint instantly from session cache; soft-revalidate on client.
 */
export default async function StaffAnnouncementsPage() {
  const access = await requireStaffModule("announcements")

  const emptyList: AnnouncementListResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  }

  return (
    <AnnouncementsPage
      access={access}
      initialFeed={emptyList}
      initialList={emptyList}
      initialStats={{
        published: 0,
        scheduled: 0,
        drafts: 0,
        total: 0,
      }}
      hydrateFromCache
    />
  )
}
