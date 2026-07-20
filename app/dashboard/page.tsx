import { redirect } from "next/navigation"

import { AppShell } from "@/components/app-shell"
import { Dashboard } from "@/components/dashboard"
import { getStaffAccess } from "@/lib/auth/access"

export default async function DashboardPage() {
  const access = await getStaffAccess()

  if (!access) {
    redirect("/")
  }

  if (!access.hasClinicMembership) {
    redirect("/auth/pending")
  }

  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  )
}
