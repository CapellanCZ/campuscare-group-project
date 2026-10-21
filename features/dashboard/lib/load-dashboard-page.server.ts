import "server-only"

import { loadAdminOpsSnapshot } from "@/features/admin/data/ops-snapshot"
import type { DashboardPageBundle } from "@/features/dashboard/lib/dashboard-page-types"
import type { StaffAccess } from "@/lib/auth/types"
import {
  enrichDashboardKpis,
  getDashboardBundle,
} from "@/lib/health/dashboard-queries"
import { loadRoleDashboardSummary } from "@/lib/health/load-role-dashboard-summary"
import { getNurseRecentlyServed } from "@/lib/health/queue-queries"

/** RSC + server-action shared loader for the role dashboard. */
export async function loadDashboardPageData(
  access: StaffAccess
): Promise<DashboardPageBundle> {
  const bundle = await getDashboardBundle(access.designation)

  const [summary, recent, ops] = await Promise.all([
    loadRoleDashboardSummary({
      designation: access.designation,
      userId: access.userId,
      allTickets: bundle.allTickets,
      checkedIn: bundle.stats.checkedIn,
    }),
    access.designation === "nurse"
      ? getNurseRecentlyServed(6, bundle.allTickets)
      : Promise.resolve(bundle.recent),
    access.designation === "admin"
      ? loadAdminOpsSnapshot()
      : Promise.resolve(null),
  ])

  const kpis = enrichDashboardKpis(
    access.designation,
    bundle.kpis,
    summary,
    bundle.allTickets
  )

  return {
    kpis,
    tickets: bundle.tickets,
    boards: bundle.boards,
    activity: bundle.activity,
    recent,
    stats: bundle.stats,
    summary,
    ops,
  }
}
