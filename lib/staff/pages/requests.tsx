import { Suspense } from "react"

import { RequestsPage } from "@/components/requests/requests-demo-page"
import { StaffContentSkeleton } from "@/components/dashboard/staff-content-skeleton"
import { requireStaffModule } from "@/lib/auth/require-module"
import { loadRequestsPageData } from "@/features/requests/lib/load-requests-page.server"

async function RequestsPageData() {
  const access = await requireStaffModule("consultation_requests")
  const { list, stats } = await loadRequestsPageData(access)

  return (
    <RequestsPage
      access={access}
      initialList={list}
      initialStats={stats}
      hydrateFromCache={false}
    />
  )
}

export default function StaffRequestsPage() {
  return (
    <Suspense fallback={<StaffContentSkeleton />}>
      <RequestsPageData />
    </Suspense>
  )
}
