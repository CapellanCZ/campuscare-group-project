import { Suspense } from "react"

import { StateBlock } from "@/features/common/components/state-block"
import { PhysicianPatientsPage } from "@/features/physician/components/physician-patients-page"
import { loadPhysicianWorkspace } from "@/features/physician/data/queries"

async function Content() {
  const workspace = await loadPhysicianWorkspace()
  return <PhysicianPatientsPage workspace={workspace} />
}

export default function Page() {
  return (
    <Suspense fallback={<StateBlock state="loading" />}>
      <Content />
    </Suspense>
  )
}
