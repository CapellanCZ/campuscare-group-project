"use server"

import { getStaffAccess } from "@/lib/auth/access"
import { loadDashboardPageData } from "@/features/dashboard/lib/load-dashboard-page.server"
import type { DashboardPageBundle } from "@/features/dashboard/lib/dashboard-page-types"

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

    return { ok: true, data: await loadDashboardPageData(access) }
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
