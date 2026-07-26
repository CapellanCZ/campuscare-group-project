import { redirect } from "next/navigation"

import { getStaffAccess } from "@/lib/auth/access"
import { homePathForDesignation } from "@/lib/auth/home-path"
import { canViewModule, type NavModule } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"

export async function requireStaffModule(
  module: NavModule
): Promise<StaffAccess> {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) {
    redirect("/login")
  }
  if (!canViewModule(access.designation, module)) {
    redirect(homePathForDesignation(access.designation))
  }
  return access
}
