import { NextResponse, type NextRequest } from "next/server"

import { homePathForDesignation, isStaffAreaPath } from "@/lib/auth/home-path"
import { hasCampusAccess } from "@/lib/auth/campus-access"
import {
  canUseWebApp,
  hasApprovedClinicAccess,
  resolveClinicRole,
  type ProfileRoleFields,
} from "@/lib/auth/resolve-role"
import {
  clearStaffAccessGateCookie,
  setStaffAccessGateCookie,
} from "@/lib/auth/staff-access-gate"
import { updateSession } from "@/lib/supabase/middleware"

/** Preserve session + gate cookies when issuing a redirect from proxy. */
function redirectWithCookies(request: NextRequest, pathname: string, from: NextResponse) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  const redirect = NextResponse.redirect(url)
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie)
  }
  return redirect
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicDisplay =
    pathname === "/queue-management/display" ||
    pathname.startsWith("/queue-management/display/") ||
    pathname === "/display" ||
    pathname.startsWith("/display/")

  // Public marketing/legal pages: skip Supabase session refresh (TTFB / auth RTT).
  // Auth is not required to render these; Login still establishes session client-side.
  const isPublicMarketing =
    pathname === "/" ||
    pathname === "/landing" ||
    pathname.startsWith("/landing/") ||
    pathname === "/login" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/data-privacy" ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/")

  // Public board is anon-readable. Skip session refresh so realtime/poll
  // refreshes cannot hammer Supabase Auth (429 over_request_rate_limit).
  if (isPublicDisplay || isPublicMarketing) {
    return NextResponse.next()
  }

  const { supabase, user, supabaseResponse } = await updateSession(request)

  const isStaffArea = isStaffAreaPath(pathname)
  const isPending = pathname.startsWith("/auth/pending")
  const isContinue = pathname.startsWith("/auth/continue")

  // Unauthenticated: may use /login and /display-login; staff areas require auth.
  if (!user && (isStaffArea || isPending || isContinue)) {
    clearStaffAccessGateCookie(supabaseResponse)
    return redirectWithCookies(request, "/login", supabaseResponse)
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
      return redirectWithCookies(
        request,
        "/queue-management/display",
        supabaseResponse
      )
    }

    if (isStaffArea || isPending || isContinue) {
      if (!canUseWebApp(gate)) {
        clearStaffAccessGateCookie(supabaseResponse)
        return redirectWithCookies(request, "/login", supabaseResponse)
      }

      const membershipOk = await hasCampusAccess(
        supabase,
        user.id,
        gate?.primary_role
      )

      const allowed =
        hasApprovedClinicAccess(gate) && (isQueueDisplay || membershipOk)

      if (clinicRole) {
        await setStaffAccessGateCookie(supabaseResponse, {
          u: user.id,
          r: clinicRole,
          m: allowed ? 1 : 0,
        })
      }

      if (isContinue) {
        return redirectWithCookies(
          request,
          isQueueDisplay || allowed ? home : "/auth/pending",
          supabaseResponse
        )
      }

      if (isStaffArea && !allowed && !isQueueDisplay) {
        return redirectWithCookies(request, "/auth/pending", supabaseResponse)
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
          return redirectWithCookies(request, home, supabaseResponse)
        }
      }

      if (isPending && (allowed || isQueueDisplay)) {
        return redirectWithCookies(request, home, supabaseResponse)
      }
    }

    // Display-login must stay reachable even when a clinical staff session exists.
    // Staff Auth logo navigation always opens /display-login without session hijack.
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon-48.png|icon-192.png|icon-512.png|apple-touch-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
