import type {
  ActivityItem,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
  StationBoard,
} from "@/lib/health/types"

export type QueuePageBundle = {
  tickets: QueueTicketRow[]
  stats: QueueStats
  boards: StationBoard[]
  recent: RecentlyServedItem[]
  activity: ActivityItem[]
}
