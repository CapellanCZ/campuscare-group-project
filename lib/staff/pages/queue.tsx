import { QueuePage } from "@/components/queue/queue-page"
import { requireStaffModule } from "@/lib/auth/require-module"
import { computeQueueStats } from "@/lib/health/queue-queries"

export async function StaffQueuePage() {
  const access = await requireStaffModule("queue_management")

  // Auth-only RSC — paint instantly; queue data comes from session cache / client.
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
