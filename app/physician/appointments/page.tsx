import { redirect } from "next/navigation"

/** Appointments board removed from physician portal. */
export default function Page() {
  redirect("/physician")
}
