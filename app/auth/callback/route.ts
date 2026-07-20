import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const nextParam = searchParams.get("next")
  const next =
    nextParam?.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard"

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const { data: membership } = await supabase
    .from("clinic_members")
    .select("clinic_id")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return NextResponse.redirect(`${origin}/auth/pending`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
