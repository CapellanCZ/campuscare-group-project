import { Suspense } from "react"

import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"
import { PhysicianHome } from "@/features/physician/components/physician-home"
import { loadPhysicianWorkspace } from "@/features/physician/data/queries"
import { StateBlock } from "@/features/common/components/state-block"

async function PhysicianDashboardContent() {
  const workspace = await loadPhysicianWorkspace()
  return <PhysicianHome workspace={workspace} />
}

export default function PhysicianDashboardPage() {
  return (
    <RoleRouteGuard expectedRole="physician">
      <Suspense fallback={<StateBlock state="loading" />}>
        <PhysicianDashboardContent />
      </Suspense>
    </RoleRouteGuard>
  )
}
