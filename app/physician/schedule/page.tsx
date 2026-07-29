import { Suspense } from "react"
import { redirect } from "next/navigation"

import { StateBlock } from "@/features/common/components/state-block"
import { StaffSchedulePage } from "@/features/availability/components/staff-schedule-page"
import { getStaffAccess } from "@/lib/auth/access"
import {
  getClinicHours,
  getStaffWeeklyHours,
} from "@/lib/availability/queries"

async function Content() {
  const access = await getStaffAccess()
  if (!access || access.primaryRole !== "physician") {
    redirect("/login")
  }

  const [availability, clinicHours] = await Promise.all([
    getStaffWeeklyHours(access.userId),
    getClinicHours(),
  ])

  return (
    <StaffSchedulePage
      role="physician"
      doctorName={access.fullName}
      availability={availability}
      clinicHours={clinicHours}
    />
  )
}

export default function Page() {
  return (
    <Suspense fallback={<StateBlock state="loading" />}>
      <Content />
    </Suspense>
  )
}
