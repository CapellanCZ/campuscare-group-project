import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { isStaleRefreshTokenError } from "@/lib/supabase/auth-errors"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (isStaleRefreshTokenError(error)) {
      await supabase.auth.signOut({ scope: "local" })
      return { supabase, user: null, supabaseResponse }
    }

    // Auth 429s during heavy refresh storms should not take down the request.
    if (
      error &&
      (error.status === 429 ||
        error.code === "over_request_rate_limit" ||
        /rate limit/i.test(error.message ?? ""))
    ) {
      console.warn(
        "[auth] getUser rate-limited; continuing without session refresh"
      )
      return { supabase, user: null, supabaseResponse }
    }

    return { supabase, user, supabaseResponse }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/rate limit|over_request_rate_limit|429/i.test(message)) {
      console.warn(
        "[auth] getUser threw rate-limit; continuing without session refresh"
      )
      return { supabase, user: null, supabaseResponse }
    }
    throw err
  }
}
