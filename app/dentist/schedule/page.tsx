import { redirect } from "next/navigation"

/** Schedule lives under Account settings for dentists. */
export default function DentistScheduleRedirectPage() {
  redirect("/dentist/settings")
}
