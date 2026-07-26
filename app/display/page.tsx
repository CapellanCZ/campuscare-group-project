import { redirect } from "next/navigation"

/** Legacy TV bookmark — public board now lives under queue-management. */
export default function DisplayRedirectPage() {
  redirect("/queue-management/display")
}
