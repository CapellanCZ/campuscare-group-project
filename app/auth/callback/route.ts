import { NextResponse } from "next/server"

import { clearInvitePendingAfterSignIn } from "@/lib/auth/clear-invite-pending"
import { hasCampusAccess } from "@/lib/auth/campus-access"
import { homePathForDesignation } from "@/lib/auth/home-path"
import {
  hasApprovedClinicAccess,
  resolveClinicRole,
  type ProfileRoleFields,
} from "@/lib/auth/resolve-role"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const nextParam = searchParams.get("next")

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
    .from("users")
    .select("primary_role, is_active")
    .eq("id", user.id)
    .maybeSingle()

  const gate = profile as ProfileRoleFields | null

  const membershipOk = await hasCampusAccess(
    supabase,
    user.id,
    gate?.primary_role
  )

  if (!hasApprovedClinicAccess(gate) || !membershipOk) {
    return NextResponse.redirect(`${origin}/auth/pending`)
  }

  await clearInvitePendingAfterSignIn(user.id)

  const clinicRole = resolveClinicRole(gate)
  const home = clinicRole
    ? homePathForDesignation(clinicRole)
    : "/auth/pending"

  const next =
    nextParam?.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : home

  return NextResponse.redirect(`${origin}${next}`)
}
