import { redirect } from "next/navigation"

import { getStaffAccess } from "@/lib/auth/access"
import {
  DEV_BYPASS_ROLE,
  isDevAuthBypassEnabled,
} from "@/lib/auth/dev-bypass"
import {
  dashboardPathForRole,
  roleRequiresClinicMembership,
} from "@/lib/auth/redirects"

export default async function DashboardPage() {
  const access = await getStaffAccess()

  if (!access) {
    if (isDevAuthBypassEnabled()) {
      redirect(dashboardPathForRole(DEV_BYPASS_ROLE))
    }
    redirect("/login")
  }

  if (
    roleRequiresClinicMembership(access.primaryRole) &&
    !access.hasClinicMembership
  ) {
    redirect("/auth/pending")
  }

  redirect(dashboardPathForRole(access.primaryRole))
}
