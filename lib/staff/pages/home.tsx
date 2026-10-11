import { redirect } from "next/navigation"

import { RoleDashboard } from "@/components/dashboard/role-dashboard"
import { getStaffAccess } from "@/lib/auth/access"

export async function StaffHomePage() {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) redirect("/login")

  // Auth-only RSC — chrome paints immediately; KPIs hydrate from cache / client.
  return <RoleDashboard access={access} hydrateFromCache />
}
