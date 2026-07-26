import { redirect } from "next/navigation"

/** Legacy /dashboard/* bookmarks → role home resolver. */
export default function LegacyDashboardCatchAllPage() {
  redirect("/auth/continue")
}
