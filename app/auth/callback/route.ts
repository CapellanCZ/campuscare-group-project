import { NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

import { ensureStaffSession } from "@/lib/auth/ensure-staff-session"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const authError = searchParams.get("error")
  const authErrorDescription = searchParams.get("error_description")

  if (authError) {
    const loginUrl = new URL("/login", origin)
    loginUrl.searchParams.set(
      "error",
      authErrorDescription?.trim() || authError
    )
    return NextResponse.redirect(loginUrl)
  }

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/auth/error`)
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    })
    if (error) {
      return NextResponse.redirect(`${origin}/auth/error`)
    }
  } else {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  await ensureStaffSession(user.id)

  return NextResponse.redirect(`${origin}/auth/continue`)
}
