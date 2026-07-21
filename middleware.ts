import { NextResponse, type NextRequest } from "next/server"

import { isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass"
import {
  dashboardPathForRole,
  isProtectedRolePath,
  isRolePathAllowed,
  roleRequiresClinicMembership,
} from "@/lib/auth/redirects"
import { normalizeWebRole } from "@/lib/auth/types"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  const { supabase, user, supabaseResponse } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isDashboard = pathname.startsWith("/dashboard")
  const isRoleDashboard = isProtectedRolePath(pathname)
  const isPending = pathname.startsWith("/auth/pending")
  const requiresAuth = isDashboard || isRoleDashboard || isPending

  if (!user && requiresAuth) {
    if (isDevAuthBypassEnabled() && (isDashboard || isRoleDashboard)) {
      return supabaseResponse
    }

    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && requiresAuth) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active, primary_role")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.is_active) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }

    const role = normalizeWebRole(profile.primary_role)
    const { data: membership } = await supabase
      .from("clinic_members")
      .select("clinic_id")
      .eq("profile_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()

    const hasMembership = Boolean(membership)
    const requiresMembership = roleRequiresClinicMembership(role)
    const hasRouteAccess = !requiresMembership || hasMembership

    if ((isDashboard || isRoleDashboard) && !hasRouteAccess) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/pending"
      return NextResponse.redirect(url)
    }

    if (hasRouteAccess && (isPending || isDashboard)) {
      const url = request.nextUrl.clone()
      url.pathname = dashboardPathForRole(role)
      return NextResponse.redirect(url)
    }

    if (hasRouteAccess && isRoleDashboard && !isRolePathAllowed(pathname, role)) {
      const url = request.nextUrl.clone()
      url.pathname = dashboardPathForRole(role)
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
