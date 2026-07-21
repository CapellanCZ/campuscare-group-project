import { NextResponse } from "next/server"

import {
  dashboardPathForRole,
  roleRequiresClinicMembership,
} from "@/lib/auth/redirects"
import { normalizeWebRole } from "@/lib/auth/types"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("primary_role")
    .eq("id", user.id)
    .maybeSingle()

  const { data: membership } = await supabase
    .from("clinic_members")
    .select("clinic_id")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  const role = normalizeWebRole(profile?.primary_role)
  if (roleRequiresClinicMembership(role) && !membership) {
    return NextResponse.redirect(`${origin}/auth/pending`)
  }

  const rolePath = dashboardPathForRole(role)
  return NextResponse.redirect(`${origin}${rolePath}`)
}
