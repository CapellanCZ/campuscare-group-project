import { NextResponse, type NextRequest } from "next/server"

import {
  homePathForDesignation,
  isStaffAreaPath,
  isStaffRouteRole,
} from "@/lib/auth/home-path"
import { hasCampusAccess } from "@/lib/auth/campus-access"
import {
  canUseWebApp,
  hasApprovedClinicAccess,
  resolveClinicRole,
  type ProfileRoleFields,
} from "@/lib/auth/resolve-role"
import {
  clearStaffAccessGateCookie,
  decodeStaffAccessGate,
  setStaffAccessGateCookie,
  STAFF_ACCESS_GATE_COOKIE,
} from "@/lib/auth/staff-access-gate"
import type { ClinicDesignation } from "@/lib/auth/types"
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

  // Server Actions POST to the current page URL. A middleware redirect returns
  // HTML/302 instead of an action flight payload → client
  // "An unexpected response was received from the server."
  // Let actions run; they already return { ok: false } when unauthenticated.
  const isServerAction = request.headers.has("next-action")

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
    if (isServerAction) return supabaseResponse
    return redirectWithCookies(request, "/login", supabaseResponse)
  }

  if (user) {
    // Hot path: trust a fresh signed gate cookie (90s) to skip users + membership
    // round-trips on every Server Action / navigation. Cookie is never sole auth —
    // session user must still match, and TTL forces periodic re-check.
    const cachedGate = await decodeStaffAccessGate(
      request.cookies.get(STAFF_ACCESS_GATE_COOKIE)?.value
    )
    const gateHit =
      cachedGate &&
      cachedGate.u === user.id &&
      (isStaffRouteRole(cachedGate.r) || cachedGate.r === "queue_display")

    let clinicRole: ClinicDesignation | null = gateHit
      ? (cachedGate.r as ClinicDesignation)
      : null
    let allowed = gateHit ? cachedGate.m === 1 : false
    let gate: ProfileRoleFields | null = null

    if (!gateHit) {
      const { data: profile } = await supabase
        .from("users")
        .select("primary_role, is_active")
        .eq("id", user.id)
        .maybeSingle()

      gate = profile as ProfileRoleFields | null
      clinicRole = resolveClinicRole(gate)
    }

    const isQueueDisplay = clinicRole === "queue_display"
    const home = clinicRole
      ? homePathForDesignation(clinicRole)
      : "/auth/pending"

    // Display accounts may only use the public queue board.
    if (
      isQueueDisplay &&
      (gateHit || canUseWebApp(gate)) &&
      !isPublicDisplay
    ) {
      if (isServerAction) return supabaseResponse
      return redirectWithCookies(
        request,
        "/queue-management/display",
        supabaseResponse
      )
    }

    if (isStaffArea || isPending || isContinue) {
      if (!gateHit && !canUseWebApp(gate)) {
        clearStaffAccessGateCookie(supabaseResponse)
        if (isServerAction) return supabaseResponse
        return redirectWithCookies(request, "/login", supabaseResponse)
      }

      if (!gateHit) {
        const membershipOk = await hasCampusAccess(
          supabase,
          user.id,
          gate?.primary_role
        )

        allowed =
          hasApprovedClinicAccess(gate) && (isQueueDisplay || membershipOk)

        if (clinicRole) {
          await setStaffAccessGateCookie(supabaseResponse, {
            u: user.id,
            r: clinicRole,
            m: allowed ? 1 : 0,
          })
        }
      }

      if (isContinue) {
        if (isServerAction) return supabaseResponse
        return redirectWithCookies(
          request,
          isQueueDisplay || allowed ? home : "/auth/pending",
          supabaseResponse
        )
      }

      if (isStaffArea && !allowed && !isQueueDisplay) {
        if (isServerAction) return supabaseResponse
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
          if (isServerAction) return supabaseResponse
          return redirectWithCookies(request, home, supabaseResponse)
        }
      }

      if (isPending && (allowed || isQueueDisplay)) {
        if (isServerAction) return supabaseResponse
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
