import { redirect } from "next/navigation"

import { getStaffAccess } from "@/lib/auth/access"
import { homePathForDesignation } from "@/lib/auth/home-path"

/** Post-login hop: resolves designation and sends the user to their home. */
export default async function AuthContinuePage() {
  const access = await getStaffAccess()

  if (!access) {
    redirect("/login")
  }

  if (!access.hasClinicMembership) {
    redirect("/auth/pending")
  }

  redirect(homePathForDesignation(access.primaryRole))
}
