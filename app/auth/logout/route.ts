import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const LOGOUT_REASONS = new Set(["idle", "absolute", "history"])

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url)
  const supabase = await createClient()
  await supabase.auth.signOut()

  const loginUrl = new URL("/login", origin)
  // Prevent proxy from sending an already-cleared session back through logout.
  loginUrl.searchParams.set("from", "logout")
  const reason = searchParams.get("reason")
  if (reason && LOGOUT_REASONS.has(reason)) {
    loginUrl.searchParams.set("reason", reason)
  }

  const response = NextResponse.redirect(loginUrl)
  // Prevent Back from restoring a logged-in staff page from browser cache.
  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate"
  )
  response.headers.set("Clear-Site-Data", '"cache"')
  return response
}
