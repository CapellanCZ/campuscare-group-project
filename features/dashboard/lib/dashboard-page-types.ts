import type { AdminOpsSnapshot } from "@/features/admin/types/ops"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import type {
  ActivityItem,
  DashboardKpis,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
  StationBoard,
} from "@/lib/health/types"

export type DashboardPageBundle = {
  kpis: DashboardKpis
  tickets: QueueTicketRow[]
  boards: StationBoard[]
  activity: ActivityItem[]
  recent: RecentlyServedItem[]
  stats: QueueStats
  summary: RoleDashboardSummary
  ops: AdminOpsSnapshot | null
}
