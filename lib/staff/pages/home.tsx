import { redirect } from "next/navigation"

import { RoleDashboard } from "@/components/dashboard/role-dashboard"
import { getStaffAccess } from "@/lib/auth/access"

/**
 * Auth-only RSC — paint instantly from session cache; soft-revalidate on client.
 */
export default async function StaffHomePage() {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) redirect("/login")

  return <RoleDashboard access={access} hydrateFromCache />
}
