import { redirect } from "next/navigation"

/** Schedule lives under Profile and Settings for dentists. */
export default function DentistScheduleRedirectPage() {
  redirect("/dentist/settings")
}
