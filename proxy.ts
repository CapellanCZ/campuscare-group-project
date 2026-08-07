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

export async function proxy(request: NextRequest) {
  const { supabase, user, supabaseResponse } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isPublicDisplay =
    pathname === "/queue-management/display" ||
    pathname.startsWith("/queue-management/display/") ||
    pathname === "/display" ||
    pathname.startsWith("/display/")

  const isDisplayLogin =
    pathname === "/display-login" || pathname.startsWith("/display-login/")

  const isStaffArea = isStaffAreaPath(pathname) && !isPublicDisplay
  const isPending = pathname.startsWith("/auth/pending")
  const isContinue = pathname.startsWith("/auth/continue")

  // Unauthenticated: may use /login and /display-login; staff areas require auth.
  if (!user && (isStaffArea || isPending || isContinue)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("primary_role, is_active")
      .eq("id", user.id)
      .maybeSingle()

    const gate = profile as ProfileRoleFields | null
    const clinicRole = resolveClinicRole(gate)
    const isQueueDisplay = clinicRole === "queue_display"
    const home = clinicRole
      ? homePathForDesignation(clinicRole)
      : "/auth/pending"

    // Display accounts may only use the public queue board.
    if (isQueueDisplay && canUseWebApp(gate) && !isPublicDisplay) {
      const url = request.nextUrl.clone()
      url.pathname = "/queue-management/display"
      return NextResponse.redirect(url)
    }

    if (isStaffArea || isPending || isContinue) {
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

      const allowed =
        hasApprovedClinicAccess(gate) && (isQueueDisplay || membershipOk)

      if (isContinue) {
        const url = request.nextUrl.clone()
        url.pathname = isQueueDisplay || allowed ? home : "/auth/pending"
        return NextResponse.redirect(url)
      }

      if (isStaffArea && !allowed && !isQueueDisplay) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/pending"
        return NextResponse.redirect(url)
      }

      // Enforce role folder: /nurse/* only for primary_role = nurse, etc.
      if (isStaffArea && allowed && clinicRole && !isQueueDisplay) {
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

      if (isPending && (allowed || isQueueDisplay)) {
        const url = request.nextUrl.clone()
        url.pathname = home
        return NextResponse.redirect(url)
      }
    }

    // Staff already signed in who hit display-login accidentally stay on their home.
    if (isDisplayLogin && clinicRole && !isQueueDisplay) {
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
