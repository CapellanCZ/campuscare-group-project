import { redirect } from "next/navigation"

import { StaffSessionShell } from "@/components/staff-session-shell"
import { AppShell } from "@/components/app-shell"
import { getStaffAccess } from "@/lib/auth/access"
import {
  homePathForDesignation,
  type StaffRouteRole,
} from "@/lib/auth/home-path"
import { getUserPreferences } from "@/services/staff-profile"

export async function StaffRoleLayout({
  role,
  children,
}: {
  role: StaffRouteRole
  children: React.ReactNode
}) {
  const access = await getStaffAccess()

  if (!access) {
    redirect("/login")
  }

  if (!access.hasClinicMembership) {
    if (access.primaryRole === "queue_display") {
      redirect("/queue-management/display")
    }
    redirect("/auth/pending")
  }

  if (access.primaryRole === "queue_display") {
    redirect("/queue-management/display")
  }

  if (access.primaryRole !== role) {
    redirect(homePathForDesignation(access.primaryRole))
  }

  const preferences = await getUserPreferences(access.userId)

  return (
    <StaffSessionShell>
      <AppShell access={access} initialTheme={preferences.theme}>
        {children}
      </AppShell>
    </StaffSessionShell>
  )
}
