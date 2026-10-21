import { Suspense } from "react"

import { QueuePage } from "@/components/queue/queue-page"
import { StaffContentSkeleton } from "@/components/dashboard/staff-content-skeleton"
import { requireStaffModule } from "@/lib/auth/require-module"
import { loadQueuePageData } from "@/features/queue/lib/load-queue-page.server"

async function QueuePageData() {
  const access = await requireStaffModule("queue_management")
  const bundle = await loadQueuePageData(access)

  return (
    <QueuePage
      access={access}
      tickets={bundle.tickets}
      stats={bundle.stats}
      boards={bundle.boards}
      recent={bundle.recent}
      activity={bundle.activity}
      hydrateFromCache={false}
    />
  )
}

export default function StaffQueuePage() {
  return (
    <Suspense fallback={<StaffContentSkeleton />}>
      <QueuePageData />
    </Suspense>
  )
}
