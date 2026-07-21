import { Suspense } from "react"

import { StateBlock } from "@/features/common/components/state-block"
import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"
import { PhysicianProfilePage } from "@/features/physician/components/physician-profile-page"
import { loadPhysicianWorkspace } from "@/features/physician/data/queries"

async function Content() {
  const workspace = await loadPhysicianWorkspace()
  return <PhysicianProfilePage workspace={workspace} />
}

export default function Page() {
  return (
    <RoleRouteGuard expectedRole="physician">
      <Suspense fallback={<StateBlock state="loading" />}>
        <Content />
      </Suspense>
    </RoleRouteGuard>
  )
}
