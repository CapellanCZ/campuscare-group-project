import { NextResponse, type NextRequest } from "next/server"

import { homePathForDesignation, isStaffAreaPath } from "@/lib/auth/home-path"
import { hasCampusAccess } from "@/lib/auth/campus-access"
import {
  canUseWebApp,
  hasApprovedClinicAccess,
  resolveClinicRole,
  type ProfileRoleFields,
} from "@/lib/auth/resolve-role"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  const { supabase, user, supabaseResponse } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isPublicDisplay =
    pathname === "/queue-management/display" ||
    pathname.startsWith("/queue-management/display/") ||
    pathname === "/display" ||
    pathname.startsWith("/display/")

  const isStaffArea = isStaffAreaPath(pathname) && !isPublicDisplay
  const isPending = pathname.startsWith("/auth/pending")
  const isContinue = pathname.startsWith("/auth/continue")

  if (!user && (isStaffArea || isPending || isContinue)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && (isStaffArea || isPending || isContinue)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("primary_role, is_active")
      .eq("id", user.id)
      .maybeSingle()

    const gate = profile as ProfileRoleFields | null

    if (!canUseWebApp(gate)) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    const membershipOk = await hasCampusAccess(
      supabase,
      user.id,
      gate?.primary_role
    )

    const allowed = hasApprovedClinicAccess(gate) && membershipOk
    const clinicRole = resolveClinicRole(gate)
    const home = clinicRole
      ? homePathForDesignation(clinicRole)
      : "/auth/pending"

    if (isContinue) {
      const url = request.nextUrl.clone()
      url.pathname = allowed ? home : "/auth/pending"
      return NextResponse.redirect(url)
    }

    if (isStaffArea && !allowed) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/pending"
      return NextResponse.redirect(url)
    }

    // Enforce role folder: /nurse/* only for primary_role = nurse, etc.
    if (isStaffArea && allowed && clinicRole && clinicRole !== "queue_display") {
      const rolePrefix = `/${clinicRole}`
      const onOwnTree =
        pathname === rolePrefix || pathname.startsWith(`${rolePrefix}/`)
      const onQueueManagement =
        pathname === "/queue-management" ||
        pathname.startsWith("/queue-management/")

      if (!onOwnTree && !onQueueManagement) {
        const url = request.nextUrl.clone()
        url.pathname = home
        return NextResponse.redirect(url)
      }
    }

    if (isPending && allowed) {
      const url = request.nextUrl.clone()
      url.pathname = home
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
