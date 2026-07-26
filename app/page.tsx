import { redirect } from "next/navigation"

/** Site root → landing folder route. */
export default function RootPage() {
  redirect("/landing")
}
