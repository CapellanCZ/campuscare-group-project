import { NextResponse } from "next/server"

import { clearInvitePendingAfterSignIn } from "@/lib/auth/clear-invite-pending"
import { createClient } from "@/lib/supabase/server"

/**
 * Completes invite activation using the hashed_token from admin.generateLink.
 * Admin action_link URLs go through Supabase verify and often redirect without a
 * PKCE `code`, which breaks /auth/callback — so we verify token_hash here instead.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get("token_hash")?.trim()
  const typeParam = searchParams.get("type")?.trim() || "email"

  if (!tokenHash) {
    return NextResponse.redirect(`${origin}/auth/error?reason=activation`)
  }

  const type =
    typeParam === "invite" ||
    typeParam === "signup" ||
    typeParam === "magiclink" ||
    typeParam === "recovery" ||
    typeParam === "email_change"
      ? typeParam
      : "email"

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth/error?reason=activation`)
  }

  await clearInvitePendingAfterSignIn(data.user.id)
  await supabase.auth.signOut()

  return NextResponse.redirect(`${origin}/login?activated=1`)
}
