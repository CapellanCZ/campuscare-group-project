import { QueuePage } from "@/components/queue/queue-page"
import { requireStaffModule } from "@/lib/auth/require-module"
import { computeQueueStats } from "@/lib/health/queue-queries"

/**
 * Auth-only RSC — paint instantly from session cache; soft-revalidate on client.
 */
export default async function StaffQueuePage() {
  const access = await requireStaffModule("queue_management")

  return (
    <QueuePage
      access={access}
      tickets={[]}
      stats={computeQueueStats([])}
      boards={[]}
      recent={[]}
      activity={[]}
      hydrateFromCache
    />
  )
}
