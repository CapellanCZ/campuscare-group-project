import { QueueDisplay } from "@/components/display/queue-display"
import { getPublicQueueSnapshot } from "@/lib/health/queue-queries"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function QueueManagementDisplayPage() {
  const snapshot = await getPublicQueueSnapshot()

  return (
    <QueueDisplay
      initialBoards={snapshot.boards}
      initialRecentlyServed={snapshot.recentlyServed}
      initialTotalWaiting={snapshot.totalWaiting}
    />
  )
}
