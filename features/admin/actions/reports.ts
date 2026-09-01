"use server"

import { loadAdminReportsAggregates } from "@/features/admin/data/reports-aggregates"
import type { AdminReportsAggregates } from "@/features/admin/types/ops"
import type { ReportFilters } from "@/features/reports/types"
import { getStaffAccess } from "@/lib/auth/access"

export async function reloadAdminReportsAction(
  filters: Pick<
    ReportFilters,
    "dateFrom" | "dateTo" | "consultationType" | "patientType" | "status"
  >
): Promise<AdminReportsAggregates> {
  const access = await getStaffAccess()
  if (!access || (access.primaryRole !== "admin" && access.primaryRole !== "nurse")) {
    return {
      generatedAt: new Date().toISOString(),
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      kpis: [],
      charts: [],
      tables: [],
      statusOptions: [],
      error: "Unauthorized.",
    }
  }
  return loadAdminReportsAggregates(
    filters,
    access.primaryRole === "nurse" ? "nurse" : "admin"
  )
}
