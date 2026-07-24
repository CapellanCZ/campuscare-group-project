import { Suspense } from "react"

import { StateBlock } from "@/features/common/components/state-block"
import { PhysicianReportsPage } from "@/features/physician/components/physician-reports-page"
import { loadPhysicianWorkspace } from "@/features/physician/data/queries"

async function Content() {
  const workspace = await loadPhysicianWorkspace()
  return <PhysicianReportsPage workspace={workspace} />
}

export default function Page() {
  return (
    <Suspense fallback={<StateBlock state="loading" />}>
      <Content />
    </Suspense>
  )
}
