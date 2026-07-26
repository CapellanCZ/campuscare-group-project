import { createClient } from "@/lib/supabase/server"

/** After a successful sign-in, mark the invite as accepted (status → Active). */
export async function clearInvitePendingAfterSignIn(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ invite_pending: false })
    .eq("id", userId)
    .eq("invite_pending", true)

  if (error) {
    console.error("Could not clear invite_pending after sign-in:", error.message)
  }
}
