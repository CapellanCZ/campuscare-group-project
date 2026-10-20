import { NextResponse, type NextRequest } from "next/server"

/** Preserve session + gate cookies when issuing a redirect from proxy. */
function redirectWithCookies(
  request: NextRequest,
  target: string,
  from: NextResponse
) {
  const url = request.nextUrl.clone()
  const [pathPart, queryPart] = target.split("?", 2)
  url.pathname = pathPart || "/"
  url.search = queryPart ? `?${queryPart}` : ""
  const redirect = NextResponse.redirect(url)
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie)
  }
  return redirect
}

function isPublicDisplayPath(pathname: string) {
  return (
    pathname === "/queue-management/display" ||
    pathname.startsWith("/queue-management/display/") ||
    pathname === "/display" ||
    pathname.startsWith("/display/")
  )
}

function isPublicMarketingPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/landing" ||
    pathname.startsWith("/landing/") ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/data-privacy" ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/")
  )
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.includes("auth-token") || cookie.name.startsWith("sb-")
    )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLogin = pathname === "/login"
  const isAuthLogout = pathname === "/auth/logout"
  const isPublicDisplay = isPublicDisplayPath(pathname)
  const isPublicMarketing = isPublicMarketingPath(pathname)
  const hasAuthCookie = hasSupabaseAuthCookie(request)

  // Fast path: no Supabase, no auth graph — return immediately.
  if (
    isPublicDisplay ||
    isPublicMarketing ||
    (isLogin && !hasAuthCookie) ||
    (isAuthLogout && !hasAuthCookie)
  ) {
    if (isAuthLogout && !hasAuthCookie) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.search = ""
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Heavy auth deps load only for protected / session-checked routes.
  const [
    { updateSession },
    { homePathForDesignation, isStaffAreaPath },
    { hasCampusAccess },
    {
      canUseWebApp,
      hasApprovedClinicAccess,
      resolveClinicRole,
    },
    { clearStaffAccessGateCookie, setStaffAccessGateCookie },
  ] = await Promise.all([
    import("@/lib/supabase/middleware"),
    import("@/lib/auth/home-path"),
    import("@/lib/auth/campus-access"),
    import("@/lib/auth/resolve-role"),
    import("@/lib/auth/staff-access-gate"),
  ])

  type ProfileRoleFields = import("@/lib/auth/resolve-role").ProfileRoleFields

  const { supabase, user, supabaseResponse } = await updateSession(request)

  // Hitting /login while signed in (incl. browser Back) must end the session.
  if (
    isLogin &&
    user &&
    request.nextUrl.searchParams.get("from") !== "logout"
  ) {
    return redirectWithCookies(
      request,
      "/auth/logout?reason=history",
      supabaseResponse
    )
  }

  if (isLogin) {
    return supabaseResponse
  }

  const isStaffArea = isStaffAreaPath(pathname)
  const isPending = pathname.startsWith("/auth/pending")
  const isContinue = pathname.startsWith("/auth/continue")

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
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Skip static assets AND public marketing so /landing never waits on
     * proxy compile or auth. Auth still runs for staff + login-with-session.
     */
    "/((?!_next/static|_next/image|favicon.ico|favicon-48.png|icon-192.png|icon-512.png|apple-touch-icon.png|landing(?:/|$)|privacy(?:/|$)|terms(?:/|$)|data-privacy(?:/|$)|docs(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
