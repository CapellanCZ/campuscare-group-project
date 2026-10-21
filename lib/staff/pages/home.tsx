import { Suspense } from "react"
import { redirect } from "next/navigation"

import { RoleDashboard } from "@/components/dashboard/role-dashboard"
import { StaffContentSkeleton } from "@/components/dashboard/staff-content-skeleton"
import { getStaffAccess } from "@/lib/auth/access"
import { loadDashboardPageData } from "@/features/dashboard/lib/load-dashboard-page.server"

async function HomePageData() {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) redirect("/login")

  const bundle = await loadDashboardPageData(access)

  return (
    <RoleDashboard
      access={access}
      hydrateFromCache={false}
      kpis={bundle.kpis}
      tickets={bundle.tickets}
      boards={bundle.boards}
      activity={bundle.activity}
      recent={bundle.recent}
      stats={bundle.stats}
      summary={bundle.summary}
      ops={bundle.ops}
    />
  )
}

export default function StaffHomePage() {
  return (
    <Suspense fallback={<StaffContentSkeleton />}>
      <HomePageData />
    </Suspense>
  )
}
