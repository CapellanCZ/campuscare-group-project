import { createAdminClient } from "@/lib/supabase/admin"

/** After a successful sign-in, mark the invite as accepted (status → Active). */
export async function clearInvitePendingAfterSignIn(userId: string) {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("users")
      .update({ invite_pending: false })
      .eq("id", userId)
      .eq("invite_pending", true)

    if (error) {
      console.error(
        "Could not clear invite_pending after sign-in:",
        error.message
      )
    }
  } catch (error) {
    console.error(
      "Could not clear invite_pending after sign-in:",
      error instanceof Error ? error.message : error
    )
  }
}
