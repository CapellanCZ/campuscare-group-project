import { ReportsAnalyticsPage } from "@/features/reports/components/reports-analytics-page"
import { loadReportsBundle } from "@/features/reports/data/queries"
import { requireStaffModule } from "@/lib/auth/require-module"
import { getAnnouncements } from "@/services/announcements"

export async function StaffReportsPage() {
  const access = await requireStaffModule("reports")

  if (access.designation === "admin" || access.designation === "nurse") {
    const { defaultFiltersFor } = await import(
      "@/features/reports/data/apply-filters"
    )
    const { loadAdminReportsAggregates } = await import(
      "@/features/admin/data/reports-aggregates"
    )
    const filters = defaultFiltersFor(access.designation)
    const aggregates = await loadAdminReportsAggregates(
      filters,
      access.designation === "nurse" ? "nurse" : "admin"
    )
    return (
      <ReportsAnalyticsPage
        access={access}
        initialAdminFilters={filters}
        initialAdminAggregates={aggregates}
      />
    )
  }

  const bundle = await loadReportsBundle(access.designation)

  let announcements: Awaited<ReturnType<typeof getAnnouncements>> | undefined
  announcements = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 6,
    totalPages: 1,
  }
  try {
    announcements = await getAnnouncements({
      page: 1,
      pageSize: 6,
      sortBy: "updated_at",
      sortDirection: "desc",
      feed: true,
    })
  } catch {
    // Reports still render without the announcements strip.
  }

  return (
    <ReportsAnalyticsPage
      access={access}
      initialBundle={bundle}
      initialAnnouncements={announcements}
    />
  )
}
