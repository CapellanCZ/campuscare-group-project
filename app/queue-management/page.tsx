import { redirect } from "next/navigation"

import { getStaffAccess } from "@/lib/auth/access"
import { homePathForDesignation } from "@/lib/auth/home-path"

export default async function QueueManagementIndexPage() {
  const access = await getStaffAccess()

  if (!access) {
    redirect("/login")
  }

  if (access.designation === "queue_display") {
    redirect("/queue-management/display")
  }

  if (access.hasClinicMembership) {
    redirect(`${homePathForDesignation(access.primaryRole)}/queue`)
  }

  redirect("/auth/pending")
}
