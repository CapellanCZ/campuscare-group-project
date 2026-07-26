import { Suspense } from "react"

import { StateBlock } from "@/features/common/components/state-block"
import { PhysicianAppointmentsPage } from "@/features/physician/components/physician-appointments-page"
import { loadPhysicianWorkspace } from "@/features/physician/data/queries"

async function Content() {
  const workspace = await loadPhysicianWorkspace()
  return <PhysicianAppointmentsPage workspace={workspace} />
}

export default function Page() {
  return (
    <Suspense fallback={<StateBlock state="loading" />}>
      <Content />
    </Suspense>
  )
}
