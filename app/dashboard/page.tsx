import { redirect } from "next/navigation"

/** Legacy shared dashboard — send signed-in users to their role home. */
export default async function LegacyDashboardRedirectPage() {
  redirect("/auth/continue")
}
