"use server"

import { getStaffAccess } from "@/lib/auth/access"
import { loadAdminOpsSnapshot } from "@/features/admin/data/ops-snapshot"
import {
  enrichDashboardKpis,
  getDashboardBundle,
} from "@/lib/health/dashboard-queries"
import { loadRoleDashboardSummary } from "@/lib/health/load-role-dashboard-summary"
import {
  getNurseRecentlyServed,
} from "@/lib/health/queue-queries"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import type {
  ActivityItem,
  DashboardKpis,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
  StationBoard,
} from "@/lib/health/types"
import type { AdminOpsSnapshot } from "@/features/admin/types/ops"

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

export type DashboardActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function loadDashboardPageAction(): Promise<
  DashboardActionResult<DashboardPageBundle>
> {
  try {
    const access = await getStaffAccess()
    if (!access?.hasClinicMembership) {
      return { ok: false, error: "Not signed in." }
    }

    const bundle = await getDashboardBundle(access.designation)
    const summary = await loadRoleDashboardSummary({
      designation: access.designation,
      userId: access.userId,
      allTickets: bundle.allTickets,
      checkedIn: bundle.stats.checkedIn,
    })
    const kpis = enrichDashboardKpis(
      access.designation,
      bundle.kpis,
      summary,
      bundle.allTickets
    )

    const recent =
      access.designation === "nurse"
        ? await getNurseRecentlyServed(6, bundle.allTickets)
        : bundle.recent

    const ops =
      access.designation === "admin" ? await loadAdminOpsSnapshot() : null

    return {
      ok: true,
      data: {
        kpis,
        tickets: bundle.tickets,
        boards: bundle.boards,
        activity: bundle.activity,
        recent,
        stats: bundle.stats,
        summary,
        ops,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not load dashboard. Please try again.",
    }
  }
}
