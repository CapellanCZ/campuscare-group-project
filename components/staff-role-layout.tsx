import { redirect } from "next/navigation"

import { IdleSessionProvider } from "@/components/auth/idle-session-provider"
import { AppShell } from "@/components/app-shell"
import { getStaffAccess } from "@/lib/auth/access"
import {
  homePathForDesignation,
  type StaffRouteRole,
} from "@/lib/auth/home-path"

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

  return (
    <IdleSessionProvider>
      <AppShell access={access}>{children}</AppShell>
    </IdleSessionProvider>
  )
}
