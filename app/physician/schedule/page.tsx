import { redirect } from "next/navigation"

/** Schedule lives under Account settings for physicians. */
export default function PhysicianScheduleRedirectPage() {
  redirect("/physician/settings")
}
