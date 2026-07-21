import { redirect } from "next/navigation"

import { getStaffAccess } from "@/lib/auth/access"
import {
  dashboardPathForRole,
  roleRequiresClinicMembership,
} from "@/lib/auth/redirects"
import type { WebRole } from "@/lib/auth/types"
import { RoleShell } from "@/components/dashboard/role-shell"

type RoleRouteGuardProps = {
  expectedRole: WebRole
  children: React.ReactNode
}

export async function RoleRouteGuard({
  expectedRole,
  children,
}: RoleRouteGuardProps) {
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

  if (access.primaryRole !== expectedRole) {
    redirect(dashboardPathForRole(access.primaryRole))
  }

  return <RoleShell role={expectedRole}>{children}</RoleShell>
}
