import { Suspense } from "react"

import { AnnouncementsPage } from "@/components/announcements/announcements-demo-page"
import { StaffContentSkeleton } from "@/components/dashboard/staff-content-skeleton"
import { requireStaffModule } from "@/lib/auth/require-module"
import { loadAnnouncementsPageData } from "@/features/announcements/lib/load-announcements-page.server"

async function AnnouncementsPageData() {
  const access = await requireStaffModule("announcements")
  const { feed, list, stats } = await loadAnnouncementsPageData(access)

  return (
    <AnnouncementsPage
      access={access}
      initialFeed={feed}
      initialList={list}
      initialStats={stats}
      hydrateFromCache={false}
    />
  )
}

export default function StaffAnnouncementsPage() {
  return (
    <Suspense fallback={<StaffContentSkeleton />}>
      <AnnouncementsPageData />
    </Suspense>
  )
}
