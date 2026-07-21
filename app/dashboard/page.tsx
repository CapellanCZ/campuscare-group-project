import { redirect } from "next/navigation"

import { getStaffAccess } from "@/lib/auth/access"
import {
  dashboardPathForRole,
  roleRequiresClinicMembership,
} from "@/lib/auth/redirects"

export default async function DashboardPage() {
  const access = await getStaffAccess()

  if (!access) {
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
