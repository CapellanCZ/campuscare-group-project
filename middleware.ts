import { NextResponse, type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  const { supabase, user, supabaseResponse } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isDashboard = pathname.startsWith("/dashboard")
  const isPending = pathname.startsWith("/auth/pending")

  if (!user && (isDashboard || isPending)) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  if (user && (isDashboard || isPending)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.is_active) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }

    const { data: membership } = await supabase
      .from("clinic_members")
      .select("clinic_id")
      .eq("profile_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()

    const hasMembership = Boolean(membership)

    if (isDashboard && !hasMembership) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/pending"
      return NextResponse.redirect(url)
    }

    if (isPending && hasMembership) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
